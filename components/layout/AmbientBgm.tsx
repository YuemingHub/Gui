"use client";

import { useEffect, useRef } from "react";

export function AmbientBgm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    const tryPlay = async () => {
      try {
        audio.currentTime = audio.currentTime || 0;
        await audio.play();
        startFadeIn();
        return true;
      } catch {
        return false;
      }
    };

    let unlocked = false;

    void tryPlay().then((played) => {
      unlocked = played;
    });

    const resumeOnFirstGesture = () => {
      if (unlocked) return;
      void tryPlay().then((played) => {
        if (!played) return;
        unlocked = true;
        window.removeEventListener("pointerdown", resumeOnFirstGesture);
        window.removeEventListener("keydown", resumeOnFirstGesture);
        window.removeEventListener("touchstart", resumeOnFirstGesture);
      });
    };

    window.addEventListener("pointerdown", resumeOnFirstGesture, { passive: true });
    window.addEventListener("keydown", resumeOnFirstGesture);
    window.addEventListener("touchstart", resumeOnFirstGesture, { passive: true });

    return () => {
      if (fadeTimer) clearInterval(fadeTimer);
      window.removeEventListener("pointerdown", resumeOnFirstGesture);
      window.removeEventListener("keydown", resumeOnFirstGesture);
      window.removeEventListener("touchstart", resumeOnFirstGesture);
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      autoPlay
      loop
      preload="auto"
      aria-hidden="true"
      className="hidden"
    >
      <source src="/bgm/trackintime.mp3" type="audio/mpeg" />
    </audio>
  );
}
