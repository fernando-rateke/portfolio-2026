"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar3D from "./Navbar3D";

export default function Navbar({ activePage = "home" }: { activePage?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(activePage);

    // Dynamic Scrollspy: track which section is currently on screen
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If we're on a dedicated subpage (e.g. /materias, /curriculo, /sobre, /galeria)
    const pathname = window.location.pathname.toLowerCase().replace(/\/$/, "");
    if (pathname !== "/antigo") return;

    const sections = [
      { id: "home", name: "home" },
      { id: "about", name: "sobre" },
      { id: "projects", name: "projects" },
      { id: "archive", name: "archive" },
      { id: "gallery", name: "galeria" },
    ];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 220; // Offset for navbar

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveSection(sections[i].name);
            return;
          }
        }
      }
      setActiveSection("home");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [activePage]);

  const handleNavClick = useCallback((targetId?: string) => {
    setMobileMenuOpen(false);
    if (targetId && typeof window !== "undefined") {
      const cleanPath = window.location.pathname.toLowerCase().replace(/\/$/, "");
      if (cleanPath === "/antigo") {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, []);

  return (
    <header className="navbar">
      <div className="nav-container">
        {/* Left Column: Brand Logo with 3D Emblem */}
        <Link href="/antigo#home" className="logo" onClick={() => handleNavClick("home")}>
          <Navbar3D />
          <span>
            Fernando <span>Rateke</span>
          </span>
        </Link>

        {/* Center Column: Navigation Links Capsule */}
        <div className="nav-center-wrapper">
          <nav className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <Link
              href="/antigo#home"
              className={`nav-item ${activeSection === "home" ? "active-link" : ""}`}
              onClick={() => handleNavClick("home")}
            >
              Início
            </Link>
            <Link
              href="/antigo#about"
              className={`nav-item ${activeSection === "sobre" ? "active-link" : ""}`}
              onClick={() => handleNavClick("about")}
            >
              Sobre Mim
            </Link>
            <Link
              href="/antigo#projects"
              className={`nav-item ${activeSection === "projects" ? "active-link" : ""}`}
              onClick={() => handleNavClick("projects")}
            >
              Projetos
            </Link>
            <Link
              href="/antigo#archive"
              className={`nav-item ${activeSection === "archive" ? "active-link" : ""}`}
              onClick={() => handleNavClick("archive")}
            >
              Arquivos
            </Link>
            <Link
              href="/antigo#gallery"
              className={`nav-item ${activeSection === "galeria" ? "active-link" : ""}`}
              onClick={() => handleNavClick("gallery")}
            >
              Galeria
            </Link>
            <Link
              href="/curriculo"
              className={`nav-item ${activeSection === "curriculo" ? "active-link" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Currículo
            </Link>
            <Link
              href="/materias"
              className={`nav-item nav-highlight ${activeSection === "materias" ? "active-link" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Matérias
            </Link>
          </nav>
        </div>

        {/* Right Column: Balancing Column & Mobile Menu Toggle */}
        <div className="nav-right-actions" style={{ justifyContent: "flex-end" }}>
          <button
            aria-label="Abrir Menu"
            className="menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <i className={mobileMenuOpen ? "ph ph-x" : "ph ph-list"}></i>
          </button>
        </div>
      </div>
    </header>
  );
}
