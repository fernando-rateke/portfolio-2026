"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });

export default function CurriculoPage() {
  const [iframeLoading, setIframeLoading] = useState(true);
  const onSceneReady = useCallback(() => {}, []);

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
        履歴書
      </span>
      <span className="kanji-watermark kanji-2" aria-hidden="true">
        経験
      </span>

      <Navbar activePage="curriculo" />

      <section className="section" style={{ paddingTop: "120px", paddingBottom: "4rem" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <Link
            href="/#about"
            className="btn-outline"
            style={{ display: "inline-flex", marginBottom: "2rem" }}
          >
            <i className="ph ph-arrow-left"></i> Voltar para Perfil
          </Link>

          <div>
            <span className="badge">
              <i className="ph ph-file-text" style={{ marginRight: "6px" }}></i> Documento Profissional
            </span>
          </div>

          <h1 className="section-title" style={{ marginTop: "0.5rem" }}>
            Meu <span style={{ color: "var(--accent-color)", fontStyle: "italic" }}>Currículo</span>
          </h1>

          <div
            style={{
              width: "60px",
              height: "3px",
              background: "var(--accent-color)",
              borderRadius: "2px",
              margin: "1rem auto 2rem",
            }}
          ></div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
              marginBottom: "2.5rem",
              color: "var(--text-secondary)",
              fontSize: "0.92rem",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="ph ph-student" style={{ color: "var(--accent-color)" }}></i> Ensino Médio Técnico — ADS
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="ph ph-map-pin" style={{ color: "var(--accent-color)" }}></i> Florianópolis, SC
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="ph ph-calendar-blank" style={{ color: "var(--accent-color)" }}></i> 2026
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "3rem" }}>
            <a
              href="https://www.canva.com/design/DAGxm9Bd6lU/f8w8zNxuOLH2PDnrVvsAmQ/view"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Abrir no Canva <i className="ph ph-arrow-square-out"></i>
            </a>
          </div>

          {/* Canva Viewer Frame */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "880px",
              margin: "0 auto",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 16px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
              background: "#080808",
              aspectRatio: "1 / 1.4142",
            }}
          >
            {iframeLoading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                <i className="ph ph-circle-notch" style={{ fontSize: "2rem" }}></i>
                <span>Carregando currículo...</span>
              </div>
            )}
            <iframe
              src="https://www.canva.com/design/DAGxm9Bd6lU/f8w8zNxuOLH2PDnrVvsAmQ/view?embed"
              allowFullScreen
              loading="lazy"
              title="Currículo — Fernando Rateke"
              onLoad={() => setIframeLoading(false)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                zIndex: 1,
              }}
            ></iframe>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
