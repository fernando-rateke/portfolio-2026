"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });

export default function ProjetoPage() {
  const onSceneReady = useCallback(() => {}, []);

  return (
    <main>
      <SculptureScene mode="projects" onReady={onSceneReady} />
      <div className="noise" aria-hidden="true" />

      {/* Zen Background Elements */}
      <div className="background-elements" aria-hidden="true">
        <div className="zen-circle"></div>
        <div className="zen-sun"></div>
      </div>

      <span className="kanji-watermark kanji-1" aria-hidden="true">
        設計
      </span>
      <span className="kanji-watermark kanji-2" aria-hidden="true">
        音響
      </span>

      <Navbar activePage="projects" />

      <section className="section" style={{ paddingTop: "120px" }}>
        <div className="container">
          <Link href="/#projects" className="btn-outline" style={{ display: "inline-flex", marginBottom: "2rem" }}>
            <i className="ph ph-arrow-left"></i> Voltar para Projetos
          </Link>

          <div>
            <span className="badge">PROJECT / 001 · ENGENHARIA ACÚSTICA & SOFTWARE</span>
          </div>

          <h1 className="section-title" style={{ textAlign: "left", margin: "1rem 0 1.5rem" }}>
            Acustic<span style={{ color: "var(--accent-color)", fontStyle: "italic" }}>Building</span>
          </h1>

          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "720px", lineHeight: 1.8, marginBottom: "3rem" }}>
            Plataforma preditiva para prever níveis de ruído de uma edificação durante a fase de planejamento
            arquitetônico, seguindo as normas europeias <strong>EN 12354-1</strong> e <strong>EN 12354-2</strong>.
          </p>

          {/* Blueprint Visual Box */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "380px",
              borderRadius: "12px",
              overflow: "hidden",
              background: "radial-gradient(circle at 65% 35%, rgba(194, 32, 38, 0.3), transparent 60%), #0e0d0e",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              marginBottom: "3.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="architecture-lines" aria-hidden="true">
              <i style={{ width: "75%", height: "1px", left: "10%", top: "35%", transform: "rotate(15deg)", position: "absolute", background: "rgba(238,233,226,0.18)" }} />
              <i style={{ width: "1px", height: "110%", left: "60%", top: "-5%", transform: "rotate(20deg)", position: "absolute", background: "rgba(238,233,226,0.18)" }} />
              <i style={{ width: "60%", height: "1px", left: "30%", top: "68%", transform: "rotate(-25deg)", position: "absolute", background: "rgba(238,233,226,0.18)" }} />
              <i style={{ width: "220px", height: "220px", right: "15%", top: "50%", border: "1px solid rgba(194,32,38,0.5)", borderRadius: "50%", position: "absolute", transform: "translateY(-50%)" }} />
              <b style={{ position: "absolute", right: "20%", top: "50%", transform: "translateY(-50%)", color: "transparent", WebkitTextStroke: "1px rgba(238,233,226,0.35)", font: "700 90px/0.8 var(--font-heading)" }}>
                EN<br />12354
              </b>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "28px",
              marginBottom: "3.5rem",
            }}
          >
            <div className="bento-item glass-panel">
              <span className="badge" style={{ marginBottom: "10px" }}>01. O PROBLEMA</span>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: "12px" }}>
                Complexidade Normativa
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "0.95rem" }}>
                Antecipar o desempenho acústico antes da construção exige cálculos técnicos complexos
                e matrizes de propagação sonora que nem sempre são fáceis de interpretar e aplicar na tomada de decisões.
              </p>
            </div>

            <div className="bento-item glass-panel">
              <span className="badge" style={{ marginBottom: "10px" }}>02. A PROPOSTA</span>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: "12px" }}>
                Software Intuitivo e Preditivo
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "0.95rem" }}>
                Traduzir as normas europeias em uma interface visual navegável e automatizada, gerando predições acústicas
                confiáveis diretamente no navegador durante a concepção de projetos.
              </p>
            </div>

            <div className="bento-item glass-panel">
              <span className="badge" style={{ marginBottom: "10px" }}>03. MINHA CONTRIBUIÇÃO</span>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: "12px" }}>
                Modelagem & Desenvolvimento
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "0.95rem" }}>
                Pesquisa técnica normativa, formulação de algoritmos de cálculo, arquitetura de software, prototipação UI/UX
                e desenvolvimento de interface interativa.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <a
              href="https://canva.link/qvl29bfldnlalbu"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ padding: "14px 32px", fontSize: "1rem" }}
            >
              Abrir Apresentação do Projeto <i className="ph ph-arrow-square-out"></i>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
