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
            background: "linear-gradient(-45deg, #f5ecd5, #e8c68c, #4facfe, #fdfbfb)",
            backgroundSize: "400% 400%",
          }}
        >
          {/* Lightweight CSS animation instead of heavy JS/WebGL/SVG blurs */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes gradientMove {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          `}} />
          
          <div 
            className="absolute inset-0"
            style={{ animation: "gradientMove 15s ease infinite" }}
          />

          {/* Simple lightweight noise overlay */}
          <div 
            className="absolute inset-0 opacity-[0.2]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: "200px",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
