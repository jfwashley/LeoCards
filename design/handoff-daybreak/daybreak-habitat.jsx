// Daybreak hi-fi — Habitat overlays, progress card, celebration, and screen boards.
// Scene engine from daybreak-habitat-scene.jsx.

const H_NEXT = {
  1: { at: 2, what: 'a lake & lily pads' }, 2: { at: 3, what: 'trees & rocks' },
  3: { at: 4, what: 'flowers & butterflies' }, 4: { at: 5, what: 'an elephant friend' },
  5: { at: 6, what: 'mushrooms' }, 6: { at: 7, what: 'a cave & nights' },
  7: { at: 8, what: 'toys to play with' }, 8: { at: 9, what: 'songbirds & golden light' },
};
const H_NAME = { 1: 'Bare mound', 2: 'Lakeside', 3: 'Woodland', 4: 'Meadow', 5: 'Savanna', 6: 'Glade', 7: 'Den', 8: 'Playground', 9: 'Golden hour' };
const MOOD = {
  excited: { label: 'Excited', c: '#F2B33A' }, happy: { label: 'Happy', c: ht.green },
  neutral: { label: 'Neutral', c: '#B7A98F' }, sad: { label: 'Sad', c: '#7C93B0' },
};

function HBack() {
  return <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(120,80,30,0.16)', flex: 'none' }}>
    <span style={{ width: 9, height: 9, borderLeft: `2.4px solid ${ht.ink}`, borderBottom: `2.4px solid ${ht.ink}`, transform: 'rotate(45deg)', marginLeft: 3, display: 'inline-block' }}></span>
  </div>;
}
function HMoodChip({ mood }) {
  const m = MOOD[mood];
  return (
    <div style={{ height: 36, padding: '0 13px 0 11px', borderRadius: 999, background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 3px 10px rgba(120,80,30,0.14)', flex: 'none' }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: m.c, boxShadow: `0 0 0 3px ${m.c}33` }}></span>
      <span style={{ fontSize: 14, fontWeight: 700, color: ht.ink }}>{m.label}</span>
    </div>
  );
}
function HLevelBadge({ level }) {
  return (
    <div style={{ width: 46, height: 46, borderRadius: '50%', background: level >= 9 ? '#F2B33A' : ht.primary, border: '3px solid rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF', lineHeight: 1, boxShadow: '0 4px 12px rgba(242,138,31,0.32)', flex: 'none' }}>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, opacity: 0.9 }}>LVL</span>
      <span style={{ fontFamily: ht.fontDisplay, fontSize: 19, fontWeight: 700, marginTop: -1 }}>{level}</span>
    </div>
  );
}

function HTop({ mood, level }) {
  return (
    <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 18px 0', flex: 'none' }}>
      <HBack />
      <HMoodChip mood={mood} />
      <HLevelBadge level={level} />
    </div>
  );
}

// locked progress option 1 — bottom card
function HProgCard({ level, pct }) {
  const nx = H_NEXT[level];
  return (
    <div style={{ position: 'relative', zIndex: 3, margin: '0 16px 18px', padding: '15px 17px', borderRadius: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', boxShadow: '0 10px 28px rgba(120,80,30,0.18)', border: '1px solid rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: 11, flex: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: ht.fontDisplay, fontSize: 18, fontWeight: 700, color: ht.ink, whiteSpace: 'nowrap' }}>Level {level} &middot; {H_NAME[level]}</span>
        {nx ? <span style={{ fontSize: 13, fontWeight: 700, color: ht.muted, flex: 'none' }}>{pct}% to L{level + 1}</span> : null}
      </div>
      {nx ? (
        <React.Fragment>
          <div style={{ height: 12, borderRadius: 7, background: '#F1E6D2', overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${ht.primary}, #F2B33A)` }}></div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: '#FFF1DC', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ width: 9, height: 9, border: `2px solid ${ht.primary}`, borderRadius: '50%' }}></span></span>
            <span style={{ fontSize: 14, color: ht.ink }}>Next at L{nx.at}: <span style={{ fontWeight: 700, color: ht.link }}>{nx.what}</span></span>
          </div>
        </React.Fragment>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: ht.ink }}>
          <span style={{ fontSize: 17 }}>&#10024;</span> Course 1 complete &mdash; you grew the whole world.
        </div>
      )}
    </div>
  );
}

function HShell({ label, children }) {
  return (
    <PhoneShell bg={ht.bg}>
      <div data-screen-label={label} style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, fontFamily: ht.fontBody, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </PhoneShell>
  );
}

// ——— arc + normal boards ———
function HabScreen({ level, mood, pct, decay, reduced, label, welcome }) {
  return (
    <HShell label={label}>
      <HabScene level={level} mood={mood} decay={decay} reduced={reduced} />
      <StatusBar ink={ht.ink} />
      <HTop mood={mood} level={level} />
      <div style={{ flex: 1 }}></div>
      {welcome ? <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', fontSize: 15, fontWeight: 600, color: ht.ink, padding: '0 28px 10px', textShadow: '0 1px 8px rgba(255,247,233,0.9)' }}>{welcome}</div> : null}
      {reduced ? <div style={{ position: 'relative', zIndex: 3, alignSelf: 'center', marginBottom: 10, fontSize: 12, fontWeight: 600, color: ht.muted, background: 'rgba(255,255,255,0.8)', padding: '5px 12px', borderRadius: 999 }}>&#9208; Motion paused</div> : null}
      <HProgCard level={level} pct={pct} />
    </HShell>
  );
}

function HabNew() { return <HabScreen level={1} mood="excited" pct={15} welcome="Study cards to grow Leo\u2019s world." label="Daybreak — Habitat, new user L1" />; }
function HabMid() { return <HabScreen level={5} mood="happy" pct={62} label="Daybreak — Habitat, mid L5 (default)" />; }
function HabLush() { return <HabScreen level={9} mood="happy" pct={100} label="Daybreak — Habitat, lush L9" />; }
function HabReduced() { return <HabScreen level={5} mood="happy" pct={62} reduced label="Daybreak — Habitat, reduced motion" />; }

// ——— decaying / sad ———
function HabDecay() {
  return (
    <HShell label="Daybreak — Habitat, decaying / sad">
      <HabScene level={4} mood="sad" decay />
      <StatusBar ink={ht.ink} />
      <HTop mood="sad" level={4} />
      <div style={{ flex: 1 }}></div>
      <div style={{ position: 'relative', zIndex: 3, margin: '0 16px 18px', padding: '16px 17px', borderRadius: 20, background: 'rgba(255,255,255,0.94)', boxShadow: '0 10px 28px rgba(120,80,30,0.18)', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><HabLeo size={36} mood="sad" anim={false} /></div>
          <div>
            <div style={{ fontFamily: ht.fontDisplay, fontSize: 17, fontWeight: 700, color: ht.ink }}>Leo misses you</div>
            <div style={{ fontSize: 13.5, color: ht.muted }}>A quick session brings the world back to life.</div>
          </div>
        </div>
        <div style={{ height: 48, borderRadius: 14, background: ht.primary, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ht.fontDisplay, fontWeight: 700, fontSize: 17, boxShadow: '0 8px 18px rgba(242,138,31,0.3)' }}>Study now</div>
      </div>
    </HShell>
  );
}

// ——— offline ———
function HabOffline() {
  return (
    <HShell label="Daybreak — Habitat, offline (cached)">
      <HabScene level={5} mood="happy" />
      <StatusBar ink={ht.ink} />
      <div style={{ position: 'relative', zIndex: 4, margin: '4px 16px 0', padding: '10px 14px', borderRadius: 13, background: 'rgba(74,51,28,0.82)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 9, flex: 'none' }}>
        <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #FFE0A8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFE0A8', fontSize: 12, fontWeight: 700, flex: 'none' }}>!</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#FFF6E9' }}>You&rsquo;re offline &mdash; showing last known state.</span>
      </div>
      <div style={{ position: 'relative', zIndex: 3, padding: '10px 18px 0', display: 'flex', justifyContent: 'space-between' }}><HBack /><HLevelBadge level={5} /></div>
      <div style={{ flex: 1 }}></div>
      <HProgCard level={5} pct={62} />
    </HShell>
  );
}

// ——— error ———
function HabError() {
  return (
    <HShell label="Daybreak — Habitat, error (no data)">
      <div style={{ position: 'absolute', inset: 0, background: SKY.day }}></div>
      <StatusBar ink={ht.ink} />
      <div style={{ position: 'relative', zIndex: 3, padding: '8px 18px 0', flex: 'none' }}><HBack /></div>
      <div style={{ position: 'relative', zIndex: 3, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28, textAlign: 'center' }}>
        <HabLeo size={120} mood="neutral" anim={false} />
        <span style={{ fontFamily: ht.fontDisplay, fontSize: 21, fontWeight: 700, color: ht.ink }}>We couldn&rsquo;t load your habitat.</span>
        <span style={{ fontSize: 14.5, color: ht.muted, lineHeight: 1.5, maxWidth: 250 }}>Check your connection and try again.</span>
        <div style={{ height: 50, padding: '0 26px', borderRadius: 14, background: ht.primary, color: '#FFF', display: 'flex', alignItems: 'center', fontFamily: ht.fontDisplay, fontWeight: 700, fontSize: 16, boxShadow: '0 10px 22px rgba(242,138,31,0.3)' }}>Try again</div>
      </div>
    </HShell>
  );
}

// ——— level-up celebration ———
function HabCelebrate() {
  const cols = [ht.primary, '#F2B33A', ht.green, ht.red, '#6B4A8A'];
  const bits = [];
  for (let i = 0; i < 26; i++) {
    const c = cols[i % cols.length], left = (i * 53) % 100, sq = i % 3 === 0;
    bits.push(<div key={i} className="hab-fall" style={{ position: 'absolute', left: left + '%', top: '-10%', width: sq ? 10 : 6, height: sq ? 10 : 14, background: c, borderRadius: sq ? 2 : 1, animationDelay: (i % 9) * 0.22 + 's', transform: `rotate(${(i * 47) % 360}deg)` }}></div>);
  }
  return (
    <HShell label="Daybreak — Habitat, level-up celebration">
      <HabScene level={5} mood="excited" />
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, background: 'radial-gradient(circle at 50% 42%, rgba(255,247,233,0.35), rgba(255,247,233,0.62))' }}></div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 5, overflow: 'hidden', pointerEvents: 'none' }}>{bits}</div>
      <StatusBar ink={ht.ink} />
      <div style={{ position: 'relative', zIndex: 6, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
        <span style={{ fontFamily: ht.fontDisplay, fontSize: 17, fontWeight: 700, color: ht.link, letterSpacing: 1, textTransform: 'uppercase' }}>Level up!</span>
        <span style={{ fontFamily: ht.fontDisplay, fontSize: 62, fontWeight: 700, color: ht.ink, lineHeight: 0.9 }}>Level 5</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16, background: '#FFFFFF', boxShadow: '0 12px 30px rgba(120,80,30,0.2)' }}>
          <div style={{ width: 46, height: 40, position: 'relative' }}><div style={{ position: 'absolute', left: 6, top: 6, width: 34, height: 28, background: PAL.ele, borderRadius: '46% 46% 40% 40%' }}></div><div style={{ position: 'absolute', left: 0, top: 9, width: 22, height: 22, background: PAL.ele, borderRadius: '50%' }}></div><div style={{ position: 'absolute', left: 2, top: 22, width: 8, height: 16, background: PAL.ele, borderRadius: '0 0 0 60%', transform: 'rotate(8deg)' }}></div></div>
          <span style={{ fontSize: 16, fontWeight: 700, color: ht.ink }}>An elephant moved in!</span>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 6, textAlign: 'center', fontSize: 13, fontWeight: 600, color: ht.muted, paddingBottom: 22 }}>Tap to continue</div>
    </HShell>
  );
}

Object.assign(window, {
  H_NEXT, H_NAME, MOOD, HBack, HMoodChip, HLevelBadge, HTop, HProgCard, HShell,
  HabScreen, HabNew, HabMid, HabLush, HabReduced, HabDecay, HabOffline, HabError, HabCelebrate,
});
