// Daybreak — Dashboard ("My Deck") hi-fi. Matches the locked wireframe:
// large Habitat hero · Option D action line (Start studying + shared status / Add a card) ·
// "Your words" inline accordion (tap to expand, no swipe).
// Uses d1Theme / LionFace / PhoneShell / StatusBar from hifi-shared + hifi-daybreak.

const dt = window.d1Theme;

// —— sample data ——————————————————————————————————————————————
const WORDS = [
  { t: 'el le\u00f3n', n: 'the lion', src: 'curated', step: 2 },
  { t: 'la casa', n: 'the house', src: 'curated', step: 3 },
  { t: 'gracias', n: 'thank you', src: 'curated', step: 1 },
  { t: 'el perro', n: 'the dog', src: 'manual', step: 0 },
  { t: 'la playa', n: 'the beach', src: 'manual', step: 1 },
];

// —— small glyphs (drawn, no emoji) ————————————————————————————
function LogoutGlyph({ c }) {
  return (
    <div style={{ position: 'relative', width: 18, height: 15 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.1, background: c, borderRadius: 2 }}></div>
      <div style={{ position: 'absolute', left: 5, top: 6.5, width: 12, height: 2.1, background: c, borderRadius: 2 }}></div>
      <div style={{ position: 'absolute', right: 0, top: 3, width: 7.5, height: 7.5, borderTop: `2.1px solid ${c}`, borderRight: `2.1px solid ${c}`, transform: 'rotate(45deg)' }}></div>
    </div>
  );
}
function Chevron({ c, dir = 'down', size = 9 }) {
  const rot = { down: 45, up: -135, right: -45 }[dir];
  return <span style={{ width: size, height: size, borderRight: `2.2px solid ${c}`, borderBottom: `2.2px solid ${c}`, transform: `rotate(${rot}deg)`, display: 'inline-block', marginTop: dir === 'down' ? -3 : (dir === 'up' ? 3 : 0) }}></span>;
}
function PlusGlyph({ c }) {
  return (
    <span style={{ position: 'relative', width: 14, height: 14, flex: 'none' }}>
      <span style={{ position: 'absolute', left: 0, top: 6, width: 14, height: 2.3, borderRadius: 2, background: c }}></span>
      <span style={{ position: 'absolute', left: 6, top: 0, width: 2.3, height: 14, borderRadius: 2, background: c }}></span>
    </span>
  );
}
function PencilGlyph({ c }) {
  return (
    <div style={{ position: 'relative', width: 16, height: 16 }}>
      <div style={{ position: 'absolute', left: 8.5, top: 1, width: 5, height: 11, background: c, borderRadius: '2px 2px 0 0', transform: 'rotate(45deg)', transformOrigin: 'center' }}></div>
      <div style={{ position: 'absolute', left: 2.5, bottom: 1.5, width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderTop: `5px solid ${c}`, transform: 'rotate(-45deg)' }}></div>
    </div>
  );
}
function MagnifierGlyph({ c }) {
  return (
    <div style={{ position: 'relative', width: 16, height: 16 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 11, height: 11, borderRadius: '50%', border: `2px solid ${c}`, boxSizing: 'border-box' }}></div>
      <div style={{ position: 'absolute', right: 0, bottom: 0, width: 6, height: 2, background: c, borderRadius: 2, transform: 'rotate(45deg)', transformOrigin: 'left' }}></div>
    </div>
  );
}

function LangChip({ code, size = 24 }) {
  return (
    <span style={{ width: size + 7, height: size, borderRadius: 6, background: '#FFF1DC', border: '1px solid #F0E3CF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.46, fontWeight: 700, color: '#B4762A', fontFamily: dt.fontBody, letterSpacing: 0.3, flex: 'none', boxSizing: 'border-box' }}>{code}</span>
  );
}

// —— habitat medallion: lion on sunrise disc + conic progress ring + level badge ——
function HabitatMedallion({ size = 84, level = 7, progress = 0.7, sleeping = false }) {
  const deg = Math.max(0, Math.min(1, progress)) * 360;
  const ring = level >= 10 ? '#F2B33A' : `conic-gradient(${dt.primary} ${deg}deg, #F3E3C6 ${deg}deg)`;
  return (
    <div style={{ width: size, height: size, position: 'relative', flex: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: sleeping ? '#F3E3C6' : ring }}></div>
      <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE7BC 0%, #FFFDF8 78%)', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', right: '22%', top: '15%', width: size * 0.15, height: size * 0.15, borderRadius: '50%', background: '#FFC95C', opacity: sleeping ? 0.45 : 1 }}></div>
        <div style={{ marginBottom: size * 0.05, position: 'relative' }}>
          <LionFace size={size * 0.56} {...dt.lion} />
          {sleeping ? <span style={{ position: 'absolute', right: -size * 0.05, top: -size * 0.05, fontFamily: dt.fontDisplay, fontWeight: 700, fontSize: size * 0.17, color: '#B4762A' }}>z</span> : null}
        </div>
      </div>
      <div style={{ position: 'absolute', right: -2, bottom: -2, minWidth: size * 0.3, height: size * 0.3, padding: '0 5px', borderRadius: 999, background: sleeping ? '#C9B79A' : (level >= 10 ? '#F2B33A' : dt.primary), color: '#FFF', border: '3px solid #FFF6E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: dt.fontDisplay, fontWeight: 700, fontSize: size * 0.19, boxSizing: 'border-box' }}>{sleeping ? '\u2022' : level}</div>
    </div>
  );
}

// —— mastery: 3-round growth meter (green + check at 3/3) ——
function Mastery({ step = 0 }) {
  const done = step >= 3;
  const fill = done ? dt.green : dt.primary;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 8, height: 16, borderRadius: 4, background: i < step ? fill : '#F0E3CF' }}></span>)}
      </div>
      {done ? <span style={{ width: 17, height: 17, borderRadius: '50%', background: dt.green, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 11, fontWeight: 700 }}>&#10003;</span> : null}
    </div>
  );
}

function SourceTag({ src, paused }) {
  const label = paused ? 'Paused' : src === 'manual' ? 'Added by you' : 'Curated';
  const tone = paused ? { bg: '#F1E9DD', tx: '#8C7A63' } : src === 'manual' ? { bg: '#EAF3EC', tx: '#3E8B5C' } : { bg: '#FFF1DC', tx: '#B4762A' };
  return <span style={{ fontSize: 11, fontWeight: 700, color: tone.tx, background: tone.bg, padding: '3px 8px', borderRadius: 999, letterSpacing: 0.2 }}>{label}</span>;
}

function IconBtn({ children, onLight }) {
  return <div style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #EDDFC9', background: onLight ? '#FFFBF4' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxSizing: 'border-box' }}>{children}</div>;
}

function CardRow({ t, n, src, step, paused }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: '1px solid #F4ECDD', opacity: paused ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: dt.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 13.5, color: dt.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</span>
          <SourceTag src={src} paused={paused} />
        </div>
      </div>
      <Mastery step={paused ? 0 : step} />
      <IconBtn onLight>
        {paused
          ? <span style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `9px solid ${dt.primary}`, marginLeft: 2 }}></span>
          : <span style={{ display: 'flex', gap: 3 }}><span style={{ width: 3.5, height: 13, borderRadius: 2, background: dt.ink }}></span><span style={{ width: 3.5, height: 13, borderRadius: 2, background: dt.ink }}></span></span>}
      </IconBtn>
      <IconBtn><PencilGlyph c={dt.ink} /></IconBtn>
    </div>
  );
}

// —— top bar: logo + small deck picker icon + logout ————————————
function TopBar() {
  return (
    <div style={{ padding: '2px 20px 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LionFace size={27} {...dt.lion} />
        <span style={{ fontFamily: dt.fontDisplay, fontSize: 21, fontWeight: 700, color: dt.ink }}>LeoCards</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '0 9px', borderRadius: 10, border: '1.5px solid #EDDFC9', background: '#FFFFFF', boxSizing: 'border-box' }}>
          <LangChip code="ES" size={20} />
          <Chevron c={dt.muted} dir="down" size={8} />
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #EDDFC9', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><LogoutGlyph c={dt.ink} /></div>
      </div>
    </div>
  );
}

// —— large habitat hero ————————————————————————————————————————
function HabitatHero({ sleeping }) {
  return (
    <div style={{ background: 'linear-gradient(180deg, #FFF3DC 0%, #FFFFFF 70%)', border: dt.cardBorder, borderRadius: dt.cardRadius, boxShadow: '0 10px 26px rgba(160,110,40,0.12)', padding: '26px 22px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', flex: 'none' }}>
      <HabitatMedallion size={132} level={7} progress={sleeping ? 0 : 0.7} sleeping={sleeping} />
      <div style={{ fontFamily: dt.fontDisplay, fontSize: 26, fontWeight: 700, color: dt.ink, lineHeight: 1 }}>Habitat &middot; Level 7</div>
      <div style={{ fontSize: 14.5, color: dt.muted, lineHeight: 1.35 }}>
        {sleeping
          ? <span>Your lion is napping &middot; cards recharging</span>
          : <span><span style={{ color: dt.ink, fontWeight: 700 }}>14 of 20</span> cards to Level 8</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 700, color: dt.link, marginTop: 1 }}>
        View habitat <Chevron c={dt.link} dir="right" size={8} />
      </div>
    </div>
  );
}

// —— Option D action line ————————————————————————————————————
function StudyButton({ active }) {
  return (
    <div style={{ height: 58, borderRadius: dt.btnRadius, background: active ? dt.primary : '#F4E7D2', color: active ? '#FFFFFF' : '#B49B78', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: dt.fontDisplay, fontWeight: 700, fontSize: 21, boxShadow: active ? '0 10px 22px rgba(242,138,31,0.32)' : 'none' }}>
      Start studying
    </div>
  );
}

function StatusText({ state }) {
  if (state === 'cooldown') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 600, color: '#8A6235' }}>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <LionFace size={22} {...dt.lion} />
          <span style={{ position: 'absolute', right: -5, top: -4, fontFamily: dt.fontDisplay, fontWeight: 700, fontSize: 12, color: '#B4762A' }}>z</span>
        </span>
        Resting &middot; 2h 15m
      </span>
    );
  }
  if (state === 'paused') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 600, color: '#8A6235' }}>
        <span style={{ display: 'flex', gap: 3 }}><span style={{ width: 3.5, height: 13, borderRadius: 2, background: '#B49B78' }}></span><span style={{ width: 3.5, height: 13, borderRadius: 2, background: '#B49B78' }}></span></span>
        All paused
      </span>
    );
  }
  const count = state === 'none' ? 0 : 12;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700, color: count ? dt.ink : dt.muted }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: count ? dt.primary : 'transparent', border: count ? 'none' : `1.6px solid ${dt.muted}`, boxSizing: 'border-box' }}></span>
      {count} due
    </span>
  );
}

function ActionLine({ state }) {
  const active = state === 'due';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 'none' }}>
      <StudyButton active={active} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <StatusText state={state} />
        <div style={{ height: 40, padding: '0 15px', borderRadius: 12, border: '1.5px solid #EDDFC9', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' }}>
          <PlusGlyph c={dt.primary} />
          <span style={{ fontSize: 14.5, fontWeight: 700, color: dt.ink }}>Add a card</span>
        </div>
      </div>
    </div>
  );
}

// —— "Your words" inline accordion ————————————————————————————
function WordsAccordion({ open, state }) {
  const rows = state === 'paused' ? WORDS.map((w) => ({ ...w, paused: true })) : WORDS;
  return (
    <React.Fragment>
      <div style={{ flex: 'none', background: '#FFFFFF', border: dt.cardBorder, borderRadius: 16, padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: dt.fontDisplay, fontSize: 18, fontWeight: 700, color: dt.ink }}>Your words</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: dt.muted }}>14 learned</span>
          <Chevron c={dt.muted} dir={open ? 'up' : 'down'} size={9} />
        </div>
      </div>
      {open ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ height: 42, borderRadius: 12, background: dt.fieldBg, border: dt.fieldBorder, display: 'flex', alignItems: 'center', gap: 10, padding: '0 13px', boxSizing: 'border-box', flex: 'none' }}>
            <MagnifierGlyph c={dt.muted} />
            <span style={{ fontSize: 14.5, color: dt.muted }}>Search your words</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(180deg, #000 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 85%, transparent 100%)' }}>
            {rows.map((w, i) => <CardRow key={i} {...w} />)}
          </div>
        </div>
      ) : null}
    </React.Fragment>
  );
}

// —— screen composer ————————————————————————————————————————
function DashScreen({ state = 'due', wordsOpen = false, screenLabel }) {
  const sleeping = state === 'cooldown';
  return (
    <PhoneShell bg={dt.bg}>
      <div data-screen-label={screenLabel} style={{ display: 'flex', flexDirection: 'column', flex: 1, fontFamily: dt.fontBody, minHeight: 0 }}>
        <StatusBar ink={dt.ink} />
        <TopBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 18px', gap: 16, minHeight: 0 }}>
          <HabitatHero sleeping={sleeping} />
          <ActionLine state={state} />
          <WordsAccordion open={wordsOpen} state={state} />
        </div>
      </div>
    </PhoneShell>
  );
}

function DbDue() { return <DashScreen state="due" screenLabel="Daybreak — Dashboard, cards due" />; }
function DbNone() { return <DashScreen state="none" screenLabel="Daybreak — Dashboard, none due" />; }
function DbResting() { return <DashScreen state="cooldown" screenLabel="Daybreak — Dashboard, resting" />; }
function DbPaused() { return <DashScreen state="paused" screenLabel="Daybreak — Dashboard, all paused" />; }
function DbWordsOpen() { return <DashScreen state="due" wordsOpen screenLabel="Daybreak — Dashboard, words open" />; }

Object.assign(window, {
  dt, WORDS, LangChip, HabitatMedallion, Mastery, CardRow, SourceTag, IconBtn, Chevron,
  TopBar, HabitatHero, StudyButton, ActionLine, WordsAccordion, DashScreen,
  DbDue, DbNone, DbResting, DbPaused, DbWordsOpen,
});
