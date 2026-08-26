---
title: Why language models will need local learning, and what it will take to get there
date: 2026-08-26
slug: language-models-local-learning
summary: A look at why global backpropagation is becoming a systems bottleneck for language models, and what evidence local learning would need before it can replace it.
tags: AI, Local Learning, Backpropagation
readTime: 7 min read
section: blog
---

# Why language models will need local learning, and what it will take to get there

Every large language model in production today is trained with backpropagation, and the systems built around it are showing strain in several places at once: activation memory that grows with depth and context, pipelines that idle unless fed ever-larger batches, fine-tuning that erodes capabilities the model already had, looped architectures trained only on their last few iterations, and deployed models that cannot learn at all.

In this post we make two arguments. First, these are five consequences of one design decision: every parameter waits on a single error signal computed at the output. Local learning, in which each block of layers updates from a signal it can compute itself, is the only family of methods that removes that dependency. Second, the evidence available in 2026 does not yet support replacing backpropagation with any existing local rule, and we describe what evidence would.

## The hidden cost of a single global gradient

Backpropagation is sequential. A layer cannot update until the forward pass has reached the output and the gradient has returned through every layer above it. Depth becomes a serial chain, every intermediate activation is stored until its gradient arrives, and any signal entering at the output reaches every parameter, whether or not it should change.

Training systems manage these costs by trading resources. Activation checkpointing recomputes the forward pass to save memory, at roughly 30% more compute. Pipeline schedules keep accelerators busy by adding microbatches, which enlarges the global batch, or by adding memory in zero-bubble variants. Zeroth-order optimizers remove the backward pass and pay with 10–100 times more steps. None of these removes the dependency; each moves its cost to the least constrained budget.

## Where the constraint is starting to bind

**Depth and batch size.** Activation memory scales with depth, sequence length, and width. Across *p* pipeline stages, roughly (*p*−1)/(*m*+*p*−1) of the hardware is idle unless the number of microbatches *m* is much larger than *p*. Meeting that condition pushes the global batch past the critical batch size, beyond which additional samples no longer reduce training steps. Depth ends up limited by memory, batch size, or both.

**Looped architectures.** Models such as Huginn and Ouro reuse one block for *r* iterations to reason in latent space. Backpropagating through *r* iterations multiplies *r* Jacobians and grows memory with *r*, so training is usually truncated. An iso-depth scaling study from April 2026 found that truncation leaves the loop mechanism poorly trained even while validation loss keeps improving.

**Diffusion blocks.** Block diffusion language models (BD3-LM, SDAR, SDLM, and this year's multi-block variants) generate autoregressively over blocks and denoise within each one. Their objective is already local in the iteration dimension, since each denoising step is trained on its own rather than through the refinement chain, which is what looped transformers lack. The price is an objective that cannot be evaluated in one standard forward pass and slower convergence when denoising is coupled across a sequence. Along depth, these models remain fully backpropagated.

**Learning on devices.** Fine-tuning needs gradients, optimizer state, and stored activations beyond the weights, which limits on-device training to a few billion parameters. Zeroth-order methods fit a 30B model on one 80 GB A100 where backpropagation fits 2.7B, at 10–100 times the steps. Deployed models stay frozen.

**Post-training.** Full-parameter SFT and RL push narrow gradients through every layer. In LoPT (May 2026), fine-tuning Llama-3.1-8B-Instruct on Alpaca reduced GSM8K from 69.7 to 46.6, while stopping the task gradient at the network's midpoint gave 72.1 with 24–36% less peak memory.

**New hardware.** Analog and photonic substrates run forward passes efficiently but cannot easily implement backpropagation. Wave-based physical networks have been trained without it (*Science*, 2023); a usable local rule is a precondition for training on such hardware.

## What local learning achieves today

Not enough. A June 2026 audit compared the strongest Forward-Forward variant with a matched backpropagation baseline and found deficits of 2.4 and 5.9 points on CIFAR-10 and CIFAR-100, widening with the number of classes, and 49.4% on ImageNet-100 where backpropagation exceeds 75%. On an 8 GB GPU, backpropagation with gradient accumulation used less memory and ran faster. Since next-token prediction is classification over roughly 10⁵ classes, a gap that widens with class count is a warning sign for language.

Results on language models this year point the same way. Split Forward Gradient (July) reports that forward-gradient training of a transformer trunk on WikiText-103 did worse than leaving a random trunk frozen. Forward Pass Domain Adaptation (August) adapts 7–8B models without cross-layer backpropagation at 40% less memory, but only in late layers, where the output error approximates the gradient at cosine similarity 0.47–0.59, and full fine-tuning still reaches lower in-domain perplexity. Even LoPT uses a single boundary in post-training only, and a local next-token objective on its lower half severely degraded performance.

We read these as one failure: a strictly local objective does not encode the task the model is evaluated on. The methods that succeed either keep backpropagation running within large blocks or reintroduce a global signal by another route. Local architectures are well understood; local objectives that carry enough information are not.

## What it would take

A local rule that matches backpropagation on next-token loss from 125M to 1B parameters at Chinchilla-optimal budgets, with a gap that does not widen with scale; that holds at 7–8B parameters on a trillion tokens with downstream benchmarks within noise; and that beats checkpointed backpropagation with gradient accumulation on wall-clock time and energy, since peak memory has already proven to be the wrong metric.

Training systems are running out of budgets in which to hide the cost of the global gradient. Whether language models will need local learning has, in our view, been settled by the constraints above. Whether a local rule can be found that carries enough information to be worth using is the open question, and the experiments that would answer it are within reach of a single lab.

---

**References.** LoPT (arXiv:2605.04913); Forward-Forward audit (arXiv:2606.06539); Split Forward Gradient (arXiv:2607.16612); Forward Pass Domain Adaptation (arXiv:2608.14563); MeZO (arXiv:2305.17333); iso-depth scaling for looped LMs (arXiv:2604.21106); BD3-LM (arXiv:2503.09573); SDLM (arXiv:2509.24007); Multi-Block Diffusion LMs (arXiv:2606.29215); Interlocking Backpropagation (arXiv:2010.04116); critical batch size (arXiv:1812.06162); Momeni et al., *Science*, 2023.
