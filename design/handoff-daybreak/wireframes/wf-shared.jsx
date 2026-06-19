// Shared sketch primitives for LeoCards wireframes
const INK = '#2f2a26';
const FAINT = '#8d857a';
const PAPER = '#fffdf8';
const ACCENT = 'rgba(242,163,60,0.5)'; // marker-orange highlight
const ACCENT_INK = '#b06f1e';
const GREEN = '#69a45e';
const RED = '#d96a52';

const WOB = [
  '255px 15px 225px 15px / 15px 225px 15px 255px',
  '15px 225px 15px 255px / 255px 15px 225px 15px',
  '225px 15px 255px 15px / 15px 255px 15px 225px',
  '15px 255px 15px 225px / 225px 15px 255px 15px',
];
const wobble = (i = 0) => WOB[i % WOB.length];

function SBox({ i = 0, dashed, style, children }) {
  return (
    <div style={{
      border: `1.6px ${dashed ? 'dashed' : 'solid'} ${INK}`,
      borderRadius: wobble(i),
      background: PAPER,
      ...style,
    }}>{children}</div>
  );
}

function Phone({ children, style }) {
  return (
    <div style={{
      width: 340, height: 720, flex: 'none', position: 'relative',
      border: `2.2px solid ${INK}`,
      borderRadius: '42px 38px 44px 40px / 40px 44px 38px 42px',
      background: PAPER, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Patrick Hand', cursive", color: INK,
      boxShadow: '3px 4px 0 rgba(47,42,38,0.12)',
      ...style,
    }}>{children}</div>
  );
}

function SField({ label, placeholder, error, i = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 15 }}>{label}</span>
      <SBox i={i} style={{
        height: 44, display: 'flex', alignItems: 'center', padding: '0 12px',
        borderColor: error ? RED : INK,
      }}>
        <span style={{ color: FAINT, fontSize: 15 }}>{placeholder}</span>
      </SBox>
      {error ? <span style={{ color: RED, fontSize: 14 }}>{error}</span> : null}
    </div>
  );
}

function SBtn({ label, kind = 'primary', i = 1, style }) {
  return (
    <SBox i={i} style={{
      height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, cursor: 'default',
      background: kind === 'primary' ? ACCENT : 'transparent',
      borderStyle: kind === 'ghost' ? 'dashed' : 'solid',
      ...style,
    }}>{label}</SBox>
  );
}

function SLink({ children, style }) {
  return (
    <span style={{
      textDecoration: 'underline', textDecorationStyle: 'wavy',
      textDecorationColor: FAINT, textUnderlineOffset: 3, fontSize: 14, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}

// Hand-doodled lion mark (wireframe-grade placeholder)
function LionMark({ size = 80, label }) {
  const s = size;
  const u = (n) => (n / 100) * s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: s, height: s, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, border: `2px dashed ${ACCENT_INK}`, borderRadius: '50% 48% 52% 50%' }}></div>
        <div style={{ position: 'absolute', left: u(15), top: u(15), width: u(70), height: u(70), border: `1.8px solid ${INK}`, borderRadius: '48% 52% 50% 50%', background: PAPER }}></div>
        <div style={{ position: 'absolute', left: u(14), top: u(8), width: u(16), height: u(16), border: `1.8px solid ${INK}`, borderRadius: '50%', background: PAPER }}></div>
        <div style={{ position: 'absolute', right: u(14), top: u(8), width: u(16), height: u(16), border: `1.8px solid ${INK}`, borderRadius: '50%', background: PAPER }}></div>
        <div style={{ position: 'absolute', left: u(36), top: u(42), width: u(5), height: u(5), background: INK, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', right: u(36), top: u(42), width: u(5), height: u(5), background: INK, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', left: u(46), top: u(56), width: u(8), height: u(6), border: `1.8px solid ${INK}`, borderTop: 'none', borderRadius: '0 0 50% 50%', background: PAPER }}></div>
      </div>
      {label ? <span style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: FAINT }}>{label}</span> : null}
    </div>
  );
}

// Annotation note (handwritten, for the margin column)
function Note({ children, style }) {
  return (
    <div style={{
      fontFamily: "'Caveat', cursive", fontSize: 17, lineHeight: 1.25,
      color: '#6b6359', ...style,
    }}>
      <span style={{ color: ACCENT_INK, marginRight: 4 }}>&#8617;</span>{children}
    </div>
  );
}

// Artboard inner layout: phone + margin notes
function Board({ screenLabel, notes, children }) {
  return (
    <div data-screen-label={screenLabel} style={{
      display: 'flex', gap: 18, padding: 18, alignItems: 'flex-start',
      background: '#fbf8f1', minHeight: '100%', boxSizing: 'border-box',
    }}>
      {children}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 28, width: 200, flex: 'none' }}>
        {notes.map((n, idx) => <Note key={idx}>{n}</Note>)}
      </div>
    </div>
  );
}

Object.assign(window, {
  INK, FAINT, PAPER, ACCENT, ACCENT_INK, GREEN, RED, wobble,
  SBox, Phone, SField, SBtn, SLink, LionMark, Note, Board,
});
