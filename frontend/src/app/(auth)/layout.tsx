"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import LineWaves from "@/components/common/LineWaves";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white text-black font-sans">
      {/* ── Left: Form Area ─────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-16 lg:px-24 xl:px-32 relative">
        {/* Logo */}
        <div className="absolute top-10 left-8 sm:left-16 lg:left-24 xl:left-32 flex items-center gap-2.5">
          <Logo className="w-8 h-8" />
          <span className="font-semibold text-xl tracking-wide uppercase text-black">Helix</span>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </div>
      </div>

      {/* ── Right: Aesthetic Fluid Gradient ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 p-6 xl:p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full h-full rounded-[40px] overflow-hidden relative shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #f5ecd5 0%, #e8c68c 30%, #4facfe 70%, #fdfbfb 100%)",
          }}
        >
          {/* Abstract fluid shapes using blur */}
          <motion.div 
            animate={{
              x: ["0%", "10%", "-5%", "0%"],
              y: ["0%", "-10%", "5%", "0%"],
              scale: [1, 1.1, 0.9, 1],
            }}
            transition={{ duration: 15, ease: "easeInOut", repeat: Infinity }}
            className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-500/40 blur-[100px] rounded-full mix-blend-multiply" 
          />
          <motion.div 
            animate={{
              x: ["0%", "-15%", "10%", "0%"],
              y: ["0%", "15%", "-10%", "0%"],
              scale: [1, 0.85, 1.15, 1],
            }}
            transition={{ duration: 18, ease: "easeInOut", repeat: Infinity, delay: 2 }}
            className="absolute top-[20%] right-[-20%] w-[80%] h-[80%] bg-orange-300/60 blur-[120px] rounded-full mix-blend-multiply" 
          />
          <motion.div 
            animate={{
              x: ["0%", "20%", "-15%", "0%"],
              y: ["0%", "-10%", "15%", "0%"],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{ duration: 20, ease: "easeInOut", repeat: Infinity, delay: 4 }}
            className="absolute bottom-[-20%] left-[10%] w-[60%] h-[60%] bg-amber-200/50 blur-[90px] rounded-full mix-blend-multiply" 
          />
          
          {/* React Bits: Line Waves */}
          <div className="absolute inset-0 z-0 opacity-80 mix-blend-overlay">
            <LineWaves
              speed={0.3}
              innerLineCount={32}
              outerLineCount={36}
              warpIntensity={1.0}
              rotation={-45}
              edgeFadeWidth={0.0}
              colorCycleSpeed={1.0}
              brightness={1.0}
              color1="#ffffff"
              color2="#fdfbfb"
              color3="#ffffff"
              enableMouseInteraction={true}
              mouseInfluence={2.0}
            />
          </div>
          
          {/* Noise overlay */}
          <div 
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "256px",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
