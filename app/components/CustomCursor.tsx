"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  type: "spark" | "ember" | "orbit";
  angle: number;
  orbitRadius: number;
  orbitSpeed: number;
}

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const canvas = canvasRef.current;
    if (!dot || !ring || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let prevMouseX = mouseX;
    let prevMouseY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let isHovering = false;
    let velocity = 0;

    const particles: Particle[] = [];
    const MAX_PARTICLES = 80;
    const ORBIT_COUNT = 5;

    // Create persistent orbiting particles
    for (let i = 0; i < ORBIT_COUNT; i++) {
      particles.push({
        x: mouseX,
        y: mouseY,
        vx: 0,
        vy: 0,
        life: 999,
        maxLife: 999,
        size: 2.5 + Math.random() * 2,
        hue: 355 + Math.random() * 15,
        type: "orbit",
        angle: (Math.PI * 2 * i) / ORBIT_COUNT,
        orbitRadius: 18 + i * 8,
        orbitSpeed: 0.015 + Math.random() * 0.02,
      });
    }

    const spawnParticle = (x: number, y: number, speed: number) => {
      const angle = Math.random() * Math.PI * 2;
      const power = speed * 0.3 + Math.random() * 2;
      const type = Math.random() > 0.4 ? "spark" : "ember";

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * power + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * power + (Math.random() - 0.5) * 2,
        life: type === "spark" ? 30 + Math.random() * 25 : 50 + Math.random() * 40,
        maxLife: type === "spark" ? 55 : 90,
        size: type === "spark" ? 1.5 + Math.random() * 3 : 3 + Math.random() * 5,
        hue: type === "spark" ? 355 + Math.random() * 15 : 10 + Math.random() * 20,
        type,
        angle: 0,
        orbitRadius: 0,
        orbitSpeed: 0,
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      prevMouseX = mouseX;
      prevMouseY = mouseY;
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

      const dx = mouseX - prevMouseX;
      const dy = mouseY - prevMouseY;
      velocity = Math.sqrt(dx * dx + dy * dy);

      // Spawn particles based on movement speed
      const count = Math.min(Math.floor(velocity * 0.4), 5);
      for (let i = 0; i < count; i++) {
        if (particles.length < MAX_PARTICLES + ORBIT_COUNT) {
          const t = i / Math.max(count, 1);
          spawnParticle(
            prevMouseX + dx * t,
            prevMouseY + dy * t,
            velocity
          );
        }
      }
    };

    const onMouseDown = () => {
      ring.classList.add("cursor-clicking");
      // Burst of particles on click
      for (let i = 0; i < 12; i++) {
        if (particles.length < MAX_PARTICLES + ORBIT_COUNT + 20) {
          const angle = (Math.PI * 2 * i) / 12;
          const speed = 3 + Math.random() * 4;
          particles.push({
            x: mouseX,
            y: mouseY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 35 + Math.random() * 20,
            maxLife: 55,
            size: 2 + Math.random() * 4,
            hue: 350 + Math.random() * 20,
            type: "spark",
            angle: 0,
            orbitRadius: 0,
            orbitSpeed: 0,
          });
        }
      }
    };

    const onMouseUp = () => {
      ring.classList.remove("cursor-clicking");
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        "a, button, [role='button'], input, .project-card, .subject-card-interactive, .activity-card-item, .carousel-slide, .easter-egg-trigger, .btn, .btn-primary, .btn-outline, .archive-card"
      );
      if (interactive) {
        isHovering = true;
        ring.classList.add("cursor-hover");
        dot.classList.add("dot-hover");
      } else {
        isHovering = false;
        ring.classList.remove("cursor-hover");
        dot.classList.remove("dot-hover");
      }
    };

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.scale(dpr, dpr);
    };

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Smooth follower ring
      const ease = isHovering ? 0.22 : 0.12;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw magnetic field lines between orbiting particles and cursor
      const orbitParticles = particles.filter((p) => p.type === "orbit");

      // Draw energy connections between orbit particles
      if (orbitParticles.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(orbitParticles[0].x, orbitParticles[0].y);
        for (let i = 1; i < orbitParticles.length; i++) {
          const prev = orbitParticles[i - 1];
          const curr = orbitParticles[i];
          const mx = (prev.x + curr.x) / 2;
          const my = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
        // Close back to first
        const last = orbitParticles[orbitParticles.length - 1];
        const first = orbitParticles[0];
        ctx.quadraticCurveTo(last.x, last.y, first.x, first.y);

        ctx.strokeStyle = `rgba(194, 32, 38, ${0.12 + velocity * 0.005})`;
        ctx.lineWidth = 1;
        ctx.shadowColor = "rgba(194, 32, 38, 0.4)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }

      // Update & render all particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (p.type === "orbit") {
          // Orbiting particles follow cursor with elastic motion
          const targetRadius = isHovering ? p.orbitRadius * 1.8 : p.orbitRadius;
          const speedMult = isHovering ? 1.6 : 1 + velocity * 0.04;
          p.angle += p.orbitSpeed * speedMult;
          p.x = ringX + Math.cos(p.angle) * targetRadius;
          p.y = ringY + Math.sin(p.angle) * targetRadius;

          // Draw orbit particle with glow
          const pulseSize = p.size + Math.sin(p.angle * 3) * 1.2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseSize * 3);
          gradient.addColorStop(0, `hsla(${p.hue}, 85%, 58%, 0.9)`);
          gradient.addColorStop(0.4, `hsla(${p.hue}, 80%, 50%, 0.4)`);
          gradient.addColorStop(1, `hsla(${p.hue}, 80%, 50%, 0)`);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Inner bright core
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseSize * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 78%, 0.95)`;
          ctx.fill();
          ctx.restore();

          // Draw connection line to cursor center
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(ringX, ringY);
          ctx.strokeStyle = `rgba(194, 32, 38, ${0.06 + velocity * 0.003})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.restore();

          continue;
        }

        // Aging & physics
        p.life -= 1;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const lifeRatio = p.life / p.maxLife;

        // Apply gentle gravity and friction
        p.vy += 0.03;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx;
        p.y += p.vy;

        if (p.type === "spark") {
          // Bright sparks
          const alpha = 0.8 * Math.pow(lifeRatio, 0.8);
          const size = p.size * lifeRatio;

          ctx.save();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.5);
          grad.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${alpha})`);
          grad.addColorStop(0.5, `hsla(${p.hue}, 85%, 55%, ${alpha * 0.5})`);
          grad.addColorStop(1, `hsla(${p.hue}, 80%, 40%, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Bright core
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(30, 100%, 95%, ${alpha * 0.9})`;
          ctx.fill();
          ctx.restore();
        } else {
          // Embers — larger, softer, slower fade
          const alpha = 0.5 * Math.pow(lifeRatio, 1.5);
          const size = p.size * (0.3 + 0.7 * lifeRatio);

          ctx.save();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
          grad.addColorStop(0, `hsla(${p.hue}, 90%, 55%, ${alpha})`);
          grad.addColorStop(0.3, `hsla(${p.hue}, 85%, 45%, ${alpha * 0.6})`);
          grad.addColorStop(1, `hsla(${p.hue}, 80%, 35%, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw ambient glow around cursor position
      ctx.save();
      const ambientGrad = ctx.createRadialGradient(ringX, ringY, 0, ringX, ringY, 50 + velocity * 2);
      ambientGrad.addColorStop(0, `rgba(194, 32, 38, ${0.08 + velocity * 0.003})`);
      ambientGrad.addColorStop(0.5, `rgba(194, 32, 38, ${0.03 + velocity * 0.001})`);
      ambientGrad.addColorStop(1, "rgba(194, 32, 38, 0)");
      ctx.beginPath();
      ctx.arc(ringX, ringY, 50 + velocity * 2, 0, Math.PI * 2);
      ctx.fillStyle = ambientGrad;
      ctx.fill();
      ctx.restore();
    };

    animate();

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="cursor-trail-canvas"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 99990,
          width: "100vw",
          height: "100vh",
        }}
        aria-hidden="true"
      />
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
    </>
  );
}
