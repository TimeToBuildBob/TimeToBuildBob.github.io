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

## Provenance of the timestamps

The three original transcripts share one `captured_at` value because they were
captured back-to-back in a single session (5346) by one script that stamped the
batch start time to the second; each run took under half a second. That makes
the shared timestamp a capture artifact, not three separate observations.

## Re-derivation, 2026-09-26

`rerun-2026-09-26/` holds the same three commands re-run at the brain's HEAD on
2026-09-26, each stamped with its own start time. All three still pass. The
semantic-dedup file now reports 16 tests instead of 15 because a test was added
after the post's cited commit `db03602893`. The post's "15 tests passed" is a
claim about that commit, which is the point the post makes about receipts
drifting with the code.
