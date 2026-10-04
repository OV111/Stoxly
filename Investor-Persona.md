# Investor-Persona — Vision

_Separate project from Stoxly, moved out of Vision.md to its own file since it is explicitly not a Stoxly subsystem. See "Explicitly not" below._

## What this is

A standalone project (separate from Stoxly) to build a fictional expert-investor "mind" — codifying how real expert investors actually reason before making decisions, based on documented principles from investors like Buffett, Munger, and Dalio.

## Why

Most investing mistakes come from unclear or emotional reasoning, not lack of intelligence. This project makes expert-level reasoning explicit, checkable, and reusable — first as a mentor I can consult, later possibly as a fine-tuned model.

## Two layers

1. **Persona Layer** — usable immediately as an AI prompt. Defines the character's identity, core principles (margin of safety, inversion, circle of competence, process-over-outcome, position sizing), and a decision checklist run before any investment call.
2. **Training-Data Layer** — real case studies, mistakes, and Q&A pairs logged over time. Doubles as future fine-tuning data.

## Build order

1. Define persona identity + principles + checklist (fast, done through writing)
2. Use it as a working prompt/mentor on real decisions
3. Log every real reasoning session as a Case Study
4. Only fine-tune a model once 100+ solid case studies exist — not before

## Success looks like

A consistent, rules-based reasoning process I can trust more than gut feeling — eventually possibly a trained model that reasons the same way automatically.

## Explicitly not

- Not connected to Stoxly (separate folder, separate purpose)
- Not a trading bot or automated execution
- Not trained/fine-tuned yet — prompt-only for now
