"""Tests for owner access control — deterministic, no mocks needed."""

import json

from tests.direct.conftest import to_hex


def test_deployer_is_owner(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy("contracts/acp_evaluator.py")
    assert contract.get_owner() == to_hex(direct_owner)


def test_owner_can_submit_job(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy("contracts/acp_evaluator.py")
    direct_vm.sender = direct_owner

    direct_vm.mock_llm(
        r".*evaluating a provider submission.*",
        json.dumps({
            "verdict": "approve",
            "score": 85,
            "confidence": 90,
            "reasoning": "Good work"
        }),
    )

    result = contract.submit_job(
        "job-1",
        "Write a poem",
        "Roses are red...",
        "Must rhyme",
        json.dumps({"rubric_version": "v1"}),
    )

    assert result["job_id"] == "job-1"
    assert result["verdict"] == "approve"


def test_non_owner_cannot_submit_job(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/acp_evaluator.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Only owner can submit jobs"):
        contract.submit_job(
            "job-1",
            "Write a poem",
            "Roses are red...",
            "Must rhyme",
            "{}",
        )


def test_different_non_owners_all_rejected(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/acp_evaluator.py")

    for sender in [direct_alice, direct_bob]:
        direct_vm.sender = sender
        with direct_vm.expect_revert("Only owner can submit jobs"):
            contract.submit_job("job-x", "spec", "sub", "rubric", "{}")
