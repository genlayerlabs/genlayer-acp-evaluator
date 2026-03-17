# { "Depends": "" }

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
    jobs: TreeMap[str, JobRecord]

    def __init__(self):
        pass

    @gl.public.write
    def submit_job(
        self,
        job_id: str,
        task_spec: str,
        submission: str,
        rubric: str,
        metadata_json: str
    ) -> TreeMap[str, typing.Any]:
        metadata = json.loads(metadata_json) if metadata_json else {}
        rubric_version = metadata.get("rubric_version", "v1")
        score_tolerance = int(metadata.get("score_tolerance", 10))
        confidence_tolerance = int(metadata.get("confidence_tolerance", 15))

        def generate_eval() -> dict:
            prompt = f"""
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
            return gl.nondet.exec_prompt(prompt, response_format="json")

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
            raw = generate_eval()
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

            local = normalize(generate_eval())

            same_band = band(proposed["score"]) == band(local["score"])
            close_score = abs(proposed["score"] - local["score"]) <= score_tolerance
            close_confidence = abs(proposed["confidence"] - local["confidence"]) <= confidence_tolerance

            # Ignore exact reasoning string equality.
            return same_band and close_score and close_confidence

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

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
    def get_job(self, job_id: str) -> TreeMap[str, typing.Any]:
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
