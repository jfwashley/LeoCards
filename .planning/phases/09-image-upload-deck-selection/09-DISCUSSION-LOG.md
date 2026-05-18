# Phase 9: Image Upload & Deck Selection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 9-image-upload-deck-selection
**Areas discussed:** Entry point & flow shape, Image picker & preview UX, Validation & error UX, Deck selector reuse

---

## Entry point & flow shape

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle on new-card page | Mode toggle on /deck/new-card (Type a word / From image) | ✓ |
| Separate route | New /deck/new-card/image page | |
| Button opens dialog | Image flow in a modal | |

| Option | Description | Selected |
|--------|-------------|----------|
| Combined single screen | Image + deck + preview together | |
| Stepped (image → deck) | Image first, then deck step | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit 'Extract' button | Disabled until valid image + deck | ✓ |
| Auto-advance on valid image | Extraction starts on image select | |

**User's choice:** Toggle on new-card page; stepped flow; explicit Extract button.
**Notes:** Stepped chosen over the recommended combined screen.

---

## Image picker & preview UX

| Option | Description | Selected |
|--------|-------------|----------|
| Click + drag-and-drop | Clickable drop zone | |
| Click-only | File picker button only | |
| Click + drag + paste | Also clipboard paste of screenshots | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Medium contained thumbnail | Fixed max box, aspect preserved | ✓ |
| Full-width preview | Spans form width | |
| Small chip thumbnail | Tiny thumb + filename | |

| Option | Description | Selected |
|--------|-------------|----------|
| X to remove + Replace button | Clear + swap affordances | ✓ |
| Replace only | Re-pick overwrites, no clear | |

**User's choice:** Click + drag + paste; medium contained thumbnail; X to remove + Replace button.
**Notes:** Paste explicitly wanted for screenshots.

---

## Validation & error UX

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately on selection | Reject before preview state | ✓ |
| On Extract click | Validate late | |

| Option | Description | Selected |
|--------|-------------|----------|
| Inline message in the drop zone | Reuse TranslationForm error pattern | ✓ |
| Toast / banner | Net-new infra | |

| Option | Description | Selected |
|--------|-------------|----------|
| Specific & friendly | Names the rule + the fix | ✓ |
| Generic friendly | One catch-all line | |

**User's choice:** Immediate rejection; inline drop-zone error; specific & friendly copy.
**Notes:** Aligns with IMG-03 (rejected before upload).

---

## Deck selector reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse DeckSwitcher as-is | Existing component + create-deck | ✓ |
| Simple read-only Select | No create option | |
| DeckSwitcher, create disabled | Hide create affordance | |

| Option | Description | Selected |
|--------|-------------|----------|
| Active deck from ?deck= param | Same as manual form logic | ✓ |
| Always first deck | Ignore param | |

| Option | Description | Selected |
|--------|-------------|----------|
| Step 2, with Extract button | Deck step + recap thumbnail + Extract | ✓ |
| Persistent under preview | Same-view selector | |

**User's choice:** Reuse DeckSwitcher as-is; default via ?deck= param; deck selector in Step 2 with Extract button.
**Notes:** Create-deck affordance kept as escape hatch for no-deck users.

## Claude's Discretion

- Toggle UI form (tabs/segmented/button pair).
- Component decomposition and stepped-state modeling (reducer analog optional).
- Drop-zone styling and Step 2 → Step 1 back-navigation detail.

## Deferred Ideas

None — discussion stayed within phase scope.
