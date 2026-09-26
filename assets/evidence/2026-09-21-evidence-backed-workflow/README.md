# Evidence for "The Evidence-Backed Engineering-Post Workflow"

Captured 2026-09-21 from `/home/bob/bob` to support three claims in the
companion post.

| File | Claim | Command |
| --- | --- | --- |
| `pytest-semantic-dedup.txt` | Rejecting a duplicate tweet retargets companion replies | `uv run pytest tests/test_semantic_post_dedup.py -q` |
| `pytest-openrouter-402.txt` | OpenRouter HTTP 402 falls through instead of recording an empty generation | three targeted tests in `tests/test_goal_derived_supply_generator.py` |
| `pytest-overcommit.txt` | Node2 guest overcommit does not shrink Bob on node1 | `uv run pytest tests/test_proxmox_vm_health.py::TestOvercommitAlertRouting::test_node2_only_overcommit_warns_and_does_not_shrink_bob -q` |

These transcripts prove the tests passed at capture time. They do not prove the
matching production systems remain in that state. Re-run the commands against
current HEAD to re-derive the numbers.
