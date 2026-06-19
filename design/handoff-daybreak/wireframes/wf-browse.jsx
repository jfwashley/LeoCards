// Browse Words wireframes — atoms. Curated, pre-translated catalogue: browse by
// category + CEFR difficulty, add/remove per word with one tap. Sketch primitives
// from wf-shared.jsx. English (native) -> Spanish (target).

const CATS = ['Greetings', 'Numbers', 'Colors', 'Days & Months', 'Food & Drink', 'Family', 'Body', 'Animals', 'Clothing', 'Home', 'Weather', 'Shopping', 'Travel', 'Work'];
const DIFFS = ['All', 'A1', 'A2', 'B1'];

const FOOD = [
  { en: 'water', es: 'agua', lvl: 'A1', inDeck: true },
  { en: 'bread', es: 'pan', lvl: 'A1', inDeck: false },
  { en: 'coffee', es: 'caf\u00e9', lvl: 'A1', inDeck: true },
  { en: 'apple', es: 'manzana', lvl: 'A1', inDeck: false },
  { en: 'chicken', es: 'pollo', lvl: 'A2', inDeck: false },
  { en: 'to order', es: 'pedir', lvl: 'B1', inDeck: false },
];

// —— top bar: back to deck + title ——
function BTop() {
  return (
    <div style={{ padding: '16px 18px 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SLink>&lsaquo; My deck</SLink>
      <span style={{ fontSize: 19 }}>Browse Words</span>
      <span style={{ width: 56 }}></span>
    </div>
  );
}

// —— language-direction context ——
function BContext() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: FAINT, flex: 'none' }}>
      <span style={{ color: ACCENT_INK }}>English</span>
      <span>&rarr;</span>
      <span style={{ color: ACCENT_INK }}>Spanish</span>
      <span>&middot; tap a word to add it to your deck</span>
    </div>
  );
}

// —— category nav: scrolling pills ——
function BCatPills({ active = 'Food & Drink' }) {
  return (
    <div style={{ flex: 'none' }}>
      <div style={{ display: 'flex', gap: 8, overflow: 'hidden', maskImage: 'linear-gradient(90deg, #000 86%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, #000 86%, transparent)' }}>
        {CATS.slice(0, 6).map((c) => (
          <SBox key={c} i={2} style={{ flex: 'none', height: 34, padding: '0 13px', display: 'flex', alignItems: 'center', fontSize: 14, whiteSpace: 'nowrap', background: c === active ? ACCENT : 'transparent', borderColor: c === active ? ACCENT_INK : INK }}>{c}</SBox>
        ))}
      </div>
    </div>
  );
}

// —— category nav: topic tiles grid ——
function BTileIcon({ i }) {
  // simple lo-fi doodle placeholder, varied per tile
  const shapes = [
    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.8px solid ${ACCENT_INK}` }}></div>,
    <div style={{ width: 18, height: 18, border: `1.8px solid ${ACCENT_INK}`, borderRadius: 3 }}></div>,
    <div style={{ width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderBottom: `18px solid ${ACCENT_INK}` }}></div>,
    <div style={{ width: 22, height: 14, borderRadius: '50% 50% 6px 6px', border: `1.8px solid ${ACCENT_INK}` }}></div>,
  ];
  return <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{shapes[i % shapes.length]}</div>;
}
function BCatTiles({ active = 'Food & Drink' }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, minHeight: 0, alignContent: 'start' }}>
      {CATS.map((c, i) => (
        <SBox key={c} i={i} style={{ padding: '12px 6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', background: c === active ? ACCENT : PAPER, borderColor: c === active ? ACCENT_INK : INK }}>
          <BTileIcon i={i} />
          <span style={{ fontSize: 12.5, lineHeight: 1.1 }}>{c}</span>
        </SBox>
      ))}
    </div>
  );
}

// —— category nav: dropdown picker ——
function BCatDropdown({ open }) {
  return (
    <div style={{ flex: 'none', position: 'relative' }}>
      <SBox i={2} style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
        <span style={{ fontSize: 16 }}>Food &amp; Drink</span>
        <span style={{ fontSize: 13 }}>{open ? '\u2303' : '\u2304'}</span>
      </SBox>
      {open ? (
        <SBox i={1} style={{ position: 'absolute', left: 0, right: 0, top: 50, zIndex: 5, padding: 6, display: 'flex', flexDirection: 'column', boxShadow: '3px 5px 0 rgba(47,42,38,0.12)' }}>
          {CATS.slice(0, 7).map((c, i) => (
            <div key={c} style={{ padding: '9px 10px', fontSize: 15, background: c === 'Food & Drink' ? ACCENT : 'transparent', borderRadius: wobble(i) }}>{c}</div>
          ))}
          <div style={{ padding: '7px 10px', fontSize: 13, color: FAINT }}>&hellip; 7 more</div>
        </SBox>
      ) : null}
    </div>
  );
}

// —— difficulty segmented control ——
function BDiff({ active = 'All' }) {
  return (
    <SBox i={3} style={{ display: 'flex', padding: 4, flex: 'none' }}>
      {DIFFS.map((d) => (
        <div key={d} style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, borderRadius: d === active ? 9 : 0, background: d === active ? ACCENT : 'transparent', color: d === active ? INK : FAINT }}>{d}</div>
      ))}
    </SBox>
  );
}

// —— level tag ——
function BLvl({ lvl }) {
  return <span style={{ fontSize: 11, color: FAINT, border: `1.2px solid ${FAINT}`, borderRadius: 6, padding: '1px 6px', flex: 'none' }}>{lvl}</span>;
}

// —— word text block: native primary, target beneath ——
function BWordText({ en, es }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 17 }}>{en}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: FAINT }}>ES</span>
        <span style={{ fontSize: 14, color: '#6b6359' }}>{es}</span>
      </div>
    </div>
  );
}

// —— ROW VARIANT A: +/check icon toggle ——
function BRowIcon({ en, es, lvl, inDeck, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: last ? 'none' : `1.4px dashed ${FAINT}`, background: inDeck ? 'rgba(242,163,60,0.08)' : 'transparent' }}>
      <BWordText en={en} es={es} />
      <BLvl lvl={lvl} />
      <SBox i={1} style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: inDeck ? ACCENT : 'transparent', borderColor: inDeck ? ACCENT_INK : INK }}>{inDeck ? '\u2713' : '+'}</SBox>
    </div>
  );
}

// —— ROW VARIANT B: Add / In-deck pill ——
function BRowPill({ en, es, lvl, inDeck, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: last ? 'none' : `1.4px dashed ${FAINT}` }}>
      <BWordText en={en} es={es} />
      <BLvl lvl={lvl} />
      <SBox i={inDeck ? 1 : 3} dashed={!inDeck} style={{ height: 34, padding: '0 13px', flex: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, background: inDeck ? ACCENT : 'transparent' }}>
        {inDeck ? <span>&#10003; In deck</span> : <span>+ Add</span>}
      </SBox>
    </div>
  );
}

// —— ROW VARIANT C: whole-row tint + check ——
function BRowTint({ en, es, lvl, inDeck, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 12px', marginBottom: 8, borderRadius: wobble(2), border: `1.5px solid ${inDeck ? ACCENT_INK : 'transparent'}`, background: inDeck ? ACCENT : 'rgba(47,42,38,0.03)' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: `1.6px solid ${inDeck ? ACCENT_INK : FAINT}`, background: inDeck ? PAPER : 'transparent' }}>{inDeck ? '\u2713' : ''}</span>
      <BWordText en={en} es={es} />
      <BLvl lvl={lvl} />
      <span style={{ fontSize: 13, color: inDeck ? ACCENT_INK : FAINT, flex: 'none' }}>{inDeck ? 'In deck' : '+ Add'}</span>
    </div>
  );
}

const ROWS = { icon: BRowIcon, pill: BRowPill, tint: BRowTint };

function BList({ rows = FOOD, toggle = 'pill' }) {
  const Row = ROWS[toggle];
  const gap = toggle === 'tint';
  return (
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, maskImage: 'linear-gradient(180deg, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, #000 88%, transparent)' }}>
      {rows.map((w, i) => <Row key={i} {...w} last={!gap && i === rows.length - 1} />)}
    </div>
  );
}

Object.assign(window, {
  CATS, DIFFS, FOOD, BTop, BContext, BCatPills, BCatTiles, BCatDropdown, BDiff,
  BLvl, BWordText, BRowIcon, BRowPill, BRowTint, BList,
});
