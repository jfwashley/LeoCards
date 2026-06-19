// Onboarding wireframes — dedicated first-visit. "Choose your languages" (native +
// target on one page), minimal vs richer framing, states + empty states.
// Reuses wf-shared (Phone, SBox, SBtn, SLink, LionMark, Board) + wf-auth (WBrand).

const LANGS = { English: 'EN', French: 'FR', Spanish: 'ES' };

// Leo greeting block (mascot + optional speech bubble)
function WGreet({ size = 78, title, sub, bubble }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', flex: 'none' }}>
      <div style={{ position: 'relative' }}>
        <LionMark size={size} />
        {bubble ? <SBox i={2} dashed style={{ position: 'absolute', left: size - 6, top: -6, padding: '6px 10px', fontFamily: "'Caveat', cursive", fontSize: 16, whiteSpace: 'nowrap', background: PAPER }}>{bubble}</SBox> : null}
      </div>
      {title ? <div style={{ fontSize: 21, lineHeight: 1.15 }}>{title}</div> : null}
      {sub ? <div style={{ fontSize: 14, color: '#6b6359', lineHeight: 1.4, maxWidth: 230 }}>{sub}</div> : null}
    </div>
  );
}

function WStepDots({ n, of = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flex: 'none' }}>
      {Array.from({ length: of }).map((_, i) => (
        <span key={i} style={{ width: i + 1 === n ? 22 : 9, height: 9, borderRadius: 6, background: i + 1 === n ? ACCENT : 'transparent', border: `1.5px solid ${i + 1 === n ? ACCENT_INK : FAINT}` }}></span>
      ))}
    </div>
  );
}

// little flag doodle (lo-fi: a tricolor rounded rect)
function WFlag({ code, size = 30 }) {
  return (
    <div style={{ width: size, height: size * 0.72, borderRadius: 5, border: `1.5px solid ${INK}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 'none' }}>
      <div style={{ flex: 1, background: 'rgba(242,163,60,0.5)' }}></div>
      <div style={{ flex: 1, background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{code}</div>
    </div>
  );
}

// language option card — flag or Leo-motif, optional selected / disabled
function WLangCard({ name, selected, disabled, motif }) {
  return (
    <SBox i={selected ? 1 : 3} dashed={!selected} style={{
      height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
      background: selected ? ACCENT : 'transparent', opacity: disabled ? 0.4 : 1,
    }}>
      {motif ? <div style={{ flex: 'none' }}><LionMark size={30} /></div> : <WFlag code={LANGS[name]} />}
      <span style={{ fontSize: 16, flex: 1 }}>{name}</span>
      <span style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${selected ? ACCENT_INK : FAINT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{selected ? '\u2713' : ''}</span>
    </SBox>
  );
}

function WLangGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 13, color: FAINT }}>{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

// picker — native + target together (variant: 'flag' | 'motif' | 'dropdown')
function WLangPick({ variant }) {
  if (variant === 'dropdown') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 14 }}>I speak</span>
          <SBox i={2} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}><span style={{ fontSize: 16 }}>English</span><span>&#9662;</span></SBox>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 14 }}>I want to learn</span>
          <SBox i={3} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}><span style={{ fontSize: 16, color: FAINT }}>Choose a language</span><span>&#9662;</span></SBox>
        </div>
      </div>
    );
  }
  const motif = variant === 'motif';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <WLangGroup label="I speak">
        <WLangCard name="English" selected motif={motif} />
      </WLangGroup>
      <WLangGroup label="I want to learn">
        <WLangCard name="Spanish" motif={motif} />
        <WLangCard name="French" motif={motif} />
        <WLangCard name="English" disabled motif={motif} />
      </WLangGroup>
    </div>
  );
}

// full-screen onboarding shell
function WOnb({ screenLabel, notes, children }) {
  return (
    <Board screenLabel={screenLabel} notes={notes}>
      <Phone>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '26px 22px 22px', gap: 18, minHeight: 0 }}>{children}</div>
      </Phone>
    </Board>
  );
}

Object.assign(window, { LANGS, WGreet, WStepDots, WFlag, WLangCard, WLangGroup, WLangPick, WOnb });
