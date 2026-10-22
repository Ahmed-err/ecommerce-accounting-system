// WebGL hero scene: the brand's lightning bolt in brushed amber metal, two cable rings
// orbiting it and a field of sparks. Imported only by Hero3D (after capability checks), so
// three.js never ships in the main bundle. Returns a cleanup function.
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  Shape,
  TorusGeometry,
  WebGLRenderer,
} from "three";

const AMBER = new Color("#f2a20c");
const AMBER_HOT = new Color("#ffcf5c");
const STEEL = new Color("#1e2a3a");

function boltShape() {
  // Same silhouette as the logo's bolt, centered on the origin.
  const s = new Shape();
  s.moveTo(0.35, 1.6);
  s.lineTo(-0.85, -0.15);
  s.lineTo(-0.05, -0.15);
  s.lineTo(-0.45, -1.6);
  s.lineTo(0.9, 0.35);
  s.lineTo(0.1, 0.35);
  s.lineTo(0.35, 1.6);
  return s;
}

export function mountHeroScene(canvas, { lowPower = false, rtl = false, narrow = false, onReady } = {}) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !lowPower, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5));

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 8);

  scene.add(new AmbientLight(0xffffff, 0.55));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new PointLight(AMBER_HOT, 18, 12);
  rim.position.set(-3, -1, 2);
  scene.add(rim);

  const rig = new Group();
  scene.add(rig);

  // Bolt: beveled extrusion, metallic amber with a soft inner glow.
  const boltGeo = new ExtrudeGeometry(boltShape(), {
    depth: 0.45,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: lowPower ? 2 : 4,
  });
  boltGeo.center();
  const boltMat = new MeshPhysicalMaterial({
    color: AMBER,
    metalness: 0.75,
    roughness: 0.28,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    emissive: AMBER,
    emissiveIntensity: 0.18,
  });
  const bolt = new Mesh(boltGeo, boltMat);
  // The product cards sit in the middle of the canvas, so the bolt floats at the outer top
  // corner (away from the headline: right in English, left in Arabic) where it stays visible.
  const boltHolder = new Group();
  boltHolder.position.set(rtl ? -1.7 : 1.7, 0.95, 0.6);
  boltHolder.scale.setScalar(0.62);
  boltHolder.add(bolt);
  // On phones the cards fill the width and the bolt would crowd the buttons: rings only.
  if (!narrow) rig.add(boltHolder);
  // Warm glow behind the bolt.
  const glow = new PointLight(AMBER_HOT, 10, 4);
  glow.position.set(rtl ? -1.7 : 1.7, 0.95, 1.6);
  if (!narrow) rig.add(glow);

  // Cable rings: thin dark tori with amber "current" tori just inside them.
  const ringMat = new MeshStandardMaterial({ color: STEEL, metalness: 0.5, roughness: 0.4, emissive: AMBER, emissiveIntensity: 0.12 });
  const currentMat = new MeshStandardMaterial({ color: AMBER_HOT, emissive: AMBER_HOT, emissiveIntensity: 1.2 });
  const segs = lowPower ? 64 : 128;
  const rings = [
    { r: 2.2, tilt: [1.15, 0.25, 0], speed: 0.32 },
    { r: 2.75, tilt: [1.45, -0.55, 0.4], speed: -0.22 },
  ].map(({ r, tilt, speed }) => {
    const g = new Group();
    g.rotation.set(...tilt);
    g.add(new Mesh(new TorusGeometry(r, 0.035, 10, segs), ringMat));
    const current = new Mesh(new TorusGeometry(r, 0.05, 8, segs, Math.PI * 0.35), currentMat);
    g.add(current);
    rig.add(g);
    return { g, current, speed };
  });

  // Sparks: additive points drifting upward around the bolt.
  const count = lowPower ? 120 : 260;
  const pos = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = 1.2 + Math.random() * 2.6;
    pos[i * 3] = Math.cos(a) * rad;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
    pos[i * 3 + 2] = Math.sin(a) * rad * 0.6;
    speeds[i] = 0.15 + Math.random() * 0.45;
  }
  const sparkGeo = new BufferGeometry();
  sparkGeo.setAttribute("position", new BufferAttribute(pos, 3));
  const sparkMat = new PointsMaterial({
    color: AMBER_HOT,
    size: lowPower ? 0.05 : 0.04,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const sparks = new Points(sparkGeo, sparkMat);
  rig.add(sparks);

  // Input: pointer (desktop) and scroll progress through the hero.
  const target = { x: 0, y: 0 };
  const onPointer = (e) => {
    if (e.pointerType === "touch") return;
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  let scroll = 0;
  const onScroll = () => {
    const r = canvas.getBoundingClientRect();
    scroll = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole rig in frame on narrow screens.
    camera.position.z = w / h < 0.9 ? 10.5 : 8;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Render only while visible on screen and the tab is in front.
  let visible = true;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) start();
  });
  io.observe(canvas);
  const onVis = () => !document.hidden && start();
  document.addEventListener("visibilitychange", onVis);

  let raf = 0;
  let last = performance.now();
  let t = 0;
  let readySent = false;
  const frame = (now) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    // Ease toward the pointer; scrolling away turns the bolt and sinks the rig.
    rig.rotation.y += ((target.x * 0.5 + scroll * 1.6) - rig.rotation.y) * 0.06;
    rig.rotation.x += ((target.y * 0.25 + scroll * 0.35) - rig.rotation.x) * 0.06;
    rig.position.y = -scroll * 1.2 + Math.sin(t * 0.9) * 0.08;
    bolt.rotation.y = Math.sin(t * 0.6) * 0.45;
    bolt.rotation.z = Math.sin(t * 0.4) * 0.08;
    glow.intensity = 8 + (Math.sin(t * 3.1) * 0.5 + 0.5) * 6;
    boltMat.emissiveIntensity = 0.16 + (Math.sin(t * 3.1) * 0.5 + 0.5) * 0.14;

    for (const ring of rings) ring.current.rotation.z += ring.speed * dt * 3;

    const p = sparkGeo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] += speeds[i] * dt;
      if (p[i * 3 + 1] > 2.6) p[i * 3 + 1] = -2.6;
    }
    sparkGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    if (!readySent) {
      readySent = true;
      onReady?.();
    }
    raf = requestAnimationFrame(frame);
  };
  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  start();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVis);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose?.();
    });
    renderer.dispose();
  };
}
