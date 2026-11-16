import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MODULES, MOD, CREW, CREW_NOW, type ModuleId } from "../data/sim";

export type ShipProps = {
  selected: ModuleId | null;
  onSelect: (m: ModuleId) => void;
  colorOf: (m: ModuleId) => string;
  labelOf?: (m: ModuleId) => string;
  path?: ModuleId[];
  equipment?: string;
  showCrew: boolean;
  onFail: () => void;
  reduceMotion?: boolean;
  api?: React.MutableRefObject<{ zoom: (f: number) => void; reset: () => void } | null>;
};

const EQUIP_POS: Record<string, [number, number, number]> = {
  "Ventilation fan B": [-2.42, 0.2, 0.34],
  "CO₂ removal assembly": [-3.5, -0.25, 0.3],
  "Caution speaker · command deck hatch": [2.3, 0.3, 0.35],
  "Treadmill isolators": [0, -3.15, -0.3],
};

export default function Ship3D(p: ShipProps) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const live = useRef(p);
  live.current = p;
  const three = useRef<{
    meshes: Map<ModuleId, THREE.Mesh>;
    shells: Map<ModuleId, THREE.Mesh>;
    pathGroup: THREE.Group;
    crewGroup: THREE.Group;
    dirty: () => void;
  } | null>(null);
  const [hoverId, setHoverId] = useState<ModuleId | null>(null);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      p.onFail();
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const HOME = new THREE.Vector3(7.0, -8.4, 6.0);
    camera.position.copy(HOME);
    camera.up.set(0, 0, 1);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !p.reduceMotion;
    controls.dampingFactor = 0.12;
    controls.minDistance = 5;
    controls.maxDistance = 34;
    controls.target.set(-0.3, -0.4, 0);
    controls.enablePan = true;

    scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x1a2638, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(6, -5, 9);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9fb7d8, 0.5);
    fill.position.set(-6, 6, -4);
    scene.add(fill);

    const orient = (mesh: THREE.Object3D, axis: "x" | "y" | "z") => {
      if (axis === "x") mesh.rotation.z = Math.PI / 2;
      if (axis === "z") mesh.rotation.x = Math.PI / 2;
    };
    const meshes = new Map<ModuleId, THREE.Mesh>();
    const shells = new Map<ModuleId, THREE.Mesh>();
    for (const m of MODULES) {
      const geo = new THREE.CapsuleGeometry(m.rad, Math.max(0.1, m.len - m.rad * 1.1), 10, 28);
      const mat = new THREE.MeshStandardMaterial({ color: 0x9fb0c3, roughness: 0.55, metalness: 0.15, transparent: true, opacity: 0.94 });
      const mesh = new THREE.Mesh(geo, mat);
      orient(mesh, m.axis);
      mesh.position.set(...m.pos);
      mesh.userData.id = m.id;
      scene.add(mesh);
      meshes.set(m.id, mesh);
      // selection shell
      const shell = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x6fa0ff, side: THREE.BackSide, transparent: true, opacity: 0.9 }));
      shell.scale.setScalar(1.07);
      orient(shell, m.axis);
      shell.position.copy(mesh.position);
      shell.visible = false;
      scene.add(shell);
      shells.set(m.id, shell);
      // ring bands for a sense of structure
      const ring = new THREE.Mesh(new THREE.TorusGeometry(m.rad + 0.012, 0.018, 8, 40), new THREE.MeshStandardMaterial({ color: 0x4d5f76, roughness: 0.7 }));
      if (m.axis === "x") ring.rotation.y = Math.PI / 2;
      if (m.axis === "y") ring.rotation.x = Math.PI / 2;
      ring.position.copy(mesh.position);
      scene.add(ring);
    }
    // tunnels between neighbours
    const hull = new THREE.MeshStandardMaterial({ color: 0x6b7c93, roughness: 0.7, metalness: 0.2 });
    const done = new Set<string>();
    for (const m of MODULES)
      for (const nb of m.neighbours) {
        const key = [m.id, nb].sort().join("-");
        if (done.has(key)) continue;
        done.add(key);
        const a = new THREE.Vector3(...m.pos);
        const b = new THREE.Vector3(...MOD[nb].pos);
        const len = a.distanceTo(b);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, len, 16), hull);
        t.position.copy(a).lerp(b, 0.5);
        t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        scene.add(t);
      }
    // external systems
    const ext = (geo: THREE.BufferGeometry, color: number, pos: [number, number, number], rot?: [number, number, number], emissive = 0) => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, emissive, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
      mesh.position.set(...pos);
      if (rot) mesh.rotation.set(...rot);
      scene.add(mesh);
      return mesh;
    };
    ext(new THREE.CylinderGeometry(0.72, 0.72, 1.4, 28), 0x566579, [-5.0, 0, 0], [0, 0, Math.PI / 2]);
    ext(new THREE.ConeGeometry(0.5, 0.7, 24, 1, true), 0x3a4656, [-6.0, 0, 0], [0, 0, -Math.PI / 2]);
    for (const s of [1, -1]) {
      ext(new THREE.BoxGeometry(1.25, 3.3, 0.04), 0x1f3f73, [-3.3, s * 2.55, 0], undefined, 0x1b3a6b);
      ext(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), 0x8696aa, [-3.3, s * 0.8, 0]);
      for (let k = -1; k <= 1; k++) ext(new THREE.BoxGeometry(1.27, 0.02, 0.05), 0x8fa5c4, [-3.3, s * 2.55 + k * 0.8, 0]);
      ext(new THREE.BoxGeometry(1.1, 0.03, 1.5), 0xc9d2dc, [1.55, 0, s * 1.45]);
    }
    ext(new THREE.CapsuleGeometry(0.46, 0.5, 8, 20), 0x7f8ea3, [4.25, 0, 0], [0, 0, Math.PI / 2]);
    const dish = ext(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), 0xd5dce5, [3.05, 0.55, 0.95], [-Math.PI / 2.4, 0, 0]);
    dish.scale.z = 0.5;
    ext(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), 0x8696aa, [3.05, 0.3, 0.72], [Math.PI / 4, 0, 0]);

    const pathGroup = new THREE.Group();
    const crewGroup = new THREE.Group();
    scene.add(pathGroup, crewGroup);

    let needs = true;
    const dirty = () => (needs = true);
    three.current = { meshes, shells, pathGroup, crewGroup, dirty };
    controls.addEventListener("change", dirty);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // picking
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let down: [number, number] | null = null;
    const pick = (e: PointerEvent): ModuleId | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects([...meshes.values()])[0];
      return hit ? (hit.object.userData.id as ModuleId) : null;
    };
    const onDown = (e: PointerEvent) => (down = [e.clientX, e.clientY]);
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
      down = null;
      if (moved > 5) return;
      const id = pick(e);
      if (id) live.current.onSelect(id);
    };
    const onMove = (e: PointerEvent) => {
      if (down) return;
      const id = pick(e);
      renderer.domElement.style.cursor = id ? "pointer" : "grab";
      setHoverId(id);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);

    if (p.api)
      p.api.current = {
        zoom: (f) => {
          camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);
          controls.update();
          dirty();
        },
        reset: () => {
          camera.position.copy(HOME);
          controls.target.set(-0.3, -0.4, 0);
          controls.update();
          dirty();
        },
      };

    const v = new THREE.Vector3();
    let raf = 0;
    let t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      t += 0.016;
      const pulsing = pathGroup.children.length > 0 && !live.current.reduceMotion;
      if (pulsing) {
        pathGroup.children.forEach((c) => {
          const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
          m.opacity = 0.55 + Math.sin(t * 3) * 0.3;
        });
        needs = true;
      }
      if (!needs) return;
      needs = false;
      renderer.render(scene, camera);
      // project labels
      const box = labels.current;
      if (box) {
        const w = el.clientWidth;
        const h = el.clientHeight;
        for (const child of Array.from(box.children) as HTMLElement[]) {
          const id = child.dataset.id as ModuleId;
          const m = MOD[id];
          v.set(m.pos[0], m.pos[1], m.pos[2] + (m.axis === "z" ? (m.pos[2] > 0 ? m.len / 2 : -m.len / 2) : m.rad + 0.1));
          v.project(camera);
          child.style.transform = `translate(-50%,-100%) translate(${((v.x + 1) / 2) * w}px,${((1 - v.y) / 2) * h}px)`;
          child.style.opacity = v.z < 1 ? "1" : "0";
        }
      }
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      three.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reflect props into the scene
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    for (const m of MODULES) {
      const mesh = t.meshes.get(m.id)!;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(p.colorOf(m.id));
      const sel = p.selected === m.id;
      const inPath = p.path?.includes(m.id);
      mat.emissive.set(sel ? 0x1c3f86 : inPath ? 0x7a4a05 : hoverId === m.id ? 0x1a2d4d : 0x000000);
      mat.emissiveIntensity = sel ? 0.55 : 0.45;
      mat.opacity = p.path && !inPath && !sel ? 0.5 : 0.95;
      t.shells.get(m.id)!.visible = sel;
    }
    // path + equipment
    t.pathGroup.clear();
    if (p.path && p.path.length > 1) {
      const pts = p.path.map((id) => new THREE.Vector3(MOD[id].pos[0], MOD[id].pos[1], MOD[id].pos[2] + 0.02));
      if (p.equipment && EQUIP_POS[p.equipment]) pts.push(new THREE.Vector3(...EQUIP_POS[p.equipment]));
      const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.07, 10), new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.85, depthTest: false }));
      tube.renderOrder = 5;
      t.pathGroup.add(tube);
    }
    if (p.equipment && EQUIP_POS[p.equipment]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.95, depthTest: false }));
      e.position.set(...EQUIP_POS[p.equipment]);
      e.renderOrder = 6;
      t.pathGroup.add(e);
    }
    // crew
    t.crewGroup.clear();
    if (p.showCrew) {
      const count: Record<string, number> = {};
      CREW.forEach((c) => {
        const loc = CREW_NOW[c.id].module;
        const k = (count[loc] = (count[loc] ?? 0) + 1);
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: c.you ? 0x2f7bff : 0xffffff, depthTest: false }));
        const m = MOD[loc];
        s.position.set(m.pos[0] + (k - 1) * 0.32 - 0.16, m.pos[1], m.pos[2]);
        s.renderOrder = 7;
        t.crewGroup.add(s);
      });
    }
    t.dirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.selected, p.colorOf, p.path, p.equipment, p.showCrew, hoverId]);

  return (
    <div className="ship3d">
      <div ref={host} className="ship3d-canvas" />
      <div ref={labels} className="ship3d-labels" aria-hidden="true">
        {MODULES.map((m) => (
          <div key={m.id} data-id={m.id} className={`${p.selected === m.id ? "sel" : ""} ${hoverId === m.id ? "hov" : ""}`}>
            {m.short}
            {p.labelOf && <b>{p.labelOf(m.id)}</b>}
          </div>
        ))}
      </div>
    </div>
  );
}
