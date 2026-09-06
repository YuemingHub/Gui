"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalOptions = {
  open: boolean;
  onClose: () => void;
  /** Where focus goes back when the dialog closes; defaults to whatever was focused. */
  returnTo?: () => HTMLElement | null;
};

/**
 * Keyboard contract for a modal panel: Escape closes, Tab cannot walk out of it,
 * focus lands inside on open and returns to the opener on close. Page scroll is
 * locked so a phone does not scroll a transcript behind the panel.
 */
export function useModalDialog<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
  returnTo,
}: ModalOptions) {
  const panelRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const list = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    (list()[0] ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = list();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = panel.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      const target = returnTo?.() ?? opener;
      if (target && document.contains(target)) target.focus();
    };
    // returnTo is read through a ref-free call: it only runs on close.
  }, [open, returnTo]);

  return panelRef;
}
