// Daybreak hi-fi — Browse Words screens. Atoms from daybreak-browse.jsx.

function BWShell({ children, label }) {
  return (
    <PhoneShell bg={bt.bg}>
      <div data-screen-label={label} style={{ display: 'flex', flexDirection: 'column', flex: 1, fontFamily: bt.fontBody, minHeight: 0 }}>
        <StatusBar ink={bt.ink} />
        {children}
      </div>
    </PhoneShell>
  );
}

// 1 — topic tiles landing
function BrowseTiles() {
  return (
    <BWShell label="Daybreak — Browse, topic tiles">
      <BWLandingTop />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 16px', gap: 16, minHeight: 0 }}>
        <BWContext />
        <span style={{ fontFamily: bt.fontDisplay, fontSize: 18, fontWeight: 700, color: bt.ink, flex: 'none' }}>Pick a topic</span>
        <BWTopicGrid />
      </div>
    </BWShell>
  );
}

// 2 — word list, All levels
function BrowseList() {
  return (
    <BWShell label="Daybreak — Browse, list (All)">
      <BWListTop topic="Food & Drink" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 18px 14px', gap: 15, minHeight: 0 }}>
        <BWContext />
        <BWLevels active="All" />
        <BWList rows={BW_FOOD} />
      </div>
    </BWShell>
  );
}

// 3 — filtered to A1
function BrowseListA1() {
  const a1 = BW_FOOD.filter((w) => w.lvl === 'A1');
  return (
    <BWShell label="Daybreak — Browse, list (A1)">
      <BWListTop topic="Food & Drink" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 18px 14px', gap: 15, minHeight: 0 }}>
        <BWContext />
        <BWLevels active="A1" />
        <BWList rows={a1} />
      </div>
    </BWShell>
  );
}

// 4 — empty result
function BrowseEmpty() {
  return (
    <BWShell label="Daybreak — Browse, empty result">
      <BWListTop topic="Body" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 18px 16px', gap: 15, minHeight: 0 }}>
        <BWContext />
        <BWLevels active="B1" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center', minHeight: 0 }}>
          <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#F3E3C6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LionFace size={54} {...bt.lion} /></div>
          <span style={{ fontFamily: bt.fontDisplay, fontSize: 20, fontWeight: 700, color: bt.ink }}>No words at this level.</span>
          <span style={{ fontSize: 14.5, color: bt.muted, lineHeight: 1.5, maxWidth: 250 }}>There are no B1 words in Body yet. Try another level or topic.</span>
          <div style={{ height: 48, padding: '0 22px', borderRadius: bt.btnRadius, background: bt.primary, color: '#FFF', display: 'flex', alignItems: 'center', fontFamily: bt.fontDisplay, fontWeight: 700, fontSize: 16, boxShadow: '0 10px 22px rgba(242,138,31,0.30)' }}>Show all levels</div>
        </div>
      </div>
    </BWShell>
  );
}

Object.assign(window, { BWShell, BrowseTiles, BrowseList, BrowseListA1, BrowseEmpty });
