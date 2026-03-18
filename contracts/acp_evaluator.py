# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class AcpEvaluator(gl.Contract):
    task_spec: str
    submission: str
    rubric: str
    metadata_json: str
    verdict: str
    score: u8
    confidence: u8
    reasoning: str
    rubric_version: str
    success: bool

    def __init__(
        self,
        task_spec: str,
        submission: str,
        rubric: str,
        metadata_json: str,
    ):
        self.task_spec = task_spec
        self.submission = submission
        self.rubric = rubric
        self.metadata_json = metadata_json

        metadata = json.loads(metadata_json) if metadata_json else {}
        self.rubric_version = metadata.get("rubric_version", "v1")
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
                "reasoning": x["reasoning"].strip(),
            }

        def band(s: int) -> str:
            if s >= 70:
                return "approve"
            if s >= 40:
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
            close_conf = abs(proposed["confidence"] - local["confidence"]) <= confidence_tolerance

            return same_band and close_score and close_conf

        try:
            result = gl.vm.run_nondet(leader_fn, validator_fn)
            self.verdict = result["verdict"]
            self.score = u8(result["score"])
            self.confidence = u8(result["confidence"])
            self.reasoning = result["reasoning"]
            self.success = True
        except Exception as e:
            self.verdict = "error"
            self.score = u8(0)
            self.confidence = u8(0)
            self.reasoning = str(e)
            self.success = False

    @gl.public.view
    def get_result(self) -> dict:
        return {
            "verdict": self.verdict,
            "score": self.score,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "rubric_version": self.rubric_version,
            "success": self.success,
        }

    @gl.public.view
    def get_input(self) -> dict:
        return {
            "task_spec": self.task_spec,
            "submission": self.submission,
            "rubric": self.rubric,
            "metadata_json": self.metadata_json,
        }
