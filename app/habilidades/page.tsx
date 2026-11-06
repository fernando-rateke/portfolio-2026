"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });

const skills = [
  {
    name: "Interfaces",
    detail: "HTML · CSS · JavaScript",
    level: "Construção visual",
    appliedTo: [
      { title: "AcusticBuilding", type: "Projeto Principal — Interface & Simulação" },
      { title: "Integração API REST", type: "Atividade — JavaScript Assíncrono" },
      { title: "Meme: Evolucionismo", type: "Atividade — Comunicação Visual" },
    ],
  },
  {
    name: "Aplicações",
    detail: "React · TypeScript · Next.js · Three.js",
    level: "Desenvolvimento",
    appliedTo: [
      { title: "AcusticBuilding", type: "Cálculos normativos & UX Interativa" },
      { title: "Hollow Depths", type: "Game RPG — Lógica probabilística em JS" },
      { title: "CRUD Java OO", type: "Atividade — Paradigma Orientado a Objetos" },
    ],
  },
  {
    name: "Dados & Sistemas",
    detail: "SQL · UML · Modelagem · IoT",
    level: "Estrutura",
    appliedTo: [
      { title: "Hackathon Cibersegurança", type: "Modelagem de dados & Camadas IoT" },
      { title: "Banco de Dados Relacional", type: "Esquemas & Proteção SQL" },
      { title: "Quebrando a Banca", type: "Análise Estatística & Probabilidade" },
    ],
  },
  {
    name: "Pesquisa & Produto",
    detail: "UI/UX · Iniciação Científica · Prototipação",
    level: "Experiência",
    appliedTo: [
      { title: "Iniciação Científica", type: "Pesquisa Acadêmica & Metodologia" },
      { title: "Apresentação FEBRACE", type: "Comunicação Científica em SP" },
      { title: "A Paixão Segundo G.H.", type: "Ensaio Audiovisual Narrativo" },
    ],
  },
];

export default function HabilidadesPage() {
  const [active, setActive] = useState(0);
  const onReady = useCallback(() => {}, []);

  return (
    <main className="sub-page">
      <SculptureScene mode="skills" onReady={onReady} />
      <div className="noise" aria-hidden="true" />

      <header className="sub-header">
        <Link href="/antigo#about" className="back-link">← VOLTAR</Link>
        <span className="sub-title">HABILIDADES</span>
      </header>

      <section className="sub-hero">
        <div className="sub-hero-inner reveal-immediate">
          <span className="kicker">02 / SISTEMA & REDE</span>
          <h1>Conhecimento<br />em <em>rede viva.</em></h1>
        </div>
      </section>

      <section className="skills-section-page">
        <div className="skills-grid reveal-immediate">
          <div className="skill-tabs" role="tablist">
            {skills.map((skill, i) => (
              <button
                key={skill.name}
                className={active === i ? "active" : ""}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                role="tab"
                aria-selected={active === i}
              >
                <small>0{i + 1}</small>
                <span>{skill.name}</span>
                <i>+</i>
              </button>
            ))}
          </div>
          <div className="skill-display" role="tabpanel">
            <span>{skills[active].level}</span>
            <strong>{skills[active].name}</strong>
            <p>{skills[active].detail}</p>
            <div className="skill-orbit"><i /><i /><i /><b /></div>
            <div className="skill-projects-tooltip visible">
              <h4>ONDE FOI APLICADO</h4>
              <ul>
                {skills[active].appliedTo.map((item, idx) => (
                  <li key={idx}><strong>{item.title}</strong><em>{item.type}</em></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
