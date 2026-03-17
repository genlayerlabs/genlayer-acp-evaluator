# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json
import typing


@allow_storage
@dataclass
class EvalResult:
    verdict: str              # approve | reject | needs_review
    score: u8                 # 0..100
    confidence: u8            # 0..100
    reasoning: str
    rubric_version: str


@allow_storage
@dataclass
class JobRecord:
    job_id: str
    requester: Address
    task_spec: str
    submission: str
    rubric: str
    metadata_json: str
    result: EvalResult


class AcpEvaluator(gl.Contract):
    owner: Address
    jobs: TreeMap[str, JobRecord]

    def __init__(self):
        self.owner = gl.message.sender_address

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner.as_hex

    @gl.public.write
    def submit_job(
        self,
        job_id: str,
        task_spec: str,
        submission: str,
        rubric: str,
        metadata_json: str
    ) -> dict[str, typing.Any]:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only owner can submit jobs")

        metadata = json.loads(metadata_json) if metadata_json else {}
        rubric_version = metadata.get("rubric_version", "v1")
        score_tolerance = int(metadata.get("score_tolerance", 10))
        confidence_tolerance = int(metadata.get("confidence_tolerance", 15))

        eval_prompt = f"""
You are evaluating a provider submission against a rubric.

TASK SPEC:
{task_spec}

SUBMISSION:
{submission}

RUBRIC:
{rubric}

Return strict JSON with:
- verdict: one of "approve", "reject", "needs_review"
- score: integer 0..100
- confidence: integer 0..100
- reasoning: short explanation
"""

        def normalize(x: dict) -> dict:
            return {
                "verdict": x["verdict"],
                "score": int(x["score"]),
                "confidence": int(x["confidence"]),
                "reasoning": x["reasoning"].strip()
            }

        def band(score: int) -> str:
            if score >= 70:
                return "approve"
            if score >= 40:
                return "needs_review"
            return "reject"

        def leader_fn():
            raw = gl.nondet.exec_prompt(eval_prompt, response_format="json")
            return normalize(raw)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False

            proposed = leader_result.calldata

            if proposed["verdict"] not in ("approve", "reject", "needs_review"):
                return False
            if not (0 <= proposed["score"] <= 100):
                return False
            if not (0 <= proposed["confidence"] <= 100):
                return False

            local_raw = gl.nondet.exec_prompt(eval_prompt, response_format="json")
            local = normalize(local_raw)

            same_band = band(proposed["score"]) == band(local["score"])
            close_score = abs(proposed["score"] - local["score"]) <= score_tolerance
            close_confidence = abs(proposed["confidence"] - local["confidence"]) <= confidence_tolerance

            return same_band and close_score and close_confidence

        result = gl.vm.run_nondet(leader_fn, validator_fn)

        stored_result = EvalResult(
            verdict=result["verdict"],
            score=u8(result["score"]),
            confidence=u8(result["confidence"]),
            reasoning=result["reasoning"],
            rubric_version=rubric_version
        )

        self.jobs[job_id] = JobRecord(
            job_id=job_id,
            requester=gl.message.sender_address,
            task_spec=task_spec,
            submission=submission,
            rubric=rubric,
            metadata_json=metadata_json,
            result=stored_result
        )

        # convenience return only; durable state lives in self.jobs[job_id]
        return {
            "job_id": job_id,
            "verdict": stored_result.verdict,
            "score": stored_result.score,
            "confidence": stored_result.confidence
        }

    @gl.public.view
    def get_job(self, job_id: str) -> JobRecord:
        return self.jobs.get(
            job_id,
            JobRecord(
                job_id="",
                requester=Address("0x0000000000000000000000000000000000000000"),
                task_spec="",
                submission="",
                rubric="",
                metadata_json="",
                result=EvalResult(
                    verdict="needs_review",
                    score=u8(0),
                    confidence=u8(0),
                    reasoning="",
                    rubric_version=""
                )
            )
        )

    @gl.public.view
    def has_job(self, job_id: str) -> bool:
        return job_id in self.jobs
