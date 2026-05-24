"use client";

import { useEffect, useRef } from "react";

export function AmbientBgm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const targetVolume = 0.42;
    let fadeTimer: ReturnType<typeof setInterval> | null = null;

    const startFadeIn = () => {
      if (fadeTimer) clearInterval(fadeTimer);
      audio.volume = 0;
      fadeTimer = setInterval(() => {
        const nextVolume = Math.min(targetVolume, audio.volume + 0.03);
        audio.volume = nextVolume;
        if (nextVolume >= targetVolume && fadeTimer) {
          clearInterval(fadeTimer);
          fadeTimer = null;
        }
      }, 180);
    };

    const startPlayback = async () => {
      if (startedRef.current) return true;
      try {
        await audio.play();
        startedRef.current = true;
        startFadeIn();
        return true;
      } catch {
        return false;
      }
    };

    const onExplicitStart = () => {
      void startPlayback();
    };

    const resumeOnFirstGesture = () => {
      if (startedRef.current) return;
      void startPlayback().then((played) => {
        if (!played) return;
        window.removeEventListener("pointerdown", resumeOnFirstGesture);
        window.removeEventListener("keydown", resumeOnFirstGesture);
        window.removeEventListener("touchstart", resumeOnFirstGesture);
      });
    };

    window.addEventListener("ambient-bgm-start", onExplicitStart as EventListener);
    window.addEventListener("pointerdown", resumeOnFirstGesture, { passive: true });
    window.addEventListener("keydown", resumeOnFirstGesture);
    window.addEventListener("touchstart", resumeOnFirstGesture, { passive: true });

    return () => {
      if (fadeTimer) clearInterval(fadeTimer);
      window.removeEventListener("ambient-bgm-start", onExplicitStart as EventListener);
      window.removeEventListener("pointerdown", resumeOnFirstGesture);
      window.removeEventListener("keydown", resumeOnFirstGesture);
      window.removeEventListener("touchstart", resumeOnFirstGesture);
    };
  }, []);

  return (
    <audio ref={audioRef} loop preload="auto" aria-hidden="true" className="hidden">
      <source src="/bgm/trackintime.mp3" type="audio/mpeg" />
    </audio>
  );
}
