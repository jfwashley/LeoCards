// Dashboard ("My Deck") wireframes — Option D layout + Option 1 (inline accordion).
// Large Habitat hero · shared status line (Start studying + Add a card) ·
// "Your words" is a tap-to-expand inline accordion (no swipe, no OS-gesture conflict).
// Sketch primitives from wf-shared.jsx.

// —— deck picker, small top-right icon (shows active language) ————
function WDeckIcon() {
  return (
    <SBox i={2} style={{ height: 32, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
      <span style={{ fontSize: 14, color: ACCENT_INK }}>ES</span>
      <span style={{ fontSize: 11 }}>&#9662;</span>
    </SBox>
  );
}

function WTopBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0', flex: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LionMark size={26} />
        <span style={{ fontSize: 19 }}>LeoCards</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <WDeckIcon />
        <SBox i={1} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>&#8617;</SBox>
      </div>
    </div>
  );
}

// —— LARGE habitat hero — the focal point of the dashboard ————————
function WHabitatLarge({ sleeping }) {
  return (
    <SBox i={0} style={{ padding: '26px 20px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', flex: 'none' }}>
      <div style={{ position: 'relative' }}>
        <LionMark size={104} />
        {sleeping
          ? <span style={{ position: 'absolute', right: 2, top: -6, fontFamily: "'Caveat', cursive", fontSize: 22, color: ACCENT_INK }}>z<sup>z</sup></span>
          : null}
        <SBox i={1} style={{ position: 'absolute', right: -8, bottom: -2, width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: sleeping ? PAPER : ACCENT }}>{sleeping ? '\u2022' : 7}</SBox>
      </div>
      <span style={{ fontSize: 22 }}>Habitat &middot; Level 7</span>
      <div style={{ width: '90%', height: 16, border: `1.6px solid ${INK}`, borderRadius: 9, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: sleeping ? '0%' : '70%', background: ACCENT }}></div>
      </div>
      <span style={{ fontSize: 14, color: FAINT }}>14 / 20 cards to Level 8 &middot; tap to visit &rsaquo;</span>
    </SBox>
  );
}

// —— Option D action zone: study button + shared status / Add-a-card line ——
function WStatusText({ state }) {
  if (state === 'cooldown') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <LionMark size={26} />
          <span style={{ position: 'absolute', right: -7, top: -5, fontFamily: "'Caveat', cursive", fontSize: 14, color: ACCENT_INK }}>z<sup>z</sup></span>
        </span>
        <span style={{ color: '#6b6359' }}>resting &middot; 2h 15m</span>
      </span>
    );
  }
  if (state === 'paused') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, color: '#6b6359' }}>
        <span style={{ fontSize: 13 }}>&#10073;&#10073;</span>all paused
      </span>
    );
  }
  const count = state === 'none' ? 0 : 12;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 15, color: count ? INK : FAINT }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: count ? ACCENT : 'transparent', border: `1.5px solid ${count ? ACCENT_INK : FAINT}` }}></span>
      {count} due
    </span>
  );
}

function WActionStatusLine({ state }) {
  const active = state === 'due';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 'none' }}>
      <SBtn label="Start studying" kind={active ? 'primary' : 'ghost'} i={1} style={{ height: 58, fontSize: 20, opacity: active ? 1 : 0.55 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <WStatusText state={state} />
        <SBox i={3} dashed style={{ height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 15 }}>+ Add a card</SBox>
      </div>
    </div>
  );
}

// —— card list atoms ————————————————————————————————————————
function WMastery({ step = 2 }) {
  return (
    <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', border: `1.5px solid ${i < step ? ACCENT_INK : FAINT}`, background: i < step ? ACCENT : 'transparent' }}></span>
      ))}
    </div>
  );
}

function WCardRow({ t, n, src, step, paused, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 2px', borderBottom: last ? 'none' : `1.4px dashed ${FAINT}`, opacity: paused ? 0.5 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16 }}>{t}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <span style={{ fontSize: 13, color: FAINT }}>{n}</span>
          <span style={{ fontSize: 11, color: FAINT, border: `1.2px solid ${FAINT}`, borderRadius: 6, padding: '0 5px' }}>{paused ? 'paused' : src}</span>
        </div>
      </div>
      <WMastery step={paused ? 0 : step} />
      <SBox i={1} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{paused ? '\u25B6' : '\u2225'}</SBox>
      <SBox i={2} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>&#9998;</SBox>
    </div>
  );
}

const W_ROWS = [
  { t: 'el le\u00f3n', n: 'the lion', src: 'curated', step: 2 },
  { t: 'la casa', n: 'the house', src: 'curated', step: 3 },
  { t: 'gracias', n: 'thank you', src: 'curated', step: 1 },
  { t: 'el perro', n: 'the dog', src: 'added', step: 0 },
  { t: 'la playa', n: 'the beach', src: 'added', step: 1 },
];

function WSearch() {
  return (
    <SBox i={3} style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flex: 'none' }}>
      <span style={{ fontSize: 14, color: FAINT }}>&#9906;</span>
      <span style={{ fontSize: 14, color: FAINT }}>Search your words</span>
    </SBox>
  );
}

// —— "Your words" — inline accordion (tap header to expand in place) ——
function WWordsAccordion({ open, state }) {
  const rows = state === 'paused' ? W_ROWS.map((r) => ({ ...r, paused: true })) : W_ROWS;
  return (
    <React.Fragment>
      <SBox i={2} style={{ flex: 'none', padding: '15px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17 }}>Your words</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: FAINT }}>14 learned</span>
          <span style={{ fontSize: 16 }}>{open ? '\u2303' : '\u2304'}</span>
        </div>
      </SBox>
      {open ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <WSearch />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {rows.map((w, i) => <WCardRow key={i} {...w} last={i === rows.length - 1} />)}
          </div>
        </div>
      ) : null}
    </React.Fragment>
  );
}

// —— parametrised dashboard ————————————————————————————————————
// state: 'due' | 'none' | 'cooldown' | 'paused'   wordsOpen: bool
function WDash({ state = 'due', wordsOpen = false, screenLabel, notes }) {
  const sleeping = state === 'cooldown';
  return (
    <Board screenLabel={screenLabel} notes={notes}>
      <Phone>
        <WTopBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 20px 16px', gap: 18, minHeight: 0 }}>
          <WHabitatLarge sleeping={sleeping} />
          <WActionStatusLine state={state} />
          <WWordsAccordion open={wordsOpen} state={state} />
        </div>
      </Phone>
    </Board>
  );
}

// —— STATES ————————————————————————————————————————————————
function DashDue() {
  return <WDash state="due" screenLabel="Dashboard — cards due" notes={[
    'Habitat is the hero \u2014 enlarged and centred so progress is the first thing you see',
    'deck picker: small icon, top-right (active language; tap to switch / add a deck)',
    'Option D action line: Start studying + a shared status / Add-a-card row beneath it',
    '\u201CYour words\u201D is an inline accordion \u2014 plain tappable header, no swipe, no OS-gesture conflict',
    'tap the header to expand the list in place (chevron \u2304 \u2192 \u2303)',
    'Browse lives on the Add-a-card screen, not here',
  ]} />;
}
function DashNone() {
  return <WDash state="none" screenLabel="Dashboard — none due" notes={[
    'nothing due: Start studying stays put but dims, status reads \u201C0 due\u201D',
    'habitat + words header unchanged \u2014 nothing jumps between states',
  ]} />;
}
function DashResting() {
  return <WDash state="cooldown" screenLabel="Dashboard — resting" notes={[
    'resting shows on the shared line (napping lion + countdown), button stays put',
    'habitat shows the lion napping too \u2014 the rest reads as a feature, not a lockout',
  ]} />;
}
function DashPaused() {
  return <WDash state="paused" screenLabel="Dashboard — all paused" notes={[
    'all cards paused: status line says so; resume from inside the expanded words list',
    'one consistent action layout regardless of state',
  ]} />;
}
function DashWordsOpen() {
  return <WDash state="due" wordsOpen screenLabel="Dashboard — words accordion open" notes={[
    'tapping the header expands the list inline \u2014 no overlay, no swipe',
    'search + full card list: both sides, source tag, mastery, pause + edit',
    'page scrolls if the list runs long; tap the header again to collapse',
  ]} />;
}

Object.assign(window, {
  DashDue, DashNone, DashResting, DashPaused, DashWordsOpen,
});
