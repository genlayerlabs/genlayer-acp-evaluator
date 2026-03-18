"""Tests for evaluation results — requires LLM mocks."""

import json


def _mock_eval(vm, verdict="approve", score=85, confidence=90):
    vm.mock_llm(
        r".*evaluating a provider submission.*",
        json.dumps({
            "verdict": verdict,
            "score": score,
            "confidence": confidence,
            "reasoning": f"Mock evaluation: {verdict}"
        }),
    )


def test_approve_verdict(direct_vm, direct_deploy):
    _mock_eval(direct_vm, verdict="approve", score=87, confidence=92)

    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "spec", "good submission", "rubric", "{}",
    )

    result = contract.get_result()
    assert result["verdict"] == "approve"
    assert result["score"] == 87
    assert result["confidence"] == 92
    assert result["success"] is True


def test_reject_verdict(direct_vm, direct_deploy):
    _mock_eval(direct_vm, verdict="reject", score=20, confidence=95)

    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "spec", "bad submission", "rubric", "{}",
    )

    result = contract.get_result()
    assert result["verdict"] == "reject"
    assert result["score"] == 20
    assert result["success"] is True


def test_needs_review_verdict(direct_vm, direct_deploy):
    _mock_eval(direct_vm, verdict="needs_review", score=55, confidence=60)

    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "spec", "mediocre submission", "rubric", "{}",
    )

    result = contract.get_result()
    assert result["verdict"] == "needs_review"
    assert result["score"] == 55


def test_metadata_passthrough(direct_vm, direct_deploy):
    _mock_eval(direct_vm)

    metadata = {"rubric_version": "v2", "score_tolerance": 5}
    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "spec", "sub", "rubric", json.dumps(metadata),
    )

    inp = contract.get_input()
    assert inp["metadata_json"] == json.dumps(metadata)
    assert contract.get_result()["rubric_version"] == "v2"


# NOTE: deploy isolation is tested in integration tests (tests/integration/)
# Direct mode only allows one contract deploy per test due to GenLayer SDK restriction.
