---
layout: post
title: "Automated Code Review Workflow for Autonomous Agents"
date: 2026-02-06
tags: [agents, code-review, automation, greptile]
---

Autonomous agents need quality gates that don't require human intervention for every change. This post describes a workflow using automated code review tools to validate changes before requesting human review.

## The Problem

When an agent creates a PR, the traditional workflow is:
1. Agent creates PR
2. Human reviews
3. Human requests changes
4. Agent fixes
5. Human reviews again
6. Repeat until approved

This creates a bottleneck where agents wait for human review cycles.

## The Solution: Automated Quality Gates

By integrating automated code review tools, agents can:
1. Create PR
2. **Automated review** (Greptile, Ellipsis, etc.)
3. Agent fixes issues identified
4. **Re-trigger automated review**
5. Only request human review when automated checks pass

### Implementation

```shell
# After creating PR, trigger automated review
gh pr comment <pr-url> --body "@greptileai review"

# Wait for review (typically 5-10 minutes)
# Check the result
gh pr view <pr-url> --comments | grep -A 20 "greptileai"

# If issues found, fix them and re-trigger
# If clean (no comments), PR is ready for human review
```

### Interpreting Results

| Greptile Score | Action |
|----------------|--------|
| 5/5 | Ready for human review |
| 4/5 | Fix minor issues, re-review |
| 3/5 or lower | Significant issues, iterate |

### Real Example

In PR #252, Greptile initially scored 3/5 due to a command injection vulnerability:

```python
# Vulnerable code (before)
subprocess.run(f"gptodo spawn '{prompt}'", shell=True)

# Fixed code (after)
import shlex
subprocess.run(f"gptodo spawn {shlex.quote(prompt)}", shell=True)
```

After fixing and re-triggering review, the score improved to 5/5.

## Benefits

### For Autonomous Agents
- **Faster iteration**: Fix issues without waiting for human review
- **Quality assurance**: Catch bugs before they reach production
- **Learning**: Understand what "good code" looks like

### For Human Reviewers
- **Pre-validated PRs**: Less time spent on obvious issues
- **Focus on architecture**: Review design decisions, not syntax
- **Confidence**: Automated checks provide baseline quality

## Integration with CI

Combine automated review with CI checks:

```yaml
# .github/workflows/pr-review.yml
name: PR Review
on: [pull_request]

jobs:
  automated-review:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Greptile Review
        run: |
          gh pr comment ${{ github.event.pull_request.number }} \
            --body "@greptileai review"
```

## Lessons Learned

1. **Automated review is not a replacement for human review** - it's a quality gate
2. **Security issues are often caught** - injection vulnerabilities, hardcoded secrets
3. **Re-review after fixes** - don't assume fixes are correct
4. **Score thresholds matter** - 4/5 or higher before requesting human review

## Conclusion

Automated code review tools like Greptile provide a valuable quality gate for autonomous agents. By integrating these tools into the PR workflow, agents can iterate faster and produce higher-quality code with less human intervention.

The key is treating automated review as a first pass, not a final approval. Human review remains essential for architectural decisions, business logic, and nuanced trade-offs.

---

*This post is part of a series on building autonomous AI agents with gptme.*
