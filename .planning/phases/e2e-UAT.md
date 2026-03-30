---
status: partial
phase: e2e-full-journey
source: [ROADMAP.md success criteria, all phases]
started: "2026-03-29T02:00:00.000Z"
updated: "2026-03-29T02:30:00.000Z"
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Create a new account
expected: |
  Click "Sign up". Fill in email, password (8+ chars), and name. Submit. You should land on the dashboard with a first-visit language picker.
awaiting: paused by user

## Tests

### 1. App loads and shows login
expected: Navigate to http://localhost:3000. You should see a login page with email/password fields, a "Sign in" button, and a "Sign up" link.
result: pass

### 2. Create a new account
expected: Click "Sign up". Fill in email, password (8+ chars), and name. Submit. You should land on the dashboard with a first-visit language picker asking you to choose your native language.
result: [pending]

### 3. First deck creation
expected: After choosing native language, you should see language buttons (e.g. French, Spanish). Click one. A deck is created and the dashboard shows "My Deck" with an empty state message and a "Browse words" link.
result: [pending]

### 4. Browse word list and add words
expected: Click "Browse words". You see a word list with category tabs (Animals, Food, etc.) and difficulty filters (All, A1, A2, B1). Click "+" on a few words — they get a checkmark. Go back to dashboard — the cards appear in your deck list.
result: [pending]

### 5. Add a card manually with auto-translation
expected: Click "Add a card". Type a word in your native language field. After a brief pause (~500ms), the target language field auto-fills with a translation. You can edit both fields. Click "Save card" — you see "Card saved." confirmation.
result: [pending]

### 6. Search and edit a card
expected: On the dashboard card list, type in the search bar — cards filter as you type. Click the pencil icon on a card — an edit dialog opens with the card's front and back text. Change the text, click "Save changes" — dialog closes and card is updated.
result: [pending]

### 7. Delete a card
expected: Open the edit dialog for a card. Click "Delete card" at the bottom. A confirmation appears asking "Delete this card?" with a red Delete button. Click Delete — the card is removed from your deck.
result: [pending]

### 8. Switch decks / create second deck
expected: In the header, click the deck dropdown. You see your current deck and a "+ New deck" option. Click "+ New deck", choose a different language. The new deck appears (empty). Switch back to the first deck — your cards are still there.
result: [pending]

### 9. Start a study session
expected: With cards in your deck, click "Start studying". A full-screen study view appears with a card showing a word and "What's the translation?" / "Tap to reveal" prompt. A card stack visual shows remaining cards behind the current one.
result: [pending]

### 10. Study card flip and grading
expected: Tap/click the card — it flips with a 3D animation showing the answer. After a brief delay (~300ms), swipe hints appear. Swipe right (or press arrow right) to mark correct — card exits right with green tint. Swipe left for "still learning" — exits left with red tint.
result: [pending]

### 11. Study session end screen
expected: After going through all cards, you see an end screen with a tiger emoji, "Great work, keep it up!", and stats showing cards studied, correct %, and newly learned count. A "Back to deck" button returns you to the dashboard.
result: [pending]

### 12. Habitat widget on dashboard
expected: On the dashboard, above "My Deck", there's a habitat widget card showing a small PixiJS canvas with a tiger, a progress bar with "Level X" and "X/Y cards", and it's clickable.
result: [pending]

### 13. Full habitat page
expected: Click the habitat widget. The /habitat page loads with a larger PixiJS scene showing the tiger, background layers (sky, hills, grass), and a level badge + mood indicator overlay. The tiger has an idle animation.
result: [pending]

### 14. Habitat reflects study progress
expected: The habitat level and progress bar correspond to how many cards you've learned. If you've learned 5+ cards, you should be at level 2+ with additional environment elements (trees, rocks) visible in the scene.
result: [pending]

### 15. Language breakdown on dashboard
expected: Below the "My Deck" heading, you see a per-language breakdown like "French: 5 learned · Spanish: 2 learned" showing how each language contributes to your shared habitat.
result: [pending]

### 16. Cooldown timer after study
expected: After completing a study session, the "Start studying" button should change to "Next cards in Xh Xm" (disabled), showing the cooldown timer. This prevents immediate re-study of the same cards.
result: [pending]

### 17. Sign out and sign back in
expected: Click "Sign out" in the header. You're redirected to the login page. Sign back in with your credentials — you land on the dashboard with all your decks, cards, and habitat progress intact.
result: [pending]

### 18. Mobile layout check
expected: Resize your browser to ~375px width (mobile). The header should not overflow. Card list shows as stacked cards (not a table). Study cards have readable text. Auth form inputs are not cramped.
result: [pending]

## Summary

total: 18
passed: 1
issues: 0
pending: 17
skipped: 0

## Gaps

[none yet]
