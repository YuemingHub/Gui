"use client";

import { useEffect } from "react";

/**
 * Track the visible part of the screen. iOS and current Android keep the layout
 * viewport full-height when the keyboard opens, so a chat shell sized to 100dvh
 * would slide its composer behind the keyboard. Everything sized to the
 * conversation reads --vvh instead.
 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = typeof window === "undefined" ? null : window.visualViewport;
    const root = document.documentElement;
    if (!vv) {
      root.style.removeProperty("--vvh");
      return;
    }
    const apply = () => {
      const h = Math.max(1, Math.round(vv.height));
      root.style.setProperty("--vvh", `${h}px`);
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);
}
