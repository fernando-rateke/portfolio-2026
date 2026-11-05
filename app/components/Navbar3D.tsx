"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Navbar3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = 36;
    const height = 36;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 3D Geometry: Torus Knot + Icosahedron Wireframe
    const geom = new THREE.IcosahedronGeometry(1.0, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xc22026,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geom, wireMat);
    scene.add(mesh);

    const coreGeom = new THREE.SphereGeometry(0.35, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xedebe6 });
    const core = new THREE.Mesh(coreGeom, coreMat);
    scene.add(core);

    let animationId: number;
    let rotSpeed = 0.015;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const targetSpeed = hoverRef.current ? 0.06 : 0.015;
      rotSpeed += (targetSpeed - rotSpeed) * 0.08;

      mesh.rotation.x += rotSpeed;
      mesh.rotation.y += rotSpeed * 1.3;
      core.rotation.y -= rotSpeed * 0.5;

      renderer.render(scene, camera);
    };
    animate();

    const onEnter = () => { hoverRef.current = true; };
    const onLeave = () => { hoverRef.current = false; };

    mount.addEventListener("mouseenter", onEnter);
    mount.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(animationId);
      mount.removeEventListener("mouseenter", onEnter);
      mount.removeEventListener("mouseleave", onLeave);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      geom.dispose();
      wireMat.dispose();
      coreGeom.dispose();
      coreMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      title="Fernando Rateke 3D"
    />
  );
}
