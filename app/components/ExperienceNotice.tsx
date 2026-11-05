"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const EXPERIENCE_DURATION_SEC = 5.0;

export default function ExperienceNotice() {
  // Este componente só roda no navegador (dynamic + ssr:false), então dá para
  // ler o sessionStorage direto no estado inicial.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("portfolio_intro_seen") === "true";
    } catch {
      return false;
    }
  });
  const [started, setStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFolding, setIsFolding] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const mountRef = useRef<HTMLDivElement>(null);
  const transitionRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const startedRef = useRef(false);


  const finishAndEnter = useCallback(() => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setIsTransitioning(true);
    setProgressPercent(100);

    try {
      sessionStorage.setItem("portfolio_intro_seen", "true");
    } catch {
      // Ignore storage errors
    }

    // Trigger portfolio audio via custom event
    try {
      window.dispatchEvent(new CustomEvent("start-portfolio-audio"));
    } catch {
      // Ignored if not supported
    }

    // After 3D expansion completes, trigger folding curtain
    setTimeout(() => {
      setIsFolding(true);
    }, 450);

    // Dismiss overlay after transition completes
    setTimeout(() => {
      setDismissed(true);
    }, 1800);
  }, []);

  // User clicks "Entrar" — start the animation + music
  const handleStart = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);

    // Trigger portfolio audio immediately on click (user gesture)
    try {
      window.dispatchEvent(new CustomEvent("start-portfolio-audio"));
    } catch {
      // Ignored if not supported
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;

    const mount = mountRef.current;
    if (!mount) return;

    // ── 1. Three.js Scene Setup ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 6.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ── 2. Lights ──
    const ambientLight = new THREE.AmbientLight(0xfff5f0, 1.6);
    scene.add(ambientLight);

    const redLight = new THREE.PointLight(0xff2233, 48, 30);
    redLight.position.set(-4, -2.5, 4.5);
    scene.add(redLight);

    const whiteLight = new THREE.PointLight(0xffffff, 32, 30);
    whiteLight.position.set(4, 3.5, 5);
    scene.add(whiteLight);

    const backlight = new THREE.PointLight(0xff1e2e, 30, 25);
    backlight.position.set(0, 0, -5);
    scene.add(backlight);

    // ── 3. 3D Monumental Kinetic Element (Amplified Initial Scale) ──
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Outer Geodesic Wireframe Cage
    const outerGeo = new THREE.IcosahedronGeometry(2.8, 1);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xe6202e,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const outerCage = new THREE.Mesh(outerGeo, outerMat);
    rootGroup.add(outerCage);

    // Concentric Gyroscope Rings
    const rings: THREE.Mesh[] = [];
    const ringRadii = [3.3, 2.8, 2.3];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.TorusGeometry(r, 0.02, 8, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0xffffff : 0xe6202e,
        transparent: true,
        opacity: idx === 1 ? 0.9 : 0.65,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(idx * 0.7, idx * 0.9, idx * 0.4);
      rootGroup.add(ring);
      rings.push(ring);
    });

    // Central Monolithic Core (Torus Knot sculpture)
    const coreGeo = new THREE.TorusKnotGeometry(1.4, 0.42, 128, 24, 2, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1f191b,
      roughness: 0.18,
      metalness: 0.92,
      emissive: 0x4a080d,
      emissiveIntensity: 1.0,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // Core Wireframe Outline
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: 0xff3b4a,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const coreWireMesh = new THREE.Mesh(coreGeo, coreWireMat);
    rootGroup.add(coreWireMesh);

    // Inner Glowing Polyhedral Star
    const innerStarGeo = new THREE.OctahedronGeometry(0.7, 0);
    const innerStarMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.95,
    });
    const innerStar = new THREE.Mesh(innerStarGeo, innerStarMat);
    rootGroup.add(innerStar);

    // Dynamic constellation particles
    const noticePCount = 60;
    const noticePPos = new Float32Array(noticePCount * 3);
    for (let i = 0; i < noticePCount; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pR = 1.5 + Math.random() * 2.8;
      noticePPos[i * 3] = pR * Math.cos(pAngle);
      noticePPos[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
      noticePPos[i * 3 + 2] = pR * Math.sin(pAngle);
    }
    const noticePGeom = new THREE.BufferGeometry();
    noticePGeom.setAttribute("position", new THREE.BufferAttribute(noticePPos, 3));
    const noticePMat = new THREE.PointsMaterial({
      color: 0xff3b44,
      size: 0.065,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const noticePPoints = new THREE.Points(noticePGeom, noticePMat);
    rootGroup.add(noticePPoints);

    // ── 4. Parallax & Resize ──
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotY = nx * 0.35;
      targetRotX = -ny * 0.35;
      whiteLight.position.x = nx * 5;
      whiteLight.position.y = -ny * 5;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── 5. Render Loop ──
    let animId: number;
    let prevTime = performance.now();
    let hasCompleted = false;

    const animate = (time: number) => {
      const delta = Math.min((time - prevTime) / 1000, 0.05);
      prevTime = time;

      currentRotX += (targetRotX - currentRotX) * 0.05;
      currentRotY += (targetRotY - currentRotY) * 0.05;

      // Before user clicks: gentle idle rotation only
      if (!startedRef.current) {
        const idleSpeed = 0.3;
        coreMesh.rotation.x += delta * 0.45 * idleSpeed;
        coreMesh.rotation.y += delta * 0.7 * idleSpeed;
        coreWireMesh.rotation.copy(coreMesh.rotation);

        outerCage.rotation.x -= delta * 0.25 * idleSpeed;
        outerCage.rotation.y += delta * 0.3 * idleSpeed;

        innerStar.rotation.x += delta * 1.1 * idleSpeed;
        innerStar.rotation.z -= delta * 0.9 * idleSpeed;

        rings.forEach((ring, i) => {
          ring.rotation.x += delta * (0.28 + i * 0.12) * idleSpeed;
          ring.rotation.y += delta * (0.38 - i * 0.12) * idleSpeed;
        });

        rootGroup.rotation.x = currentRotX;
        rootGroup.rotation.y = currentRotY;

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
        return;
      }

      // After user clicks: synchronized 5-second progressive growth
      if (!startTimeRef.current) {
        startTimeRef.current = time;
      }

      const elapsed = (time - startTimeRef.current) / 1000;
      const rawProgress = Math.min(elapsed / EXPERIENCE_DURATION_SEC, 1);
      const currentPercent = Math.floor(rawProgress * 100);

      setProgressPercent((prev) => (currentPercent > prev ? currentPercent : prev));

      // Smooth progression curve (ease-in-out / smoothstep)
      const smoothP = rawProgress * rawProgress * (3 - 2 * rawProgress);

      // Progressive 3D Expansion to envelop screen
      const currentScale = 1.0 + smoothP * 4.8;
      rootGroup.scale.setScalar(currentScale);

      // Camera smoothly dollys in
      camera.position.z = THREE.MathUtils.lerp(6.4, 0.4, smoothP);

      // Speed acceleration factor
      const speedFactor = 0.6 + smoothP * 2.8;

      coreMesh.rotation.x += delta * 0.45 * speedFactor;
      coreMesh.rotation.y += delta * 0.7 * speedFactor;
      coreWireMesh.rotation.copy(coreMesh.rotation);

      outerCage.rotation.x -= delta * 0.25 * speedFactor;
      outerCage.rotation.y += delta * 0.3 * speedFactor;

      innerStar.rotation.x += delta * 1.1 * speedFactor;
      innerStar.rotation.z -= delta * 0.9 * speedFactor;

      rings.forEach((ring, i) => {
        ring.rotation.x += delta * (0.28 + i * 0.12) * speedFactor;
        ring.rotation.y += delta * (0.38 - i * 0.12) * speedFactor;
      });

      // Emissive and particle excitation
      coreMat.emissiveIntensity = THREE.MathUtils.lerp(1.0, 6.5, smoothP);
      outerMat.opacity = THREE.MathUtils.lerp(0.7, 0.95, smoothP);

      rootGroup.rotation.x = currentRotX;
      rootGroup.rotation.y = currentRotY;

      // Completion check at 100% (5 seconds)
      if (rawProgress >= 1 && !hasCompleted && !transitionRef.current) {
        hasCompleted = true;
        finishAndEnter();
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : mesh.material
          ? [mesh.material]
          : [];
        mats.forEach((m) => m.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [dismissed, finishAndEnter]);

  if (dismissed) return null;

  return (
    <div
      className={`experience-notice-overlay ${isTransitioning ? "transition-out" : ""}`}
      role="banner"
      aria-label="Aviso de Experiência"
    >
      {/* 3D WebGL Background Canvas */}
      <div ref={mountRef} className="experience-notice-canvas" aria-hidden="true" />

      {/* Aesthetic Subtle Vignette Overlay */}
      <div className="experience-notice-vignette" aria-hidden="true" />

      {/* Minimalist Floating Notice Card */}
      <div className="experience-notice-content">
        {/* Top Minimal Badge */}
        <div className="experience-badge">
          <span className="experience-badge-dot"></span>
          <span>AVISO DE EXPERIÊNCIA</span>
        </div>

        {/* Discreet Notice Message */}
        <p className="experience-title">
          Para melhor experiência:
          <span className="experience-highlight">maximize a página e aumente o som</span>
        </p>

        {/* Minimal Subtle Hints Bar */}
        <div className="experience-hints-bar">
          <div className="experience-hint-item">
            <i className="ph ph-speaker-high"></i>
            <span>Aumente o Som</span>
          </div>
          <span className="experience-hint-divider">·</span>
          <div className="experience-hint-item">
            <i className="ph ph-corners-out"></i>
            <span>Maximize a Página (F11)</span>
          </div>
        </div>

        {/* Before start: show Enter button */}
        {!started && (
          <div className="experience-action-wrapper">
            <button
              className="experience-enter-btn"
              onClick={handleStart}
              type="button"
            >
              <i className="ph ph-play-circle"></i>
              Iniciar Experiência
            </button>
          </div>
        )}

        {/* After start: show progress bar */}
        {started && (
          <>
            <div className="experience-progress-container">
              <div className="experience-progress-track">
                <div
                  className="experience-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="experience-progress-info">
                <span className="experience-progress-status">
                  {progressPercent < 100 ? "Inicializando experiência 3D..." : "Pronto para entrar"}
                </span>
                <span className="experience-progress-percent">{progressPercent}%</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Folding Curtain Panels (appear during transition) */}
      {isTransitioning && (
        <div className={`intro-curtain-fold ${isFolding ? "folding" : ""}`} aria-hidden="true">
          <div className="fold-panel fold-top">
            <span className="fold-brand">FERNANDO RATEKE</span>
          </div>
          <div className="fold-panel fold-bottom">
            <span className="fold-sub">PORTFÓLIO · 2026</span>
          </div>
        </div>
      )}
    </div>
  );
}
