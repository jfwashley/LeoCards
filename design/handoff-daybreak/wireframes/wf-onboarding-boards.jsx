// Onboarding wireframe boards. Atoms from wf-onboarding.jsx + wf-auth.jsx + wf-shared.jsx.

// ===== Section 1 — first-visit framing: minimal vs richer =====
function FvMinimal() {
  return (
    <WOnb screenLabel="First-visit — minimal (one screen)" notes={[
      'Option: minimal \u2014 one warm screen does it all',
      'Leo greets, then you pick native + target right away, then Start',
      'fastest path into the app; the welcome warmth lives in Leo + copy',
      'this is also the \u201Cdefault\u201D state of the first-visit moment',
    ]}>
      <WGreet size={72} title="What do you want to learn?" bubble="Hi, I&rsquo;m Leo!" />
      <WLangPick variant="flag" />
      <div style={{ flex: 1 }}></div>
      <SBtn label="Start learning" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}
function FvRich1() {
  return (
    <WOnb screenLabel="First-visit — richer · step 1 (meet Leo)" notes={[
      'Option: richer \u2014 a short guided welcome (3 steps) before the pick',
      'step 1: meet Leo \u2014 set the tone, a friendly hello',
      'step dots show progress; Skip is always available',
    ]}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 'none' }}>
        <WStepDots n={1} />
        <SLink>Skip</SLink>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
        <LionMark size={120} />
        <div style={{ fontSize: 24 }}>Meet Leo</div>
        <div style={{ fontSize: 14.5, color: '#6b6359', lineHeight: 1.45, maxWidth: 240 }}>Your lion lives in a habitat that grows as you learn.</div>
      </div>
      <SBtn label="Next" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}
function FvRich2() {
  return (
    <WOnb screenLabel="First-visit — richer · step 2 (the promise)" notes={[
      'step 2: the loop \u2014 learn words \u2192 grow your habitat',
      'a tiny habitat doodle previews the reward to build anticipation',
      'this is the bit the current cold prompt is missing',
    ]}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 'none' }}>
        <WStepDots n={2} />
        <SLink>Skip</SLink>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <SBox i={0} style={{ width: '90%', height: 150, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: 22, top: 16, width: 28, height: 28, borderRadius: '50%', border: `1.8px solid ${ACCENT_INK}`, background: ACCENT }}></div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 36, borderTop: `1.8px solid ${INK}`, borderRadius: '50%/8px', height: 12 }}></div>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 28 }}><LionMark size={56} /></div>
          <div style={{ position: 'absolute', left: 14, bottom: 22, fontFamily: "'Caveat', cursive", color: FAINT, fontSize: 15 }}>/ //</div>
          <div style={{ position: 'absolute', right: 14, bottom: 22, fontFamily: "'Caveat', cursive", color: FAINT, fontSize: 15 }}>// /</div>
        </SBox>
        <div style={{ fontSize: 22 }}>Learn words, grow your world</div>
        <div style={{ fontSize: 14.5, color: '#6b6359', lineHeight: 1.45, maxWidth: 250 }}>Every word you master adds something new to the habitat.</div>
      </div>
      <SBtn label="Next" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}
function FvRich3() {
  return (
    <WOnb screenLabel="First-visit — richer · step 3 (choose languages)" notes={[
      'step 3: choose languages \u2014 native + target on this one page',
      'lands on the same picker as the minimal option',
      'primary becomes \u201CStart learning\u201D \u2192 creates the first deck',
    ]}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 'none' }}>
        <WStepDots n={3} />
        <span style={{ width: 30 }}></span>
      </div>
      <div style={{ fontSize: 21, textAlign: 'center', flex: 'none' }}>Choose your languages</div>
      <WLangPick variant="flag" />
      <div style={{ flex: 1 }}></div>
      <SBtn label="Start learning" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}

// ===== Section 2 — choose-languages presentation options =====
function LangFlags() {
  return (
    <WOnb screenLabel="Choose languages — option 1: flag cards" notes={[
      'Option 1 \u2014 tappable cards with a flag + language name',
      'two groups: \u201CI speak\u201D (native) and \u201CI want to learn\u201D (target)',
      'target list excludes the chosen native (English greyed out here)',
      'most familiar; flags scan fast',
    ]}>
      <WGreet size={64} title="Choose your languages" />
      <WLangPick variant="flag" />
      <div style={{ flex: 1 }}></div>
      <SBtn label="Start learning" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}
function LangMotif() {
  return (
    <WOnb screenLabel="Choose languages — option 2: Leo-motif cards" notes={[
      'Option 2 \u2014 cards carry a little Leo/habitat motif instead of flags',
      'more on-brand + avoids the language\u2260country awkwardness of flags',
      'each motif could later tint to that course\u2019s habitat',
    ]}>
      <WGreet size={64} title="Choose your languages" />
      <WLangPick variant="motif" />
      <div style={{ flex: 1 }}></div>
      <SBtn label="Start learning" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}
function LangDropdown() {
  return (
    <WOnb screenLabel="Choose languages — option 3: dropdowns" notes={[
      'Option 3 \u2014 two selects (\u201CI speak\u201D / \u201CI want to learn\u201D), auth-form feel',
      'most compact; scales if many languages arrive later',
      'least delightful \u2014 quietest of the three',
    ]}>
      <WGreet size={64} title="Choose your languages" />
      <WLangPick variant="dropdown" />
      <div style={{ flex: 1 }}></div>
      <SBtn label="Start learning" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}

// ===== Section 3 — first-visit states =====
function FvCreating() {
  return (
    <WOnb screenLabel="First-visit — creating deck" notes={[
      'the chosen target enters a brief loading state while the deck is set up',
      'controls disabled; honest, short wait',
    ]}>
      <WGreet size={64} title="Choose your languages" />
      <WLangGroup label="I speak"><WLangCard name="English" selected /></WLangGroup>
      <WLangGroup label="I want to learn">
        <SBox i={1} style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: ACCENT }}>
          <WFlag code="ES" /><span style={{ fontSize: 16, flex: 1 }}>Spanish</span>
          <span style={{ width: 18, height: 18, border: `2.4px solid ${INK}`, borderTopColor: 'transparent', borderRadius: '50%' }}></span>
        </SBox>
      </WLangGroup>
      <div style={{ flex: 1 }}></div>
      <SBox i={1} style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontSize: 16, background: ACCENT, opacity: 0.7 }}>Setting up your Spanish deck&hellip;</SBox>
    </WOnb>
  );
}
function FvError() {
  return (
    <WOnb screenLabel="First-visit — error" notes={[
      'deck-create failed \u2014 recoverable, never a trap',
      '\u201CSomething went wrong. Try again.\u201D keeps the chosen languages',
    ]}>
      <WGreet size={64} title="Choose your languages" />
      <WLangGroup label="I speak"><WLangCard name="English" selected /></WLangGroup>
      <WLangGroup label="I want to learn"><WLangCard name="Spanish" selected /></WLangGroup>
      <SBox i={3} style={{ borderColor: RED, background: 'rgba(217,106,82,0.08)', padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <span style={{ color: RED }}>!</span> Something went wrong. Try again.
      </SBox>
      <div style={{ flex: 1 }}></div>
      <SBtn label="Try again" i={1} style={{ height: 50, fontSize: 17 }} />
    </WOnb>
  );
}

// ===== Section 4 — empty states (lightweight, consistent) =====
function EmptyDeck() {
  return (
    <WOnb screenLabel="Empty deck — no cards yet" notes={[
      'a deck exists but has no cards \u2014 an inviting nudge, not a dead end',
      'two clear routes: Browse curated words, or Add a card',
      'consistent with the onboarding warmth (Leo + friendly copy)',
    ]}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <span style={{ fontSize: 18 }}>Spanish deck</span>
        <SBox i={2} style={{ height: 30, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>ES &#9662;</SBox>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
        <LionMark size={88} />
        <div style={{ fontSize: 20 }}>Your deck is empty</div>
        <div style={{ fontSize: 14, color: '#6b6359', lineHeight: 1.4, maxWidth: 230 }}>Add a few words and Leo&rsquo;s habitat starts to grow.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '78%' }}>
          <SBtn label="Browse words" i={1} style={{ height: 48, fontSize: 16 }} />
          <SBtn label="+ Add a card" kind="ghost" i={3} style={{ height: 48, fontSize: 16 }} />
        </div>
      </div>
    </WOnb>
  );
}
function EmptySearch() {
  return (
    <WOnb screenLabel="No search results" notes={[
      'card-list search with no matches \u2014 minor, kept consistent',
      'states the query, offers a one-tap clear',
    ]}>
      <SBox i={3} style={{ height: 42, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', flex: 'none' }}>
        <span style={{ color: FAINT }}>&#9906;</span>
        <span style={{ fontSize: 15 }}>perro</span>
        <span style={{ flex: 1 }}></span>
        <span style={{ color: FAINT, fontSize: 16 }}>&times;</span>
      </SBox>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
        <LionMark size={62} label="no matches" />
        <div style={{ fontSize: 17 }}>No words match &ldquo;perro&rdquo;</div>
        <div style={{ fontSize: 14, color: FAINT, lineHeight: 1.4 }}>Try a different spelling, or clear the search.</div>
        <SBtn label="Clear search" kind="ghost" i={2} style={{ height: 42, fontSize: 15, padding: '0 16px' }} />
      </div>
    </WOnb>
  );
}

Object.assign(window, {
  FvMinimal, FvRich1, FvRich2, FvRich3,
  LangFlags, LangMotif, LangDropdown,
  FvCreating, FvError, EmptyDeck, EmptySearch,
});
