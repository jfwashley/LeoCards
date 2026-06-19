// Daybreak hi-fi — Browse Words. Topic-tiles navigation (locked Option 2) with
// difficulty levels as their own tile row, and Row A (+/check icon) word rows.
// Reuses d1Theme / PhoneShell / StatusBar / LionFace + dashboard glyphs (Chevron, LangChip).
const bt = window.d1Theme;

// ============ 14 geometric topic icons (single-weight, amber) ============
const STK = 2.2;
function TG({ children, w = 27, h = 26 }) { return <div style={{ position: 'relative', width: w, height: h, flex: 'none' }}>{children}</div>; }
const line = (c, s) => ({ position: 'absolute', background: c, borderRadius: 2, ...s });
const ring = (c, s) => ({ position: 'absolute', border: `${STK}px solid ${c}`, boxSizing: 'border-box', ...s });

const TOPIC_ICON = {
  'Greetings': (c) => <TG><div style={ring(c, { left: 0, top: 0, width: 27, height: 19, borderRadius: 8 })}></div><div style={{ position: 'absolute', left: 6, bottom: 0, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '7px solid transparent', borderTop: `8px solid ${c}` }}></div></TG>,
  'Numbers': (c) => <TG><span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: bt.fontDisplay, fontWeight: 700, fontSize: 17, color: c, letterSpacing: -1 }}>123</span></TG>,
  'Colors': (c) => <TG><div style={ring(c, { left: 0, top: 1, width: 15, height: 15, borderRadius: '50%' })}></div><div style={{ position: 'absolute', right: 0, top: 1, width: 15, height: 15, borderRadius: '50%', background: c, opacity: 0.32 }}></div><div style={{ position: 'absolute', left: 6, bottom: 0, width: 15, height: 15, borderRadius: '50%', background: c, opacity: 0.6 }}></div></TG>,
  'Days & Months': (c) => <TG><div style={ring(c, { left: 1, top: 3, width: 25, height: 22, borderRadius: 5 })}></div><div style={line(c, { left: 1, top: 9, width: 25, height: STk2() })}></div><div style={line(c, { left: 6, top: 0, width: STK, height: 6 })}></div><div style={line(c, { right: 6, top: 0, width: STK, height: 6 })}></div><div style={{ position: 'absolute', left: 5, top: 13, width: 4, height: 4, borderRadius: 1, background: c }}></div><div style={{ position: 'absolute', left: 12, top: 13, width: 4, height: 4, borderRadius: 1, background: c }}></div><div style={{ position: 'absolute', left: 19, top: 13, width: 4, height: 4, borderRadius: 1, background: c }}></div></TG>,
  'Food & Drink': (c) => <TG><div style={ring(c, { left: 3, top: 5, width: 17, height: 18, borderRadius: '3px 3px 8px 8px', borderTop: 'none' })}></div><div style={ring(c, { right: 0, top: 7, width: 8, height: 9, borderRadius: '0 8px 8px 0', borderLeft: 'none' })}></div><div style={line(c, { left: 8, top: 0, width: STK, height: 4 })}></div><div style={line(c, { left: 13, top: 0, width: STK, height: 4 })}></div></TG>,
  'Family': (c) => <TG><div style={ring(c, { left: 0, top: 1, width: 10, height: 10, borderRadius: '50%' })}></div><div style={ring(c, { left: 0, top: 13, width: 10, height: 12, borderRadius: '6px 6px 0 0' })}></div><div style={ring(c, { right: 0, top: 3, width: 9, height: 9, borderRadius: '50%' })}></div><div style={ring(c, { right: 0, top: 14, width: 9, height: 11, borderRadius: '5px 5px 0 0' })}></div></TG>,
  'Body': (c) => <TG><div style={ring(c, { left: 8, top: 0, width: 11, height: 11, borderRadius: '50%' })}></div><div style={ring(c, { left: 5, top: 13, width: 17, height: 13, borderRadius: '8px 8px 0 0' })}></div></TG>,
  'Animals': (c) => <TG><div style={{ position: 'absolute', left: 6, bottom: 0, width: 15, height: 13, borderRadius: '50%', background: c }}></div><div style={{ position: 'absolute', left: 1, top: 4, width: 6, height: 8, borderRadius: '50%', background: c }}></div><div style={{ position: 'absolute', left: 9, top: 0, width: 6, height: 8, borderRadius: '50%', background: c }}></div><div style={{ position: 'absolute', right: 1, top: 4, width: 6, height: 8, borderRadius: '50%', background: c }}></div></TG>,
  'Clothing': (c) => <TG><div style={{ position: 'absolute', left: 0, top: 2, width: 27, height: 23, background: c, clipPath: 'polygon(0% 28%, 30% 0%, 38% 9%, 62% 9%, 70% 0%, 100% 28%, 80% 44%, 78% 38%, 78% 100%, 22% 100%, 22% 38%, 20% 44%)' }}></div></TG>,
  'Home': (c) => <TG><div style={{ position: 'absolute', left: 1, top: 0, width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderBottom: `11px solid ${c}` }}></div><div style={ring(c, { left: 4, top: 10, width: 19, height: 15, borderRadius: '0 0 3px 3px', borderTop: 'none' })}></div></TG>,
  'Weather': (c) => <TG><div style={{ position: 'absolute', right: 1, top: 0, width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.5 }}></div><div style={ring(c, { left: 0, bottom: 2, width: 22, height: 13, borderRadius: 9 })}></div><div style={ring(c, { left: 5, bottom: 7, width: 12, height: 12, borderRadius: '50%' })}></div></TG>,
  'Shopping': (c) => <TG><div style={ring(c, { left: 3, top: 6, width: 21, height: 19, borderRadius: '0 0 4px 4px' })}></div><div style={ring(c, { left: 8, top: 0, width: 11, height: 12, borderRadius: '50%', borderBottom: 'none' })}></div></TG>,
  'Travel': (c) => <TG><div style={{ position: 'absolute', left: 5, top: 0, width: 17, height: 17, background: c, borderRadius: '50% 50% 50% 0', transform: 'rotate(45deg)' }}></div><div style={{ position: 'absolute', left: 11, top: 6, width: 7, height: 7, borderRadius: '50%', background: bt.surface }}></div><div style={{ position: 'absolute', left: 7, bottom: 0, width: 13, height: 4, borderRadius: '50%', background: c, opacity: 0.3 }}></div></TG>,
  'Work': (c) => <TG><div style={ring(c, { left: 0, top: 6, width: 27, height: 19, borderRadius: 4 })}></div><div style={ring(c, { left: 8, top: 1, width: 11, height: 7, borderRadius: '4px 4px 0 0', borderBottom: 'none' })}></div><div style={line(c, { left: 0, top: 13, width: 27, height: STK })}></div></TG>,
};
function STk2() { return STK; }

const TOPICS = [
  { name: 'Greetings', n: 12 }, { name: 'Numbers', n: 20 }, { name: 'Colors', n: 11 },
  { name: 'Days & Months', n: 19 }, { name: 'Food & Drink', n: 32 }, { name: 'Family', n: 16 },
  { name: 'Body', n: 18 }, { name: 'Animals', n: 24 }, { name: 'Clothing', n: 15 },
  { name: 'Home', n: 22 }, { name: 'Weather', n: 13 }, { name: 'Shopping', n: 17 },
  { name: 'Travel', n: 21 }, { name: 'Work', n: 14 },
];

const LEVELS = ['All', 'A1', 'A2', 'B1'];

const BW_FOOD = [
  { en: 'water', es: 'agua', lvl: 'A1', inDeck: true },
  { en: 'bread', es: 'pan', lvl: 'A1', inDeck: false },
  { en: 'coffee', es: 'caf\u00e9', lvl: 'A1', inDeck: true },
  { en: 'apple', es: 'manzana', lvl: 'A1', inDeck: false },
  { en: 'cheese', es: 'queso', lvl: 'A2', inDeck: false },
  { en: 'chicken', es: 'pollo', lvl: 'A2', inDeck: true },
  { en: 'to order', es: 'pedir', lvl: 'B1', inDeck: false },
  { en: 'spicy', es: 'picante', lvl: 'B1', inDeck: false },
];

// ============ atoms ============
function BWMedallion({ name, size = 52, tint = '#FFF1DC' }) {
  const draw = TOPIC_ICON[name];
  return (
    <div style={{ width: size, height: size, borderRadius: 16, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      {draw ? draw(bt.primary) : null}
    </div>
  );
}

function BWLandingTop() {
  return (
    <div style={{ padding: '4px 20px 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: bt.link, fontWeight: 700, fontSize: 15 }}><BWChevL c={bt.link} />My deck</span>
      <span style={{ fontFamily: bt.fontDisplay, fontSize: 20, fontWeight: 700, color: bt.ink }}>Browse Words</span>
      <span style={{ width: 64 }}></span>
    </div>
  );
}
function BWChevL({ c = bt.link, size = 8 }) {
  return <span style={{ width: size, height: size, borderLeft: `2.2px solid ${c}`, borderBottom: `2.2px solid ${c}`, transform: 'rotate(45deg)', display: 'inline-block', flex: 'none' }}></span>;
}
function BWListTop({ topic }) {
  return (
    <div style={{ padding: '4px 18px 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: bt.link, fontWeight: 700, fontSize: 14.5 }}><BWChevL c={bt.link} />Topics</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <BWMedallion name={topic} size={26} />
        <span style={{ fontFamily: bt.fontDisplay, fontSize: 18, fontWeight: 700, color: bt.ink }}>{topic}</span>
      </span>
      <span style={{ width: 64 }}></span>
    </div>
  );
}

function BWContext() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 'none' }}>
      <LangChip code="EN" size={22} />
      <span style={{ color: bt.muted, fontSize: 15 }}>&rarr;</span>
      <LangChip code="ES" size={22} />
      <span style={{ fontSize: 13.5, color: bt.muted }}>tap a word to add it to your <span style={{ color: bt.ink, fontWeight: 700 }}>Spanish deck</span></span>
    </div>
  );
}

// difficulty as its own tile row
function BWLevels({ active = 'All' }) {
  return (
    <div style={{ flex: 'none' }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: bt.muted, letterSpacing: 0.3 }}>LEVEL</span>
      <div style={{ display: 'flex', gap: 9, marginTop: 8 }}>
        {LEVELS.map((l) => {
          const on = l === active;
          return (
            <div key={l} style={{ flex: 1, height: 46, borderRadius: 13, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: bt.fontDisplay, fontWeight: 700, fontSize: 16, background: on ? bt.primary : '#FFFFFF', color: on ? '#FFF' : bt.ink, border: on ? 'none' : bt.fieldBorder, boxShadow: on ? '0 6px 14px rgba(242,138,31,0.26)' : 'none' }}>{l}</div>
          );
        })}
      </div>
    </div>
  );
}

// topic tile (landing grid)
function BWTopicTile({ name, n }) {
  return (
    <div style={{ borderRadius: 18, background: '#FFFFFF', border: bt.cardBorder, boxShadow: '0 5px 14px rgba(160,110,40,0.07)', padding: '15px 12px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, textAlign: 'center' }}>
      <BWMedallion name={name} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: bt.ink, lineHeight: 1.1 }}>{name}</span>
        <span style={{ fontSize: 11.5, color: bt.muted }}>{n} words</span>
      </div>
    </div>
  );
}
function BWTopicGrid() {
  return (
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11, alignContent: 'start', maskImage: 'linear-gradient(180deg, #000 92%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, #000 92%, transparent)' }}>
      {TOPICS.map((t) => <BWTopicTile key={t.name} {...t} />)}
    </div>
  );
}

// word row — Row A: +/check icon toggle
function BWLvlTag({ lvl }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: '#B4762A', background: '#FFF1DC', borderRadius: 6, padding: '2px 7px', flex: 'none' }}>{lvl}</span>;
}
function BWWordRow({ en, es, lvl, inDeck, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 12px', marginBottom: 7, borderRadius: 14, background: inDeck ? '#FFF7E9' : 'transparent', border: inDeck ? '1px solid #F4E3C4' : '1px solid transparent' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17.5, fontWeight: 700, color: bt.ink }}>{en}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: bt.muted }}>ES</span>
          <span style={{ fontSize: 14.5, color: '#9C8467' }}>{es}</span>
        </div>
      </div>
      <BWLvlTag lvl={lvl} />
      <div style={{ width: 38, height: 38, borderRadius: '50%', flex: 'none', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: inDeck ? bt.primary : '#FFFFFF', border: inDeck ? 'none' : `2px solid ${bt.primary}`, boxShadow: inDeck ? '0 5px 12px rgba(242,138,31,0.26)' : 'none' }}>
        {inDeck
          ? <span style={{ color: '#FFF', fontSize: 17, fontWeight: 700 }}>&#10003;</span>
          : <span style={{ position: 'relative', width: 15, height: 15 }}><span style={{ position: 'absolute', top: 6.5, left: 0, width: 15, height: 2.4, borderRadius: 2, background: bt.primary }}></span><span style={{ position: 'absolute', left: 6.5, top: 0, width: 2.4, height: 15, borderRadius: 2, background: bt.primary }}></span></span>}
      </div>
    </div>
  );
}
function BWList({ rows }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, maskImage: 'linear-gradient(180deg, #000 90%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, #000 90%, transparent)' }}>
      {rows.map((w, i) => <BWWordRow key={i} {...w} last={i === rows.length - 1} />)}
    </div>
  );
}

Object.assign(window, {
  bt, TOPIC_ICON, TOPICS, LEVELS, BW_FOOD, BWMedallion, BWChevL, BWLandingTop, BWListTop,
  BWContext, BWLevels, BWTopicTile, BWTopicGrid, BWLvlTag, BWWordRow, BWList,
});
