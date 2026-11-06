"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CoverflowGallery, { GallerySlide, defaultSlides } from "../components/CoverflowGallery";

const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });

export default function GaleriaPage() {
  const [activeSlide, setActiveSlide] = useState<GallerySlide | null>(null);
  const onSceneReady = useCallback(() => {}, []);

  return (
    <main>
      <SculptureScene mode="gallery" onReady={onSceneReady} />
      <div className="noise" aria-hidden="true" />

      {/* Zen Background Elements */}
      <div className="background-elements" aria-hidden="true">
        <div className="zen-circle"></div>
        <div className="zen-sun"></div>
      </div>

      <span className="kanji-watermark kanji-1" aria-hidden="true">
        芸術
      </span>
      <span className="kanji-watermark kanji-2" aria-hidden="true">
        空間
      </span>

      <Navbar activePage="galeria" />

      <section className="section" style={{ paddingTop: "130px", minHeight: "90vh" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="badge">Exposição 3D Interativa</span>
            <h1 className="section-title" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
              Minha <span className="gradient-text">Galeria</span>
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                maxWidth: "600px",
                margin: "0 auto",
                fontSize: "1rem",
                lineHeight: 1.8,
              }}
            >
              Registros da minha trajetória acadêmica, iniciação científica, participações em eventos
              nacionais e momentos que constroem a história.
            </p>
          </div>

          {/* 3D Coverflow Gallery Component */}
          <CoverflowGallery
            slides={defaultSlides}
            initialIndex={2}
            onSlideClick={(slide) => setActiveSlide(slide)}
          />

          <div style={{ textAlign: "center", marginTop: "4rem" }}>
            <Link href="/antigo#home" className="btn btn-outline">
              <i className="ph ph-arrow-left"></i> Voltar ao Início
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <div
        className={`gallery-lightbox ${activeSlide ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!activeSlide}
      >
        <button
          className="gallery-lightbox-close"
          onClick={() => setActiveSlide(null)}
          aria-label="Fechar"
        >
          FECHAR ×
        </button>
        {activeSlide && (
          <div className="gallery-lightbox-inner">
            <img src={activeSlide.src} alt={activeSlide.alt} />
            <div className="gallery-lightbox-info">
              <span>
                {activeSlide.tag} · {activeSlide.year}
              </span>
              <h3>{activeSlide.caption}</h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: "1.8",
                  fontSize: "0.95rem",
                  margin: "14px 0 24px",
                }}
              >
                {activeSlide.description || "Registro pessoal e acadêmico."}
              </p>
              <button
                onClick={() => setActiveSlide(null)}
                className="btn btn-outline"
                style={{ padding: "8px 18px", fontSize: "0.82rem" }}
              >
                Voltar à Exibição <i className="ph ph-arrow-left"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
