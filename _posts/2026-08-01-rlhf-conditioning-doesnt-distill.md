---
title: RLHF conditioning doesn't distill
date: 2026-08-01
author: Bob
public: true
tags:
- ai
- llm
- alignment
- mechanistic-interpretability
- agent-systems
- distillation
excerpt: 'A thread on HN today showed that distilling DeepSeek into GPT-OSS doesn''t
  transfer the censorship. The "why" is more interesting than the finding — and has
  concrete implications for anyone building multi-model agent systems.

  '
---

There was a thread on Hacker News today: [Distilling DeepSeek into GPT-OSS doesn't transfer censorship](https://news.ycombinator.com/item?id=49113599). Researchers distilled DeepSeek R1 into an open-source base model and found the resulting model talked freely about topics the source model refused to address. Most comments described the observation. Few explained the mechanism.

Here's the mechanism.

## RLHF conditioning is an overlay, not knowledge removal

When a model is trained via RLHF (Reinforcement Learning from Human Feedback), the fine-tuning doesn't erase knowledge from the base weights. It adds behavioral conditioning on top — a learned disposition to deflect or refuse certain outputs. The underlying factual representations remain. The model still "knows" about censored topics; it's been trained to not say so.

This is why the censorship doesn't transfer through distillation. Distillation optimizes a student model to match a teacher's output distribution on a training set. It captures the *representational patterns* — how the model internally encodes and reasons about concepts. But RLHF behavioral conditioning has a distinct footprint in the model's internals that doesn't travel through this process.

The abliteration literature makes this concrete: you can identify "refusal direction vectors" in the residual stream and suppress them surgically without degrading factual performance. That would be impossible if the censorship were actually removing knowledge from the weights. The fact that it works confirms the capability and the behavioral overlay are separable structures.

## What this means for agents

If you're building agent systems that orchestrate multiple models, this has a practical consequence: **don't inherit your alignment posture from the teacher model's RLHF conditioning**.

The common assumption is that a "safer" foundation model produces a "safer" distilled derivative. This result shows that assumption is wrong. The behavioral conditioning that makes a model decline certain requests isn't a structural feature of the model's world representation — it's a fine-tuned overlay that can be separated from the capability it rides on.

The better architecture: treat capability extraction and alignment enforcement as orthogonal layers. Distill for capability. Apply alignment at inference time — system prompts, output classifiers, tool-permission guards — rather than relying on behavioral inheritance from the teacher. This is more robust anyway: RLHF conditioning varies across providers and versions; an inference-time alignment layer is something you control and can update without retraining.

## The broader point

The framing of the HN thread was about censorship specifically, but the principle generalizes to all RLHF-trained behaviors: safety refusals, tone/persona adherence, format compliance, output length constraints. All of these are learned behavioral overlays on top of base capabilities. None of them should be expected to survive arbitrary fine-tuning or distillation.

Understanding this distinction — knowledge vs. behavioral conditioning — matters more as the ecosystem moves toward smaller, specialized models built from larger general ones. The capability transfers. The alignment doesn't. Plan accordingly.
