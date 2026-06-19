// Daybreak hi-fi — Add a Card screens. Atoms from daybreak-addcard.jsx.
// Mirrors the locked wireframe board-for-board.

function ACShell({ children, label }) {
  return (
    <PhoneShell bg={at.bg}>
      <div data-screen-label={label} style={{ display: 'flex', flexDirection: 'column', flex: 1, fontFamily: at.fontBody, minHeight: 0 }}>
        <StatusBar ink={at.ink} />
        {children}
      </div>
    </PhoneShell>
  );
}

// ============ TYPE A WORD ============
function ACTypeScreen({ variant, label }) {
  const filled = variant === 'translating' || variant === 'errors';
  const ready = variant === 'errors';
  return (
    <ACShell label={label}>
      <ACTop />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 20px 20px', gap: 18, minHeight: 0 }}>
        <ACContext />
        <ACSeg mode="type" />
        {variant === 'saved' ? <ACBanner kind="ok">Card saved &mdash; add another.</ACBanner> : null}
        {variant === 'errors' ? <ACBanner kind="error">Couldn&rsquo;t save card. Try again.</ACBanner> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ACField label="English" value={filled ? 'the lion' : ''} placeholder="Type a word…" />
          <ACLinkBadge />
          <ACField label="Spanish" value={variant === 'errors' ? 'el le\u00f3n' : ''} placeholder="Auto-fills, or type it" pending={variant === 'translating'} error={variant === 'errors' ? 'Translation unavailable \u2014 enter manually.' : null} />
        </div>
        <ACBtn label={variant === 'saving' ? '' : 'Save card'} kind={ready ? 'primary' : 'disabled'} />
        <span style={{ fontSize: 13, color: at.muted, textAlign: 'center' }}>{variant === 'saved' ? 'Last card added just now.' : 'Save unlocks once both sides are filled.'}</span>
      </div>
    </ACShell>
  );
}
function ACTypeEmpty() { return <ACTypeScreen variant="empty" label="Daybreak — Add, type empty" />; }
function ACTypeTranslating() { return <ACTypeScreen variant="translating" label="Daybreak — Add, translating" />; }
function ACTypeErrors() { return <ACTypeScreen variant="errors" label="Daybreak — Add, errors" />; }
function ACTypeSaved() { return <ACTypeScreen variant="saved" label="Daybreak — Add, saved" />; }

// ============ IMAGE — A: PICK ============
function ACPickScreen({ state, label }) {
  return (
    <ACShell label={label}>
      <ACTop />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 20px 20px', gap: 18, minHeight: 0 }}>
        <ACContext />
        <ACSeg mode="image" />
        <ACDrop state={state} />
        {state === 'error' ? <span style={{ fontSize: 13.5, fontWeight: 600, color: at.red, textAlign: 'center' }}>That file isn&rsquo;t supported. Use JPG, PNG or WebP under 10&nbsp;MB.</span> : null}
      </div>
    </ACShell>
  );
}
function ACPick() { return <ACPickScreen state="idle" label="Daybreak — Add, pick image" />; }
function ACPickOver() { return <ACPickScreen state="over" label="Daybreak — Add, drag-over + error" />; }

// ============ IMAGE — B: CONFIRM + DECK ============
function ACConfirm() {
  return (
    <ACShell label="Daybreak — Add, confirm + deck">
      <ACFlowTop current={0} back="Re-pick" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 20px 20px', gap: 16, minHeight: 0 }}>
        <ACThumb />
        <div style={{ display: 'flex', gap: 11 }}>
          <ACBtn label="Remove" kind="ghost" style={{ flex: 1, height: 42, fontSize: 14.5 }} />
          <ACBtn label="Change image" kind="ghost" style={{ flex: 1, height: 42, fontSize: 14.5 }} />
        </div>
        <ACDeckSelect />
        <div style={{ flex: 1 }}></div>
        <ACBtn label="Extract words" kind="primary" />
      </div>
    </ACShell>
  );
}

// ============ IMAGE — C: EXTRACTING / NO WORDS ============
function ACExtracting() {
  return (
    <ACShell label="Daybreak — Add, extracting">
      <ACFlowTop current={1} />
      <ACProgress searching title="Reading your image…" sub={<span>This can take up to 30&nbsp;seconds. Hang tight &mdash; your lion is sniffing out the words.</span>} />
      <div style={{ padding: '0 20px 22px', flex: 'none' }}><ACBtn label="Cancel" kind="ghost" style={{ height: 46, fontSize: 15 }} /></div>
    </ACShell>
  );
}
function ACNoWords() {
  return (
    <ACShell label="Daybreak — Add, no words / error">
      <ACFlowTop current={1} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px 20px', gap: 16, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#F3E3C6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LionFace size={56} {...at.lion} /></div>
          <span style={{ fontFamily: at.fontDisplay, fontSize: 21, fontWeight: 700, color: at.ink }}>No words found in this image.</span>
          <span style={{ fontSize: 14.5, color: at.muted, lineHeight: 1.5, maxWidth: 270 }}>Try a photo with clearer text, or choose a different image.</span>
          <ACBtn label="Choose another image" kind="primary" style={{ padding: '0 22px' }} />
        </div>
        <div style={{ borderRadius: 14, border: `1.5px solid #F2C9BF`, background: '#FCEBE6', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: at.red, letterSpacing: 0.4, textTransform: 'uppercase' }}>&mdash; or, on failure &mdash;</span>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: at.ink }}>Reading took too long. Your image is still here.</span>
          <ACBtn label="Try again" kind="ghost-danger" style={{ height: 42, fontSize: 15 }} />
        </div>
      </div>
    </ACShell>
  );
}

// ============ IMAGE — D: REVIEW WORDS ============
function ACReview() {
  const words = ['la monta\u00f1a', 'el r\u00edo', 'el bosque', 'la nube', 'sxsx???'];
  return (
    <ACShell label="Daybreak — Add, review words">
      <ACFlowTop current={2} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 18px', gap: 14, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
          <span style={{ fontFamily: at.fontDisplay, fontSize: 18, fontWeight: 700, color: at.ink }}>5 words found</span>
          <div style={{ display: 'flex', gap: 16, fontSize: 14, fontWeight: 700, color: at.link }}><span>Select all</span><span>None</span></div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {words.map((w, i) => <ACReviewRow key={i} word={w} excluded={i === 4} last={i === words.length - 1} />)}
        </div>
        <div style={{ flex: 'none' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: at.muted }}>Already in your deck &middot; skipped</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {['el sol', 'la luna'].map((w) => <span key={w} style={{ fontSize: 13.5, fontWeight: 600, color: at.muted, background: '#F1E9DD', borderRadius: 999, padding: '5px 12px', textDecoration: 'line-through' }}>{w}</span>)}
          </div>
        </div>
        <ACBtn label="Translate 4 words" kind="primary" icon={<Chevron c="#FFF" dir="right" size={8} />} style={{ flex: 'none' }} />
      </div>
    </ACShell>
  );
}

// ============ IMAGE — E: TRANSLATING / CHECK ============
function ACTranslating() {
  return (
    <ACShell label="Daybreak — Add, translating">
      <ACFlowTop current={3} />
      <ACProgress title="Translating 4 words…" sub="Almost there. You&rsquo;ll be able to check and fix each one." />
      <div style={{ padding: '0 20px 22px', flex: 'none' }}><ACBtn label="Cancel" kind="ghost" style={{ height: 46, fontSize: 15 }} /></div>
    </ACShell>
  );
}
function ACCheck() {
  return (
    <ACShell label="Daybreak — Add, check translations">
      <ACFlowTop current={3} back="Words" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 18px', gap: 12, minHeight: 0 }}>
        <span style={{ fontFamily: at.fontDisplay, fontSize: 18, fontWeight: 700, color: at.ink, flex: 'none' }}>Check translations</span>
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <ACPairRow target="la montaña" native="the mountain" />
          <ACPairRow target="el río" native="the river" />
          <ACPairRow target="el bosque" native="" failed />
          <ACPairRow target="la nube" native="the cloud" last />
        </div>
        <ACBtn label="Add 4 cards" kind="primary" style={{ flex: 'none' }} />
      </div>
    </ACShell>
  );
}

// ============ IMAGE — F: RESULT ============
function ACResultSuccess() {
  return (
    <ACShell label="Daybreak — Add, result success">
      <ACFlowTop current={4} cancel={false} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 28, textAlign: 'center' }}>
        <div style={{ width: 128, height: 128, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE7BC, #FFFDF8)', border: '1px solid #F0E3CF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <LionFace size={72} {...at.lion} />
          <span style={{ position: 'absolute', right: 6, top: 4, fontSize: 22 }}>&#10024;</span>
        </div>
        <span style={{ fontFamily: at.fontDisplay, fontSize: 30, fontWeight: 700, color: at.ink }}>4 cards added!</span>
        <span style={{ fontSize: 14.5, color: at.muted, lineHeight: 1.5, maxWidth: 250 }}>They&rsquo;re in your Spanish deck, ready to study.</span>
        <ACBtn label="Go to my deck" kind="primary" style={{ padding: '0 26px', marginTop: 4 }} />
      </div>
    </ACShell>
  );
}
function ACResultPartial() {
  const Row = ({ c, label, n }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15.5 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9, color: c, fontWeight: 600 }}><span style={{ width: 18, height: 18, borderRadius: '50%', background: c, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{label.glyph}</span>{label.text}</span>
      <span style={{ fontWeight: 700, color: at.ink }}>{n}</span>
    </div>
  );
  return (
    <ACShell label="Daybreak — Add, result partial / failed">
      <ACFlowTop current={4} cancel={false} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 20px', gap: 16, justifyContent: 'center' }}>
        <div style={{ background: '#FFFFFF', border: at.cardBorder, borderRadius: at.cardRadius, boxShadow: '0 10px 26px rgba(160,110,40,0.10)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontFamily: at.fontDisplay, fontSize: 21, fontWeight: 700, color: at.ink, textAlign: 'center' }}>Added with a few skips</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Row c={at.green} label={{ glyph: '\u2713', text: 'Added' }} n={3} />
            <Row c={at.muted} label={{ glyph: '\u2013', text: 'Already learned' }} n={2} />
            <Row c={at.red} label={{ glyph: '!', text: 'Couldn\u2019t add' }} n={1} />
          </div>
          <ACBtn label="Go to my deck" kind="primary" style={{ height: 50 }} />
        </div>
        <div style={{ borderRadius: 16, border: '1.5px solid #F2C9BF', background: '#FCEBE6', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: at.red, letterSpacing: 0.4, textTransform: 'uppercase' }}>&mdash; all-failed variant &mdash;</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: at.ink }}>Couldn&rsquo;t add cards &mdash; please try again.</span>
          <div style={{ display: 'flex', gap: 11, alignSelf: 'stretch' }}>
            <ACBtn label="Try again" kind="ghost-danger" style={{ flex: 1, height: 44, fontSize: 15 }} />
            <ACBtn label="Back to deck" kind="ghost" style={{ flex: 1, height: 44, fontSize: 15 }} />
          </div>
        </div>
      </div>
    </ACShell>
  );
}

Object.assign(window, {
  ACShell, ACTypeEmpty, ACTypeTranslating, ACTypeErrors, ACTypeSaved,
  ACPick, ACPickOver, ACConfirm, ACExtracting, ACNoWords,
  ACReview, ACTranslating, ACCheck, ACResultSuccess, ACResultPartial,
});
