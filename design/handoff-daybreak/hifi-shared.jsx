// Hi-fi shared shell: phone, status bar, geometric lion mark, themed form atoms.
// Each direction passes a theme object `t`.

function PhoneShell({ bg, children, style }) {
  return (
    <div style={{
      width: 390, height: 844, overflow: 'hidden', position: 'relative',
      display: 'flex', flexDirection: 'column', background: bg, ...style,
    }}>{children}</div>
  );
}

function StatusBar({ ink }) {
  const bar = (h) => ({ width: 3, height: h, borderRadius: 1, background: ink });
  return (
    <div style={{ height: 48, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', color: ink }}>
      <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'Albert Sans', sans-serif" }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5 }}>
          <span style={bar(4)}></span><span style={bar(6)}></span><span style={bar(8)}></span><span style={bar(10)}></span>
        </div>
        <div style={{ width: 23, height: 11.5, border: `1.5px solid ${ink}`, borderRadius: 3.5, padding: 1.5, boxSizing: 'border-box' }}>
          <div style={{ width: '72%', height: '100%', borderRadius: 1.5, background: ink }}></div>
        </div>
      </div>
    </div>
  );
}

// Flat geometric lion mark. colors: { mane, face, muzzle, ink, outline? }
function LionFace({ size = 80, mane, face, muzzle, ink, outline }) {
  const s = size, u = (n) => (n / 100) * s;
  const ob = outline ? `${Math.max(1.5, s * 0.028)}px solid ${outline}` : 'none';
  return (
    <div style={{ width: s, height: s, position: 'relative', flex: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: mane, borderRadius: '50%', border: ob, boxSizing: 'border-box' }}></div>
      <div style={{ position: 'absolute', left: u(13), top: u(6), width: u(20), height: u(20), background: face, borderRadius: '50%', border: ob, boxSizing: 'border-box' }}></div>
      <div style={{ position: 'absolute', right: u(13), top: u(6), width: u(20), height: u(20), background: face, borderRadius: '50%', border: ob, boxSizing: 'border-box' }}></div>
      <div style={{ position: 'absolute', left: u(17), top: u(17), width: u(66), height: u(66), background: face, borderRadius: '50%', border: ob, boxSizing: 'border-box' }}></div>
      <div style={{ position: 'absolute', left: u(35), top: u(42), width: u(6), height: u(6), background: ink, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', right: u(35), top: u(42), width: u(6), height: u(6), background: ink, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', left: u(37), top: u(56), width: u(26), height: u(18), background: muzzle, borderRadius: '46% 46% 50% 50%' }}></div>
      <div style={{ position: 'absolute', left: u(46.5), top: u(56), width: u(7), height: u(6), background: ink, borderRadius: '40% 40% 60% 60%' }}></div>
    </div>
  );
}

function GhostPeek({ t, top, widthPct, opacity }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', top, transform: 'translateX(-50%)',
      width: widthPct, height: 22, background: t.ghost, opacity,
      borderRadius: `${t.cardRadius}px ${t.cardRadius}px 0 0`,
      border: t.cardBorder, borderBottom: 'none', boxSizing: 'border-box',
    }}></div>
  );
}

function TField({ t, label, placeholder, value, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: t.ink, letterSpacing: 0.2 }}>{label}</span>
      <div style={{
        height: 48, borderRadius: t.fieldRadius, background: t.fieldBg,
        border: error ? `1.5px solid ${t.red}` : t.fieldBorder,
        display: 'flex', alignItems: 'center', padding: '0 14px', boxSizing: 'border-box',
      }}>
        <span style={{ fontSize: 15, color: value ? t.ink : t.muted }}>{value || placeholder}</span>
      </div>
      {error ? <span style={{ fontSize: 13, fontWeight: 600, color: t.red }}>{error}</span> : null}
    </div>
  );
}

function TBtn({ t, label, spinner, style }) {
  return (
    <div style={{
      height: 50, borderRadius: t.btnRadius, background: t.primary, color: t.primaryText,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 700, fontFamily: t.fontBody, border: t.btnBorder || 'none',
      boxShadow: t.btnShadow || 'none', boxSizing: 'border-box',
      opacity: spinner ? 0.85 : 1, ...style,
    }}>
      {spinner ? (
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.35)', borderTopColor: '#FFFFFF', animation: 'lc-spin 0.8s linear infinite' }}></div>
      ) : label}
    </div>
  );
}

// ——— Login C: habitat flashcard ———
function HiFiLogin({ t, scene, screenLabel, emailValue, passwordValue, emailError, passwordError, submitting }) {
  return (
    <PhoneShell bg={t.bg}>
      <div data-screen-label={screenLabel} style={{ display: 'flex', flexDirection: 'column', flex: 1, fontFamily: t.fontBody }}>
        <StatusBar ink={t.ink} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px 30px', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <LionFace size={32} {...t.lion} />
            <span style={{ fontFamily: t.fontDisplay, fontSize: 27, color: t.ink, fontWeight: t.displayWeight }}>LeoCards</span>
          </div>
          <div style={{ position: 'relative', paddingTop: 20 }}>
            <GhostPeek t={t} top={0} widthPct="62%" opacity={0.45} />
            <GhostPeek t={t} top={10} widthPct="76%" opacity={0.8} />
            <div style={{ position: 'relative', borderRadius: t.cardRadius, overflow: 'hidden', background: t.surface, border: t.cardBorder, boxShadow: t.cardShadow, boxSizing: 'border-box' }}>
              <div style={{ height: 216, position: 'relative', flex: 'none' }}>{scene}</div>
              <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.ink, fontWeight: t.displayWeight }}>Welcome back</div>
                <TField t={t} label="Email" placeholder="you@example.com" value={emailValue} error={emailError} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <TField t={t} label="Password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" value={passwordValue} error={passwordError} />
                  <span style={{ alignSelf: 'flex-end', fontSize: 13, fontWeight: 600, color: t.link }}>Forgot password?</span>
                </div>
                <TBtn t={t} label="Sign in" spinner={submitting} />
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 14, color: t.muted }}>
            Don&rsquo;t have an account? <span style={{ color: t.link, fontWeight: 700 }}>Sign up</span>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ——— Study D: big card hybrid ———
function HiFiStudy({ t, screenLabel }) {
  return (
    <PhoneShell bg={t.studyBg || t.bg}>
      <div data-screen-label={screenLabel} style={{ display: 'flex', flexDirection: 'column', flex: 1, fontFamily: t.fontBody }}>
        <StatusBar ink={t.ink} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 22px 0', flex: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, border: t.quitBorder, background: t.quitBg || 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.ink, fontSize: 15, boxSizing: 'border-box' }}>&#10005;</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.muted, letterSpacing: 0.3 }}>Study session</span>
          <span style={{ width: 40 }}></span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 20px 22px', gap: 16 }}>
          <div style={{ position: 'relative', paddingTop: 20, flex: 1 }}>
            <GhostPeek t={t} top={0} widthPct="68%" opacity={0.45} />
            <GhostPeek t={t} top={10} widthPct="82%" opacity={0.8} />
            <div style={{ position: 'relative', height: '100%', boxSizing: 'border-box', borderRadius: t.cardRadius, background: t.surface, border: t.cardBorder, boxShadow: t.cardShadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28 }}>
              <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: t.red, fontSize: 20, opacity: 0.5 }}>&larr;</span>
              <span style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: t.green, fontSize: 20, opacity: 0.5 }}>&rarr;</span>
              {t.cardMotif || null}
              <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 2.2, color: t.muted }}>WHAT&rsquo;S THE TRANSLATION?</span>
              <span style={{ fontFamily: t.fontDisplay, fontSize: 42, color: t.ink, fontWeight: t.displayWeight, textAlign: 'center', lineHeight: 1.15 }}>der L&ouml;we</span>
              <span style={{ position: 'absolute', bottom: 22, fontSize: 13, fontWeight: 600, color: t.pillText, background: t.pillBg, padding: '8px 16px', borderRadius: 999 }}>Tap to reveal</span>
            </div>
          </div>
          <div style={{ alignSelf: 'center', fontSize: 13.5, fontWeight: 600, color: t.hintText, background: t.hintBg, border: t.hintBorder || 'none', padding: '9px 18px', borderRadius: 999, boxSizing: 'border-box' }}>
            Swipe <span style={{ color: t.green }}>&rarr;</span> if you got it &nbsp;&middot;&nbsp; <span style={{ color: t.red }}>&larr;</span> still learning
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

Object.assign(window, { PhoneShell, StatusBar, LionFace, GhostPeek, TField, TBtn, HiFiLogin, HiFiStudy });
