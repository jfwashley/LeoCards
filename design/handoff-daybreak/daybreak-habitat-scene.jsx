// Daybreak hi-fi — Habitat scene engine. Flat-geometric living world for Leo (a lion).
// Seated mood-driven Leo + cumulative scene elements by level + gentle ambient motion.
// Pass anim=false (reduced motion) to drop all animation classes.
const ht = window.d1Theme;

const SKY = {
  day: 'linear-gradient(180deg, #FFEAC0 0%, #FFF6E8 58%, #FBF0DB 100%)',
  gold: 'linear-gradient(180deg, #FFD08A 0%, #FFE3B6 46%, #FBD7BE 100%)',
  decay: 'linear-gradient(180deg, #E7E3D8 0%, #F0ECE2 100%)',
};
const PAL = {
  hillBack: '#CFE0A4', hillMid: '#ADCB79', hillFront: '#8FB85F',
  mound: '#EBCD93', dirt: '#DCB178', water: '#B6DEE8', waterShine: '#D8F0F5',
  trunk: '#B07B45', leaf: '#7FAE54', leaf2: '#9BC06C', rock: '#C7BBA8',
  ele: '#A9B9C9', ele2: '#94A6BA', cap: '#E0664B',
};
const A = (anim, cls) => (anim ? cls : undefined);

// ——— Seated Leo, mood-driven ———
function HabLeo({ size = 150, mood = 'happy', sleeping, anim = true }) {
  const u = (n) => (n / 100) * size, L = ht.lion;
  const eyeRow = u(40);
  const eye = (cx) => {
    if (sleeping) return <div style={{ position: 'absolute', left: u(cx), top: eyeRow + u(2), width: u(9), height: u(5), borderBottom: `${u(2)}px solid ${L.ink}`, borderRadius: '0 0 80% 80%' }}></div>;
    if (mood === 'sad') return <div style={{ position: 'absolute', left: u(cx), top: eyeRow, width: u(9), height: u(7), borderTop: `${u(2.2)}px solid ${L.ink}`, borderRadius: '70% 70% 0 0' }}></div>;
    const big = mood === 'excited';
    return (
      <div style={{ position: 'absolute', left: u(cx), top: eyeRow - (big ? u(1) : 0), width: u(big ? 9 : 7.5), height: u(big ? 10 : 8.5), background: L.ink, borderRadius: '50%' }}>
        <div style={{ position: 'absolute', right: u(0.6), top: u(0.8), width: u(2.6), height: u(2.6), background: '#FFF', borderRadius: '50%' }}></div>
      </div>
    );
  };
  const mouth = () => {
    if (sleeping) return null;
    if (mood === 'excited') return <div style={{ position: 'absolute', left: u(42), top: u(63), width: u(16), height: u(11), background: L.ink, borderRadius: '0 0 60% 60%' }}><div style={{ position: 'absolute', left: '28%', bottom: 0, width: '44%', height: '55%', background: ht.red, borderRadius: '50% 50% 60% 60%', opacity: 0.85 }}></div></div>;
    if (mood === 'neutral') return <div style={{ position: 'absolute', left: u(43.5), top: u(66), width: u(13), height: u(2), background: L.ink, borderRadius: 2 }}></div>;
    if (mood === 'sad') return <div style={{ position: 'absolute', left: u(43), top: u(68), width: u(14), height: u(7), borderTop: `${u(2)}px solid ${L.ink}`, borderRadius: '70% 70% 0 0' }}></div>;
    return <div style={{ position: 'absolute', left: u(42), top: u(64), width: u(16), height: u(8), borderBottom: `${u(2.2)}px solid ${L.ink}`, borderRadius: '0 0 70% 70%' }}></div>;
  };
  const blush = mood === 'happy' || mood === 'excited';
  return (
    <div style={{ width: size, height: size * 1.12, position: 'relative', flex: 'none' }}>
      {/* shadow */}
      <div style={{ position: 'absolute', left: '50%', bottom: u(-4), transform: 'translateX(-50%)', width: u(86), height: u(13), background: 'rgba(90,60,25,0.16)', borderRadius: '50%' }}></div>
      {/* tail */}
      <div className={A(anim, 'hab-sway')} style={{ position: 'absolute', right: u(2), bottom: u(20), width: u(30), height: u(34), borderTop: `${u(5)}px solid ${L.mane}`, borderRight: `${u(5)}px solid ${L.mane}`, borderRadius: '0 80% 0 0', transformOrigin: 'bottom left' }}>
        <div style={{ position: 'absolute', right: u(-4), top: u(-3), width: u(10), height: u(10), background: L.ink, borderRadius: '50%' }}></div>
      </div>
      {/* breathing group: chest + paws + head */}
      <div className={A(anim, 'hab-breathe')} style={{ position: 'absolute', inset: 0, transformOrigin: '50% 80%' }}>
        {/* chest */}
        <div style={{ position: 'absolute', left: '50%', bottom: u(2), transform: 'translateX(-50%)', width: u(74), height: u(56), background: `linear-gradient(180deg, ${L.mane}, #DB8730)`, borderRadius: '46% 46% 40% 40%' }}></div>
        <div style={{ position: 'absolute', left: '50%', bottom: u(2), transform: 'translateX(-50%)', width: u(44), height: u(40), background: L.muzzle, borderRadius: '50% 50% 45% 45%', opacity: 0.92 }}></div>
        {/* paws */}
        <div style={{ position: 'absolute', left: u(28), bottom: 0, width: u(22), height: u(17), background: L.face, borderRadius: '40% 40% 45% 45%' }}><Toes u={u} L={L} /></div>
        <div style={{ position: 'absolute', right: u(28), bottom: 0, width: u(22), height: u(17), background: L.face, borderRadius: '40% 40% 45% 45%' }}><Toes u={u} L={L} /></div>
        {/* head */}
        <div style={{ position: 'absolute', left: '50%', top: u(2), transform: 'translateX(-50%)', width: u(82), height: u(82) }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 42%, ${L.mane} 56%, #E8973B 57%)`, borderRadius: '50%', boxShadow: `inset 0 0 0 ${u(2)}px rgba(255,255,255,0.18)` }}></div>
          {/* mane tufts */}
          {Array.from({ length: 12 }).map((_, i) => {
            const ang = (i / 12) * 360, r = u(40);
            return <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: u(15), height: u(15), background: L.mane, borderRadius: '50%', transform: `rotate(${ang}deg) translate(0, ${-r}px)`, transformOrigin: 'center' }}></div>;
          })}
          {/* face */}
          <div style={{ position: 'absolute', left: '14%', top: '12%', width: '72%', height: '76%', background: `linear-gradient(180deg, ${L.face}, #FFCF94)`, borderRadius: '50% 50% 48% 48%' }}></div>
          {/* ears */}
          <div style={{ position: 'absolute', left: '8%', top: '6%', width: u(20), height: u(20), background: L.face, borderRadius: '50%' }}><div style={{ position: 'absolute', inset: '28%', background: L.muzzle, borderRadius: '50%' }}></div></div>
          <div style={{ position: 'absolute', right: '8%', top: '6%', width: u(20), height: u(20), background: L.face, borderRadius: '50%' }}><div style={{ position: 'absolute', inset: '28%', background: L.muzzle, borderRadius: '50%' }}></div></div>
          {/* features */}
          {eye(33)}{eye(58)}
          {blush ? <React.Fragment><div style={{ position: 'absolute', left: u(24), top: u(54), width: u(11), height: u(7), background: ht.primary, opacity: 0.2, borderRadius: '50%' }}></div><div style={{ position: 'absolute', right: u(24), top: u(54), width: u(11), height: u(7), background: ht.primary, opacity: 0.2, borderRadius: '50%' }}></div></React.Fragment> : null}
          {/* muzzle + nose */}
          <div style={{ position: 'absolute', left: '50%', top: u(52), transform: 'translateX(-50%)', width: u(34), height: u(24), background: L.muzzle, borderRadius: '46% 46% 50% 50%' }}></div>
          <div style={{ position: 'absolute', left: '50%', top: u(52), transform: 'translateX(-50%)', width: u(9), height: u(7), background: L.ink, borderRadius: '40% 40% 60% 60%' }}></div>
          {mouth()}
          {sleeping ? <div style={{ position: 'absolute', right: u(-6), top: u(-6), fontFamily: ht.fontDisplay, fontWeight: 700, fontSize: u(20), color: '#B4762A' }}>z</div> : null}
          {mood === 'excited' && !sleeping ? <div style={{ position: 'absolute', right: u(-10), top: u(-4), fontSize: u(16), color: '#F2B33A' }}>&#10022;</div> : null}
        </div>
      </div>
    </div>
  );
}
function Toes({ u, L }) {
  return <React.Fragment>
    <div style={{ position: 'absolute', bottom: u(2), left: '22%', width: u(2.4), height: u(6), background: 'rgba(90,60,25,0.25)', borderRadius: 2 }}></div>
    <div style={{ position: 'absolute', bottom: u(2), left: '47%', width: u(2.4), height: u(6), background: 'rgba(90,60,25,0.25)', borderRadius: 2 }}></div>
    <div style={{ position: 'absolute', bottom: u(2), left: '72%', width: u(2.4), height: u(6), background: 'rgba(90,60,25,0.25)', borderRadius: 2 }}></div>
  </React.Fragment>;
}

// ——— scene element atoms ———
const Abs = ({ s, cls, children }) => <div className={cls} style={{ position: 'absolute', ...s }}>{children}</div>;

function Sun({ golden, anim }) {
  return (
    <Abs cls={A(anim, 'hab-glow')} s={{ right: golden ? '20%' : '14%', top: golden ? '20%' : '9%', width: golden ? 92 : 60, height: golden ? 92 : 60, borderRadius: '50%', background: golden ? 'radial-gradient(circle, #FFD15E, #FFC04A)' : 'radial-gradient(circle, #FFE08A, #FFD062)', boxShadow: golden ? '0 0 0 22px rgba(255,193,74,0.22), 0 0 60px 20px rgba(255,193,74,0.35)' : '0 0 0 14px rgba(255,208,98,0.20)' }} />
  );
}
function Cloud({ s, anim }) {
  return (
    <Abs cls={A(anim, 'hab-drift')} s={{ ...s, opacity: 0.9 }}>
      <div style={{ position: 'relative', width: 70, height: 22 }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 16, background: '#FFFDF8', borderRadius: 12 }}></div>
        <div style={{ position: 'absolute', bottom: 6, left: 14, width: 26, height: 26, background: '#FFFDF8', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: 4, left: 34, width: 20, height: 20, background: '#FFFDF8', borderRadius: '50%' }}></div>
      </div>
    </Abs>
  );
}
function Hills() {
  return <React.Fragment>
    <Abs s={{ left: '-14%', bottom: '20%', width: '70%', height: 150, background: PAL.hillBack, borderRadius: '50%' }} />
    <Abs s={{ right: '-16%', bottom: '21%', width: '74%', height: 140, background: PAL.hillBack, borderRadius: '50%' }} />
    <Abs s={{ left: '-10%', bottom: '12%', width: '120%', height: 150, background: PAL.hillMid, borderRadius: '50% 50% 0 0' }} />
    <Abs s={{ left: '-12%', bottom: 0, width: '124%', height: 150, background: PAL.hillFront, borderRadius: '50% 50% 0 0' }} />
    <Abs s={{ left: '50%', bottom: 0, transform: 'translateX(-50%)', width: 210, height: 80, background: PAL.mound, borderRadius: '50% 50% 0 0' }} />
  </React.Fragment>;
}
function Lake({ anim }) {
  return (
    <Abs s={{ left: '8%', bottom: '15%', width: '40%', height: 56 }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${PAL.waterShine}, ${PAL.water})`, borderRadius: '50%' }}></div>
      <Abs cls={A(anim, 'hab-shimmer')} s={{ left: '20%', top: '34%', width: 26, height: 5, background: '#FFFFFF', opacity: 0.6, borderRadius: 4 }} />
      <Abs cls={A(anim, 'hab-shimmer2')} s={{ left: '52%', top: '56%', width: 18, height: 4, background: '#FFFFFF', opacity: 0.5, borderRadius: 4 }} />
      <Abs s={{ left: '30%', top: '40%', width: 16, height: 9, background: PAL.leaf2, borderRadius: '50%' }} />
      <Abs s={{ left: '58%', top: '30%', width: 13, height: 7, background: PAL.leaf, borderRadius: '50%' }}><div style={{ position: 'absolute', left: '40%', top: '-30%', width: 4, height: 4, borderRadius: '50%', background: ht.primary }}></div></Abs>
    </Abs>
  );
}
function Tree({ s, scale = 1, anim }) {
  return (
    <Abs s={s}>
      <div style={{ position: 'relative', width: 50 * scale, height: 78 * scale }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 9 * scale, height: 34 * scale, background: PAL.trunk, borderRadius: 4 }}></div>
        <div className={A(anim, 'hab-sway')} style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', transformOrigin: 'bottom center' }}>
          <div style={{ position: 'absolute', left: -22 * scale, top: 8 * scale, width: 30 * scale, height: 30 * scale, background: PAL.leaf, borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', left: 0 * scale, top: 8 * scale, width: 30 * scale, height: 30 * scale, background: PAL.leaf, borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', left: -12 * scale, top: -6 * scale, width: 36 * scale, height: 36 * scale, background: PAL.leaf2, borderRadius: '50%' }}></div>
        </div>
      </div>
    </Abs>
  );
}
function Rock({ s }) {
  return <Abs s={s}><div style={{ width: 34, height: 22, background: PAL.rock, borderRadius: '60% 60% 40% 40%' }}><div style={{ position: 'absolute', left: '18%', top: '20%', width: '40%', height: '30%', background: '#fff', opacity: 0.3, borderRadius: '50%' }}></div></div></Abs>;
}
function Flower({ s, c = ht.primary, anim }) {
  return (
    <Abs cls={A(anim, 'hab-sway')} s={{ ...s, transformOrigin: 'bottom center' }}>
      <div style={{ position: 'relative', width: 16, height: 24 }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 16, background: PAL.leaf }}></div>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: c }}><div style={{ position: 'absolute', inset: '32%', background: '#FFF3D8', borderRadius: '50%' }}></div></div>
      </div>
    </Abs>
  );
}
function Grass({ s }) {
  return <Abs s={s}><div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>{[10, 16, 12].map((h, i) => <div key={i} style={{ width: 3, height: h, background: PAL.leaf, borderRadius: 3, transform: `rotate(${i * 7 - 7}deg)` }}></div>)}</div></Abs>;
}
function Butterfly({ s, anim }) {
  return (
    <Abs cls={A(anim, 'hab-float')} s={s}>
      <div style={{ position: 'relative', width: 18, height: 14 }}>
        <div className={A(anim, 'hab-flap')} style={{ position: 'absolute', left: 0, top: 0, width: 8, height: 13, background: ht.primary, borderRadius: '70% 0 70% 0', transformOrigin: 'right center' }}></div>
        <div className={A(anim, 'hab-flap')} style={{ position: 'absolute', right: 0, top: 0, width: 8, height: 13, background: '#F2B33A', borderRadius: '0 70% 0 70%', transformOrigin: 'left center' }}></div>
        <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 2, height: 13, background: ht.ink, borderRadius: 2 }}></div>
      </div>
    </Abs>
  );
}
function Elephant({ anim }) {
  return (
    <Abs cls={A(anim, 'hab-breathe')} s={{ right: '11%', bottom: '15%', transformOrigin: '50% 100%' }}>
      <div style={{ position: 'relative', width: 76, height: 60 }}>
        <div style={{ position: 'absolute', left: 16, bottom: 6, width: 14, height: 18, background: PAL.ele2, borderRadius: 5 }}></div>
        <div style={{ position: 'absolute', right: 16, bottom: 6, width: 14, height: 18, background: PAL.ele2, borderRadius: 5 }}></div>
        <div style={{ position: 'absolute', left: 8, top: 10, width: 56, height: 42, background: PAL.ele, borderRadius: '46% 46% 40% 40%' }}></div>
        <div style={{ position: 'absolute', left: -2, top: 14, width: 34, height: 34, background: PAL.ele, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', left: -8, top: 18, width: 20, height: 24, background: PAL.ele2, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', left: -2, top: 36, width: 12, height: 26, background: PAL.ele, borderRadius: '0 0 0 60%', transform: 'rotate(8deg)' }}></div>
        <div style={{ position: 'absolute', left: 12, top: 24, width: 6, height: 6, background: ht.ink, borderRadius: '50%' }}></div>
      </div>
    </Abs>
  );
}
function Mushroom({ s }) {
  return <Abs s={s}><div style={{ position: 'relative', width: 18, height: 20 }}><div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 7, height: 12, background: '#FBEBD2', borderRadius: '0 0 4px 4px' }}></div><div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 18, height: 11, background: PAL.cap, borderRadius: '60% 60% 30% 30%' }}><div style={{ position: 'absolute', left: '20%', top: '30%', width: 3, height: 3, background: '#fff', borderRadius: '50%' }}></div><div style={{ position: 'absolute', right: '24%', top: '45%', width: 2.5, height: 2.5, background: '#fff', borderRadius: '50%' }}></div></div></div></Abs>;
}
function Cave({ s }) {
  return <Abs s={s}><div style={{ position: 'relative', width: 64, height: 50 }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#B7A98F,#9C8E76)', borderRadius: '50% 50% 14% 14%' }}></div><div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: 32, height: 30, background: '#3B3128', borderRadius: '50% 50% 0 0', opacity: 0.85 }}></div></div></Abs>;
}
function Toy({ s, anim }) {
  return <Abs s={s}><div style={{ width: 22, height: 22, borderRadius: '50%', background: 'conic-gradient(#fff 0 25%, ' + ht.primary + ' 0 50%, #fff 0 75%, ' + ht.primary + ' 0)', border: '1.5px solid rgba(90,60,25,0.2)' }}></div></Abs>;
}
function Bird({ s, anim }) {
  return <Abs cls={A(anim, 'hab-float')} s={s}><div style={{ position: 'relative', width: 22, height: 12 }}><div style={{ position: 'absolute', left: 0, top: 2, width: 12, height: 8, borderTop: `2.4px solid #6B4A8A`, borderRadius: '50% 50% 0 0', transform: 'rotate(-12deg)' }}></div><div style={{ position: 'absolute', right: 0, top: 2, width: 12, height: 8, borderTop: `2.4px solid #6B4A8A`, borderRadius: '50% 50% 0 0', transform: 'rotate(12deg)' }}></div></div></Abs>;
}

// ——— composer ———
function HabScene({ level = 5, mood = 'happy', decay, golden, reduced }) {
  const anim = !reduced;
  golden = golden ?? (level >= 9 && !decay);
  const sky = decay ? SKY.decay : (golden ? SKY.gold : SKY.day);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: sky }}>
      <div style={{ position: 'absolute', inset: 0, filter: decay ? 'saturate(0.5) brightness(0.99)' : 'none', transition: 'filter .4s' }}>
        <Sun golden={golden} anim={anim} />
        <Cloud s={{ left: '10%', top: '12%' }} anim={anim} />
        <Cloud s={{ left: '58%', top: '20%', transform: 'scale(0.8)' }} anim={anim} />
        {level >= 9 && !decay ? <React.Fragment><Bird s={{ left: '24%', top: '15%' }} anim={anim} /><Bird s={{ left: '62%', top: '11%', transform: 'scale(0.8)' }} anim={anim} /></React.Fragment> : null}
        <Hills />
        {level >= 2 ? <Lake anim={anim} /> : null}
        {level >= 3 ? <React.Fragment><Tree s={{ left: '4%', bottom: '24%' }} anim={anim} /><Tree s={{ right: '6%', bottom: '27%' }} scale={0.82} anim={anim} /><Rock s={{ left: '60%', bottom: '15%' }} /></React.Fragment> : null}
        {level >= 4 ? <React.Fragment>
          <Flower s={{ left: '26%', bottom: '13%' }} c={ht.primary} anim={anim} />
          <Flower s={{ left: '36%', bottom: '11%' }} c={ht.red} anim={anim} />
          <Flower s={{ left: '70%', bottom: '12%' }} c="#E0A23A" anim={anim} />
          <Grass s={{ left: '18%', bottom: '12%' }} /><Grass s={{ right: '24%', bottom: '13%' }} />
          <Butterfly s={{ left: '30%', top: '40%' }} anim={anim} />
        </React.Fragment> : null}
        {level >= 5 ? <Elephant anim={anim} /> : null}
        {level >= 6 ? <React.Fragment><Mushroom s={{ left: '22%', bottom: '14%' }} /><Mushroom s={{ left: '50%', bottom: '12%', transform: 'scale(0.85)' }} /></React.Fragment> : null}
        {level >= 7 ? <Cave s={{ left: '3%', bottom: '23%' }} /> : null}
        {level >= 8 ? <Toy s={{ left: '44%', bottom: '12%' }} anim={anim} /> : null}
        {/* Leo */}
        <div style={{ position: 'absolute', left: '50%', bottom: '11%', transform: 'translateX(-50%)' }}>
          <HabLeo size={150} mood={mood} anim={anim} />
        </div>
        {golden ? <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 72% 26%, rgba(255,200,110,0.28), transparent 55%)', pointerEvents: 'none' }}></div> : null}
        {decay ? <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(120,120,130,0.06), rgba(120,120,130,0.12))', pointerEvents: 'none' }}></div> : null}
      </div>
    </div>
  );
}

Object.assign(window, { ht, SKY, PAL, HabLeo, HabScene });
