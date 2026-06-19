// Add-a-Card wireframes. One destination, segmented toggle (Type a word | From an image).
// Image mode is a full-screen stepper flow. Sketch primitives from wf-shared.jsx.

// —— shared context: languages + destination deck, unambiguous throughout ——
function WContext() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: FAINT, flex: 'none' }}>
      <span style={{ color: ACCENT_INK }}>EN</span>
      <span>&rarr;</span>
      <span style={{ color: ACCENT_INK }}>ES</span>
      <span>&middot;</span>
      <span>saves to your Spanish deck</span>
    </div>
  );
}

// —— segmented mode toggle ————————————————————————————————————
function WSeg({ mode }) {
  const half = (label, active) => (
    <div style={{
      flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, background: active ? ACCENT : 'transparent', color: active ? INK : FAINT,
      borderRadius: active ? '10px' : 0,
    }}>{label}</div>
  );
  return (
    <SBox i={2} style={{ display: 'flex', padding: 4, flex: 'none' }}>
      {half('Type a word', mode === 'type')}
      {half('From an image', mode === 'image')}
    </SBox>
  );
}

// —— top bar for the mode screens (back to deck + title) ————————
function WAddTop() {
  return (
    <div style={{ padding: '16px 20px 0', flex: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SLink>&lsaquo; My deck</SLink>
        <span style={{ fontSize: 19 }}>Add a Card</span>
        <span style={{ width: 48 }}></span>
      </div>
    </div>
  );
}

// —— five-stage progress indicator for the image flow ————————————
const STAGES = ['Image', 'Extract', 'Review', 'Translate', 'Add'];
function WStepper({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none', padding: '0 2px' }}>
      {STAGES.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 'none' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', border: `1.6px solid ${(done || active) ? ACCENT_INK : FAINT}`,
                background: active ? ACCENT : (done ? 'rgba(242,163,60,0.25)' : 'transparent'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: done ? ACCENT_INK : INK,
              }}>{done ? '\u2713' : i + 1}</span>
              <span style={{ fontSize: 10.5, color: active ? INK : FAINT, width: 50, textAlign: 'center' }}>{s}</span>
            </div>
            {i < STAGES.length - 1 ? <div style={{ flex: 1, height: 1.5, background: i < current ? ACCENT_INK : FAINT, marginTop: -16, opacity: 0.6 }}></div> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// —— flow header (image steps): back · title · cancel + stepper ————
function WFlowTop({ current, onBack }) {
  return (
    <div style={{ padding: '16px 18px 0', flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SLink>{onBack || '\u2039 Back'}</SLink>
        <span style={{ fontSize: 17 }}>From an image</span>
        <SLink>Cancel</SLink>
      </div>
      <WStepper current={current} />
    </div>
  );
}

// —— field with a link glyph + optional pending / error treatment ——
function WLinkedField({ label, value, placeholder, pending, error, struck }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        {pending ? <span style={{ fontSize: 12.5, color: ACCENT_INK }}>&#8635; translating&hellip;</span> : null}
      </div>
      <SBox i={1} style={{
        minHeight: 46, display: 'flex', alignItems: 'center', padding: '0 12px',
        borderColor: error ? RED : INK, borderStyle: pending ? 'dashed' : 'solid',
        background: pending ? 'rgba(242,163,60,0.08)' : PAPER,
      }}>
        {pending
          ? <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
              <div style={{ flex: 1, height: 9, borderRadius: 5, background: 'repeating-linear-gradient(90deg, rgba(176,111,30,0.25) 0 14px, transparent 14px 26px)' }}></div>
            </div>
          : <span style={{ fontSize: 16, color: value ? INK : FAINT, textDecoration: struck ? 'line-through' : 'none' }}>{value || placeholder}</span>}
      </SBox>
      {error ? <span style={{ fontSize: 13, color: RED }}>{error}</span> : null}
    </div>
  );
}

function WLinkGlyph() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: FAINT, flex: 'none' }}>
      <span style={{ flex: 1, height: 1.4, background: FAINT, opacity: 0.4, maxWidth: 70 }}></span>
      <span style={{ fontSize: 14 }}>&#8645; auto</span>
      <span style={{ flex: 1, height: 1.4, background: FAINT, opacity: 0.4, maxWidth: 70 }}></span>
    </div>
  );
}

// —— banner (success / error) ————————————————————————————————
function WBanner({ kind, children }) {
  const col = kind === 'error' ? RED : GREEN;
  return (
    <SBox i={3} style={{ borderColor: col, background: kind === 'error' ? 'rgba(217,106,82,0.08)' : 'rgba(105,164,94,0.1)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
      <span style={{ color: col, fontSize: 15 }}>{kind === 'error' ? '!' : '\u2713'}</span>
      <span style={{ fontSize: 14, color: INK }}>{children}</span>
    </SBox>
  );
}

// —— TYPE-A-WORD screen, parametrised ————————————————————————
// variant: 'empty' | 'translating' | 'errors' | 'saved'
function WTypeBody({ variant }) {
  const filled = variant === 'translating' || variant === 'errors';
  const saveReady = variant === 'errors';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px 18px', gap: 16, minHeight: 0 }}>
      <WContext />
      <WSeg mode="type" />
      {variant === 'saved' ? <WBanner kind="ok">Card saved &mdash; add another.</WBanner> : null}
      {variant === 'errors' ? <WBanner kind="error">Couldn&rsquo;t save card. Try again.</WBanner> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <WLinkedField label="English" value={filled ? 'the lion' : ''} placeholder="Type a word&hellip;" />
        <WLinkGlyph />
        <WLinkedField
          label="Spanish"
          value={variant === 'errors' ? 'el le\u00f3n' : ''}
          placeholder="Auto-fills, or type it"
          pending={variant === 'translating'}
          error={variant === 'errors' ? 'Translation unavailable \u2014 enter manually.' : null}
        />
      </div>
      <SBtn label="Save card" kind={saveReady ? 'primary' : 'ghost'} i={1} style={{ opacity: saveReady ? 1 : 0.5 }} />
      <span style={{ fontSize: 13, color: FAINT, textAlign: 'center' }}>
        {variant === 'saved' ? 'Last card added just now.' : 'Save unlocks once both sides are filled.'}
      </span>
    </div>
  );
}

function WTypeScreen({ variant, screenLabel, notes }) {
  return (
    <Board screenLabel={screenLabel} notes={notes}>
      <Phone>
        <WAddTop />
        <WTypeBody variant={variant} />
      </Phone>
    </Board>
  );
}

// —— IMAGE STEP A: pick ————————————————————————————————————
function WDrop({ state }) {
  // state: 'idle' | 'over' | 'error'
  const over = state === 'over';
  return (
    <SBox i={0} dashed style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 22, textAlign: 'center',
      borderColor: state === 'error' ? RED : (over ? ACCENT_INK : INK),
      background: over ? 'rgba(242,163,60,0.14)' : PAPER,
    }}>
      {/* upload glyph */}
      <div style={{ position: 'relative', width: 54, height: 46 }}>
        <div style={{ position: 'absolute', bottom: 0, left: 4, width: 46, height: 22, border: `1.8px solid ${INK}`, borderRadius: '8px 8px 4px 4px', borderTop: 'none' }}></div>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `11px solid ${ACCENT_INK}` }}></div>
        <div style={{ position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)', width: 4, height: 20, background: ACCENT_INK, borderRadius: 2 }}></div>
      </div>
      <span style={{ fontSize: 18 }}>{over ? 'Drop to upload' : 'Drag a photo here'}</span>
      {!over ? (
        <span style={{ fontSize: 14, color: FAINT, lineHeight: 1.4 }}>
          or <span style={{ textDecoration: 'underline', textDecorationColor: FAINT }}>browse your files</span><br></br>
          &middot; paste a screenshot (&#8984;V)
        </span>
      ) : null}
      <span style={{ fontSize: 12.5, color: FAINT }}>JPG &middot; PNG &middot; WebP</span>
    </SBox>
  );
}

function WPickScreen({ state, screenLabel, notes }) {
  return (
    <Board screenLabel={screenLabel} notes={notes}>
      <Phone>
        <WAddTop />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px 18px', gap: 16, minHeight: 0 }}>
          <WContext />
          <WSeg mode="image" />
          <WDrop state={state} />
          {state === 'error' ? <span style={{ fontSize: 13.5, color: RED, textAlign: 'center' }}>That file isn&rsquo;t supported. Use JPG, PNG or WebP under 10 MB.</span> : null}
        </div>
      </Phone>
    </Board>
  );
}

// —— image thumbnail placeholder (a photographed word list) ————————
function WThumb({ size = 'lg' }) {
  const h = size === 'lg' ? 150 : 76;
  return (
    <SBox i={1} style={{ height: h, flex: 'none', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 7, padding: 14, justifyContent: 'center', background: 'rgba(141,133,122,0.08)' }}>
      <span style={{ position: 'absolute', right: 8, top: 6, fontFamily: "'Caveat', cursive", fontSize: 13, color: FAINT }}>photo</span>
      {[78, 64, 70, 52].slice(0, size === 'lg' ? 4 : 2).map((w, i) => (
        <div key={i} style={{ height: size === 'lg' ? 10 : 8, width: w + '%', borderRadius: 3, background: 'rgba(47,42,38,0.18)' }}></div>
      ))}
    </SBox>
  );
}

// —— calm progress (extraction / translating / committing) ————————
function WProgress({ title, sub, lion }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      {lion ? (
        <div style={{ position: 'relative' }}>
          <LionMark size={84} />
          <span style={{ position: 'absolute', right: -6, bottom: 6, fontSize: 18 }}>&#128269;</span>
        </div>
      ) : <LionMark size={72} />}
      <span style={{ fontSize: 20 }}>{title}</span>
      <div style={{ width: '70%', height: 12, border: `1.6px solid ${INK}`, borderRadius: 7, overflow: 'hidden' }}>
        <div style={{ width: '55%', height: '100%', background: 'repeating-linear-gradient(90deg, rgba(242,163,60,0.6) 0 12px, transparent 12px 22px)' }}></div>
      </div>
      <span style={{ fontSize: 14, color: FAINT, lineHeight: 1.4 }}>{sub}</span>
    </div>
  );
}

// —— review-words row: keep checkbox · word (editable) · remove ————
function WReviewRow({ word, excluded, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: last ? 'none' : `1.4px dashed ${FAINT}` }}>
      <SBox i={1} style={{ width: 24, height: 24, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: excluded ? 'transparent' : ACCENT }}>{excluded ? '' : '\u2713'}</SBox>
      <span style={{ flex: 1, fontSize: 17, color: excluded ? FAINT : INK, textDecoration: excluded ? 'line-through' : 'none' }}>{word}</span>
      <SBox i={2} style={{ width: 28, height: 28, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>&#9998;</SBox>
      <span style={{ fontSize: 18, color: FAINT, flex: 'none' }}>&times;</span>
    </div>
  );
}

// —— translation pair row: native + target, both editable, may fail —
function WPairRow({ target, native, failed, last }) {
  return (
    <div style={{ padding: '12px 2px', borderBottom: last ? 'none' : `1.4px dashed ${FAINT}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: FAINT, width: 26, flex: 'none' }}>ES</span>
        <SBox i={1} style={{ flex: 1, minHeight: 38, display: 'flex', alignItems: 'center', padding: '0 11px', fontSize: 16 }}>{target}</SBox>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: FAINT, width: 26, flex: 'none' }}>EN</span>
        <SBox i={2} style={{ flex: 1, minHeight: 38, display: 'flex', alignItems: 'center', padding: '0 11px', fontSize: 16, borderColor: failed ? RED : INK, color: failed ? RED : INK }}>
          {failed ? 'Tap to enter manually' : native}
        </SBox>
      </div>
      {failed ? <span style={{ fontSize: 12.5, color: RED, marginLeft: 36 }}>Translation unavailable &mdash; enter manually.</span> : null}
    </div>
  );
}

Object.assign(window, {
  WContext, WSeg, WAddTop, WStepper, WFlowTop, WLinkedField, WLinkGlyph, WBanner,
  WTypeBody, WTypeScreen, WDrop, WPickScreen, WThumb, WProgress, WReviewRow, WPairRow,
});
