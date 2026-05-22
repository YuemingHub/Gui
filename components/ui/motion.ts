export const motionEase = [0.16, 1, 0.3, 1] as const;

export const softSpring = {
  type: "spring",
  stiffness: 90,
  damping: 18,
  mass: 0.8,
} as const;

export const slowFadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: softSpring,
  },
} as const;

export const gentleFade = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: motionEase },
  },
} as const;

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
} as const;

export const cardLift = {
  rest: {
    y: 0,
    scale: 1,
    boxShadow: "0 24px 70px -52px rgba(0, 0, 0, 0.72)",
  },
  hover: {
    y: -6,
    scale: 1.01,
    boxShadow: "0 36px 90px -48px rgba(0, 0, 0, 0.82)",
    transition: { duration: 0.35, ease: motionEase },
  },
} as const;
