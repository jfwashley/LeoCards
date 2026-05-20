// habitats-shared.jsx — shared three.js scaffolding for all 3 habitat directions

const { useEffect, useRef, useState } = React;

// ---------- Scene scaffolding ----------
function buildSceneHost(canvas, w, h, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure || 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.bg || '#1a1a1a');
  if (opts.fog) scene.fog = new THREE.Fog(opts.fog, opts.fogNear || 20, opts.fogFar || 50);

  const camera = new THREE.PerspectiveCamera(opts.fov || 30, w / h, 0.1, 200);
  const camDist = opts.camDist || 18;
  const camHeight = opts.camHeight || 9;
  camera.position.set(camDist, camHeight, camDist);
  camera.lookAt(0, opts.lookY || 1, 0);

  return { renderer, scene, camera, camDist, camHeight, lookY: opts.lookY || 1 };
}

// Hand-rolled lightweight orbit: drag rotates around Y, auto-rotates idle.
function attachOrbit(canvas, camera, opts = {}) {
  const target = new THREE.Vector3(0, opts.lookY || 1, 0);
  let theta = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
  const radius = Math.hypot(camera.position.x - target.x, camera.position.z - target.z);
  const phi = Math.atan2(camera.position.y - target.y, radius);
  const r3d = Math.hypot(radius, camera.position.y - target.y);

  let dragging = false;
  let lastX = 0;
  let lastIdle = performance.now();
  const idleDelay = opts.idleDelay ?? 1200;
  const autoSpeed = opts.autoSpeed ?? 0.12;

  const onDown = (e) => {
    dragging = true;
    lastX = (e.touches ? e.touches[0].clientX : e.clientX);
    canvas.style.cursor = 'grabbing';
  };
  const onMove = (e) => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - lastX;
    lastX = x;
    theta -= dx * 0.008;
    lastIdle = performance.now();
  };
  const onUp = () => { dragging = false; canvas.style.cursor = 'grab'; lastIdle = performance.now(); };

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);

  canvas.style.cursor = 'grab';

  function tick(dt) {
    const now = performance.now();
    if (!dragging && now - lastIdle > idleDelay) {
      theta += autoSpeed * dt;
    }
    camera.position.x = target.x + Math.cos(phi) * r3d * Math.sin(theta);
    camera.position.z = target.x + Math.cos(phi) * r3d * Math.cos(theta);
    camera.position.y = target.y + Math.sin(phi) * r3d;
    camera.lookAt(target);
  }

  function dispose() {
    canvas.removeEventListener('mousedown', onDown);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('touchstart', onDown);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  }

  return { tick, dispose };
}

// React wrapper component each direction reuses.
function HabitatCanvas({ width, height, buildScene, label, palette, hud }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  // Track whether the Three.js scene has been built yet.
  const builtRef = useRef(false);
  const ctxRef = useRef(null);
  const orbitRef = useRef(null);
  const disposedRef = useRef(false);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrapper = wrapRef.current;
    if (!wrapper) return;
    disposedRef.current = false;

    // ── Lazy init: build the scene only when the artboard enters the viewport ──
    let rafId = 0, intervalId = 0;

    function stopAll() {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
      rafId = 0; intervalId = 0;
    }

    function startLoop(ctx, orbit) {
      let lastT = performance.now();
      function step(t) {
        if (disposedRef.current) return;
        try {
          const dt = Math.min(0.05, (t - lastT) / 1000);
          lastT = t;
          if (ctx.update) ctx.update(dt, t / 1000);
          orbit.tick(dt);
          ctx.renderer.render(ctx.scene, ctx.camera);
        } catch (e) {
          console.error('[HabitatCanvas] loop error', label, e);
        }
      }
      function startRaf() {
        const loop = (t) => { if (disposedRef.current) return; step(t); rafId = requestAnimationFrame(loop); };
        rafId = requestAnimationFrame(loop);
      }
      function startInterval() { intervalId = setInterval(() => step(performance.now()), 100); }
      stopAll();
      if (document.hidden) startInterval(); else startRaf();
      const visHandler = () => { stopAll(); if (!disposedRef.current) { if (document.hidden) startInterval(); else startRaf(); } };
      document.addEventListener('visibilitychange', visHandler);
      return () => { stopAll(); document.removeEventListener('visibilitychange', visHandler); };
    }

    function initScene() {
      if (builtRef.current) return;
      builtRef.current = true;
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const ctx = buildScene(canvas, width, height);
        const orbit = attachOrbit(canvas, ctx.camera, { lookY: ctx.lookY, idleDelay: 800 });
        ctxRef.current = ctx;
        orbitRef.current = orbit;
        // Eager first paint
        try {
          if (ctx.update) ctx.update(0.016, 0);
          orbit.tick(0.016);
          ctx.renderer.render(ctx.scene, ctx.camera);
          setReady(true);
        }
        catch (e) { console.error('[HabitatCanvas] initial render error', label, e); }
        ctx._stopLoop = startLoop(ctx, orbit);
      } catch (e) {
        console.error('[HabitatCanvas] build error', label, e);
      }
    }

    // IntersectionObserver: build on first scroll-into-view, pause/resume RAF
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!builtRef.current) {
            initScene();
          } else {
            // Resume loop if it was stopped
            const ctx = ctxRef.current;
            const orbit = orbitRef.current;
            if (ctx && orbit && !disposedRef.current) {
              stopAll();
              ctx._stopLoop = startLoop(ctx, orbit);
            }
          }
        } else {
          // Pause rendering when off-screen to free GPU bandwidth
          stopAll();
        }
      });
    }, { threshold: 0.01 });

    io.observe(wrapper);

    return () => {
      disposedRef.current = true;
      io.disconnect();
      stopAll();
      const ctx = ctxRef.current;
      const orbit = orbitRef.current;
      if (ctx && ctx._stopLoop) ctx._stopLoop();
      if (orbit) orbit.dispose();
      if (ctx) {
        ctx.renderer.dispose();
        ctx.scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => m.dispose && m.dispose());
          }
        });
      }
      ctxRef.current = null;
      orbitRef.current = null;
      builtRef.current = false;
    };
  }, [width, height, buildScene]);

  return (
    <div ref={wrapRef} style={{
      width, height, position: 'relative',
      background: palette.bg, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      {/* Loading skeleton — visible until first frame renders */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0,
          background: palette.bg,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 14, zIndex: 10,
        }}>
          {/* Pulsing clay mound silhouette */}
          <svg width="120" height="72" viewBox="0 0 120 72" fill="none" style={{ animation: 'hab-pulse 1.4s ease-in-out infinite' }}>
            <style>{`@keyframes hab-pulse { 0%,100%{opacity:.45} 50%{opacity:1} }`}</style>
            <ellipse cx="60" cy="58" rx="56" ry="22" fill="#a8d77c" opacity="0.7"/>
            <ellipse cx="60" cy="44" rx="38" ry="28" fill="#9bcf6a" opacity="0.8"/>
            {/* tiny lion silhouette */}
            <ellipse cx="60" cy="28" rx="10" ry="7" fill="#f0b558"/>
            <circle cx="60" cy="20" r="5.5" fill="#c97a3a"/>
            <circle cx="60" cy="20" r="3.5" fill="#f0b558"/>
          </svg>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
            textTransform: 'uppercase', color: 'rgba(74,64,112,0.55)',
          }}>Loading habitat…</div>
        </div>
      )}
      <canvas ref={canvasRef} width={width} height={height} style={{
        display: 'block', width: '100%', height: '100%',
        opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease',
      }} />
      {ready && <HUD label={label} palette={palette} hud={hud} />}
    </div>
  );
}

// Per-direction floating UI overlay so each artboard shows what's "unlocked"
// and how the design treats UI chrome.
function HUD({ label, palette, hud }) {
  const streakIcon = hud?.streakIcon ?? '★';
  const streakText = hud?.streakText ?? 'Day 12 · 84 cards';
  const levelText = hud?.levelText ?? 'Habitat · Lv 3';
  const ctaText = hud?.ctaText ?? 'Study 10 cards →';
  return (
    <>
      {/* top: streak badge */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px 8px 8px',
        background: palette.chipBg,
        color: palette.chipText,
        borderRadius: 999,
        fontSize: 13, fontWeight: 600,
        boxShadow: palette.chipShadow,
        backdropFilter: palette.chipBlur || 'none',
      }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: palette.accent,
          display: 'grid', placeItems: 'center',
          color: palette.accentText, fontSize: 14,
        }}>{streakIcon}</span>
        <span>{streakText}</span>
      </div>

      {/* top right: habitat progress */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        padding: '8px 12px',
        background: palette.chipBg,
        color: palette.chipText,
        borderRadius: 10,
        fontSize: 11, fontWeight: 600,
        letterSpacing: 0.4, textTransform: 'uppercase',
        boxShadow: palette.chipShadow,
        backdropFilter: palette.chipBlur || 'none',
      }}>
        {levelText}
      </div>

      {/* bottom: CTA */}
      <div style={{
        position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button style={{
          border: 'none', cursor: 'pointer',
          padding: '12px 22px',
          background: palette.ctaBg,
          color: palette.ctaText,
          borderRadius: 12,
          fontSize: 14, fontWeight: 700,
          boxShadow: palette.ctaShadow,
        }}>{ctaText}</button>
      </div>

      {/* style label tag */}
      <div style={{
        position: 'absolute', bottom: 18, left: 18,
        padding: '6px 10px',
        background: palette.tagBg,
        color: palette.tagText,
        borderRadius: 6,
        fontSize: 10, fontWeight: 700,
        letterSpacing: 0.8, textTransform: 'uppercase',
      }}>{label}</div>
    </>
  );
}

// Materials helpers
function flat(color) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
}
function smooth(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: opts.rough ?? 0.6, metalness: 0 });
}
function toon(color, gradMap) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradMap });
}
function makeToonGradient(steps = 3) {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round(((i + 1) / steps) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// expose
Object.assign(window, {
  HabitatCanvas, buildSceneHost, attachOrbit,
  flat, smooth, toon, makeToonGradient,
});
