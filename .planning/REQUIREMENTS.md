# Requirements: TioCards

**Defined:** 2026-03-17
**Core Value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.

---

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can create an account with email and password
- [x] **AUTH-02**: User can log in with email and password and stay logged in across sessions
- [x] **AUTH-03**: User can log out from any page
- [x] **AUTH-04**: User can reset password via email link

### Deck & Card Management

- [x] **DECK-01**: User can browse a built-in word list for their chosen language and add words to their deck
- [x] **DECK-02**: User can manually enter a word in their native language and receive an auto-translated result for the target language
- [x] **DECK-03**: User can review and edit the auto-translated result before saving a manually-entered card
- [x] **DECK-04**: User can edit the translation on any saved card
- [x] **DECK-05**: User can delete a card from their deck
- [x] **DECK-06**: User can manage decks for French, Spanish, and English independently

### Study

- [x] **STUDY-01**: User can start a flashcard study session for a language
- [x] **STUDY-02**: User sees a card's word, can reveal the translation, and marks themselves correct or still learning
- [x] **STUDY-03**: A card is considered "learned" after 3–4 successful self-graded recalls
- [x] **STUDY-04**: Learned cards are saved and contribute to habitat progression
- [x] **STUDY-05**: Approximately 10% of each study session resurfaces already-learned cards to prevent forgetting
- [x] **STUDY-06**: User can see a session progress indicator (cards remaining in current session)

### Habitat

- [ ] **HAB-01**: User has one shared tiger habitat that reflects learning progress across all languages
- [ ] **HAB-02**: The tiger displays different mood states (happy, neutral, sad) based on recent activity
- [ ] **HAB-03**: The habitat environment gradually improves as total learned cards increase
- [ ] **HAB-04**: Milestone thresholds trigger special unlock moments (new toy, tree, play area, etc.)
- [ ] **HAB-05**: New animals appear in the habitat as visual milestone rewards
- [ ] **HAB-06**: After a 2-day grace period of inactivity, habitat begins to decay (hard decay)
- [ ] **HAB-07**: The dashboard shows a per-language breakdown of learned card counts

---

## v2 Requirements

### Notifications

- **NOTF-01**: User receives email reminder when tiger has been neglected for N days
- **NOTF-02**: User receives in-app notification when a new animal joins the habitat

### Social

- **SOCL-01**: User can share their habitat as a public link
- **SOCL-02**: User can view a friend's habitat

### Audio

- **AUDIO-01**: User can hear pronunciation of a word on any flashcard
- **AUDIO-02**: Auto-translated words include a pronunciation guide

### Study Enhancements

- **STUDY-07**: Multiple choice mode as an alternative to self-grade
- **STUDY-08**: Daily streak tracking as a secondary motivator

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple habitats per language | One tiger, one home — dilutes emotional attachment |
| Animal abilities / bonuses | Game-balance trap; visual-only is correct |
| Full SM-2 spaced repetition | Over-engineering for casual learners; 3–4 recall rule is right |
| Leaderboards / leagues | Contradicts single-player emotional tone |
| Mobile app | Web-first; mobile deferred post-v1 |
| OAuth (Google, GitHub) | Email/password sufficient for v1 |
| Admin / moderation tools | Single-user product in v1 |

---

## Traceability

*Updated after roadmap creation — 2026-03-17.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Foundation | Complete |
| AUTH-02 | Phase 1: Foundation | Complete |
| AUTH-03 | Phase 1: Foundation | Complete |
| AUTH-04 | Phase 1: Foundation | Complete |
| DECK-01 | Phase 2: Deck and Card Management | Complete |
| DECK-02 | Phase 2: Deck and Card Management | Complete |
| DECK-03 | Phase 2: Deck and Card Management | Complete |
| DECK-04 | Phase 2: Deck and Card Management | Complete |
| DECK-05 | Phase 2: Deck and Card Management | Complete |
| DECK-06 | Phase 2: Deck and Card Management | Complete |
| STUDY-01 | Phase 3: Study Engine and Study UI | Complete |
| STUDY-02 | Phase 3: Study Engine and Study UI | Complete |
| STUDY-03 | Phase 3: Study Engine and Study UI | Complete |
| STUDY-04 | Phase 3: Study Engine and Study UI | Complete |
| STUDY-05 | Phase 3: Study Engine and Study UI | Complete |
| STUDY-06 | Phase 3: Study Engine and Study UI | Complete |
| HAB-01 | Phase 4: Habitat Engine | Pending |
| HAB-06 | Phase 4: Habitat Engine | Pending |
| HAB-02 | Phase 5: Habitat UI | Pending |
| HAB-03 | Phase 5: Habitat UI | Pending |
| HAB-04 | Phase 6: Milestone System and Dashboard Polish | Pending |
| HAB-05 | Phase 6: Milestone System and Dashboard Polish | Pending |
| HAB-07 | Phase 6: Milestone System and Dashboard Polish | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---

*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after roadmap creation*
