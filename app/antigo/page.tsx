"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CoverflowGallery from "../components/CoverflowGallery";
import { onKeyActivate } from "../utils/a11y";
import type { ScenePhase } from "../SculptureScene";

const ExperienceNotice = dynamic(() => import("../components/ExperienceNotice"), { ssr: false });
const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });
const FinalePortalScene = dynamic(() => import("../components/FinalePortalScene"), { ssr: false });

export default function Home() {
  const [sceneMode, setSceneMode] = useState<ScenePhase>("hero");
  const [activePhoto, setActivePhoto] = useState<{
    src: string;
    alt: string;
    title: string;
    tag: string;
    caption: string;
  } | null>(null);

  // Easter Egg State: Background Warp Speed Lines & Kanji Stream
  const [warpStreakActive, setWarpStreakActive] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const onSceneReady = useCallback(() => {
    // 3D Engine ready
  }, []);

  const triggerEasterEgg = () => {
    setWarpStreakActive(true);
    setTimeout(() => {
      setWarpStreakActive(false);
    }, 1800);
  };

  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const progress = h > 0 ? Math.min(Math.max(window.scrollY / h, 0), 1) : 0;

      if (progressRef.current) {
        progressRef.current.style.width = `${progress * 100}%`;
      }

      // Zone mapping for 3D Sculpture
      if (progress < 0.1) {
        setSceneMode("hero");
      } else if (progress < 0.28) {
        setSceneMode("about");
      } else if (progress < 0.5) {
        setSceneMode("projects");
      } else if (progress < 0.72) {
        setSceneMode("subjects");
      } else if (progress < 0.88) {
        setSceneMode("gallery");
      } else {
        setSceneMode("finale");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main>
      {/* Immersive 3D Experience Warning & Audio Entry Screen */}
      <ExperienceNotice />

      {/* 3D Three.js Sculpture Background */}
      <SculptureScene mode={sceneMode} onReady={onSceneReady} />

      {/* Overlays */}
      <div className="noise" aria-hidden="true" />
      <div ref={progressRef} className="scroll-progress" />

      {/* Zen Background Elements */}
      <div className="background-elements" aria-hidden="true">
        <div className="zen-circle"></div>
        <div className="zen-sun"></div>
      </div>

      {/* Kanji Watermarks */}
      <span className="kanji-watermark kanji-1" aria-hidden="true">
        学生
      </span>
      <span className="kanji-watermark kanji-2" aria-hidden="true">
        創造
      </span>

      {/* Navbar */}
      <Navbar activePage="home" />

      {/* ── 1. HOME / HERO SECTION ── */}
      <section id="home" className="hero section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="badge">Portfólio | 3B 2026</span>
            <h1 className="hero-title">
              Ensino Médio e Técnico em{" "}
              <span
                className="easter-egg-trigger"
                onClick={triggerEasterEgg}
                onKeyDown={onKeyActivate(triggerEasterEgg)}
                role="button"
                tabIndex={0}
                title="✦ Clique para ativar o Easter Egg secreto! ✦"
                style={{ color: "var(--accent-color)", fontWeight: 600 }}
              >
                ADS
              </span>
            </h1>
            <p className="hero-desc">
              Estudante do Ensino Médio e Técnico em Análise e Desenvolvimento de Sistemas.
              Criando desde trabalhos simples, até projetos mais elaborados.
            </p>
            <div className="hero-buttons">
              <a href="#projects" className="btn btn-primary">
                Ver Principais Projetos <i className="ph ph-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. ABOUT SECTION ("Sobre Mim") ── */}
      <section id="about" className="about section glass-panel">
        <div className="container">
          <h2 className="section-title">Sobre Mim</h2>
          <div className="about-content">
            <div className="about-text">
              <p>
                Atualmente, sou um estudante técnico de Análise e Desenvolvimento de Sistemas focado
                em criar softwares eficientes aliados a um design UI/UX visualmente agradável e intuitivo.
              </p>
              <p>
                Busco ativamente aplicar meus conhecimentos acadêmicos em soluções de software reais,
                priorizando escalabilidade e excelência nos mínimos detalhes.
              </p>

              <div className="skills-container">
                <span className="skill-tag">HTML5 & CSS3</span>
                <span className="skill-tag">JavaScript</span>
                <span className="skill-tag">TypeScript & React</span>
                <span className="skill-tag">Design UI/UX</span>
                <span className="skill-tag">Lógica de Programação</span>
                <span className="skill-tag">Banco de dados SQL</span>
              </div>

              <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "center" }}>
                <Link href="/sobre" className="btn btn-outline">
                  Sobre mim | Pessoal <i className="ph ph-arrow-right"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. PROJECTS SECTION ("Principais Projetos") ── */}
      <section id="projects" className="projects section">
        <div className="container">
          <h2 className="section-title">Principais Projetos</h2>
          <div className="projects-grid">
            {/* Project 1: AcusticBuilding */}
            <div className="project-card">
              <i className="ph ph-kanban watermark-icon"></i>
              <div className="project-info">
                <div className="project-card-visual" aria-hidden="true">
                  <div className="architecture-lines">
                    <i />
                    <i />
                    <i />
                    <i />
                    <b>
                      EN
                      <br />
                      12354
                    </b>
                  </div>
                </div>
                <i className="ph ph-kanban"></i>
                <h3 className="project-title">AcusticBuilding</h3>
                <p className="project-desc">
                  Desenvolvimento de uma plataforma preditiva para antecipar níveis de ruído em
                  edificações na fase de planejamento arquitetônico, baseando-se nas normas europeias
                  EN 12354-1 e EN 12354-2.
                </p>
                <div className="project-video-embed">
                  <iframe
                    src="https://drive.google.com/file/d/1kC-pFY_rgKTiVAEkhKXlEsYN6WP5YFrU/preview"
                    width="100%"
                    height="240"
                    allow="autoplay"
                    style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}
                    title="Vídeo — AcousticBuild"
                  ></iframe>
                </div>
                <div className="project-actions">
                  <Link href="/projeto" className="btn btn-primary">
                    Estudo Completo
                  </Link>
                  <a
                    href="https://canva.link/qvl29bfldnlalbu"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                  >
                    Apresentação <i className="ph ph-arrow-square-out"></i>
                  </a>
                  <a
                    href="https://drive.google.com/file/d/1kC-pFY_rgKTiVAEkhKXlEsYN6WP5YFrU/view"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                  >
                    Ver Vídeo <i className="ph ph-play-circle"></i>
                  </a>
                </div>
              </div>
            </div>

            {/* Project 2: Hollow Depths RPG */}
            <div className="project-card">
              <i className="ph ph-game-controller watermark-icon"></i>
              <div className="project-info">
                <div className="project-card-image" aria-hidden="true">
                  <img src="/activities/hollow-depths.png" alt="Hollow Depths Gameplay" />
                </div>
                <i className="ph ph-game-controller"></i>
                <h3 className="project-title">Hollow Depths</h3>
                <p className="project-desc">
                  RPG de turno experimental explorando probabilidade, baralhos de cartas e leitura de
                  variáveis estatísticas integrado com design procedural de combate.
                </p>
                <div className="project-actions">
                  <a
                    href="https://game-nauy.onrender.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    Jogar / Acessar <i className="ph ph-arrow-square-out"></i>
                  </a>
                  <Link href="/materias" className="btn btn-outline">
                    Ver na Matéria <i className="ph ph-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. ARCHIVE SECTION ("Arquivos: Jornada") ── */}
      <section id="archive" className="section archive-section glass-panel">
        <div className="container">
          <h2 className="section-title">
            Arquivos: <span style={{ color: "var(--accent-color)", fontStyle: "italic" }}>Jornada</span>
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              marginBottom: "3rem",
              maxWidth: "640px",
              marginInline: "auto",
            }}
          >
            Uma retrospectiva das minhas evoluções passadas e o progresso no ensino médio e técnico
            ao longo dos anos.
          </p>

          <div className="archive-grid">
            {/* Year 2025 */}
            <div className="archive-card premium-card">
              <i className="ph ph-folder-notch-open"></i>
              <h3 className="archive-year">2025</h3>
              <p className="archive-desc">
                Segundo ano do ensino médio integrado com o curso técnico em ADS. Projetos práticos,
                modelagem e APIs.
              </p>
              <a
                href="https://sites.google.com/estudante.sesisenai.org.br/portfolio-fernando-2025/in%C3%ADcio"
                target="_blank"
                rel="noreferrer"
                className="btn-outline"
              >
                Ver Portfólio 2025 <i className="ph ph-arrow-right"></i>
              </a>
            </div>

            {/* Year 2024 */}
            <div className="archive-card premium-card">
              <i className="ph ph-folder-notch-open"></i>
              <h3 className="archive-year">2024</h3>
              <p className="archive-desc">
                Primeiro ano do Ensino Médio. Primeiros passos em desenvolvimento, lógica de
                programação e ciências aplicadas.
              </p>
              <a
                href="https://canva.link/3sn82g1zzujjw8t"
                target="_blank"
                rel="noreferrer"
                className="btn-outline"
              >
                Ver Portfólio 2024 <i className="ph ph-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. GALLERY SECTION (3D Coverflow Carousel) ── */}
      <section id="gallery" className="gallery section">
        <div className="container">
          <h2 className="section-title">Galeria</h2>
          <CoverflowGallery
            onSlideClick={(slide) =>
              setActivePhoto({
                src: slide.src,
                alt: slide.alt,
                title: slide.caption,
                tag: slide.tag || "Galeria",
                caption: slide.description || slide.caption,
              })
            }
          />
        </div>
      </section>

      {/* ── 6. FINALE SECTION (High-Speed Kinetic 3D Object — Click to Navigate to /materias) ── */}
      <section className="section finale-section glass-panel" style={{ textAlign: "center", overflow: "hidden", position: "relative", padding: "80px 0 100px" }}>
        <div className="container">
          <h2 className="section-title" style={{ marginBottom: "2rem" }}>
            Matérias
          </h2>

          {/* High-speed Large Interactive 3D Object (Click to navigate to /materias) */}
          <FinalePortalScene />
        </div>
      </section>

      {/* Lightbox Modal */}
      <div
        className={`gallery-lightbox ${activePhoto ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!activePhoto}
      >
        <button
          className="gallery-lightbox-close"
          onClick={() => setActivePhoto(null)}
          aria-label="Fechar"
        >
          FECHAR ×
        </button>
        {activePhoto && (
          <div className="gallery-lightbox-inner">
            <img src={activePhoto.src} alt={activePhoto.alt} />
            <div className="gallery-lightbox-info">
              <span>{activePhoto.tag}</span>
              <h3>{activePhoto.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.7", fontSize: "0.95rem" }}>
                {activePhoto.caption}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Easter Egg: Background Warp Speed Lines & Kanji Stream */}
      {warpStreakActive && (
        <div className="warp-background-streak" aria-hidden="true">
          <div className="warp-line"></div>
          <div className="warp-line"></div>
          <div className="warp-line"></div>
          <div className="warp-line"></div>
          <div className="warp-kanji-stream">
            <span>創造 · 未来 · 開発 · 2026 · ADS</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </main>
  );
}
