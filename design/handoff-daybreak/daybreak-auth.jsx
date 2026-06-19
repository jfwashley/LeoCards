// Daybreak hi-fi — Auth family (Signup / Forgot / Reset). Shell A: brand block +
// ghost-card stack + habitat-flashcard card (scene header recoloured per screen) + form.
// Reuses PhoneShell / StatusBar / LionFace / GhostPeek / TField / TBtn + d1Theme.
const au = window.d1Theme;

const TINTS = {
  sunrise: { sky: 'linear-gradient(180deg, #FFE7BC 0%, #FFFDF8 80%)', sun: '#FFC95C', sunPos: { right: '20%', top: '20%' }, glow: 'rgba(255,201,92,0.28)' },
  daylight: { sky: 'linear-gradient(180deg, #FFF2CE 0%, #FFFDF8 80%)', sun: '#FFD874', sunPos: { right: '50%', top: '14%' }, glow: 'rgba(255,216,116,0.26)' },
  dusk: { sky: 'linear-gradient(180deg, #FFCBA0 0%, #FBE6D6 82%)', sun: '#F2A35E', sunPos: { right: '22%', top: '40%' }, glow: 'rgba(242,163,94,0.3)' },
};

function AuthScene({ tint = 'sunrise', tagline }) {
  const t = TINTS[tint];
  return (
    <div style={{ height: 158, position: 'relative', overflow: 'hidden', flex: 'none', background: t.sky }}>
      <div style={{ position: 'absolute', width: 52, height: 52, borderRadius: '50%', background: t.sun, boxShadow: `0 0 0 12px ${t.glow}`, ...t.sunPos }}></div>
      <div style={{ position: 'absolute', left: '-16%', bottom: -46, width: '135%', height: 110, borderRadius: '50%', background: '#F7D592' }}></div>
      <div style={{ position: 'absolute', right: '-14%', bottom: -40, width: '125%', height: 92, borderRadius: '50%', background: '#EFB964' }}></div>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 20 }}><LionFace size={74} {...au.lion} /></div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 7, textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: '#8A6235' }}>{tagline}</div>
    </div>
  );
}

function AuthPass({ label = 'Password', value, error, hint = 'At least 8 characters' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <TField t={au} label={label} placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" value={value} error={error} />
      {!error && hint ? <span style={{ fontSize: 12.5, color: au.muted }}>{hint}</span> : null}
    </div>
  );
}

// shell A: brand + ghost stack + flashcard
function AuthScreen({ label, tint, tagline, title, children, footer }) {
  return (
    <PhoneShell bg={au.bg}>
      <div data-screen-label={label} style={{ display: 'flex', flexDirection: 'column', flex: 1, fontFamily: au.fontBody, minHeight: 0 }}>
        <StatusBar ink={au.ink} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 26px 26px', gap: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <LionFace size={30} {...au.lion} />
            <span style={{ fontFamily: au.fontDisplay, fontSize: 26, fontWeight: 700, color: au.ink }}>LeoCards</span>
          </div>
          <div style={{ position: 'relative', paddingTop: 18 }}>
            <GhostPeek t={au} top={0} widthPct="64%" opacity={0.45} />
            <GhostPeek t={au} top={9} widthPct="78%" opacity={0.8} />
            <div style={{ position: 'relative', borderRadius: au.cardRadius, overflow: 'hidden', background: au.surface, border: au.cardBorder, boxShadow: au.cardShadow }}>
              <AuthScene tint={tint} tagline={tagline} />
              <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontFamily: au.fontDisplay, fontSize: 22, fontWeight: 700, color: au.ink }}>{title}</div>
                {children}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 14, color: au.muted }}>{footer}</div>
        </div>
      </div>
    </PhoneShell>
  );
}

const Sign = <React.Fragment>Already have an account? <span style={{ color: au.link, fontWeight: 700 }}>Sign in</span></React.Fragment>;
const Back = <span style={{ color: au.link, fontWeight: 700 }}>&lsaquo; Back to sign in</span>;

// ——— Signup ———
function AuSignup({ variant }) {
  const err = variant === 'errors', taken = variant === 'taken', sub = variant === 'submitting';
  return (
    <AuthScreen label={`Daybreak — Signup, ${variant}`} tint="sunrise" tagline="Your lion is waiting." title="Create your account" footer={Sign}>
      <TField t={au} label="Name" placeholder="Your name" value={err ? '' : 'Alex Rivera'} error={err ? 'Enter your name' : null} />
      <TField t={au} label="Email" placeholder="you@example.com" value={err ? 'you.example.com' : 'alex@example.com'} error={err ? 'Enter a valid email address' : (taken ? 'An account with this email already exists.' : null)} />
      <AuthPass value={err ? '' : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} error={err ? 'Use at least 8 characters' : null} hint={sub ? null : 'At least 8 characters'} />
      <TBtn t={au} label="Create account" spinner={sub} />
    </AuthScreen>
  );
}

// ——— Forgot ———
function AuForgot({ variant }) {
  if (variant === 'sent') {
    return (
      <AuthScreen label="Daybreak — Forgot, sent" tint="daylight" tagline="We&rsquo;ll send a link." title="Check your email" footer={Back}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: '2px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFF1DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>&#9993;</div>
          <span style={{ fontSize: 14.5, color: au.muted, lineHeight: 1.5 }}>If an account exists, we&rsquo;ve sent a reset link to <span style={{ color: au.ink, fontWeight: 700 }}>you@example.com</span>.</span>
          <span style={{ fontSize: 13, color: au.muted }}>Didn&rsquo;t get it? Check spam, or <span style={{ color: au.link, fontWeight: 700 }}>resend</span>.</span>
        </div>
      </AuthScreen>
    );
  }
  const err = variant === 'invalid', sub = variant === 'submitting';
  return (
    <AuthScreen label={`Daybreak — Forgot, ${variant}`} tint="daylight" tagline="We&rsquo;ll send a link." title="Reset your password" footer={Back}>
      <span style={{ fontSize: 14, color: au.muted, lineHeight: 1.45 }}>Enter your email and we&rsquo;ll send you a reset link.</span>
      <TField t={au} label="Email" placeholder="you@example.com" value={err ? 'you.example.com' : 'you@example.com'} error={err ? 'Enter a valid email address' : null} />
      <TBtn t={au} label="Send reset link" spinner={sub} />
    </AuthScreen>
  );
}

// ——— Reset ———
function AuReset({ variant }) {
  if (variant === 'expired') {
    return (
      <AuthScreen label="Daybreak — Reset, expired" tint="dusk" tagline="Let&rsquo;s try again." title="Link expired" footer={Back}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: '2px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FCEBE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: au.red, fontWeight: 700 }}>!</div>
          <span style={{ fontSize: 14.5, color: au.muted, lineHeight: 1.5 }}>This reset link has expired. Request a new one and we&rsquo;ll send a fresh link.</span>
          <TBtn t={au} label="Request a new link" style={{ marginTop: 2 }} />
        </div>
      </AuthScreen>
    );
  }
  const mis = variant === 'mismatch', sub = variant === 'submitting';
  return (
    <AuthScreen label={`Daybreak — Reset, ${variant}`} tint="dusk" tagline="Almost done." title="Set a new password" footer={Back}>
      <AuthPass label="New password" value={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} />
      <AuthPass label="Confirm password" value={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} hint={null} error={mis ? 'Passwords do not match' : null} />
      <TBtn t={au} label="Set new password" spinner={sub} />
    </AuthScreen>
  );
}

Object.assign(window, { au, TINTS, AuthScene, AuthPass, AuthScreen, AuSignup, AuForgot, AuReset });
