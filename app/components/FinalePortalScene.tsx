"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";


const PARTICLE_COUNT = 80;
const TRANSITION_DURATION = 2000; // 2 seconds responsive cinematic transition

export default function FinalePortalScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);

  const jumpingRef = useRef(false);
  const startTimeRef = useRef(0);

  const triggerTransition = useCallback(() => {
    if (jumpingRef.current) return;
    jumpingRef.current = true;
    startTimeRef.current = performance.now();
    setIsJumping(true);

    // Audio cue if desired
    try {
      window.dispatchEvent(new CustomEvent("portal-jump-start"));
    } catch {
      // Ignored
    }

    // 2-second transition then navigate directly
    setTimeout(() => {
      router.push("/materias");
    }, TRANSITION_DURATION);
  }, [router]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 900;
    const height = 660;

    const scene = new THREE.Scene();
    
    // Camera with generous FOV and distance to prevent ANY vertical clipping
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 8.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Main Group
    const portalGroup = new THREE.Group();
    scene.add(portalGroup);

    // 1. Kinetic Gyro Rings (Scaled down so they never touch top/bottom edges)
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0xc22026,
      emissive: 0x900a0f,
      roughness: 0.15,
      metalness: 0.85,
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.042, 16, 120), ringMat1);
    portalGroup.add(ring1);

    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xff3b44,
      emissive: 0xb0121a,
      roughness: 0.18,
      metalness: 0.9,
    });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.035, 16, 120), ringMat2);
    portalGroup.add(ring2);

    const ringMat3 = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x444444,
      roughness: 0.1,
      metalness: 0.95,
    });
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.028, 16, 100), ringMat3);
    portalGroup.add(ring3);

    // 2. Center Core: White wireframe icosahedron + Red inner energy core
    const coreGeom = new THREE.IcosahedronGeometry(0.78, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.88,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    portalGroup.add(coreMesh);

    const energyCoreGeom = new THREE.SphereGeometry(0.52, 32, 32);
    const energyCoreMat = new THREE.MeshStandardMaterial({
      color: 0xc22026,
      emissive: 0xd91424,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });
    const energyCore = new THREE.Mesh(energyCoreGeom, energyCoreMat);
    portalGroup.add(energyCore);

    // 3. Balanced Particle Constellation (Tasteful ~80 glowing points)
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleSpeeds = new Float32Array(PARTICLE_COUNT);
    const particleRadii = new Float32Array(PARTICLE_COUNT);
    const particleAngles = new Float32Array(PARTICLE_COUNT);
    const particleYOffsets = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particleRadii[i] = 0.9 + Math.random() * 2.2;
      particleSpeeds[i] = 0.012 + Math.random() * 0.028;
      particleAngles[i] = Math.random() * Math.PI * 2;
      particleYOffsets[i] = (Math.random() - 0.5) * 1.6;

      particlePositions[i * 3] = particleRadii[i] * Math.cos(particleAngles[i]);
      particlePositions[i * 3 + 1] = particleYOffsets[i];
      particlePositions[i * 3 + 2] = particleRadii[i] * Math.sin(particleAngles[i]);
    }

    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xff4d56,
      size: 0.07,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeom, particleMat);
    portalGroup.add(particleSystem);

    // Lights
    const pointLight = new THREE.PointLight(0xff2233, 6, 20);
    scene.add(pointLight);
    const whiteLight = new THREE.PointLight(0xffffff, 3.5, 14);
    whiteLight.position.set(4, 4, 6);
    scene.add(whiteLight);
    const ambientLight = new THREE.AmbientLight(0xfff0eb, 1.2);
    scene.add(ambientLight);

    // Interactive mouse parallax
    let mouseX = 0, mouseY = 0;
    let targetRotX = 0, targetRotY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / height - 0.5) * 2;
      targetRotY = mouseX * 0.45;
      targetRotX = -mouseY * 0.35;
    };

    const onMouseEnter = () => setIsHovered(true);
    const onMouseLeave = () => {
      setIsHovered(false);
      targetRotX = 0;
      targetRotY = 0;
    };

    mount.addEventListener("mousemove", onPointerMove, { passive: true });
    mount.addEventListener("mouseenter", onMouseEnter);
    mount.addEventListener("mouseleave", onMouseLeave);
    mount.addEventListener("click", triggerTransition);

    let animationId: number;
    let prevTime = performance.now();

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - prevTime) / 1000, 0.05);
      prevTime = currentTime;

      const jumping = jumpingRef.current;
      let transitionEase = 0;
      let speedBoost = 1;

      if (jumping) {
        const elapsed = currentTime - startTimeRef.current;
        const rawProgress = Math.min(elapsed / TRANSITION_DURATION, 1);
        setTransitionProgress(rawProgress);

        // Smooth cubic in-out ease curve over 5 seconds
        transitionEase = rawProgress < 0.5
          ? 4 * rawProgress * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

        // Progressive exponential speed acceleration
        speedBoost = 1 + transitionEase * 22;

        // Cinematic camera fly-through rush (starts gentle, accelerates through portal)
        if (rawProgress > 0.3) {
          const flyProgress = (rawProgress - 0.3) / 0.7;
          const flyEase = flyProgress * flyProgress * flyProgress;
          camera.position.z = THREE.MathUtils.lerp(8.8, -2.5, flyEase);
        }

        // Expand portal group as we fly into it
        portalGroup.scale.setScalar(1 + transitionEase * 3.8);

        // Emissive light flare explosion
        energyCoreMat.emissiveIntensity = THREE.MathUtils.lerp(0.9, 12.0, transitionEase);
        pointLight.intensity = THREE.MathUtils.lerp(6, 40, transitionEase);
      } else {
        speedBoost = isHovered ? 2.2 : 1.2;
      }

      // Smooth gyro rotation
      ring1.rotation.x += delta * 0.75 * speedBoost;
      ring1.rotation.y += delta * 0.95 * speedBoost;

      ring2.rotation.y -= delta * 0.85 * speedBoost;
      ring2.rotation.z += delta * 1.05 * speedBoost;

      ring3.rotation.z += delta * 1.15 * speedBoost;
      ring3.rotation.x -= delta * 0.65 * speedBoost;

      // Core rapid spin & breathing
      coreMesh.rotation.x += delta * 0.9 * speedBoost;
      coreMesh.rotation.y += delta * 1.3 * speedBoost;

      const idlePulse = 1 + Math.sin(currentTime * 0.003) * 0.06;
      coreMesh.scale.setScalar(idlePulse);
      energyCore.scale.setScalar(idlePulse * 0.92);

      // Orbiting particles update
      const pos = particleGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleAngles[i] += delta * (particleSpeeds[i] * 60) * speedBoost;
        const angle = particleAngles[i];
        const r = particleRadii[i] * (1 + Math.sin(currentTime * 0.002 + i) * 0.06);

        pos[i * 3] = r * Math.cos(angle);
        pos[i * 3 + 1] = particleYOffsets[i] + Math.sin(angle * 2 + currentTime * 0.003) * 0.25;
        pos[i * 3 + 2] = r * Math.sin(angle);
      }
      particleGeom.attributes.position.needsUpdate = true;

      // Mouse Parallax Lerp
      portalGroup.rotation.x += (targetRotX - portalGroup.rotation.x) * 0.05;
      portalGroup.rotation.y += (targetRotY - portalGroup.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };

    animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!mount) return;
      width = mount.clientWidth;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("mousemove", onPointerMove);
      mount.removeEventListener("mouseenter", onMouseEnter);
      mount.removeEventListener("mouseleave", onMouseLeave);
      mount.removeEventListener("click", triggerTransition);

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      ring1.geometry.dispose();
      ringMat1.dispose();
      ring2.geometry.dispose();
      ringMat2.dispose();
      ring3.geometry.dispose();
      ringMat3.dispose();
      coreGeom.dispose();
      coreMat.dispose();
      energyCoreGeom.dispose();
      energyCoreMat.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [triggerTransition, isHovered]);

  return (
    <div className="finale-portal-container" style={{ position: "relative", width: "100%" }}>
      {/* 5-Second Cinematic Warp Transition Overlay */}
      {isJumping && (
        <div
          className="portal-cinematic-veil"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            pointerEvents: "none",
            background: `radial-gradient(circle at center, rgba(194, 32, 38, ${Math.min(transitionProgress * 0.9, 0.85)}) 0%, rgba(8, 8, 8, ${Math.min(transitionProgress * 1.2, 1)}) 75%, #080808 100%)`,
            opacity: transitionProgress > 0.2 ? Math.min((transitionProgress - 0.2) / 0.75, 1) : 0,
            transition: "opacity 0.2s ease-out",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            backdropFilter: `blur(${transitionProgress * 16}px)`,
          }}
        >
          {/* Central Warp Pulse Indicator */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.2rem",
              transform: `scale(${0.8 + transitionProgress * 0.4})`,
              transition: "transform 0.1s linear",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.2)",
                borderTopColor: "var(--accent-color)",
                animation: "spin 0.6s linear infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.25em",
                fontSize: "1.2rem",
                textTransform: "uppercase",
                color: "#EDEBE6",
              }}
            >
              Acessando Matérias
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                letterSpacing: "0.2em",
                color: "var(--accent-color)",
                fontWeight: 600,
              }}
            >
              {Math.round(transitionProgress * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        style={{
          width: "100%",
          maxWidth: "1100px",
          height: "660px",
          margin: "0 auto",
          cursor: isJumping ? "wait" : "pointer",
          transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
          transform: isHovered && !isJumping ? "scale(1.03)" : "scale(1)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "visible",
        }}
        title="Clique para Acessar Matérias"
        aria-label="Objeto 3D Cinético — Clique para Acessar Matérias"
      />

      {/* Discreet Interactive Label */}
      <span
        style={{
          marginTop: "-20px",
          marginBottom: "20px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.82rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: isHovered ? "var(--accent-color)" : "var(--text-secondary)",
          background: "rgba(18, 18, 20, 0.65)",
          padding: "6px 18px",
          borderRadius: "999px",
          border: `1px solid ${isHovered ? "rgba(194, 32, 38, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
          transition: "all 0.3s ease",
          pointerEvents: "none",
        }}
      >
        <i className="ph ph-cursor-click"></i> {isJumping ? "Iniciando Transição..." : "Clique no Objeto 3D para Acessar Matérias"}
      </span>
    </div>
  );
}
