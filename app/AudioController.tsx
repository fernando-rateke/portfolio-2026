"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUDIO_SRC = "/audio/clair-de-lune.mp3";

export default function AudioController() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cria (ou reaproveita) a instância de áudio
  const getAudio = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!audioRef.current) {
      const audio = new Audio();
      audio.src = AUDIO_SRC;
      audio.loop = true;
      audio.volume = 0.4;
      // Só baixa a música (~10 MB) quando o visitante der play
      audio.preload = "none";

      audio.addEventListener("play", () => {
        setIsPlaying(true);
        setIsLoading(false);
      });
      audio.addEventListener("playing", () => {
        setIsPlaying(true);
        setIsLoading(false);
      });
      audio.addEventListener("pause", () => {
        setIsPlaying(false);
        setIsLoading(false);
      });
      audio.addEventListener("waiting", () => {
        setIsLoading(true);
      });
      audio.addEventListener("canplay", () => {
        setIsLoading(false);
      });
      audio.addEventListener("error", (e) => {
        console.warn("Audio element error:", e);
        setIsPlaying(false);
        setIsLoading(false);
      });

      audioRef.current = audio;
    } else if (audioRef.current.error) {
      // Re-arm source if it encountered an error previously
      audioRef.current.src = AUDIO_SRC;
      audioRef.current.load();
    }

    return audioRef.current;
  }, []);

  // Cria o elemento de áudio ao montar e pausa ao desmontar
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = getAudio();
    if (!audio) return;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [getAudio]);

  // Keep hint visible for 8s initially
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Safe trigger from user gesture entry screen
  const startAudioOnce = useCallback(() => {
    const audio = getAudio();
    if (audio) {
      if (audio.paused) {
        const p = audio.play();
        if (p !== undefined) {
          p.then(() => {
            setIsPlaying(true);
          }).catch((err) => {
            console.warn("Autoplay audio blocked or pending user interaction:", err);
          });
        }
      }
    }
  }, [getAudio]);

  // Listen for custom entry event
  useEffect(() => {
    const handleAutoStart = () => {
      startAudioOnce();
    };

    window.addEventListener("start-portfolio-audio", handleAutoStart);
    return () => window.removeEventListener("start-portfolio-audio", handleAutoStart);
  }, [startAudioOnce]);

  // Toggle button handler (Mute / Play)
  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHint(true);

    const audio = getAudio();
    if (!audio) return;

    if (audio.paused || audio.ended) {
      // Recarrega a fonte só se a última tentativa falhou
      if (audio.error) {
        audio.src = AUDIO_SRC;
        audio.load();
      }

      setIsLoading(true);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.warn("Audio playback was blocked or failed:", err);
            setIsPlaying(false);
            setIsLoading(false);
          });
      }
    } else {
      audio.pause();
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [getAudio]);

  return (
    <button
      type="button"
      className={`audio-toggle ${isPlaying ? "active" : ""}`}
      onClick={togglePlay}
      onMouseEnter={() => setShowHint(true)}
      aria-label={isPlaying ? "Pausar Som" : "Tocar Som — Clair de Lune"}
      title={isPlaying ? "Desativar som (Clair de Lune)" : "Ativar som (Clair de Lune)"}
    >
      <div className="audio-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          {isPlaying ? (
            <>
              <path d="M15.54 8.46a5 5 0 010 7.07" />
              <path d="M19.07 4.93a10 10 0 010 14.14" />
            </>
          ) : (
            <>
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          )}
        </svg>
      </div>

      {isPlaying && (
        <div className="audio-equalizer-bars" aria-hidden="true">
          <span className="eq-bar eq-1"></span>
          <span className="eq-bar eq-2"></span>
          <span className="eq-bar eq-3"></span>
        </div>
      )}

      {showHint && (
        <span className="audio-hint">
          {isLoading ? "CARREGANDO..." : isPlaying ? "CLAIR DE LUNE" : "ATIVAR SOM"}
        </span>
      )}
    </button>
  );
}

