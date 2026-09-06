"use client";

import { useEffect, useRef, useState } from "react";

// Sound is opt-in. Nothing here listens for a first click, key press or touch:
// the conversation surface does not mount this component at all, and the legacy
// local surface only plays after the person presses this button — and can see
// the same button to stop it again.
const TARGET_VOLUME = 0.42;

export function AmbientBgm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      audioRef.current?.pause();
    },
    [],
  );

  const fadeIn = (audio: HTMLAudioElement) => {
    if (fadeRef.current) clearInterval(fadeRef.current);
    audio.volume = 0;
    fadeRef.current = setInterval(() => {
      const next = Math.min(TARGET_VOLUME, audio.volume + 0.03);
      audio.volume = next;
      if (next >= TARGET_VOLUME && fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    }, 180);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      if (fadeRef.current) clearInterval(fadeRef.current);
      audio.pause();
      setPlaying(false);
      setFailed(false);
      return;
    }
    try {
      await audio.play();
      setFailed(false);
      setPlaying(true);
      fadeIn(audio);
    } catch {
      // A blocked file says so instead of looking like a broken button.
      setFailed(true);
    }
  };

  return (
    <div className="fixed bottom-[calc(1.25rem+var(--sab))] right-5 z-50 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={playing}
        className="rounded-full border border-white/8 bg-[#0e1117]/85 px-4 py-2.5 text-xs text-stone-500 backdrop-blur transition hover:border-white/12 hover:text-stone-300"
      >
        {playing ? "背景声音：开（点一下停）" : "背景声音：关"}
      </button>
      {failed ? (
        <p aria-live="polite" className="text-[11px] leading-5 text-amber-200/80">
          这段声音没有放出来。可能是文件没带上。
        </p>
      ) : null}
      <audio ref={audioRef} loop preload="none" aria-hidden="true" className="hidden">
        <source
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/bgm/trackintime.mp3`}
          type="audio/mpeg"
        />
      </audio>
    </div>
  );
}
