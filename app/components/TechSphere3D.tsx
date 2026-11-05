"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type TechNode = {
  id: string;
  name: string;
  category: string;
  level: string;
  description: string;
  appliedIn: string;
};

export const techSkillsList: TechNode[] = [
  {
    id: "react",
    name: "React & Next.js",
    category: "Aplicações & Frontend",
    level: "Desenvolvimento Moderno",
    description: "Criação de interfaces reativas, componentes modulares, hooks customizados e renderização otimizada no servidor.",
    appliedIn: "AcusticBuilding, Portfólio 2026",
  },

  {
    id: "javascript",
    name: "JavaScript ES6+",
    category: "Linguagens",
    level: "Lógica Assíncrona",
    description: "Manipulação avançada da DOM, Promises, async/await, Canvas 2D e consumo de APIs REST.",
    appliedIn: "Hollow Depths, Integração API REST",
  },
  {
    id: "htmlcss",
    name: "HTML5 & CSS3",
    category: "Estrutura & Estilo",
    level: "Design Responsivo",
    description: "Semântica web, Flexbox, CSS Grid, variáveis customizadas, animações fluidas e acessibilidade.",
    appliedIn: "Todas as interfaces e projetos",
  },
  {
    id: "uiux",
    name: "Design UI/UX",
    category: "Experiência",
    level: "Prototipação & Visual",
    description: "Pesquisa de usabilidade, arquitetura da informação, design systems e interfaces visualmente agradáveis.",
    appliedIn: "AcusticBuilding, Apresentações no Canva",
  },
  {
    id: "logica",
    name: "Lógica de Programação",
    category: "Fundamentos",
    level: "Algoritmos & Estruturas",
    description: "Resolução estruturada de problemas, controle de fluxo, complexidade algorítmica e raciocínio matemático.",
    appliedIn: "Hollow Depths, Modelagem Matemática",
  },
  {
    id: "sql",
    name: "Banco de Dados SQL",
    category: "Dados & Persistência",
    level: "Modelagem E-R & SGBD",
    description: "Criação de esquemas relacionais, queries avançadas, integridade referencial e proteção contra injeções SQL.",
    appliedIn: "Hackathon Cibersegurança, CRUD Java",
  },
  {
    id: "uml",
    name: "Modelagem de Sistemas UML",
    category: "Arquitetura",
    level: "Engenharia de Software",
    description: "Diagramas de classe, diagramas de casos de uso, requisitos de software e documentação técnica antes da implementação.",
    appliedIn: "Hackathon Cibersegurança, AcusticBuilding",
  },
  {
    id: "iot",
    name: "Internet das Coisas (IoT)",
    category: "Hardware & Conectividade",
    level: "Sensores & Dispositivos",
    description: "Projetos eletrônicos, integração com sensores para coleta de metadados e camadas de segurança de dispositivos conectados.",
    appliedIn: "Hackathon Cibersegurança & IoT",
  },
  {
    id: "pesquisa",
    name: "Pesquisa Científica & Biologia",
    category: "Acadêmico",
    level: "Metodologia & Análise",
    description: "Pesquisa acadêmica aplicada, leitura normativa (EN 12354), análise experimental e comunicação científica.",
    appliedIn: "Iniciação Científica SESI SENAI, FEBRACE SP",
  },
];

export default function TechSphere3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedTech, setSelectedTech] = useState<TechNode>(techSkillsList[0]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 380;
    const height = 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Group for the entire sphere
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    // 1. Ambient particles on sphere surface
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    const radius = 1.45;

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      particlePositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
      particlePositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      particlePositions[i * 3 + 2] = radius * Math.cos(theta);
    }

    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xc22026,
      size: 0.04,
      transparent: true,
      opacity: 0.65,
    });
    const particlePoints = new THREE.Points(particleGeom, particleMat);
    sphereGroup.add(particlePoints);

    // 2. Wireframe geodesic inner cage
    const wireGeom = new THREE.IcosahedronGeometry(radius * 0.98, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    sphereGroup.add(wireMesh);

    // 3. Tech Node Meshes (Spheres evenly spaced around the globe)
    const nodeCount = techSkillsList.length;
    const nodeMeshes: THREE.Mesh[] = [];

    techSkillsList.forEach((skill, idx) => {
      // Golden spiral distribution
      const phi = Math.acos(1 - (2 * (idx + 0.5)) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * idx;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const nodeGeom = new THREE.SphereGeometry(0.085, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xff2233 : 0xedebe6,
      });
      const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
      nodeMesh.position.set(x, y, z);
      nodeMesh.userData = { skillIndex: idx };
      sphereGroup.add(nodeMesh);
      nodeMeshes.push(nodeMesh);
    });

    // Raycasting for click/hover interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const rotVelocity = { x: 0.002, y: 0.005 };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      document.body.style.userSelect = "none";
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      prevMouse = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const deltaX = clientX - prevMouse.x;
        const deltaY = clientY - prevMouse.y;
        rotVelocity.y = deltaX * 0.005;
        rotVelocity.x = deltaY * 0.005;
        sphereGroup.rotation.y += rotVelocity.y;
        sphereGroup.rotation.x += rotVelocity.x;
        prevMouse = { x: clientX, y: clientY };
      }

      // Check node hover
      const rect = mount.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const index = intersects[0].object.userData.skillIndex;
        if (index !== undefined) {
          setSelectedTech(techSkillsList[index]);
          nodeMeshes.forEach((m, i) => {
            (m.material as THREE.MeshBasicMaterial).color.setHex(
              i === index ? 0xff2233 : 0xedebe6
            );
          });
        }
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      document.body.style.userSelect = "";
    };

    mount.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    mount.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!isDragging) {
        sphereGroup.rotation.y += 0.004;
        sphereGroup.rotation.x += 0.001;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      mount.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      particleGeom.dispose();
      particleMat.dispose();
      wireGeom.dispose();
      wireMat.dispose();
      nodeMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", alignItems: "center" }}>
      {/* 3D Sphere Canvas Area */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          ref={mountRef}
          style={{
            width: "100%",
            height: "360px",
            cursor: "grab",
            display: "flex",
            justifyContent: "center",
          }}
        />
        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
          <i className="ph ph-hand-pointing"></i> Arraste ou passe o cursor sobre os nós 3D
        </div>
      </div>

      {/* Selected Skill Details Card */}
      <div
        style={{
          background: "rgba(16, 16, 16, 0.75)",
          border: "1px solid var(--glass-border)",
          borderLeft: "3px solid var(--accent-color)",
          borderRadius: "8px",
          padding: "28px 30px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
        }}
      >
        <span className="badge" style={{ marginBottom: "12px" }}>
          {selectedTech.category} · {selectedTech.level}
        </span>
        <h3
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.75rem",
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          {selectedTech.name}
        </h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.96rem",
            lineHeight: 1.8,
            marginBottom: "20px",
          }}
        >
          {selectedTech.description}
        </p>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--accent-color)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Onde foi aplicado:
          </span>
          <strong style={{ fontSize: "0.86rem", color: "var(--text-primary)" }}>
            {selectedTech.appliedIn}
          </strong>
        </div>
      </div>
    </div>
  );
}
