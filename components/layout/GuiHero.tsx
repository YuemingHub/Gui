"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";

type Ripple = { id: number; x: number; y: number };

export function GuiHero({
  onEnter,
  activated,
}: {
  onEnter: () => void;
  activated: boolean;
}) {
  const [breathing] = useState(true);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const enterCalledRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-240, 240], [7, -7]), {
    stiffness: 45,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [-240, 240], [-7, 7]), {
    stiffness: 45,
    damping: 22,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const spawnRipple = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x: clientX - rect.left, y: clientY - rect.top }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 1800);
  };

  const triggerEnter = (x: number, y: number) => {
    spawnRipple(x, y);
    if (!enterCalledRef.current) {
      enterCalledRef.current = true;
      setTimeout(onEnter, 680);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center overflow-visible ${activated ? "cursor-pointer" : ""}`}
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        if (!activated) return;
        triggerEnter(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!activated) return;
        const t = e.changedTouches[0];
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start || !t) return;
        if (Math.abs(t.clientX - start.x) < 12 && Math.abs(t.clientY - start.y) < 12) {
          triggerEnter(t.clientX, t.clientY);
        }
      }}
      role={activated ? "button" : undefined}
      tabIndex={activated ? 0 : -1}
      aria-label={activated ? "归，进入" : undefined}
      onKeyDown={(e) => {
        if (!activated) return;
        if (e.key === "Enter" || e.key === " ") {
          const rect = containerRef.current?.getBoundingClientRect();
          triggerEnter(
            rect ? rect.left + rect.width / 2 : 0,
            rect ? rect.top + rect.height / 2 : 0,
          );
        }
      }}
    >
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          aria-hidden="true"
          initial={{ scale: 0, opacity: 0.28 }}
          animate={{ scale: 6, opacity: 0 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            left: r.x - 60,
            top: r.y - 60,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,173,134,0.24), transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      ))}

      {activated && breathing &&
        [0, 2.2, 4.4].map((delay, i) => (
          <motion.span
            key={`sonar-${i}`}
            aria-hidden="true"
            initial={{ scale: 0.42, opacity: 0 }}
            animate={{ scale: 2.8, opacity: [0, 0.09, 0] }}
            transition={{
              duration: 5.5,
              delay,
              repeat: Infinity,
              ease: "easeOut",
              times: [0, 0.32, 1],
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{
              width: "1em",
              height: "1em",
              fontSize: "clamp(9rem, 28vw, 22rem)",
              borderColor: "rgba(200,173,134,0.45)",
            }}
          />
        ))}

      <motion.div
        aria-hidden="true"
        animate={
          activated && breathing
            ? { opacity: [0, 0.07, 0], scale: [0.94, 1.1, 0.94] }
            : { opacity: 0 }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(200,173,134,0.4), transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        <motion.div
          initial={false}
          animate={
            activated
              ? { opacity: 1, scale: 1, filter: "blur(0px)" }
              : { opacity: 0, scale: 0.48, filter: "blur(14px)" }
          }
          transition={{ duration: 2.6, ease: [0.16, 1, 0.3, 1], delay: activated ? 0.08 : 0 }}
        >
          <motion.h1
            animate={activated && breathing ? { scale: [1, 1.014, 1] } : {}}
            transition={{ duration: 7, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
            className="select-none font-normal leading-none tracking-[-0.02em] text-stone-100"
            style={{ fontSize: "clamp(9rem, 28vw, 22rem)" }}
          >
            归
          </motion.h1>
        </motion.div>
      </motion.div>

      <motion.p
        initial={false}
        animate={activated ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 1.8, delay: activated ? 2.1 : 0 }}
        className="mt-6 text-[10px] uppercase tracking-[0.7em] text-stone-600"
        aria-hidden="true"
      >
        guī
      </motion.p>
    </div>
  );
}
