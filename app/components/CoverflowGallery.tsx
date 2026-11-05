"use client";

import { useState, useCallback, useEffect } from "react";

export type GallerySlide = {
  src: string;
  alt: string;
  caption: string;
  tag?: string;
  year?: string;
  description?: string;
};

export const defaultSlides: GallerySlide[] = [
  {
    src: "/media/fernando.jpg",
    alt: "Foto - Fernando Rateke",
    caption: "Fernando Rateke",
    tag: "Florianópolis",
    year: "2025",
    description: "Registro pessoal e início do percurso como desenvolvedor e pesquisador.",
  },
  {
    src: "/imagens/IMG_20260316_195716_170.webp",
    alt: "Foto - São Paulo",
    caption: "São Paulo - IC",
    tag: "São Paulo",
    year: "2026",
    description: "Roda-gigante e imersão durante a participação em evento científico e acadêmico nacional.",
  },
  {
    src: "/imagens/IMG_20260320_221425_320.webp",
    alt: "Foto - FEBRACE",
    caption: "FEBRACE - SP",
    tag: "FEBRACE · SP",
    year: "2026",
    description: "Apresentação e defesa de projeto na Feira Brasileira de Ciências e Engenharia em São Paulo.",
  },
  {
    src: "/imagens/IMG-20260316-WA0013.jpg",
    alt: "Foto - Aeroporto Floripa",
    caption: "Aeroporto Floripa",
    tag: "Florianópolis",
    year: "2026",
    description: "Embarque da delegação no Aeroporto Internacional de Florianópolis rumo à FEBRACE.",
  },
  {
    src: "/imagens/IMG-20250506-WA0031.jpg",
    alt: "Foto - Antigo Grupo 5",
    caption: "Antigo Grupo 5",
    tag: "Antigo Grupo 5",
    year: "2025",
    description: "Antigo Grupo 5 de Iniciação Científica — pesquisa e desenvolvimento colaborativo.",
  },
];

export default function CoverflowGallery({
  slides = defaultSlides,
  initialIndex = 2,
  onSlideClick,
}: {
  slides?: GallerySlide[];
  initialIndex?: number;
  onSlideClick?: (slide: GallerySlide) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const prevSlide = useCallback(() => {
    setCurrentIndex((curr) => (curr > 0 ? curr - 1 : slides.length - 1));
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((curr) => (curr < slides.length - 1 ? curr + 1 : 0));
  }, [slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevSlide, nextSlide]);

  return (
    <div className="carousel-container">
      <button
        className="carousel-btn prev-btn"
        onClick={prevSlide}
        aria-label="Foto Anterior"
      >
        <i className="ph ph-caret-left"></i>
      </button>

      <div className="carousel-track-container">
        <ul className="carousel-track">
          {slides.map((slide, index) => {
            const offset = index - currentIndex;
            const absOffset = Math.abs(offset);
            const scale = absOffset === 0 ? 1 : absOffset === 1 ? 0.75 : 0.55;
            const translateX = offset * 240;
            const translateZ = absOffset * -250;
            const rotateY = offset > 0 ? -40 : offset < 0 ? 40 : 0;
            const opacity = absOffset > 2 ? 0 : absOffset === 2 ? 0.4 : absOffset === 1 ? 0.7 : 1;
            const zIndex = 10 - absOffset;
            const isActive = offset === 0;
            const filterVal = absOffset === 0 ? "none" : `blur(${absOffset * 1.5}px) brightness(0.5)`;

            return (
              <li
                key={slide.src}
                className={`carousel-slide ${isActive ? "active" : ""}`}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  filter: filterVal,
                }}
              >
                <button
                  type="button"
                  className="carousel-slide-button"
                  aria-label={isActive ? `Ampliar foto: ${slide.caption}` : `Ir para foto: ${slide.caption}`}
                  onClick={() => {
                    if (isActive) {
                      onSlideClick?.(slide);
                    } else {
                      setCurrentIndex(index);
                    }
                  }}
                >
                  <img src={slide.src} alt={slide.alt} />
                  <div className="slide-caption">{slide.caption}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        className="carousel-btn next-btn"
        onClick={nextSlide}
        aria-label="Próxima Foto"
      >
        <i className="ph ph-caret-right"></i>
      </button>
    </div>
  );
}
