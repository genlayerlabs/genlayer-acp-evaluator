"""Tests for job submission and retrieval — requires LLM mocks."""

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


def test_submit_and_get_job(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy("contracts/acp_evaluator.py")
    direct_vm.sender = direct_owner
    _mock_eval(direct_vm)

    contract.submit_job(
        "job-1",
        "Write a poem",
        "Roses are red...",
        "Must rhyme",
        json.dumps({"rubric_version": "v1"}),
    )

    job = contract.get_job("job-1")
    assert job.job_id == "job-1"
    from genlayer.py.types import Address
    assert job.requester == Address(direct_owner)
    assert job.task_spec == "Write a poem"
    assert job.submission == "Roses are red..."
    assert job.rubric == "Must rhyme"
    assert job.result.verdict == "approve"
    assert job.result.score == 85
    assert job.result.confidence == 90
    assert job.result.rubric_version == "v1"


def test_has_job(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy("contracts/acp_evaluator.py")
    direct_vm.sender = direct_owner
    _mock_eval(direct_vm)

    assert contract.has_job("job-1") is False

    contract.submit_job("job-1", "spec", "sub", "rubric", "{}")

    assert contract.has_job("job-1") is True
    assert contract.has_job("job-999") is False


def test_get_nonexistent_job_returns_empty(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/acp_evaluator.py")

    job = contract.get_job("nonexistent")
    assert job.job_id == ""
    assert job.result.verdict == "needs_review"
    assert job.result.score == 0


def test_multiple_jobs(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy("contracts/acp_evaluator.py")
    direct_vm.sender = direct_owner

    _mock_eval(direct_vm, verdict="approve", score=90, confidence=95)
    contract.submit_job("job-a", "spec-a", "sub-a", "rubric-a", "{}")

    direct_vm.clear_mocks()
    _mock_eval(direct_vm, verdict="reject", score=20, confidence=80)
    contract.submit_job("job-b", "spec-b", "sub-b", "rubric-b", "{}")

    job_a = contract.get_job("job-a")
    job_b = contract.get_job("job-b")

    assert job_a.result.verdict == "approve"
    assert job_a.result.score == 90
    assert job_b.result.verdict == "reject"
    assert job_b.result.score == 20


def test_metadata_passthrough(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy("contracts/acp_evaluator.py")
    direct_vm.sender = direct_owner
    _mock_eval(direct_vm)

    metadata = {"rubric_version": "v2", "score_tolerance": 5, "confidence_tolerance": 10}
    contract.submit_job("job-1", "spec", "sub", "rubric", json.dumps(metadata))

    job = contract.get_job("job-1")
    assert job.metadata_json == json.dumps(metadata)
    assert job.result.rubric_version == "v2"


def test_empty_metadata(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy("contracts/acp_evaluator.py")
    direct_vm.sender = direct_owner
    _mock_eval(direct_vm)

    contract.submit_job("job-1", "spec", "sub", "rubric", "")

    job = contract.get_job("job-1")
    assert job.result.rubric_version == "v1"
