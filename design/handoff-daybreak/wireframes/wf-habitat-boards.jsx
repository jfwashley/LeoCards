// Habitat wireframe boards. Atoms from wf-habitat.jsx + wf-shared.jsx.

const NEXT_UNLOCK = {
  1: 'a lake & lily pads', 2: 'trees & rocks', 3: 'flowers & butterflies',
  4: 'an elephant friend', 5: 'mushrooms', 6: 'a cave & nights', 7: 'toys',
  8: 'songbirds & golden light', 9: 'max \u2014 Course 1 complete',
};
const LVL_NAME = { 1: 'Bare mound', 2: 'Lakeside', 3: 'Woodland', 4: 'Meadow', 5: 'Savanna', 6: 'Glade', 7: 'Den', 8: 'Playground', 9: 'Golden hour' };

// top overlay: back · mood · level (optionally ringed + next-unlock peek)
function HabTop({ mood = 'happy', level = 5, ring, peek }) {
  return (
    <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 16px 0', flex: 'none' }}>
      <WBack />
      <WMoodChip mood={mood} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <WLevelBadge level={level} ring={ring} />
        {peek ? <SBox i={3} style={{ padding: '4px 9px', fontSize: 12, background: PAPER, maxWidth: 120 }}>Next: {NEXT_UNLOCK[level]}</SBox> : null}
      </div>
    </div>
  );
}

// bottom progress card
function HabProgCard({ level = 5, pct = 62 }) {
  return (
    <SBox i={0} style={{ position: 'relative', zIndex: 3, margin: '0 14px 14px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 9, background: PAPER, flex: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16 }}>Level {level} &middot; {LVL_NAME[level]}</span>
        <span style={{ fontSize: 13, color: FAINT }}>{pct}% to L{level + 1}</span>
      </div>
      <div style={{ height: 14, border: `1.6px solid ${INK}`, borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: pct + '%', background: ACCENT }}></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
        <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${ACCENT_INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>?</span>
        <span>Next at L{level + 1}: <span style={{ color: ACCENT_INK }}>{NEXT_UNLOCK[level]}</span></span>
      </div>
    </SBox>
  );
}
function HabProgMinimal({ level = 5, pct = 62 }) {
  return (
    <div style={{ position: 'relative', zIndex: 3, padding: '0 18px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
      <span style={{ fontSize: 13, color: '#6b6359' }}>L{level}</span>
      <div style={{ flex: 1, height: 8, border: `1.5px solid ${FAINT}`, borderRadius: 6, overflow: 'hidden', background: PAPER }}><div style={{ width: pct + '%', height: '100%', background: ACCENT }}></div></div>
      <span style={{ fontSize: 13, color: FAINT }}>L{level + 1}</span>
    </div>
  );
}

// the phone frame: scene fills, overlays float
function HabPhone({ level, mood, decay, night, reduced, top, bottom }) {
  return (
    <Phone>
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <WHabScene level={level} mood={mood} decay={decay} night={night} reduced={reduced} />
        {top}
        <div style={{ flex: 1 }}></div>
        {bottom}
      </div>
    </Phone>
  );
}

// ===== Section A — growth arc =====
function HabNew() {
  return (
    <Board screenLabel="Habitat — new user · Level 1" notes={[
      'state: brand-new user, Level 1 \u2014 sparse but inviting, never empty or sad',
      'just Leo on a bare mound under a warm sun; lots of room to grow into',
      'mood here is excited/happy (they just started) \u2014 mood is independent of level',
      'progress card teases the very first unlock to pull them forward',
      'a welcome line sets the promise: study to grow your world',
    ]}>
      <HabPhone level={1} mood="excited"
        top={<HabTop mood="excited" level={1} />}
        bottom={<React.Fragment>
          <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', fontSize: 15, color: '#6b6359', padding: '0 24px 8px' }}>Study cards to grow Leo&rsquo;s world.</div>
          <HabProgCard level={1} pct={15} />
        </React.Fragment>} />
    </Board>
  );
}
function HabMid() {
  return (
    <Board screenLabel="Habitat — mid · Level 5" notes={[
      'the world filling in: lake, trees, rocks, flowers, butterflies \u2014 and an elephant friend at L5',
      'this is the canonical normal/ambient default (gentle motion in hi-fi)',
      'happy mood: warm sun, lively scene; Leo content',
      'level + mood both legible over the scene via the floating overlays',
    ]}>
      <HabPhone level={5} mood="happy"
        top={<HabTop mood="happy" level={5} />}
        bottom={<HabProgCard level={5} pct={62} />} />
    </Board>
  );
}
function HabLush() {
  return (
    <Board screenLabel="Habitat — lush · Level 9 (endgame)" notes={[
      'L9 endgame: everything present + songbirds + golden-hour light \u2014 the maxed world',
      'a satisfying \u201Cyou\u2019ve grown it all\u201D feeling; headroom flagged for future levels',
      'golden light is an ambient mood cue layered on the scene',
      'progress reads \u201Cmax \u2014 Course 1 complete\u201D rather than a next unlock',
    ]}>
      <HabPhone level={9} mood="happy"
        top={<HabTop mood="happy" level={9} />}
        bottom={<SBox i={0} style={{ position: 'relative', zIndex: 3, margin: '0 14px 14px', padding: '13px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: ACCENT }}>
          <span style={{ fontSize: 16 }}>Level 9 &middot; {LVL_NAME[9]}</span>
          <span style={{ fontSize: 13 }}>Course 1 complete &#10024;</span>
        </SBox>} />
    </Board>
  );
}

// ===== Section B — progress / next-unlock options =====
function HabProgOptCard() {
  return (
    <Board screenLabel="Habitat — progress option 1: bottom card" notes={[
      'Option 1 \u2014 a bottom card: level + name, a progress bar, and the next unlock named',
      'most explicit; names what\u2019s coming (\u201CNext: mushrooms\u201D) to drive anticipation',
      'costs the most bottom space, partially covering the scene',
    ]}>
      <HabPhone level={5} mood="happy" top={<HabTop mood="happy" level={5} />} bottom={<HabProgCard level={5} pct={62} />} />
    </Board>
  );
}
function HabProgOptRing() {
  return (
    <Board screenLabel="Habitat — progress option 2: ring + peek" notes={[
      'Option 2 \u2014 a progress ring around the level badge + a small \u201CNext: \u2026\u201D peek chip',
      'keeps the scene almost full-bleed; progress lives up in the corner',
      'anticipation via the peek chip; less prominent than the card',
    ]}>
      <HabPhone level={5} mood="happy" top={<HabTop mood="happy" level={5} ring peek />} bottom={null} />
    </Board>
  );
}
function HabProgOptMinimal() {
  return (
    <Board screenLabel="Habitat — progress option 3: minimal sliver" notes={[
      'Option 3 \u2014 minimal: just a thin L5\u2192L6 sliver; the scene is the hero',
      'quietest, most immersive; next unlock is not named (tap to reveal could come later)',
      'best if we want the habitat to feel like a place, not a dashboard',
    ]}>
      <HabPhone level={5} mood="happy" top={<HabTop mood="happy" level={5} />} bottom={<HabProgMinimal level={5} pct={62} />} />
    </Board>
  );
}

// ===== Section C — emotional & system states =====
function WConfetti() {
  const cols = [ACCENT, GREEN, RED, ACCENT_INK, INK];
  const bits = [];
  for (let i = 0; i < 16; i++) {
    const c = cols[i % cols.length];
    const left = (i * 61) % 100, top = (i * 37) % 70, rot = (i * 53) % 360, sq = i % 3 === 0;
    bits.push(<div key={i} style={{ position: 'absolute', left: left + '%', top: top + '%', width: sq ? 8 : 5, height: sq ? 8 : 12, background: c, opacity: 0.85, borderRadius: sq ? 2 : 1, transform: `rotate(${rot}deg)` }}></div>);
  }
  return <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>{bits}</div>;
}
function HabCelebrate() {
  return (
    <Board screenLabel="Habitat — level-up celebration" notes={[
      'state: level-up \u2014 the app\u2019s single biggest emotional payoff',
      'full-screen confetti + \u201CLevel 5!\u201D + names what just appeared (\u201Can elephant moved in\u201D)',
      'brief flourish (~2.5s) then settles into the normal scene at the new level',
      'in hi-fi: the new element (the elephant) animates in with a spotlight under the confetti',
    ]}>
      <Phone>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <WHabScene level={5} mood="excited" />
          <WConfetti />
          <div style={{ position: 'relative', zIndex: 5, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24 }}>
            <span style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: ACCENT_INK }}>level up!</span>
            <span style={{ fontSize: 46, lineHeight: 1 }}>Level 5</span>
            <SBox i={2} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, background: PAPER }}>
              <WElephant />
              <span style={{ fontSize: 15 }}>An elephant moved in!</span>
            </SBox>
          </div>
          <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', fontSize: 13, color: FAINT, paddingBottom: 18 }}>tap to continue</div>
        </div>
      </Phone>
    </Board>
  );
}
function HabDecay() {
  return (
    <Board screenLabel="Habitat — decaying / sad" notes={[
      'state: neglect \u2014 quality decayed after the 2-day grace; effective level dropped',
      'world is dimmer and wilted (faded elements), Leo is sad \u2014 encouraging, not shaming',
      'a gentle nudge back: \u201CLeo misses you\u201D + a soft prompt to study (no guilt, no alarm)',
      'studying restores it \u2014 the copy makes the recovery feel easy',
    ]}>
      <HabPhone level={4} mood="sad" decay
        top={<HabTop mood="sad" level={4} />}
        bottom={<SBox i={0} style={{ position: 'relative', zIndex: 3, margin: '0 14px 14px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 9, background: PAPER }}>
          <span style={{ fontSize: 15.5 }}>Leo misses you.</span>
          <span style={{ fontSize: 13.5, color: '#6b6359' }}>A quick study session will bring the world back to life.</span>
          <SBtn label="Study now" kind="primary" i={1} style={{ height: 42, fontSize: 15 }} />
        </SBox>} />
    </Board>
  );
}
function HabOffline() {
  return (
    <Board screenLabel="Habitat — offline (cached)" notes={[
      'state: offline \u2014 still show the habitat from last-known data',
      'a gentle, non-alarming banner up top; nothing blocks the view',
      'no scary error \u2014 just context that this is cached',
    ]}>
      <HabPhone level={5} mood="happy"
        top={<React.Fragment>
          <div style={{ position: 'relative', zIndex: 4, margin: '14px 14px 0' }}>
            <SBox i={3} style={{ padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, background: PAPER }}>
              <span style={{ fontSize: 14 }}>&#9888;</span> You&rsquo;re offline &mdash; showing last known state.
            </SBox>
          </div>
          <HabTop mood="happy" level={5} />
        </React.Fragment>}
        bottom={<HabProgMinimal level={5} pct={62} />} />
    </Board>
  );
}
function HabError() {
  return (
    <Board screenLabel="Habitat — error (no data)" notes={[
      'state: can\u2019t load and no cached fallback \u2014 never a blank/broken screen',
      'friendly message + a clear Try again; Leo peeks in so it still feels on-brand',
      'a way back to the dashboard stays available',
    ]}>
      <Phone>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ position: 'relative', zIndex: 3, padding: '16px 16px 0', flex: 'none' }}><WBack /></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
            <WLeo size={70} mood="neutral" />
            <span style={{ fontSize: 17 }}>We couldn&rsquo;t load your habitat.</span>
            <span style={{ fontSize: 14, color: FAINT, lineHeight: 1.4 }}>Check your connection and try again.</span>
            <SBtn label="Try again" kind="primary" i={1} style={{ height: 44, fontSize: 15, padding: '0 18px' }} />
          </div>
        </div>
      </Phone>
    </Board>
  );
}
function HabReduced() {
  return (
    <Board screenLabel="Habitat — reduced motion" notes={[
      'state: prefers-reduced-motion \u2014 a calm, fully static version (no ambient loop)',
      'same scene + overlays, just no looping animation; a small \u201Cmotion paused\u201D cue',
      'respects the OS setting automatically; everything still legible',
    ]}>
      <HabPhone level={5} mood="happy" reduced
        top={<HabTop mood="happy" level={5} />}
        bottom={<HabProgCard level={5} pct={62} />} />
    </Board>
  );
}

Object.assign(window, {
  NEXT_UNLOCK, LVL_NAME, HabTop, HabProgCard, HabProgMinimal, HabPhone,
  HabNew, HabMid, HabLush, HabProgOptCard, HabProgOptRing, HabProgOptMinimal,
  HabCelebrate, HabDecay, HabOffline, HabError, HabReduced,
});
