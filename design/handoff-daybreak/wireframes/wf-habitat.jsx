// Habitat page wireframes — the living world for Leo (a lion). Flat-geometric,
// sketch-grade. Scene elements stack cumulatively by level (L1 sparse -> L9 lush);
// mood drives Leo's expression + ambient cues. Sketch primitives from wf-shared.jsx.

// absolute-positioned scene element
function El({ style, children }) { return <div style={{ position: 'absolute', ...style }}>{children}</div>; }

// —— Leo, mood-driven (happy / excited / neutral / sad / sleeping) ——
function WLeo({ size = 72, mood = 'happy', sleeping }) {
  const s = size, u = (n) => (n / 100) * s;
  const eye = (left) => {
    if (sleeping) return <El style={{ left: u(left), top: u(46), width: u(11), height: u(5), borderBottom: `2px solid ${INK}`, borderRadius: '0 0 60% 60%' }} />;
    if (mood === 'sad') return <El style={{ left: u(left), top: u(44), width: u(8), height: u(8) }}><div style={{ width: '100%', height: '100%', borderTop: `2px solid ${INK}`, borderRadius: '60% 60% 0 0' }}></div></El>;
    const big = mood === 'excited';
    return <El style={{ left: u(left + 1), top: u(44), width: u(big ? 8 : 6), height: u(big ? 8 : 6), background: INK, borderRadius: '50%' }} />;
  };
  const mouth = () => {
    if (sleeping) return null;
    if (mood === 'sad') return <El style={{ left: u(42), top: u(64), width: u(16), height: u(8), borderTop: `2px solid ${INK}`, borderRadius: '60% 60% 0 0' }} />;
    if (mood === 'neutral') return <El style={{ left: u(42), top: u(66), width: u(16), height: 0, borderTop: `2px solid ${INK}` }} />;
    if (mood === 'excited') return <El style={{ left: u(40), top: u(62), width: u(20), height: u(12), border: `2px solid ${INK}`, borderTop: 'none', borderRadius: '0 0 70% 70%', background: ACCENT }} />;
    return <El style={{ left: u(41), top: u(62), width: u(18), height: u(9), borderBottom: `2px solid ${INK}`, borderRadius: '0 0 70% 70%' }} />; // happy
  };
  return (
    <div style={{ width: s, height: s, position: 'relative', flex: 'none' }}>
      <El style={{ inset: 0, border: `2px dashed ${ACCENT_INK}`, borderRadius: '50% 48% 52% 50%' }} />
      <El style={{ left: u(15), top: u(15), width: u(70), height: u(70), border: `1.8px solid ${INK}`, borderRadius: '48% 52% 50% 50%', background: PAPER }} />
      <El style={{ left: u(13), top: u(7), width: u(17), height: u(17), border: `1.8px solid ${INK}`, borderRadius: '50%', background: PAPER }} />
      <El style={{ right: u(13), top: u(7), width: u(17), height: u(17), border: `1.8px solid ${INK}`, borderRadius: '50%', background: PAPER }} />
      {eye(33)}{eye(56)}
      <El style={{ left: u(46), top: u(56), width: u(8), height: u(6), background: INK, borderRadius: '0 0 50% 50%' }} />
      {mouth()}
      {sleeping ? <El style={{ right: u(-6), top: u(-4), fontFamily: "'Caveat', cursive", fontSize: u(22), color: ACCENT_INK }}>z<sup>z</sup></El> : null}
      {mood === 'excited' && !sleeping ? <El style={{ right: u(-10), top: u(2), fontSize: u(18), color: ACCENT_INK }}>&#10022;</El> : null}
    </div>
  );
}

// —— scene props (each positioned absolutely; faded when decayed) ——
const fade = (decay, base = 1) => ({ opacity: decay ? 0.32 : base, filter: decay ? 'grayscale(0.4)' : 'none' });

function WSun({ night, golden }) {
  if (night) return <El style={{ right: '16%', top: '9%', width: 30, height: 30, border: `2px solid ${INK}`, borderRadius: '50%', boxShadow: `inset -8px 2px 0 ${PAPER}` }} />;
  return <El style={{ right: '14%', top: '8%', width: golden ? 46 : 34, height: golden ? 46 : 34, borderRadius: '50%', border: `2px solid ${ACCENT_INK}`, background: golden ? ACCENT : 'transparent', boxShadow: golden ? '0 0 0 10px rgba(242,163,60,0.18)' : 'none' }} />;
}
function WGround() {
  return <El style={{ left: '-6%', right: '-6%', bottom: 0, height: '42%', borderTop: `2px solid ${INK}`, borderRadius: '50% 50% 0 0 / 30% 30% 0 0', background: 'rgba(47,42,38,0.04)' }} />;
}
function WLake({ decay }) {
  return <El style={{ left: '10%', bottom: '13%', width: '34%', height: '13%', border: `1.8px solid ${INK}`, borderRadius: '50%', background: decay ? 'transparent' : 'rgba(242,163,60,0.1)', ...fade(decay) }}>
    <div style={{ position: 'absolute', left: '24%', top: '36%', width: 7, height: 4, borderRadius: '50%', border: `1.4px solid ${INK}` }}></div>
    <div style={{ position: 'absolute', left: '56%', top: '52%', width: 7, height: 4, borderRadius: '50%', border: `1.4px solid ${INK}` }}></div>
  </El>;
}
function WTree({ x, decay, scale = 1 }) {
  return <El style={{ left: x, bottom: '26%', ...fade(decay) }}>
    <div style={{ width: 7 * scale, height: 26 * scale, background: 'rgba(47,42,38,0.5)', borderRadius: 3, margin: '0 auto' }}></div>
    <div style={{ position: 'absolute', left: '50%', top: -10 * scale, transform: 'translateX(-50%)', width: 34 * scale, height: 30 * scale, border: `1.8px solid ${INK}`, borderRadius: '50% 50% 46% 46%', background: PAPER }}></div>
  </El>;
}
function WRock({ x, decay }) {
  return <El style={{ left: x, bottom: '12%', width: 26, height: 16, border: `1.8px solid ${INK}`, borderRadius: '60% 60% 30% 30%', background: PAPER, ...fade(decay) }} />;
}
function WFlower({ x, b, decay }) {
  return <El style={{ left: x, bottom: b, ...fade(decay) }}>
    <div style={{ width: 1.6, height: 12, background: GREEN, margin: '0 auto' }}></div>
    <div style={{ position: 'absolute', left: '50%', top: -3, transform: 'translateX(-50%)', width: 9, height: 9, borderRadius: '50%', border: `1.6px solid ${ACCENT_INK}`, background: ACCENT }}></div>
  </El>;
}
function WGrass({ x, decay }) {
  return <El style={{ left: x, bottom: '11%', display: 'flex', gap: 2, alignItems: 'flex-end', ...fade(decay) }}>
    {[7, 11, 8].map((h, i) => <div key={i} style={{ width: 1.6, height: h, background: GREEN, borderRadius: 2, transform: `rotate(${i * 6 - 6}deg)` }}></div>)}
  </El>;
}
function WButterfly({ x, y, decay }) {
  return <El style={{ left: x, top: y, ...fade(decay) }}>
    <div style={{ display: 'flex' }}><div style={{ width: 7, height: 9, border: `1.4px solid ${ACCENT_INK}`, borderRadius: '60% 0 60% 0' }}></div><div style={{ width: 7, height: 9, border: `1.4px solid ${ACCENT_INK}`, borderRadius: '0 60% 0 60%' }}></div></div>
  </El>;
}
function WElephant({ decay }) {
  return <El style={{ right: '12%', bottom: '13%', ...fade(decay) }}>
    <div style={{ position: 'relative', width: 52, height: 38 }}>
      <div style={{ position: 'absolute', left: 4, top: 6, width: 40, height: 30, border: `1.8px solid ${INK}`, borderRadius: '50% 50% 40% 40%', background: 'rgba(47,42,38,0.06)' }}></div>
      <div style={{ position: 'absolute', left: 0, top: 10, width: 14, height: 14, border: `1.8px solid ${INK}`, borderRadius: '50%', background: PAPER }}></div>
      <div style={{ position: 'absolute', left: -4, top: 18, width: 10, height: 16, borderLeft: `1.8px solid ${INK}`, borderBottom: `1.8px solid ${INK}`, borderRadius: '0 0 0 60%' }}></div>
      <div style={{ position: 'absolute', left: 10, bottom: 0, width: 6, height: 8, background: 'rgba(47,42,38,0.3)', borderRadius: 2 }}></div>
      <div style={{ position: 'absolute', right: 12, bottom: 0, width: 6, height: 8, background: 'rgba(47,42,38,0.3)', borderRadius: 2 }}></div>
    </div>
  </El>;
}
function WMushroom({ x, decay }) {
  return <El style={{ left: x, bottom: '12%', ...fade(decay) }}>
    <div style={{ width: 6, height: 11, background: PAPER, border: `1.4px solid ${INK}`, borderTop: 'none', margin: '0 auto' }}></div>
    <div style={{ position: 'absolute', left: '50%', top: -6, transform: 'translateX(-50%)', width: 16, height: 9, background: ACCENT, border: `1.5px solid ${ACCENT_INK}`, borderRadius: '60% 60% 20% 20%' }}></div>
  </El>;
}
function WCave({ decay }) {
  return <El style={{ left: '5%', bottom: '24%', width: 48, height: 40, ...fade(decay) }}>
    <div style={{ width: '100%', height: '100%', border: `1.8px solid ${INK}`, borderRadius: '50% 50% 20% 20%', background: 'rgba(47,42,38,0.08)' }}></div>
    <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: 24, height: 22, background: INK, borderRadius: '50% 50% 0 0', opacity: 0.55 }}></div>
  </El>;
}
function WToy({ x, decay }) {
  return <El style={{ left: x, bottom: '12%', width: 16, height: 16, borderRadius: '50%', border: `1.6px solid ${INK}`, background: PAPER, ...fade(decay) }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', borderTop: `1.6px solid ${ACCENT_INK}`, transform: 'rotate(35deg)' }}></div>
  </El>;
}
function WBird({ x, y }) {
  return <El style={{ left: x, top: y, fontFamily: "'Patrick Hand', cursive", color: INK, fontSize: 14, lineHeight: 1 }}>&#8995;</El>;
}

// —— the composed scene ——
function WHabScene({ level = 1, mood = 'happy', decay, night, reduced }) {
  const golden = level >= 9 && !decay;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: golden ? 'rgba(242,163,60,0.06)' : 'transparent' }}>
      <WSun night={night} golden={golden} />
      {level >= 9 ? <React.Fragment><WBird x="26%" y="15%" /><WBird x="58%" y="11%" /></React.Fragment> : null}
      <WGround />
      {level >= 2 ? <WLake decay={decay} /> : null}
      {level >= 3 ? <React.Fragment><WTree x="8%" decay={decay} /><WTree x="80%" decay={decay} scale={0.85} /></React.Fragment> : null}
      {level >= 3 ? <WRock x="64%" decay={decay} /> : null}
      {level >= 4 ? <React.Fragment><WFlower x="30%" b="11%" decay={decay} /><WFlower x="40%" b="13%" decay={decay} /><WGrass x="20%" decay={decay} /><WButterfly x="32%" y="34%" decay={decay} /></React.Fragment> : null}
      {level >= 5 ? <WElephant decay={decay} /> : null}
      {level >= 6 ? <React.Fragment><WMushroom x="24%" decay={decay} /><WMushroom x="71%" decay={decay} /></React.Fragment> : null}
      {level >= 7 ? <WCave decay={decay} /> : null}
      {level >= 8 ? <WToy x="44%" decay={decay} /> : null}
      {/* Leo */}
      <El style={{ left: '50%', bottom: '15%', transform: 'translateX(-50%)' }}>
        <WLeo size={76} mood={mood} sleeping={night} />
      </El>
      {reduced ? <El style={{ left: '50%', bottom: '6%', transform: 'translateX(-50%)', fontSize: 12, color: FAINT, whiteSpace: 'nowrap' }}>&#9208; motion paused</El> : null}
    </div>
  );
}

// —— overlays ——
function WBack() {
  return <SBox i={1} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: PAPER }}>&lsaquo;</SBox>;
}
function WMoodChip({ mood = 'happy' }) {
  const label = { excited: 'Excited', happy: 'Happy', neutral: 'Neutral', sad: 'Sad' }[mood];
  return (
    <SBox i={2} style={{ height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, background: PAPER }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: mood === 'sad' || mood === 'neutral' ? 'transparent' : ACCENT, border: `1.5px solid ${ACCENT_INK}` }}></span>
      {label}
    </SBox>
  );
}
function WLevelBadge({ level, ring }) {
  return (
    <div style={{ position: 'relative', width: ring ? 58 : 44, height: ring ? 58 : 44 }}>
      {ring ? <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid rgba(47,42,38,0.15)`, borderTopColor: ACCENT_INK, borderRightColor: ACCENT_INK, transform: 'rotate(20deg)' }}></div> : null}
      <SBox i={1} style={{ position: 'absolute', inset: ring ? 8 : 0, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: ACCENT, lineHeight: 1 }}>
        <span style={{ fontSize: 9, marginBottom: -1 }}>LVL</span>
        <span style={{ fontSize: 18 }}>{level}</span>
      </SBox>
    </div>
  );
}

Object.assign(window, {
  El, WLeo, WSun, WGround, WLake, WTree, WRock, WFlower, WGrass, WButterfly,
  WElephant, WMushroom, WCave, WToy, WBird, WHabScene, WBack, WMoodChip, WLevelBadge,
});
