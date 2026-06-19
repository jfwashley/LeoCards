// Direction 1 — "Daybreak": warm, friendly evolution of today's LeoCards.
// Soft morning light, rounded type, amber primary.

const d1 = {
  bg: '#FFF6E9', surface: '#FFFFFF', ink: '#4A331C', muted: '#9C8467',
  primary: '#F28A1F', primaryText: '#FFFFFF', link: '#C96F12',
  fontDisplay: "'Baloo 2', sans-serif", displayWeight: 700, fontBody: "'Figtree', sans-serif",
  fieldBg: '#FFFBF4', fieldBorder: '1.5px solid #EDDFC9', fieldRadius: 12,
  btnRadius: 14, cardRadius: 22, ghost: '#FFFFFF',
  cardBorder: '1px solid #F0E3CF', cardShadow: '0 12px 30px rgba(160, 110, 40, 0.16)',
  green: '#3E9B5F', red: '#DE5F4A',
  pillBg: '#FFF1DC', pillText: '#B4762A',
  hintBg: '#FFFFFF', hintText: '#9C8467', hintBorder: '1.5px solid #F0E3CF',
  quitBorder: '1.5px solid #EDDFC9', quitBg: '#FFFFFF',
  lion: { mane: '#E8973B', face: '#FFD9A6', muzzle: '#FFF1DC', ink: '#4A331C' },
};

function D1Scene() {
  const grass = (left, w) => (
    <div style={{ position: 'absolute', bottom: 30, left, width: w, height: 10, borderRadius: 3, background: 'rgba(116, 78, 24, 0.25)', transform: 'rotate(-12deg)' }}></div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FFE7BC 0%, #FFF3DC 100%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: 30, top: 20, width: 58, height: 58, borderRadius: '50%', background: '#FFC95C', boxShadow: '0 0 0 14px rgba(255, 201, 92, 0.25)' }}></div>
      <div style={{ position: 'absolute', left: '-18%', bottom: -78, width: '135%', height: 170, borderRadius: '50%', background: '#F7D592' }}></div>
      <div style={{ position: 'absolute', right: '-14%', bottom: -66, width: '125%', height: 140, borderRadius: '50%', background: '#EFB964' }}></div>
      {grass('11%', 16)}{grass('22%', 11)}{grass('74%', 15)}{grass('85%', 10)}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 36 }}>
        <LionFace size={88} {...d1.lion} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 11, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#8A6235', fontFamily: d1.fontBody }}>
        Your lion is waiting.
      </div>
    </div>
  );
}

function LoginDaybreak() { return <HiFiLogin t={d1} scene={<D1Scene />} screenLabel="Daybreak — Login" />; }
function StudyDaybreak() { return <HiFiStudy t={d1} screenLabel="Daybreak — Study" />; }

Object.assign(window, { LoginDaybreak, StudyDaybreak, d1Theme: d1, D1Scene });
