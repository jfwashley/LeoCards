# Phase 10: Vision Extraction Endpoint - Discussion Log

> **Audit trail only.** Do not use as input to planning/research/execution agents.
> Decisions are in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 10-vision-extraction-endpoint
**Areas discussed:** Vision SDK & model, Extraction contract, Image transport & limits, Failure & resilience

---

## Vision SDK & model

| Question | Options | User choice |
|----------|---------|-------------|
| Which SDK? | Official @anthropic-ai/sdk · **Vercel AI SDK** | Vercel AI SDK (over recommended official — for generateObject/zod + abstraction) |
| Model posture? | **Balanced (Sonnet)** · Cheapest (Haiku) · Max (Opus) | Balanced (Sonnet-tier); exact ID pinned by research |
| Key wiring? | **Typed @/env + 503** · Raw process.env | Typed @/env + 503 (mirrors DEEPL) |

## Extraction contract

| Question | Options | User choice |
|----------|---------|-------------|
| Word scope? | **Bias to deck target lang** · All visible · Target+fallback | Bias to deck's target language |
| Word form? | Dictionary base form · **Exactly as seen** | Exactly as seen (verbatim; Phase 11 cleans) |
| Output? | **generateObject + zod** · Free-text parse | generateObject + zod { words[], detectedLanguage? } |
| Empty + cap? | **200 + empty, cap ~50** · Distinct status | 200 {words:[]} = none; cap ~50 |

## Image transport & limits

| Question | Options | User choice |
|----------|---------|-------------|
| Transport? | **Base64 JSON** · multipart/form-data | Base64 in JSON body |
| Server validation? | **Shared consts + magic-byte** · declared only | Shared consts + magic-byte sniff |
| Oversized cap? | **Hard cap early → 413** · after decode | Hard cap before decode → 413 |
| Shared consts module? | **Yes single source** · Keep separate | Yes — shared module (closes Phase 9 dup-MIME finding) |

## Failure & resilience

| Question | Options | User choice |
|----------|---------|-------------|
| Timeout? | **~30s/60s → 504** · ~15s/30s · ~60s/90s | ~30s call / 60s route → 504 |
| Error distinction? | **HTTP status drives UI** · typed code field | HTTP status drives UI (accepted recommendation) |
| Double-submit? | **Client in-flight guard** · +server idempotency | Client in-flight guard (accepted recommendation) |
| Recovery + rate limit? | **Preserve all + Retry ~10/min** · no inline retry | Preserve all + Retry, ~10/min (accepted recommendation) |

## Claude's Discretion
- Exact prompt wording (within D-05/D-06), route path/filename, shared-constants module placement, client extraction-state component decomposition.

## Deferred Ideas
- Lemmatization/dedupe (→ Phase 11), server idempotency (rejected for EXT-02), vision cost/observability telemetry (future/backlog), add-to-deck + DeepL + review (Phase 11).
