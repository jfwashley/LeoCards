// Daybreak hi-fi — Add a Card atoms. Mirrors the locked wireframe in the Daybreak
// visual language. Reuses dt / LionFace / PhoneShell / StatusBar + dashboard glyphs
// (Chevron, PlusGlyph, MagnifierGlyph, PencilGlyph, LangChip).
const at = window.d1Theme;

// ——— glyphs unique to this flow ———
function ACUpload({ c = at.primary, ink = at.ink }) {
  return (
    <div style={{ position: 'relative', width: 56, height: 50 }}>
      <div style={{ position: 'absolute', bottom: 0, left: 3, right: 3, height: 22, border: `2.4px solid ${ink}`, borderTop: 'none', borderRadius: '4px 4px 11px 11px' }}></div>
      <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `12px solid ${c}` }}></div>
      <div style={{ position: 'absolute', top: 13, left: '50%', transform: 'translateX(-50%)', width: 5, height: 22, background: c, borderRadius: 3 }}></div>
    </div>
  );
}
function ACSwap({ c = at.primary }) {
  return (
    <div style={{ position: 'relative', width: 18, height: 18 }}>
      <div style={{ position: 'absolute', left: 2, top: 1, width: 8, height: 8, borderLeft: `2.2px solid ${c}`, borderTop: `2.2px solid ${c}`, transform: 'rotate(45deg)' }}></div>
      <div style={{ position: 'absolute', left: 3, top: 1, width: 2.2, height: 16, background: c, borderRadius: 2 }}></div>
      <div style={{ position: 'absolute', right: 2, bottom: 1, width: 8, height: 8, borderRight: `2.2px solid ${c}`, borderBottom: `2.2px solid ${c}`, transform: 'rotate(45deg)' }}></div>
      <div style={{ position: 'absolute', right: 3, bottom: 1, width: 2.2, height: 16, background: c, borderRadius: 2 }}></div>
    </div>
  );
}
function ACCheckBox({ on }) {
  return (
    <span style={{ width: 26, height: 26, borderRadius: 8, flex: 'none', boxSizing: 'border-box', border: on ? 'none' : `2px solid #D8C7AC`, background: on ? at.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 14, fontWeight: 700 }}>{on ? '\u2713' : ''}</span>
  );
}
function ACClose({ c = at.muted, size = 18 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none', display: 'inline-block' }}>
      <span style={{ position: 'absolute', top: '46%', left: 0, width: size, height: 2.2, background: c, borderRadius: 2, transform: 'rotate(45deg)' }}></span>
      <span style={{ position: 'absolute', top: '46%', left: 0, width: size, height: 2.2, background: c, borderRadius: 2, transform: 'rotate(-45deg)' }}></span>
    </span>
  );
}
function ACSpinner({ size = 18, track = 'rgba(242,138,31,0.25)', head = at.primary }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', border: `${Math.round(size/7)}px solid ${track}`, borderTopColor: head, animation: 'lc-spin 0.8s linear infinite', flex: 'none' }}></div>;
}
function ACLeftChev({ c = at.link, size = 8 }) {
  return <span style={{ width: size, height: size, borderLeft: `2.2px solid ${c}`, borderBottom: `2.2px solid ${c}`, transform: 'rotate(45deg)', display: 'inline-block', flex: 'none' }}></span>;
}

// ——— context line: languages + destination deck ———
function ACContext() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 'none' }}>
      <LangChip code="EN" size={22} />
      <span style={{ color: at.muted, fontSize: 15 }}>&rarr;</span>
      <LangChip code="ES" size={22} />
      <span style={{ fontSize: 13.5, color: at.muted }}>saves to your <span style={{ color: at.ink, fontWeight: 700 }}>Spanish deck</span></span>
    </div>
  );
}

// ——— segmented mode toggle ———
function ACSeg({ mode }) {
  const seg = (label, glyph, active) => (
    <div style={{ flex: 1, height: 44, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: active ? '#FFFFFF' : 'transparent', boxShadow: active ? '0 2px 8px rgba(160,110,40,0.14)' : 'none', color: active ? at.ink : at.muted, fontWeight: 700, fontSize: 14.5 }}>
      {glyph}{label}
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 5, padding: 5, background: '#F4E7D2', borderRadius: 14, flex: 'none' }}>
      {seg('Type a word', <PencilGlyph c={mode === 'type' ? at.primary : at.muted} />, mode === 'type')}
      {seg('From an image', <ACMiniImg c={mode === 'image' ? at.primary : at.muted} />, mode === 'image')}
    </div>
  );
}
function ACMiniImg({ c }) {
  return (
    <span style={{ width: 16, height: 14, borderRadius: 3, border: `2px solid ${c}`, position: 'relative', display: 'inline-block', boxSizing: 'border-box' }}>
      <span style={{ position: 'absolute', left: 2, bottom: 1.5, width: 5, height: 5, borderRadius: '50%', background: c }}></span>
      <span style={{ position: 'absolute', right: -1, bottom: 1, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `6px solid ${c}` }}></span>
    </span>
  );
}

// ——— mode-screen top bar (back to deck + title) ———
function ACTop() {
  return (
    <div style={{ padding: '4px 20px 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: at.link, fontWeight: 700, fontSize: 15 }}>
        <ACLeftChev c={at.link} size={8} />
        <span>My deck</span>
      </div>
      <span style={{ fontFamily: at.fontDisplay, fontSize: 20, fontWeight: 700, color: at.ink }}>Add a Card</span>
      <span style={{ width: 64 }}></span>
    </div>
  );
}

// ——— five-stage progress indicator ———
const AC_STAGES = ['Image', 'Extract', 'Review', 'Translate', 'Add'];
function ACStepper({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flex: 'none', padding: '0 4px' }}>
      {AC_STAGES.map((s, i) => {
        const done = i < current, active = i === current;
        const dotBg = active ? at.primary : (done ? '#FCE4BE' : '#F1E6D2');
        const dotBorder = (active || done) ? at.primary : '#E4D4BA';
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 'none', width: 52 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', boxSizing: 'border-box', border: `2px solid ${dotBorder}`, background: dotBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: active ? '#FFF' : (done ? at.link : at.muted) }}>{done ? '\u2713' : i + 1}</span>
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600, color: active ? at.ink : at.muted, textAlign: 'center', lineHeight: 1.1 }}>{s}</span>
            </div>
            {i < AC_STAGES.length - 1 ? <div style={{ flex: 1, height: 2.5, borderRadius: 2, background: done ? at.primary : '#E4D4BA', marginTop: 11 }}></div> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ——— flow header (image steps) ———
function ACFlowTop({ current, back = 'Back', cancel = true }) {
  return (
    <div style={{ padding: '4px 18px 0', flex: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: at.link, fontWeight: 700, fontSize: 14.5 }}><ACLeftChev c={at.link} size={8} />{back}</span>
        <span style={{ fontFamily: at.fontDisplay, fontSize: 17, fontWeight: 700, color: at.ink }}>From an image</span>
        <span style={{ color: cancel ? at.muted : 'transparent', fontWeight: 600, fontSize: 14.5, width: 52, textAlign: 'right' }}>Cancel</span>
      </div>
      <ACStepper current={current} />
    </div>
  );
}

// ——— banner ———
function ACBanner({ kind, children }) {
  const ok = kind !== 'error';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, flex: 'none', background: ok ? '#EAF5EC' : '#FCEBE6', border: `1.5px solid ${ok ? '#C5E4CD' : '#F2C9BF'}` }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', flex: 'none', background: ok ? at.green : at.red, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{ok ? '\u2713' : '!'}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: at.ink }}>{children}</span>
    </div>
  );
}

// ——— linked translation field (type mode) ———
function ACField({ label, value, placeholder, pending, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 18 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: at.ink, letterSpacing: 0.2 }}>{label}</span>
        {pending ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: at.primary }}><ACSpinner size={13} /> Translating&hellip;</span> : null}
      </div>
      <div style={{ minHeight: 54, borderRadius: at.fieldRadius, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 15px', background: pending ? '#FFF8EC' : at.fieldBg, border: error ? `1.5px solid ${at.red}` : (value ? `1.5px solid ${at.primary}` : at.fieldBorder) }}>
        {pending
          ? <div className="ac-shimmer" style={{ height: 13, width: '62%', borderRadius: 7 }}></div>
          : <span style={{ fontSize: 18, fontWeight: value ? 700 : 400, color: value ? at.ink : at.muted }}>{value || placeholder}</span>}
      </div>
      {error ? <span style={{ fontSize: 12.5, fontWeight: 600, color: at.red }}>{error}</span> : null}
    </div>
  );
}

// ——— link badge that sits between the two fields ———
function ACLinkBadge() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '-4px 0', flex: 'none' }}>
      <span style={{ flex: 1, height: 1.5, background: '#EDDFC9', maxWidth: 90 }}></span>
      <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#FFF1DC', border: '1.5px solid #F0E3CF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ACSwap /></span>
      <span style={{ flex: 1, height: 1.5, background: '#EDDFC9', maxWidth: 90 }}></span>
    </div>
  );
}

// ——— big primary / disabled / ghost button ———
function ACBtn({ label, kind = 'primary', style, icon }) {
  const base = { height: 54, borderRadius: at.btnRadius, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: at.fontDisplay, fontWeight: 700, fontSize: 18, boxSizing: 'border-box', ...style };
  if (kind === 'disabled') return <div style={{ ...base, background: '#F4E7D2', color: '#B49B78' }}>{label}</div>;
  if (kind === 'ghost') return <div style={{ ...base, background: '#FFFFFF', border: '1.5px solid #EDDFC9', color: at.ink }}>{icon}{label}</div>;
  if (kind === 'ghost-danger') return <div style={{ ...base, background: '#FFFFFF', border: `1.5px solid ${at.red}`, color: at.red }}>{label}</div>;
  return <div style={{ ...base, background: at.primary, color: '#FFF', boxShadow: '0 10px 22px rgba(242,138,31,0.30)' }}>{icon}{label}</div>;
}

// ——— drop zone (pick) ———
function ACDrop({ state }) {
  const over = state === 'over', err = state === 'error';
  return (
    <div style={{ flex: 1, minHeight: 0, borderRadius: at.cardRadius, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', border: `2.5px dashed ${err ? at.red : (over ? at.primary : '#E4D2B2')}`, background: over ? '#FFF1D9' : '#FFFDF9' }}>
      <ACUpload c={err ? at.red : at.primary} ink={over ? at.primary : at.ink} />
      <span style={{ fontFamily: at.fontDisplay, fontSize: 20, fontWeight: 700, color: at.ink }}>{over ? 'Drop to upload' : 'Upload a Photo'}</span>
      {!over ? (
        <span style={{ fontSize: 14.5, color: at.muted, lineHeight: 1.5 }}>
          or <span style={{ color: at.link, fontWeight: 700 }}>browse your files</span><br></br>
          &middot; paste a screenshot (&#8984;V)
        </span>
      ) : null}
      <span style={{ fontSize: 12.5, fontWeight: 600, color: at.muted, background: '#FFF1DC', padding: '4px 11px', borderRadius: 999 }}>JPG &middot; PNG &middot; WebP</span>
    </div>
  );
}

// ——— image thumbnail (photographed word list) ———
function ACThumb() {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', flex: 'none', position: 'relative', height: 168, background: 'linear-gradient(150deg, #F3E7D2, #EADBC2)', border: at.cardBorder, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 11, padding: '0 22px' }}>
      <span style={{ position: 'absolute', right: 11, top: 9, fontSize: 11, fontWeight: 700, color: at.muted, background: 'rgba(255,255,255,0.7)', padding: '3px 8px', borderRadius: 999 }}>photo.jpg</span>
      {[80, 62, 72, 50].map((w, i) => <div key={i} style={{ height: 11, width: w + '%', borderRadius: 4, background: 'rgba(74,51,28,0.18)' }}></div>)}
    </div>
  );
}

// ——— calm progress (extraction / translating / committing) ———
function ACProgress({ title, sub, searching }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 28, textAlign: 'center' }}>
      <div style={{ width: 116, height: 116, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE7BC, #FFFDF8)', border: '1px solid #F0E3CF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', right: 16, top: 14, width: 14, height: 14, borderRadius: '50%', background: '#FFC95C' }}></div>
        <LionFace size={62} {...at.lion} />
        {searching ? <div style={{ position: 'absolute', right: 10, bottom: 12, width: 30, height: 30, borderRadius: '50%', border: `3px solid ${at.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF' }}><span style={{ width: 9, height: 2.5, background: at.primary, borderRadius: 2, transform: 'rotate(45deg)', position: 'absolute', right: -4, bottom: 2 }}></span></div> : null}
      </div>
      <span style={{ fontFamily: at.fontDisplay, fontSize: 23, fontWeight: 700, color: at.ink }}>{title}</span>
      <div style={{ width: '74%', height: 12, borderRadius: 7, background: '#F1E6D2', overflow: 'hidden', position: 'relative' }}>
        <div className="ac-indeterminate" style={{ position: 'absolute', top: 0, bottom: 0, width: '42%', borderRadius: 7, background: at.primary }}></div>
      </div>
      <span style={{ fontSize: 14.5, color: at.muted, lineHeight: 1.5, maxWidth: 280 }}>{sub}</span>
    </div>
  );
}

// ——— review-words row ———
function ACReviewRow({ word, excluded, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 2px', borderBottom: last ? 'none' : '1px solid #F4ECDD' }}>
      <ACCheckBox on={!excluded} />
      <span style={{ flex: 1, fontSize: 17.5, fontWeight: 600, color: excluded ? at.muted : at.ink, textDecoration: excluded ? 'line-through' : 'none' }}>{word}</span>
      <div style={{ width: 34, height: 34, borderRadius: 10, border: '1.5px solid #EDDFC9', background: '#FFFBF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><PencilGlyph c={at.ink} /></div>
      <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ACClose c={at.muted} /></div>
    </div>
  );
}

// ——— translation pair row ———
function ACPairRow({ target, native, failed, last }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: last ? 'none' : '1px solid #F4ECDD', display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: at.muted, width: 24, flex: 'none' }}>ES</span>
        <div style={{ flex: 1, minHeight: 46, borderRadius: 11, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 13px', background: at.fieldBg, border: at.fieldBorder, fontSize: 16.5, fontWeight: 700, color: at.ink }}>{target}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: at.muted, width: 24, flex: 'none' }}>EN</span>
        <div style={{ flex: 1, minHeight: 46, borderRadius: 11, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 13px', background: failed ? '#FFFBF4' : at.fieldBg, border: failed ? `1.5px solid ${at.red}` : at.fieldBorder, fontSize: 16.5, color: failed ? at.red : at.ink, fontWeight: failed ? 600 : 400 }}>{failed ? 'Tap to enter manually' : native}</div>
      </div>
      {failed ? <span style={{ fontSize: 12.5, fontWeight: 600, color: at.red, marginLeft: 35 }}>Translation unavailable &mdash; enter manually.</span> : null}
    </div>
  );
}

// ——— deck selector row ———
function ACDeckSelect() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: at.ink }}>Add words to</span>
      <div style={{ height: 52, borderRadius: at.fieldRadius, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', background: '#FFFFFF', border: at.fieldBorder }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><LangChip code="ES" size={22} /><span style={{ fontSize: 16, fontWeight: 700, color: at.ink }}>Spanish deck</span></span>
        <Chevron c={at.muted} dir="down" size={8} />
      </div>
      <span style={{ fontSize: 12.5, color: at.muted }}>Defaults to your active deck &middot; change it or create a new one</span>
    </div>
  );
}

Object.assign(window, {
  at, ACUpload, ACSwap, ACCheckBox, ACClose, ACSpinner, ACContext, ACSeg, ACMiniImg,
  ACTop, ACStepper, ACFlowTop, ACBanner, ACField, ACLinkBadge, ACBtn, ACDrop, ACThumb,
  ACProgress, ACReviewRow, ACPairRow, ACDeckSelect,
});
