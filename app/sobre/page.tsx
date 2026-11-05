"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TechSphere3D from "../components/TechSphere3D";


const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });

export default function SobrePage() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const onSceneReady = useCallback(() => {}, []);

  // Clock widget logic
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("pt-BR", { hour12: false }));
      setDate(
        now.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main>
      <SculptureScene mode="about" onReady={onSceneReady} />
      <div className="noise" aria-hidden="true" />

      {/* Zen Background Elements */}
      <div className="background-elements" aria-hidden="true">
        <div className="zen-circle"></div>
        <div className="zen-sun"></div>
      </div>

      <span className="kanji-watermark kanji-1" aria-hidden="true">
        歴史
      </span>
      <span className="kanji-watermark kanji-2" aria-hidden="true">
        知識
      </span>

      <Navbar activePage="sobre" />

      <section className="section" style={{ paddingTop: "130px", minHeight: "100vh" }}>
        <div className="container">
          <Link href="/#about" className="btn-outline" style={{ display: "inline-flex", marginBottom: "2rem" }}>
            <i className="ph ph-arrow-left"></i> Voltar para Início
          </Link>

          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="badge">Perfil & Conhecimento</span>
            <h1 className="section-title" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
              Minha <span style={{ color: "var(--accent-color)", fontStyle: "italic" }}>História</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", maxWidth: "620px", margin: "0 auto", fontSize: "1rem", lineHeight: 1.8 }}>
              Trajetória pessoal, princípios de desenvolvimento e ecossistema de habilidades técnicas.
            </p>
          </div>

          <div className="bento-grid">
            {/* 1. BIO COMPLETA WIDGET */}
            <div className="bento-item item-bio glass-panel">
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--accent-color)",
                  marginBottom: "1.5rem",
                  fontSize: "1.6rem",
                }}
              >
                Quem sou eu fora dos códigos?
              </h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "1.2rem", fontSize: "1.05rem" }}>
                Meu nome é Fernando Rateke Neto, nasci em 16 de outubro de 2008, em Florianópolis, e
                atualmente curso o Ensino Médio no SESI SENAI integrado ao curso técnico em Análise e
                Desenvolvimento de Sistemas. Desde cedo, sempre tive muita afinidade com disciplinas
                exatas, especialmente matemática, biologia e programação.
              </p>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "1.2rem", fontSize: "1.05rem" }}>
                Meu maior sonho é seguir carreira como programador full-stack e desenvolvedor de
                sistemas inovadores. Sou apaixonado por desafios lógicos, interfaces intuitivas e
                soluções eficientes, mantendo também forte interesse por pesquisa científica e biologia.
              </p>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.05rem" }}>
                Assim que concluir o Ensino Médio, meu objetivo é ingressar na faculdade na área de
                tecnologia, atuar no mercado de software e criar soluções que impactem positivamente
                a vida das pessoas.
              </p>
            </div>

            {/* 2. CLOCK WIDGET */}
            <div className="bento-item item-clock glass-panel">
              <div style={{ textAlign: "center" }}>
                <div className="clock-time">{time || "--:--:--"}</div>
                <div className="clock-date">{date || "-- --"}</div>
              </div>
            </div>

            {/* 3. SPOTIFY WIDGET (Connected to Fernando Rateke profile & playlist) */}
            <div className="bento-item item-spotify glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="ph ph-spotify-logo" style={{ color: "#1DB954", fontSize: "1.3rem" }}></i>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    Fernando Rateke
                  </span>
                </div>
                <a
                  href="https://open.spotify.com/user/fernandorateke"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "0.74rem", color: "#1DB954", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  Abrir Perfil <i className="ph ph-arrow-square-out"></i>
                </a>
              </div>
              <iframe
                style={{ borderRadius: "8px", flex: 1 }}
                src="https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0"
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Fernando Rateke Spotify Player"
              ></iframe>
            </div>

            {/* 4. GLOBO HOLOGRÁFICO DE HABILIDADES 3D (Substitui o Snake Game) */}
            <div className="bento-item item-game glass-panel" style={{ padding: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <span className="badge" style={{ marginBottom: "6px" }}>Interativo 3D</span>
                  <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem" }}>
                    Globo Holográfico de <span style={{ color: "var(--accent-color)" }}>Habilidades</span>
                  </h3>
                </div>
              </div>

              <TechSphere3D />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
