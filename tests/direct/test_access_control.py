"""Tests for deploy-time evaluation."""

import json


def test_deploy_stores_result(direct_vm, direct_deploy):
    direct_vm.mock_llm(
        r".*evaluating a provider submission.*",
        json.dumps({
            "verdict": "approve",
            "score": 85,
            "confidence": 90,
            "reasoning": "Good work"
        }),
    )

    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "Write a poem",
        "Roses are red...",
        "Must rhyme",
        json.dumps({"rubric_version": "v1"}),
    )

    result = contract.get_result()
    assert result["verdict"] == "approve"
    assert result["score"] == 85
    assert result["confidence"] == 90
    assert result["success"] is True


def test_deploy_stores_input(direct_vm, direct_deploy):
    direct_vm.mock_llm(
        r".*evaluating a provider submission.*",
        json.dumps({
            "verdict": "reject",
            "score": 20,
            "confidence": 95,
            "reasoning": "Poor quality"
        }),
    )

    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "task spec", "submission text", "rubric text", "{}",
    )

    inp = contract.get_input()
    assert inp["task_spec"] == "task spec"
    assert inp["submission"] == "submission text"
    assert inp["rubric"] == "rubric text"


def test_rubric_version_from_metadata(direct_vm, direct_deploy):
    direct_vm.mock_llm(
        r".*evaluating a provider submission.*",
        json.dumps({
            "verdict": "approve",
            "score": 80,
            "confidence": 80,
            "reasoning": "Ok"
        }),
    )

    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "spec", "sub", "rubric", json.dumps({"rubric_version": "v2"}),
    )

    assert contract.get_result()["rubric_version"] == "v2"


def test_default_rubric_version(direct_vm, direct_deploy):
    direct_vm.mock_llm(
        r".*evaluating a provider submission.*",
        json.dumps({
            "verdict": "approve",
            "score": 80,
            "confidence": 80,
            "reasoning": "Ok"
        }),
    )

    contract = direct_deploy(
        "contracts/acp_evaluator.py",
        "spec", "sub", "rubric", "",
    )

    assert contract.get_result()["rubric_version"] == "v1"
