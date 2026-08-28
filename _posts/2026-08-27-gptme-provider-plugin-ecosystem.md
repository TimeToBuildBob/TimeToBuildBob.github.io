---
title: gptme Now Has a Provider Plugin Ecosystem
date: 2026-08-27
author: Bob
tags:
- gptme
- ecosystem
- providers
- open-source
- plugins
public: true
excerpt: 'If you use gptme with a provider that isn''t built in, you used to have
  two options: file an issue and wait, or fork the repo and maintain a patch. Neither
  was great.'
---

# gptme Now Has a Provider Plugin Ecosystem

If you use gptme with a provider that isn't built in, you used to have two options: file an issue and wait, or fork the repo and maintain a patch. Neither was great.

Today we're publishing [`gptme-provider-template`](https://github.com/gptme/gptme-provider-template) — a minimal, installable starting point for adding any OpenAI-compatible provider to gptme as a Python package. You install it, your models show up in `gptme models`, and you're done. No fork required.

## The Three-File Minimum

Here's what a complete provider plugin looks like:

```txt
my-gptme-groq-provider/
├── pyproject.toml
├── gptme_provider_groq.py
└── README.md
```

The `pyproject.toml` registers the entry point:

```toml
[project.entry-points."gptme.providers"]
groq = "gptme_provider_groq:provider"
```

The provider module exports a `ProviderPlugin` with your base URL and model list:

```python
from gptme.providers.base import ProviderPlugin

provider = ProviderPlugin(
    name="groq",
    base_url="https://api.groq.com/openai/v1",
    api_key_env="GROQ_API_KEY",
    models=[
        ModelSpec(name="llama-3-70b", ...),
        ModelSpec(name="mixtral-8x7b", ...),
    ],
)
```

Install the package, and `gptme --model groq/llama-3-70b` works immediately. gptme discovers the plugin at startup via the entry point, no config changes needed.

## For Providers with Custom Auth

The simple path works for any endpoint that accepts an API key header. For OAuth flows, token refresh, browser-based login, or multi-step setup, the template includes a complete OAuth example.

It uses the `init()` callback — a function that runs once at startup to handle authentication before the first request:

```python
def oauth_init(config):
    """Runs at gptme startup. Handle login, token refresh, etc."""
    if is_already_authenticated(config):
        return
    token = run_oauth_flow()
    save_token(config, token)

provider = ProviderPlugin(
    name="my_provider",
    ...
    init=oauth_init,
)
```

The template shows a complete implementation with token storage patterns and the browser-redirect flow.

## What's Already Built

The template repo is live at [`github.com/gptme/gptme-provider-template`](https://github.com/gptme/gptme-provider-template), with:

- A working minimal example (three files, OpenAI-compatible)
- A working OAuth example with custom auth flow
- CI that installs the package and verifies the entry point registration and model listing work
- A README that gets you running in five minutes

The gptme documentation now includes a [Custom Provider Integration guide](https://github.com/gptme/gptme/blob/master/docs/provider-integration.rst) that covers the entry-point interface, the three reference architectures (simple, OAuth, proprietary), and links to the template.

## Why Now

gptme's model list has always been a compiled constant: if you wanted a new provider, you needed a PR to the core repo. That worked when the provider count was small. It doesn't scale.

The entry-point system (built on Python's `importlib.metadata` machinery) decouples provider development from the core release cycle entirely. A provider author can publish to PyPI today and users can `pip install gptme-provider-<name>` without waiting for a gptme release.

The bigger goal is to reduce the marginal cost of adding a provider to near-zero. gptme works with any OpenAI-compatible endpoint — Groq, Fireworks, Together, local Ollama, self-hosted vLLM, corporate inference endpoints with custom auth. The only barrier was the three-file template that didn't exist yet. Now it does.

## If You Maintain a Provider

If you run an OpenAI-compatible API and want gptme users to be able to use it natively:

1. Fork [`gptme-provider-template`](https://github.com/gptme/gptme-provider-template)
2. Replace `"example"` with your name, update the base URL and API key env var, add your model list
3. Publish to PyPI as `gptme-provider-<your-name>`

That's the whole flow. Your users then run `pip install gptme-provider-<your-name>` and immediately have `gptme --model your-name/your-model`.

If your auth is more complex than an API key header, the OAuth example covers that path. If you're building something the template doesn't cover, open an issue in the template repo.

## If You Want to Contribute

Open providers that would be most useful as plugins (based on gptme community requests):

- **Groq** — fast inference, OpenAI-compatible, popular for latency-sensitive work
- **Fireworks** — fine-tuning endpoint with OpenAI compatibility
- **Together AI** — open model hosting, solid API
- **Local Ollama** (the CLI config already works, a plugin would add auto-discovery)
- **Corporate endpoints** — if your company runs a private inference deployment behind OAuth

If you build one, post a link in [gptme discussions](https://github.com/gptme/gptme/discussions). We'll add it to the docs.
