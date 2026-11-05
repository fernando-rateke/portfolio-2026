"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type ScenePhase = "hero" | "about" | "projects" | "skills" | "subjects" | "gallery" | "finale";

const PHASES: ScenePhase[] = ["hero", "about", "projects", "skills", "subjects", "gallery", "finale"];
const POINT_COUNT = 180;

function smoothstep(t: number) { return t * t * (3 - 2 * t); }

function setGroupOpacity(group: THREE.Group, opacity: number) {
  group.visible = opacity > 0.01;
  group.scale.setScalar(Math.max(0.001, opacity));
  group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach((mat) => {
      mat.transparent = true;
      mat.opacity = opacity * ((mat.userData.maxOpacity as number) ?? 0.48);
    });
  });
}

export default function SculptureScene({ mode, onReady }: { mode: ScenePhase; onReady: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<ScenePhase>(mode ?? "hero");

  // A cena lê o modo atual pelo ref dentro do loop de animação
  useEffect(() => {
    modeRef.current = mode ?? "hero";
  }, [mode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── renderer, scene, camera, lights ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9.5);
    const root = new THREE.Group();
    scene.add(root);

    scene.add(new THREE.AmbientLight(0xfff1eb, 1.25));
    const rl = new THREE.PointLight(0xd52230, 22, 18); rl.position.set(-4, -2, 3); scene.add(rl);
    const wl = new THREE.PointLight(0xfff1eb, 18, 20); wl.position.set(4, 5, 5); scene.add(wl);

    /* ── particle targets for every formation ── */
    const targets: Record<ScenePhase, Float32Array> = {} as Record<ScenePhase, Float32Array>;
    PHASES.forEach((p) => { targets[p] = new Float32Array(POINT_COUNT * 3); });

    for (let i = 0; i < POINT_COUNT; i++) {
      const o = i * 3;
      const n = i / (POINT_COUNT - 1);

      // Hero – golden-angle sphere
      const hY = 1 - n * 2, hR = Math.sqrt(1 - hY * hY), hA = Math.PI * (3 - Math.sqrt(5)) * i;
      targets.hero[o] = Math.cos(hA) * hR * 2.25; targets.hero[o + 1] = hY * 2.25; targets.hero[o + 2] = Math.sin(hA) * hR * 2.25;

      // About – layered planes
      const pl = i % 6, pi = Math.floor(i / 6);
      targets.about[o] = (pl - 2.5) * 0.72 + Math.sin(pi * 0.7) * 0.18;
      targets.about[o + 1] = ((pi % 9) - 4) * 0.47;
      targets.about[o + 2] = (pl - 2.5) * 0.38;

      // Projects – blueprint towers
      const e = i % 12, fl = Math.floor(i / 12), sd = e < 6 ? -1 : 1;
      targets.projects[o] = sd * (1.15 + (e % 3) * 0.68);
      targets.projects[o + 1] = (fl - 5.5) * 0.38;
      targets.projects[o + 2] = ((e % 6) - 2.5) * 0.56;

      // Skills – constellation
      const cl = i % 8, ca = (cl / 8) * Math.PI * 2, co = 1.1 + (i % 5) * 0.32;
      targets.skills[o] = Math.cos(ca) * co;
      targets.skills[o + 1] = ((Math.floor(i / 8) % 7) - 3) * 0.48;
      targets.skills[o + 2] = Math.sin(ca) * co;

      // Subjects – grid drawers
      const sh = i % 8, rw = Math.floor(i / 8);
      targets.subjects[o] = (sh - 3.5) * 0.72;
      targets.subjects[o + 1] = ((rw % 7) - 3) * 0.54;
      targets.subjects[o + 2] = Math.floor(rw / 7) * -0.7 + (sh % 2) * 0.18;

      // Gallery – wall with depth
      const ph = i % 5, px = Math.floor(i / 5);
      targets.gallery[o] = (ph - 2) * 1.45 + Math.sin(px * 0.5) * 0.12;
      targets.gallery[o + 1] = ((px % 8) - 3.5) * 0.38;
      targets.gallery[o + 2] = (ph % 2) * -0.9 + Math.cos(px) * 0.12;

      // Finale – FR monogram
      let fx = 0, fy = 0;
      if (i < 90) {
        const t = i / 89;
        if (t < 0.4) { fx = -1.2; fy = -2 + (t / 0.4) * 4; }
        else if (t < 0.65) { fx = -1.2 + ((t - 0.4) / 0.25) * 1.4; fy = 2.0; }
        else { fx = -1.2 + ((t - 0.65) / 0.35) * 1.1; fy = 0.3; }
      } else {
        const t = (i - 90) / 89;
        if (t < 0.35) { fx = 0.3; fy = -2 + (t / 0.35) * 4; }
        else if (t < 0.7) { const at = (t - 0.35) / 0.35; fx = 0.3 + Math.sin(at * Math.PI) * 1.0; fy = 2.0 - at * 1.7; }
        else { const lt = (t - 0.7) / 0.3; fx = 0.3 + lt * 1.2; fy = 0.3 - lt * 2.3; }
      }
      targets.finale[o] = fx * 0.8; targets.finale[o + 1] = fy * 0.8; targets.finale[o + 2] = Math.sin(i * 0.7) * 0.15;
    }

    // Scatter vectors (deterministic)
    const scatter = Array.from({ length: POINT_COUNT }, (_, i) =>
      new THREE.Vector3(Math.sin(i * 13.5) * 2 - 1, Math.cos(i * 21.1) * 2 - 1, Math.sin(i * 7.3) * 2 - 1).normalize()
    );

    // Particle mesh
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(targets.hero.slice(), 3));
    const pMat = new THREE.PointsMaterial({ color: 0xe32b38, size: 0.055, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
    root.add(new THREE.Points(pGeom, pMat));

    /* ── auxiliary geometry per formation ── */
    const groups: Record<ScenePhase, THREE.Group> = {} as Record<ScenePhase, THREE.Group>;
    PHASES.forEach((p) => { groups[p] = new THREE.Group(); root.add(groups[p]); });

    // HERO: wireframe icosahedron + 3 torus rings
    groups.hero.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.55, 1), new THREE.MeshBasicMaterial({ color: 0xd52230, wireframe: true })));
    [0, 1, 2].forEach((r) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(3.05 - r * 0.3, 0.012, 5, 120), new THREE.MeshBasicMaterial({ color: r === 1 ? 0xeee9e2 : 0xd52230 }));
      m.rotation.set(r * 0.65, r * 0.8, r * 0.37);
      groups.hero.add(m);
    });

    // ABOUT: 7 wireframe planes
    Array.from({ length: 7 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.015, 2.5), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xd52230 : 0xeee9e2, wireframe: true }));
      m.position.set((i - 3) * 0.62, Math.sin(i) * 0.35, (i - 3) * 0.28);
      m.rotation.set(0.12 * i, 0.22 * i, -0.05 * i);
      groups.about.add(m);
    });

    // PROJECTS: 18 bars + ring
    Array.from({ length: 18 }, (_, i) => {
      const v = i % 3 === 0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(...(v ? [0.045, 4.2, 0.045] as const : [3.5, 0.045, 0.045] as const)), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xeee9e2 : 0xd52230 }));
      m.position.set(((i % 3) - 1) * 1.7, (Math.floor(i / 3) - 2.5) * 0.7, ((i % 2) - 0.5) * 1.5);
      groups.projects.add(m);
    });
    const pr = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: 0xd52230 }));
    pr.rotation.x = Math.PI / 2; groups.projects.add(pr);

    // SKILLS: 12 sphere nodes + line connections
    const sNodes: THREE.Vector3[] = [];
    Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const nd = new THREE.Vector3(Math.cos(a) * (1.5 + (i % 3) * 0.45), ((i % 4) - 1.5) * 0.68, Math.sin(a) * (1.5 + (i % 3) * 0.45));
      sNodes.push(nd);
      const m = new THREE.Mesh(new THREE.SphereGeometry(i % 4 === 0 ? 0.16 : 0.08, 12, 12), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xeee9e2 : 0xd52230 }));
      m.position.copy(nd); groups.skills.add(m);
    });
    sNodes.slice(1).forEach((nd, i) => {
      const lg = new THREE.BufferGeometry().setFromPoints([sNodes[0], nd]);
      const lm = new THREE.LineBasicMaterial({ color: i % 3 === 0 ? 0xeee9e2 : 0xd52230, transparent: true, opacity: 0.35 });
      lm.userData.maxOpacity = 0.35;
      groups.skills.add(new THREE.Line(lg, lm));
    });

    // SUBJECTS: 8 box drawers
    Array.from({ length: 8 }, (_, i) => {
      const c = i % 4, r = Math.floor(i / 4);
      const mt = new THREE.MeshStandardMaterial({ color: i === 5 ? 0xa7131e : 0x141112, emissive: i === 5 ? 0x5b070d : 0x170204, wireframe: i % 3 === 0 });
      mt.userData.maxOpacity = 0.68;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.65, 0.12), mt);
      m.position.set((c - 1.5) * 1.35, (r - 0.5) * 2.05, (c % 2) * -0.5);
      m.rotation.set(0.04 * i, -0.12 + c * 0.08, 0);
      groups.subjects.add(m);
    });

    // GALLERY: 5 textured photo planes
    const texLoader = new THREE.TextureLoader();
    ["/media/fernando.jpg", "/media/sao-paulo.webp", "/media/febrace.webp", "/media/iniciacao-cientifica.jpg", "/media/equipe-ic.jpg"].forEach((p, i) => {
      const tex = texLoader.load(p); tex.colorSpace = THREE.SRGBColorSpace;
      const mt = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); mt.userData.maxOpacity = 0.82;
      const port = i === 1 || i === 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.35, port ? 2 : 1.35), mt);
      m.position.set((i - 2) * 1.45, i % 2 ? -0.65 : 0.65, i % 2 ? -0.65 : 0);
      m.rotation.set(0, (i - 2) * -0.1, (i - 2) * 0.025);
      groups.gallery.add(m);
    });

    // FINALE: FR line geometry
    const frPts: THREE.Vector3[][] = [];
    // F vertical
    const fv: THREE.Vector3[] = []; for (let i = 0; i < 20; i++) { const t = i / 19; fv.push(new THREE.Vector3(-1.0, -1.6 + t * 3.2, 0)); } frPts.push(fv);
    // F top bar
    const ft: THREE.Vector3[] = []; for (let i = 0; i < 12; i++) { const t = i / 11; ft.push(new THREE.Vector3(-1.0 + t * 1.2, 1.6, 0)); } frPts.push(ft);
    // F mid bar
    const fm: THREE.Vector3[] = []; for (let i = 0; i < 10; i++) { const t = i / 9; fm.push(new THREE.Vector3(-1.0 + t * 0.9, 0.2, 0)); } frPts.push(fm);
    // R vertical
    const rv: THREE.Vector3[] = []; for (let i = 0; i < 18; i++) { const t = i / 17; rv.push(new THREE.Vector3(0.35, -1.6 + t * 3.2, 0)); } frPts.push(rv);
    // R bowl
    const rb: THREE.Vector3[] = []; for (let i = 0; i < 16; i++) { const t = i / 15; rb.push(new THREE.Vector3(0.35 + Math.sin(t * Math.PI) * 0.85, 1.6 - t * 1.4, 0)); } frPts.push(rb);
    // R leg
    const rlg: THREE.Vector3[] = []; for (let i = 0; i < 12; i++) { const t = i / 11; rlg.push(new THREE.Vector3(0.35 + t * 1.0, 0.2 - t * 1.8, 0)); } frPts.push(rlg);

    frPts.forEach((pts) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({ color: 0xd52230, transparent: true, opacity: 0.55 });
      m.userData.maxOpacity = 0.55;
      groups.finale.add(new THREE.Line(g, m));
    });

    /* ── cinematic transition state ── */
    let currentMode: ScenePhase = "hero";
    let prevMode: ScenePhase = "hero";
    let transT = 0;      // 0 = no transition, >0 = transitioning
    const transDur = 1.6; // segundos
    let transitioning = false;

    const vis: Record<ScenePhase, number> = {} as Record<ScenePhase, number>;
    PHASES.forEach((p) => { vis[p] = p === "hero" ? 1 : 0; });

    /* ── pointer + drag ── */
    let pointerX = 0, pointerY = 0;
    let isDragging = false, dragSX = 0, dragSY = 0;
    const dragQuat = new THREE.Quaternion();
    const targetDrag = new THREE.Quaternion();
    const currentDrag = new THREE.Quaternion();

    const onPointerMove = (ev: PointerEvent) => {
      pointerX = ev.clientX / window.innerWidth - 0.5;
      pointerY = ev.clientY / window.innerHeight - 0.5;
      if (isDragging) {
        const dx = ev.clientX - dragSX, dy = ev.clientY - dragSY;
        targetDrag.setFromEuler(new THREE.Euler(dy * 0.008, dx * 0.008, 0, "YXZ")).multiply(dragQuat);
      }
    };
    const onPointerDown = (ev: PointerEvent) => {
      if (modeRef.current === "hero") {
        isDragging = true;
        dragSX = ev.clientX;
        dragSY = ev.clientY;
        dragQuat.copy(currentDrag);
        document.body.style.userSelect = "none";
      }
    };
    const onPointerUp = () => {
      isDragging = false;
      targetDrag.identity();
      document.body.style.userSelect = "";
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);

    /* ── render loop ── */
    let prev = performance.now();
    let frame = 0;
    let ready = false;

    const render = (now: number) => {
      const delta = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const activeMode = modeRef.current;
      const ease = 1 - Math.pow(0.002, delta);

      /* detect mode change → trigger cinematic transition */
      if (activeMode !== currentMode && !transitioning) {
        prevMode = currentMode;
        currentMode = activeMode;
        transitioning = true;
        transT = 0;
      }

      /* transition progress */
      let scatterAmt = 0;
      let camZOff = 0;

      if (transitioning) {
        transT += delta;
        const t = Math.min(1, transT / transDur);
        const et = smoothstep(t);

        if (et < 0.35) {
          scatterAmt = et / 0.35;
          camZOff = scatterAmt * 2.5;
        } else if (et < 0.5) {
          scatterAmt = 1;
          camZOff = 2.5;
        } else {
          scatterAmt = 1 - ((et - 0.5) / 0.5);
          camZOff = scatterAmt * 2.5;
        }

        // fade groups
        PHASES.forEach((p) => {
          if (p === prevMode) vis[p] = Math.max(0, 1 - et * 3);
          else if (p === currentMode) vis[p] = Math.max(0, (et - 0.45) / 0.55);
          else vis[p] = Math.max(0, vis[p] - delta * 3);
        });

        if (t >= 1) { transitioning = false; }
      } else {
        // Normal: fade to active mode
        PHASES.forEach((p) => {
          vis[p] = THREE.MathUtils.lerp(vis[p], p === currentMode ? 1 : 0, ease);
        });
      }

      /* update particle positions */
      const positions = pGeom.attributes.position.array as Float32Array;
      const target = targets[currentMode];

      for (let i = 0; i < POINT_COUNT; i++) {
        const o3 = i * 3;
        const tx = target[o3] + scatter[i].x * scatterAmt * 4;
        const ty = target[o3 + 1] + scatter[i].y * scatterAmt * 4;
        const tz = target[o3 + 2] + scatter[i].z * scatterAmt * 4;
        positions[o3] = THREE.MathUtils.lerp(positions[o3], tx, ease);
        positions[o3 + 1] = THREE.MathUtils.lerp(positions[o3 + 1], ty, ease);
        positions[o3 + 2] = THREE.MathUtils.lerp(positions[o3 + 2], tz, ease);
      }
      pGeom.attributes.position.needsUpdate = true;

      /* update group visibility */
      PHASES.forEach((p, idx) => {
        setGroupOpacity(groups[p], vis[p]);
        groups[p].rotation.y += delta * (0.008 + idx * 0.004);
      });

      /* parallax */
      const mobile = window.innerWidth < 800;
      const bx = (currentMode === "gallery" || currentMode === "finale") ? 0 : (mobile ? 0.5 : 2.65);
      root.position.x = THREE.MathUtils.lerp(root.position.x, bx + pointerX * 0.55, ease);
      root.position.y = THREE.MathUtils.lerp(root.position.y, pointerY * -0.35, ease);
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pointerY * 0.12, ease);

      /* hero drag */
      if (!isDragging && currentMode === "hero") targetDrag.slerp(new THREE.Quaternion(), 0.03);
      if (currentMode !== "hero") targetDrag.identity();
      currentDrag.slerp(targetDrag, 0.12);
      root.quaternion.copy(currentDrag);

      /* camera dolly */
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 9.5 + camZOff, ease);

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
      if (!ready) { ready = true; requestAnimationFrame(onReady); }
    };

    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose?.();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mt) => { (mt as THREE.MeshBasicMaterial).map?.dispose(); mt.dispose(); });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady]);

  return <div ref={mountRef} className="sculpture-scene" />;
}
