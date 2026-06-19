// Onboarding & Auth wireframes — the auth family (Signup / Forgot / Reset),
// matching the approved Login (habitat-flashcard shell). Sketch primitives from wf-shared.jsx.

// brand block: lion mark + wordmark + tagline
function WBrand({ tagline = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 'none' }}>
      <LionMark size={48} />
      <div style={{ fontSize: 23 }}>LeoCards</div>
      {tagline ? <div style={{ fontSize: 13.5, color: FAINT }}>Your lion is waiting.</div> : null}
    </div>
  );
}

// compact habitat-scene card header (recolours per screen)
function WAuthScene({ label = 'sunrise', h = 120 }) {
  return (
    <div style={{ height: h, position: 'relative', borderBottom: `1.8px dashed ${INK}`, flex: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: 18, top: 14, width: 28, height: 28, border: `1.8px solid ${ACCENT_INK}`, borderRadius: '50%', background: ACCENT }}></div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, borderTop: `1.8px solid ${INK}`, borderRadius: '50%/8px', height: 12 }}></div>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 30 }}><LionMark size={56} /></div>
      <div style={{ position: 'absolute', left: 8, top: 8, fontFamily: "'Caveat', cursive", fontSize: 12, color: FAINT }}>{label}</div>
    </div>
  );
}

// ghost-card stack wrapper (echoes the study deck)
function WCardStack({ children }) {
  return (
    <div style={{ position: 'relative', paddingTop: 14 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 210, height: 16, border: `1.4px solid ${FAINT}`, borderBottom: 'none', borderRadius: '14px 14px 0 0', opacity: 0.3, background: PAPER }}></div>
      <div style={{ position: 'absolute', left: '50%', top: 7, transform: 'translateX(-50%)', width: 240, height: 16, border: `1.4px solid ${FAINT}`, borderBottom: 'none', borderRadius: '14px 14px 0 0', opacity: 0.5, background: PAPER }}></div>
      <SBox i={0} style={{ position: 'relative', overflow: 'hidden', boxShadow: '2px 3px 0 rgba(47,42,38,0.12)', display: 'flex', flexDirection: 'column' }}>{children}</SBox>
    </div>
  );
}

// native-language selector (3 options)
function WNativeSelect({ value, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 15 }}>Native language</span>
      <div style={{ display: 'flex', gap: 7 }}>
        {['English', 'French', 'Spanish'].map((l, i) => (
          <SBox key={l} i={i + 1} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: l === value ? ACCENT : 'transparent', borderColor: error && !value ? RED : INK }}>{l}</SBox>
        ))}
      </div>
      {error ? <span style={{ fontSize: 13, color: RED }}>{error}</span> : null}
    </div>
  );
}

// submitting button (spinner + disabled)
function WSubmitBtn({ label, submitting, i = 3, style }) {
  if (submitting) {
    return (
      <SBox i={i} style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16, background: ACCENT, opacity: 0.7, ...style }}>
        <span style={{ width: 16, height: 16, border: `2.4px solid ${INK}`, borderTopColor: 'transparent', borderRadius: '50%' }}></span>
      </SBox>
    );
  }
  return <SBtn label={label} i={i} style={style} />;
}

// password field with min-8 helper
function WPassField({ label = 'Password', placeholder = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', hint = 'At least 8 characters', error, i = 2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <SField label={label} placeholder={placeholder} error={error} i={i} />
      {!error && hint ? <span style={{ fontSize: 12.5, color: FAINT }}>{hint}</span> : null}
    </div>
  );
}

// shared shell: brand block + card + cross-link
function WAuthShell({ screenLabel, notes, scene, sceneLabel, title, children, footer }) {
  return (
    <Board screenLabel={screenLabel} notes={notes}>
      <Phone>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 24px', gap: 16 }}>
          <WBrand />
          <WCardStack>
            {scene ? <WAuthScene label={sceneLabel} /> : null}
            <div style={{ padding: 17, display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ fontSize: 19 }}>{title}</div>
              {children}
            </div>
          </WCardStack>
          <div style={{ textAlign: 'center', fontSize: 14, color: FAINT }}>{footer}</div>
        </div>
      </Phone>
    </Board>
  );
}

Object.assign(window, {
  WBrand, WAuthScene, WCardStack, WNativeSelect, WSubmitBtn, WPassField, WAuthShell,
});
