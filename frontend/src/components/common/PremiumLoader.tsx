"use client";

import { motion } from "framer-motion";

export function PremiumLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/60 backdrop-blur-2xl">
      <div className="relative flex items-center justify-center">
        {/* Subtle background glow */}
        <div className="absolute w-32 h-32 bg-foreground/5 rounded-full blur-2xl" />

        {/* Outer rotating ring - Apple inspired smoothness */}
        <motion.svg
          className="absolute w-20 h-20 text-foreground/20"
          viewBox="0 0 100 100"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        </motion.svg>

        {/* Inner rotating ring - Opposite direction */}
        <motion.svg
          className="absolute w-16 h-16 text-foreground/40"
          viewBox="0 0 100 100"
          initial={{ rotate: 360 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 12, ease: "linear", repeat: Infinity }}
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />
        </motion.svg>

        {/* Center dot matrix - Nothing inspired */}
        <div className="grid grid-cols-3 gap-1">
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-foreground rounded-full"
              initial={{ opacity: 0.2, scale: 0.5 }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.5, 1, 0.5] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: (i % 3) * 0.2 + Math.floor(i / 3) * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mt-12 flex flex-col items-center gap-1.5"
      >
        <div className="text-[10px] font-mono tracking-[0.4em] text-foreground/40 uppercase">
          Initializing
        </div>
        <div className="h-px w-12 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
      </motion.div>
    </div>
  );
}
