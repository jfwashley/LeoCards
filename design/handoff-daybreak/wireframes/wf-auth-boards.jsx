// Auth wireframe boards. Atoms from wf-auth.jsx + wf-shared.jsx.
// Locked: shell A (habitat flashcard) — a scene tops every auth card, recoloured per screen.
// Native + target language are NOT here — they're chosen together on a dedicated
// "Choose your languages" page (designed in the first-visit pass).

const SIGNUP_LINK = <React.Fragment>Already have an account? <SLink style={{ color: INK }}>Sign in</SLink></React.Fragment>;
const BACK_LINK = <SLink style={{ color: INK }}>&lsaquo; Back to sign in</SLink>;

// ===== Signup =====
function SignupDefault() {
  return (
    <WAuthShell screenLabel="Signup — default" scene sceneLabel="sunrise" title="Create your account" footer={SIGNUP_LINK}
      notes={[
        'shell A locked: habitat scene tops the card (sign up = sunrise), matching Login',
        'account basics only \u2014 name, email, password (min 8)',
        'choosing your languages happens next, on its own page \u2014 not mixed in here',
        'single full-width primary; cross-link to sign in below',
      ]}>
      <SField label="Name" placeholder="Your name" i={1} />
      <SField label="Email" placeholder="you@example.com" i={2} />
      <WPassField i={3} />
      <SBtn label="Create account" i={0} />
    </WAuthShell>
  );
}
function SignupErrors() {
  return (
    <WAuthShell screenLabel="Signup — per-field validation" scene sceneLabel="sunrise" title="Create your account" footer={SIGNUP_LINK}
      notes={[
        'inline, per-field errors after submit \u2014 never toasts',
        'name required \u00b7 invalid email \u00b7 password too short',
        'red text + red border on each offending field',
      ]}>
      <SField label="Name" placeholder="Your name" error="Enter your name" i={1} />
      <SField label="Email" placeholder="you.example.com" error="Enter a valid email address" i={2} />
      <WPassField error="Use at least 8 characters" i={3} />
      <SBtn label="Create account" i={0} />
    </WAuthShell>
  );
}
function SignupTaken() {
  return (
    <WAuthShell screenLabel="Signup — email already in use" scene sceneLabel="sunrise" title="Create your account" footer={SIGNUP_LINK}
      notes={[
        'server-side conflict surfaced against the email field',
        '\u201CAn account with this email already exists.\u201D + an easy route to sign in',
        'other fields keep their values \u2014 nothing is lost',
      ]}>
      <SField label="Name" placeholder="Alex Rivera" i={1} />
      <SField label="Email" placeholder="alex@example.com" error="An account with this email already exists." i={2} />
      <WPassField i={3} />
      <SBtn label="Create account" i={0} />
    </WAuthShell>
  );
}
function SignupSubmitting() {
  return (
    <WAuthShell screenLabel="Signup — submitting" scene sceneLabel="sunrise" title="Create your account" footer={SIGNUP_LINK}
      notes={[
        'primary shows a spinner and is disabled while the account is created',
        'on success \u2192 the dedicated \u201CChoose your languages\u201D welcome, then the app',
      ]}>
      <SField label="Name" placeholder="Alex Rivera" i={1} />
      <SField label="Email" placeholder="alex@example.com" i={2} />
      <WPassField i={3} hint={null} />
      <WSubmitBtn submitting label="Create account" i={0} />
    </WAuthShell>
  );
}

// ===== Forgot password =====
function ForgotDefault() {
  return (
    <WAuthShell screenLabel="Forgot — default" scene sceneLabel="daylight" title="Reset your password" footer={BACK_LINK}
      notes={[
        'short explainer sets expectations before the single field',
        'one email field + one primary (\u201CSend reset link\u201D)',
        '\u201CBack to sign in\u201D is the cross-link here',
      ]}>
      <span style={{ fontSize: 14, color: '#6b6359' }}>Enter your email and we&rsquo;ll send you a reset link.</span>
      <SField label="Email" placeholder="you@example.com" i={1} />
      <SBtn label="Send reset link" i={0} />
    </WAuthShell>
  );
}
function ForgotInvalid() {
  return (
    <WAuthShell screenLabel="Forgot — invalid email" scene sceneLabel="daylight" title="Reset your password" footer={BACK_LINK}
      notes={['inline email validation, same convention as the rest of the family']}>
      <span style={{ fontSize: 14, color: '#6b6359' }}>Enter your email and we&rsquo;ll send you a reset link.</span>
      <SField label="Email" placeholder="you.example.com" error="Enter a valid email address" i={1} />
      <SBtn label="Send reset link" i={0} />
    </WAuthShell>
  );
}
function ForgotSubmitting() {
  return (
    <WAuthShell screenLabel="Forgot — submitting" scene sceneLabel="daylight" title="Reset your password" footer={BACK_LINK}
      notes={['spinner + disabled while the request is sent']}>
      <span style={{ fontSize: 14, color: '#6b6359' }}>Enter your email and we&rsquo;ll send you a reset link.</span>
      <SField label="Email" placeholder="you@example.com" i={1} />
      <WSubmitBtn submitting label="Send reset link" i={0} />
    </WAuthShell>
  );
}
function ForgotSent() {
  return (
    <WAuthShell screenLabel="Forgot — sent confirmation" scene sceneLabel="daylight" title="Check your email" footer={BACK_LINK}
      notes={[
        'form is replaced by a warm confirmation \u2014 not a terse line',
        'privacy: shows regardless of whether the email is registered (\u201Cif it exists, it\u2019s on its way\u201D)',
        'names the exact address it went to',
      ]}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, textAlign: 'center', padding: '2px 0 4px' }}>
        <SBox i={2} style={{ width: 46, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>&#9993;</SBox>
        <span style={{ fontSize: 14.5, color: '#6b6359', lineHeight: 1.45 }}>If an account exists, we&rsquo;ve sent a reset link to <span style={{ color: INK }}>you@example.com</span>.</span>
        <span style={{ fontSize: 13, color: FAINT }}>Didn&rsquo;t get it? Check spam, or <SLink>resend</SLink>.</span>
      </div>
    </WAuthShell>
  );
}

// ===== Reset password =====
function ResetDefault() {
  return (
    <WAuthShell screenLabel="Reset — default" scene sceneLabel="dusk" title="Set a new password" footer={BACK_LINK}
      notes={[
        'reached from the emailed link (carries a token)',
        'new password (min 8) + confirm; on success \u2192 back to sign in',
      ]}>
      <WPassField label="New password" i={1} />
      <WPassField label="Confirm password" hint={null} i={2} />
      <SBtn label="Set new password" i={0} />
    </WAuthShell>
  );
}
function ResetMismatch() {
  return (
    <WAuthShell screenLabel="Reset — validation (mismatch)" scene sceneLabel="dusk" title="Set a new password" footer={BACK_LINK}
      notes={[
        'password too short and \u201Cpasswords do not match\u201D \u2014 the latter against the confirm field',
        'same inline convention',
      ]}>
      <WPassField label="New password" i={1} />
      <WPassField label="Confirm password" hint={null} error="Passwords do not match" i={2} />
      <SBtn label="Set new password" i={0} />
    </WAuthShell>
  );
}
function ResetSubmitting() {
  return (
    <WAuthShell screenLabel="Reset — submitting" scene sceneLabel="dusk" title="Set a new password" footer={BACK_LINK}
      notes={['spinner + disabled while the new password is saved']}>
      <WPassField label="New password" i={1} />
      <WPassField label="Confirm password" hint={null} i={2} />
      <WSubmitBtn submitting label="Set new password" i={0} />
    </WAuthShell>
  );
}
function ResetExpired() {
  return (
    <WAuthShell screenLabel="Reset — expired / invalid link" scene sceneLabel="dusk" title="Link expired" footer={BACK_LINK}
      notes={[
        'dead-end recovery \u2014 a common real path when links are old or already used',
        'never traps: clear route back to Forgot password to request a fresh link',
        'friendly, not alarming',
      ]}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, textAlign: 'center', padding: '2px 0 4px' }}>
        <SBox i={2} style={{ width: 44, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Caveat', cursive", fontSize: 24, color: ACCENT_INK }}>!</SBox>
        <span style={{ fontSize: 14.5, color: '#6b6359', lineHeight: 1.45 }}>This reset link has expired. Request a new one and we&rsquo;ll send a fresh link.</span>
        <SBtn label="Request a new link" i={0} style={{ height: 44, fontSize: 15, padding: '0 18px' }} />
      </div>
    </WAuthShell>
  );
}

Object.assign(window, {
  SignupDefault, SignupErrors, SignupTaken, SignupSubmitting,
  ForgotDefault, ForgotInvalid, ForgotSubmitting, ForgotSent,
  ResetDefault, ResetMismatch, ResetSubmitting, ResetExpired,
});
