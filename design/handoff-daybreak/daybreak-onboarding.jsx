// Daybreak hi-fi — Onboarding. Richer 3-step welcome + dropdown language pick +
// creating/error states + empty deck / no-search. Reuses au (d1Theme), LionFace,
// PhoneShell, StatusBar, and HabScene (real habitat preview on the promise step).
const ob = window.d1Theme;

function OnbShell({ label, children }) {
  return (
    <PhoneShell bg={ob.bg}>
      <div data-screen-label={label} style={{ display: 'flex', flexDirection: 'column', flex: 1, fontFamily: ob.fontBody, minHeight: 0 }}>
        <StatusBar ink={ob.ink} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 24px 24px', gap: 18, minHeight: 0 }}>{children}</div>
      </div>
    </PhoneShell>
  );
}

function OnbDots({ n, of = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {Array.from({ length: of }).map((_, i) => <span key={i} style={{ width: i + 1 === n ? 22 : 9, height: 9, borderRadius: 6, background: i + 1 === n ? ob.primary : '#EAD9BE' }}></span>)}
    </div>
  );
}
function OnbChevD({ c = ob.muted }) {
  return <span style={{ width: 9, height: 9, borderRight: `2.2px solid ${c}`, borderBottom: `2.2px solid ${c}`, transform: 'rotate(45deg)', display: 'inline-block', marginTop: -4 }}></span>;
}
function OnbSpin({ size = 18, on = '#FFF', track = 'rgba(255,255,255,0.4)' }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', border: `${Math.round(size / 7)}px solid ${track}`, borderTopColor: on, display: 'inline-block', animation: 'lc-spin 0.8s linear infinite' }}></span>;
}

// dropdown select (closed, open, or with a trailing spinner)
function OnbSelect({ label, value, placeholder, open, options, spinner }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, position: 'relative' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: ob.ink }}>{label}</span>
      <div style={{ height: 52, borderRadius: ob.fieldRadius, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', background: ob.surface, border: open ? `1.5px solid ${ob.primary}` : ob.fieldBorder }}>
        <span style={{ fontSize: 16, fontWeight: value ? 700 : 400, color: value ? ob.ink : ob.muted }}>{value || placeholder}</span>
        {spinner ? <OnbSpin size={18} on={ob.primary} track="rgba(242,138,31,0.25)" /> : <OnbChevD c={open ? ob.primary : ob.muted} />}
      </div>
      {open ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 84, zIndex: 6, background: ob.surface, borderRadius: 14, border: ob.cardBorder, boxShadow: '0 14px 30px rgba(160,110,40,0.2)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {options.map((o) => (
            <div key={o.name} style={{ height: 46, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', background: o.sel ? '#FFF1DC' : 'transparent', opacity: o.dis ? 0.45 : 1 }}>
              <span style={{ fontSize: 16, fontWeight: o.sel ? 700 : 400, color: ob.ink, flex: 1 }}>{o.name}</span>
              {o.dis ? <span style={{ fontSize: 12, color: ob.muted }}>your language</span> : (o.sel ? <span style={{ color: ob.primary, fontWeight: 700 }}>&#10003;</span> : null)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OnbBtn({ label, kind = 'primary', spinner, style }) {
  const base = { height: 52, borderRadius: ob.btnRadius, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: ob.fontDisplay, fontWeight: 700, fontSize: 17, boxSizing: 'border-box', ...style };
  if (kind === 'ghost') return <div style={{ ...base, background: ob.surface, border: '1.5px solid #EDDFC9', color: ob.ink }}>{label}</div>;
  if (kind === 'disabled') return <div style={{ ...base, background: '#F4E7D2', color: '#B49B78' }}>{label}</div>;
  return <div style={{ ...base, background: ob.primary, color: '#FFF', boxShadow: '0 10px 22px rgba(242,138,31,0.3)' }}>{spinner ? <OnbSpin /> : null}{label}</div>;
}

// ——— richer welcome, 3 steps ———
function ObMeet() {
  return (
    <OnbShell label="Daybreak — Onboarding, meet Leo">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <OnbDots n={1} /><span style={{ fontSize: 14, fontWeight: 600, color: ob.muted }}>Skip</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 156, height: 156, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE7BC, #FFFDF8)', border: '1px solid #F0E3CF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', right: 22, top: 20, width: 18, height: 18, borderRadius: '50%', background: '#FFC95C' }}></div>
          <LionFace size={92} {...ob.lion} />
        </div>
        <div style={{ fontFamily: ob.fontDisplay, fontSize: 28, fontWeight: 700, color: ob.ink }}>Meet Leo</div>
        <div style={{ fontSize: 15, color: ob.muted, lineHeight: 1.5, maxWidth: 250 }}>Your lion lives in a habitat that grows as you learn.</div>
      </div>
      <OnbBtn label="Next" />
    </OnbShell>
  );
}
function ObPromise() {
  return (
    <OnbShell label="Daybreak — Onboarding, the promise">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <OnbDots n={2} /><span style={{ fontSize: 14, fontWeight: 600, color: ob.muted }}>Skip</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ width: '100%', height: 210, borderRadius: 20, overflow: 'hidden', position: 'relative', border: ob.cardBorder, boxShadow: '0 10px 26px rgba(160,110,40,0.12)' }}>
          <HabScene level={4} mood="happy" />
        </div>
        <div style={{ fontFamily: ob.fontDisplay, fontSize: 24, fontWeight: 700, color: ob.ink }}>Learn words, grow your world</div>
        <div style={{ fontSize: 15, color: ob.muted, lineHeight: 1.5, maxWidth: 260 }}>Every word you master adds something new to the habitat.</div>
      </div>
      <OnbBtn label="Next" />
    </OnbShell>
  );
}
function ObChoose() {
  return (
    <OnbShell label="Daybreak — Onboarding, choose languages">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <OnbDots n={3} /><span style={{ width: 30 }}></span>
      </div>
      <div style={{ fontFamily: ob.fontDisplay, fontSize: 23, fontWeight: 700, color: ob.ink, textAlign: 'center', flex: 'none' }}>Choose your languages</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <OnbSelect label="I speak" value="English" />
        <OnbSelect label="I want to learn" placeholder="Choose a language" open options={[{ name: 'Spanish', sel: true }, { name: 'French' }, { name: 'English', dis: true }]} />
      </div>
      <OnbBtn label="Start learning" />
    </OnbShell>
  );
}

// ——— states ———
function ObCreating() {
  return (
    <OnbShell label="Daybreak — Onboarding, creating deck">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}><OnbDots n={3} /><span style={{ width: 30 }}></span></div>
      <div style={{ fontFamily: ob.fontDisplay, fontSize: 23, fontWeight: 700, color: ob.ink, textAlign: 'center', flex: 'none' }}>Choose your languages</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <OnbSelect label="I speak" value="English" />
        <OnbSelect label="I want to learn" value="Spanish" spinner />
      </div>
      <OnbBtn label={'Setting up your Spanish deck\u2026'} spinner />
    </OnbShell>
  );
}
function ObError() {
  return (
    <OnbShell label="Daybreak — Onboarding, error">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}><OnbDots n={3} /><span style={{ width: 30 }}></span></div>
      <div style={{ fontFamily: ob.fontDisplay, fontSize: 23, fontWeight: 700, color: ob.ink, textAlign: 'center', flex: 'none' }}>Choose your languages</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <OnbSelect label="I speak" value="English" />
        <OnbSelect label="I want to learn" value="Spanish" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: '#FCEBE6', border: '1.5px solid #F2C9BF' }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: ob.red, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flex: 'none' }}>!</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: ob.ink }}>Something went wrong. Try again.</span>
        </div>
      </div>
      <OnbBtn label="Try again" />
    </OnbShell>
  );
}

// ——— empty states ———
function ObEmptyDeck() {
  return (
    <OnbShell label="Daybreak — Empty deck">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LionFace size={26} {...ob.lion} /><span style={{ fontFamily: ob.fontDisplay, fontSize: 20, fontWeight: 700, color: ob.ink }}>Spanish deck</span></span>
        <div style={{ height: 34, padding: '0 11px', borderRadius: 10, border: '1.5px solid #EDDFC9', background: ob.surface, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#B4762A' }}>ES</span><OnbChevD /></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#FFF1DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LionFace size={66} {...ob.lion} /></div>
        <div style={{ fontFamily: ob.fontDisplay, fontSize: 22, fontWeight: 700, color: ob.ink }}>Your deck is empty</div>
        <div style={{ fontSize: 14.5, color: ob.muted, lineHeight: 1.5, maxWidth: 240 }}>Add a few words and Leo&rsquo;s habitat starts to grow.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: '80%', marginTop: 4 }}>
          <OnbBtn label="Browse words" style={{ height: 50 }} />
          <OnbBtn label="+ Add a card" kind="ghost" style={{ height: 50 }} />
        </div>
      </div>
    </OnbShell>
  );
}
function ObNoSearch() {
  return (
    <OnbShell label="Daybreak — No search results">
      <div style={{ height: 46, borderRadius: 12, background: ob.fieldBg, border: ob.fieldBorder, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', flex: 'none' }}>
        <span style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${ob.muted}`, position: 'relative', flex: 'none' }}><span style={{ position: 'absolute', right: -4, bottom: -3, width: 6, height: 2, background: ob.muted, borderRadius: 2, transform: 'rotate(45deg)' }}></span></span>
        <span style={{ fontSize: 15, color: ob.ink, flex: 1 }}>perro</span>
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EDE0CC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: ob.muted }}>&times;</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13, textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#F3E3C6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LionFace size={56} {...ob.lion} /></div>
        <div style={{ fontFamily: ob.fontDisplay, fontSize: 20, fontWeight: 700, color: ob.ink }}>No words match &ldquo;perro&rdquo;</div>
        <div style={{ fontSize: 14, color: ob.muted, lineHeight: 1.45, maxWidth: 230 }}>Try a different spelling, or clear the search.</div>
        <OnbBtn label="Clear search" kind="ghost" style={{ height: 44, padding: '0 18px', fontSize: 15 }} />
      </div>
    </OnbShell>
  );
}

Object.assign(window, {
  ob, OnbShell, OnbDots, OnbSelect, OnbBtn,
  ObMeet, ObPromise, ObChoose, ObCreating, ObError, ObEmptyDeck, ObNoSearch,
});
