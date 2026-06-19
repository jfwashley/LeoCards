// Browse Words wireframe boards. Atoms from wf-browse.jsx.

// frame: top bar + context, then children (nav + list)
function BFrame({ screenLabel, notes, children }) {
  return (
    <Board screenLabel={screenLabel} notes={notes}>
      <Phone>
        <BTop />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 18px 14px', gap: 13, minHeight: 0 }}>
          <BContext />
          {children}
        </div>
      </Phone>
    </Board>
  );
}

// ===== Section 1 — category navigation, 3 directions =====
function BrowseCatPills() {
  return (
    <BFrame screenLabel="Browse — category nav: scrolling pills" notes={[
      'Option 1 \u2014 horizontal scrolling pills (compact, always on screen)',
      'active category filled; row scrolls, fades at the edge to signal more',
      'difficulty segmented sits right below \u2014 the two filters stack and combine',
      'pro: stays put while you scan the list. con: 14 is a lot to scroll through',
    ]}>
      <BCatPills active="Food & Drink" />
      <BDiff active="All" />
      <BList rows={FOOD} toggle="pill" />
    </BFrame>
  );
}
function BrowseCatTiles() {
  return (
    <BFrame screenLabel="Browse — category nav: topic tiles" notes={[
      'Option 2 \u2014 a grid of topic tiles with an icon each (tap to drill into a category)',
      'most scannable for 14 categories; icons aid recognition',
      'two-level: pick a tile \u2192 its word list (with the difficulty filter) opens',
      'difficulty filter lives on the list screen, not here',
      'con: an extra tap vs pills; needs real icons in hi-fi',
    ]}>
      <span style={{ fontSize: 15, flex: 'none' }}>Pick a topic</span>
      <BCatTiles active="Food & Drink" />
    </BFrame>
  );
}
function BrowseCatDropdown() {
  return (
    <BFrame screenLabel="Browse — category nav: dropdown picker" notes={[
      'Option 3 \u2014 a single dropdown picker (minimal chrome, maximises list space)',
      'tap to open the menu of all 14; pick one to filter',
      'leaves the most room for the word list itself',
      'con: categories are hidden until you open it \u2014 less browsable at a glance',
    ]}>
      <BCatDropdown open={true} />
      <BDiff active="All" />
      <BList rows={FOOD} toggle="pill" />
    </BFrame>
  );
}

// ===== Section 2 — word row & add/remove, 3 directions =====
// (same frame; only the row treatment changes)
function BrowseRowIcon() {
  return (
    <BFrame screenLabel="Browse — row toggle: +/check icon" notes={[
      'Row A \u2014 trailing icon button: + to add, filled \u2713 when in deck (tap again to remove)',
      'in-deck rows also get a faint tinted background',
      'smallest footprint \u2014 most words fit per screen',
      'native (English) reads primary, target (Spanish) beneath with an ES tag',
    ]}>
      <BCatPills active="Food & Drink" />
      <BDiff active="All" />
      <BList rows={FOOD} toggle="icon" />
    </BFrame>
  );
}
function BrowseRowPill() {
  return (
    <BFrame screenLabel="Browse — row toggle: Add / In-deck pill" notes={[
      'Row B \u2014 a labelled pill: dashed \u201C+ Add\u201D \u2192 filled \u201C\u2713 In deck\u201D',
      'most legible status \u2014 the word, not just an icon, tells you',
      'the pill is the remove control too when in deck',
      'a touch wider; fewer rows per screen than the icon',
    ]}>
      <BCatPills active="Food & Drink" />
      <BDiff active="All" />
      <BList rows={FOOD} toggle="pill" />
    </BFrame>
  );
}
function BrowseRowTint() {
  return (
    <BFrame screenLabel="Browse — row toggle: whole-row tint" notes={[
      'Row C \u2014 the whole row is the target; added rows become tinted cards with a check',
      'biggest hit target, strongest at-a-glance in-deck vs not distinction',
      'not-added rows sit flat/quiet; added ones lift with colour + border',
      'con: card treatment uses more vertical space',
    ]}>
      <BCatPills active="Food & Drink" />
      <BDiff active="All" />
      <BList rows={FOOD} toggle="tint" />
    </BFrame>
  );
}

// ===== Section 3 — core states (recommended combo: pills + pill rows) =====
function BrowseDefault() {
  return (
    <BFrame screenLabel="Browse — default (category, All levels)" notes={[
      'core state: a category selected, difficulty \u201CAll\u201D, mixed in-deck / not-in-deck rows',
      'shown with the recommended combo \u2014 scrolling pills + \u201CAdd / In deck\u201D pill rows',
      'add/remove is optimistic + instant; the row updates on tap',
      '(per-row loading / failed states come in the edge-case pass)',
    ]}>
      <BCatPills active="Food & Drink" />
      <BDiff active="All" />
      <BList rows={FOOD} toggle="pill" />
    </BFrame>
  );
}
function BrowseFiltered() {
  const a1 = FOOD.filter((w) => w.lvl === 'A1');
  return (
    <BFrame screenLabel="Browse — filtered to A1" notes={[
      'difficulty filter applied: A1 only \u2014 category stays \u201CFood & Drink\u201D',
      'switching difficulty keeps your category + place; just narrows the list',
      'lean into A1\u2192B1 as a beginner-first progression',
    ]}>
      <BCatPills active="Food & Drink" />
      <BDiff active="A1" />
      <BList rows={a1} toggle="pill" />
    </BFrame>
  );
}
function BrowseEmpty() {
  return (
    <BFrame screenLabel="Browse — empty result" notes={[
      'no words for this category + level combination',
      'friendly empty copy + a nudge to widen the filter (try All, or another topic)',
      'filters stay set so the user can adjust from where they are',
    ]}>
      <BCatPills active="Body" />
      <BDiff active="B1" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', minHeight: 0 }}>
        <LionMark size={62} label="nothing here" />
        <span style={{ fontSize: 17 }}>No words in this category at this level.</span>
        <span style={{ fontSize: 14, color: FAINT, lineHeight: 1.4 }}>Try a different level (e.g. All) or another topic.</span>
        <SBtn label="Show all levels" kind="primary" i={1} style={{ height: 42, fontSize: 15, padding: '0 16px' }} />
      </div>
    </BFrame>
  );
}

Object.assign(window, {
  BFrame, BrowseCatPills, BrowseCatTiles, BrowseCatDropdown,
  BrowseRowIcon, BrowseRowPill, BrowseRowTint,
  BrowseDefault, BrowseFiltered, BrowseEmpty,
});
