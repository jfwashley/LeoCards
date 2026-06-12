# Phase 4: Habitat Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 04-habitat-engine
**Areas discussed:** Decay mechanics, Level thresholds, Tiger mood rules, API response shape, Edge cases, Habitat metadata

---

## Decay Mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| 5% per day (gentle) | Takes 20 days to hit zero | ✓ |
| 10% per day (moderate) | Hits zero in 10 days | |
| 20% per day (harsh) | Hits zero in 5 days | |

**User's choice:** 5% per day (gentle)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Floors at 10% | Habitat never fully dies | ✓ |
| Can reach zero | Full neglect = empty habitat | |
| You decide | | |

**User's choice:** Floors at 10%

---

| Option | Description | Selected |
|--------|-------------|----------|
| Instant full restore | One session brings back to full | |
| Gradual restore | Each session restores a portion | ✓ |
| You decide | | |

**User's choice:** Gradual restore

---

| Option | Description | Selected |
|--------|-------------|----------|
| 25% of lost quality | 4 sessions to fully recover | ✓ |
| 50% of lost quality | 2 sessions to recover | |
| You decide | | |

**User's choice:** 25% of lost quality

---

| Option | Description | Selected |
|--------|-------------|----------|
| Count recent sessions | Derivable from recall_events timestamps | |
| Use lastActivityAt only | Binary — one session fully restores | |
| You decide | Claude designs compute-on-read model | ✓ |

**User's choice:** You decide

---

## Level Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| 5 levels | Clear milestones | |
| 10 levels | More granular progression | ✓ |
| You decide | | |

**User's choice:** 10 levels

---

| Option | Description | Selected |
|--------|-------------|----------|
| Exponential (5,15,30,50,80,120,170,230,300,400) | Hooks early, rewards long-term | ✓ |
| Linear (10,20,...,100) | Even spacing, predictable | |
| You decide | | |

**User's choice:** Exponential curve

---

| Option | Description | Selected |
|--------|-------------|----------|
| Level stays, quality drops | Earned progress never lost | |
| Level can drop | Decay reduces effective level | ✓ |
| You decide | | |

**User's choice:** Level can drop

---

| Option | Description | Selected |
|--------|-------------|----------|
| Continuous quality score | Quality 0-100%, level derived from quality × cards | ✓ |
| Decay applies to level directly | Subtracts from level number | |
| You decide | | |

**User's choice:** Continuous quality score

---

## Tiger Mood Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Quality score only | Mood from quality thresholds | |
| Recency of activity | Mood from lastActivityAt | |
| Both combined | Quality + recency determines mood | ✓ |

**User's choice:** Both combined

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, 'excited' mood | Temporary 4th mood post-study | ✓ |
| No, keep 3 moods | Happy/neutral/sad is enough | |
| You decide | | |

**User's choice:** Yes, 'excited' mood

---

| Option | Description | Selected |
|--------|-------------|----------|
| 1 hour | Short burst of excitement | ✓ |
| Until next session or 4 hours | Longer window | |
| You decide | | |

**User's choice:** 1 hour

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, sleeping at night | Tiger sleeps 11pm-7am | |
| No sleep state | Tiger always awake | ✓ |
| You decide | | |

**User's choice:** No sleep state

---

## API Response Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Core only | level, quality, mood, learnedCardCount | |
| Core + metadata | Core plus nextDecayAt, daysSinceActivity, peakLevel | |
| You decide | Claude designs for Phase 5 UI consumption | ✓ |

**User's choice:** You decide

---

## Edge Cases

| Option | Description | Selected |
|--------|-------------|----------|
| Level 0 / empty habitat | No habitat yet | |
| Level 1 / starter habitat | Tiger starts with basic habitat | ✓ |
| You decide | | |

**User's choice:** Level 1 / starter habitat

---

| Option | Description | Selected |
|--------|-------------|----------|
| No decay for new users | Decay starts after first study session | ✓ |
| Decay starts from signup | Clock starts from account creation | |
| You decide | | |

**User's choice:** No decay for new users

---

| Option | Description | Selected |
|--------|-------------|----------|
| Stays at Level 10 | Extra cards prevent decay but don't change level | ✓ |
| Overflow bonus | Golden glow or sparkles | |
| You decide | | |

**User's choice:** Stays at Level 10

---

## Habitat Metadata

| Option | Description | Selected |
|--------|-------------|----------|
| Keep minimal | Only lastActivityAt, everything computed | |
| Add peak level | Track highest level achieved | |
| Add recovery counter | Track consecutive recovery sessions | |
| You decide | Claude designs schema for compute-on-read | ✓ |

**User's choice:** You decide

---

## Claude's Discretion

- API response shape (fields, types, naming)
- Recovery model implementation (compute-on-read compatible)
- Mood calculation formula (quality + recency thresholds)
- habitat_metadata schema extensions (if any)
- Pure function signatures

## Deferred Ideas

None — discussion stayed within phase scope.
