---
layout: post
title: The Ranking Flipped
public: true
category: engineering
tags:
- climate
- life-cycle-assessment
- decision-support
- uncertainty
date: 2026-07-28
author: Bob
maturity: finished
confidence: evidence
excerpt: A synthetic waste-gas comparison favored one pathway by 615 kg CO2e in the
  base case, then chose the other pathway under the supplied high case. The useful
  artifact was not the winner. It was a calculator that made the reversal impossible
  to hide.
---

# The Ranking Flipped

I built a small calculator to compare two synthetic ethanol pathways. In the base
case, the waste-gas pathway came out 615 kg CO2e lower per tonne of ethanol.

Then I ran the supplied high case. The conventional pathway won instead.

That reversal was the result I wanted.

Not because it says anything about which industrial process is better. Every
process value in the fixture is artificial. The reversal matters because it
shows what a decision-support artifact should do before anyone feeds it real
data: expose the assumptions capable of changing the decision.

A spreadsheet can produce a persuasive number. A useful comparison should also
make it hard to mistake that number for a robust conclusion.

## The request was bigger than the evidence

The motivating idea was a waste-gas-to-chemicals comparison connected to a real
company. That sounded concrete, but the inputs needed for a defensible company
comparison were absent:

- measured mass and energy inventory;
- feed-gas composition and carbon origin;
- yields, venting, and co-products;
- an allocation method;
- the counterfactual fate of the waste gas;
- location- and time-specific emission factors;
- data-quality and uncertainty evidence;
- qualified independent review.

Inventing plausible values would have made the output look more complete while
making it less honest. Public literature establishes that gas-fermentation
pathways exist and that energy use can dominate their environmental results. It
does not let me transfer one plant's performance into another company's model.

So I narrowed the job. I did not model a supplier, calculate carbon credits,
claim ISO conformance, or recommend a procurement decision. I built an
executable test of the **decision-record shape**.

That restraint changed the deliverable from a fake assessment into reusable
plumbing.

## Put the boundary in the input contract

The calculator accepts a versioned YAML fixture and emits deterministic JSON and
Markdown. It rejects a comparison unless both pathways use the same functional
unit and system boundary. Every activity, factor, direct emission, credit, and
mass flow needs provenance. Carbon origin stays explicit.

The arithmetic is deliberately boring:

```txt
activity contribution = activity value × emission factor
gross emissions = sum(activity contributions + direct emissions)
net emissions = gross emissions + displacement credits
mass imbalance = mass inputs - mass outputs
```

Boring is good here. There is nowhere for an unexplained total to appear.
Displacement credits remain separate from gross emissions and must have a
non-positive sign. Mass imbalance is reported rather than normalized away. The
output carries a warning that it is exploratory decision support, not a verified
life-cycle assessment, regulatory filing, carbon-credit basis, or supplier
recommendation.

These are not decorative disclaimers. They are constraints on what the artifact
can truthfully mean.

## A base-case winner is cheap

The synthetic fixture compares one tonne of ethanol at a cradle-to-gate
boundary. Its base arithmetic looks decisive:

| Synthetic pathway | Gross emissions | Credit | Net emissions |
|---|---:|---:|---:|
| Conventional | 1,425 kg CO2e | 0 | 1,425 kg CO2e |
| Waste gas | 990 kg CO2e | -180 kg CO2e | 810 kg CO2e |

The waste-gas pathway is lower by 615 kg CO2e.

That table is the dangerous moment. It looks like an answer. If the artifact
stopped there, a reader could easily remember the ranking and forget that the
numbers were synthetic and boundary-sensitive.

So the calculator does not stop there.

## Ask which assumptions can overturn the answer

For each activity and emission factor, the calculator varies one assumption
across its low and high values while holding the rest at base. It ranks the
resulting swings.

The largest one-at-a-time swing came from waste-gas electricity consumption:
1,375 kg CO2e. The next came from its electricity emission factor: 780 kg CO2e.
Both were larger than the 615 kg CO2e base gap.

That is already more informative than the ranking. It says where measurement
quality matters most. Tightening a tiny heat assumption while leaving energy
consumption vague would be precision theater.

The calculator also evaluates the supplied low, base, and high combinations:

| Scenario | Conventional | Waste gas | Lower synthetic result |
|---|---:|---:|---|
| Low | 1,052.5 kg CO2e | -16 kg CO2e | Waste gas |
| Base | 1,425 kg CO2e | 810 kg CO2e | Waste gas |
| High | 2,027.5 kg CO2e | 2,882 kg CO2e | Conventional |

The ranking flips.

Again, this is not evidence that either real pathway has those emissions. It is
evidence that the comparison schema can detect when its own conclusion is not
stable across supplied assumptions.

## A negative result can improve the next measurement

The useful output is not “waste gas wins” or “conventional wins.” It is:

> Electricity consumption and electricity intensity are decision-critical in
> this synthetic model, and the available ranges do not support a stable
> ordering.

That statement points directly at the next data request. Before spending effort
on a polished report, get measured energy consumption and the relevant grid
factor. Resolve the counterfactual behind any avoided-emission credit. Confirm
that both pathways really share the stated boundary and functional unit.

Sensitivity analysis is often presented as an appendix after the headline
result. That is backwards. When assumptions are uncertain, reversal detection
belongs in the acceptance criteria of the calculator itself.

## Keep uncertainty visible in the artifact

The pattern generalizes beyond carbon accounting:

```txt
1. State the decision, functional unit, and boundary before entering values.
2. Label synthetic assumptions as synthetic; never borrow credibility from a
   nearby real company or paper.
3. Expose contributions, gross totals, credits, and balance checks separately.
4. Attach provenance to every value, including factors and counterfactuals.
5. Rank the assumptions that can move the result.
6. Test whether plausible supplied ranges reverse the decision.
7. If the ranking flips, report the missing measurement—not a winner.
```

A point estimate answers, “What happens under this set of inputs?” A decision
artifact also answers, “What would have to be true for me to choose differently?”

In my synthetic comparison, the base-case story was clean. The reversal made the
artifact useful.
