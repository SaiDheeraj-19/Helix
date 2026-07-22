import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={cn("w-full h-full", className)}
    >
      <defs>
        <linearGradient id="helix-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="helix-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="helix-center" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      
      {/* Left Pillar */}
      <path 
        d="M 15 32 L 40 17 L 40 77 L 15 92 Z" 
        fill="url(#helix-left)" 
        stroke="url(#helix-left)" 
        strokeWidth="4" 
        strokeLinejoin="round" 
      />
      
      {/* Right Pillar */}
      <path 
        d="M 60 20 L 85 5 L 85 65 L 60 80 Z" 
        fill="url(#helix-right)" 
        stroke="url(#helix-right)" 
        strokeWidth="4" 
        strokeLinejoin="round" 
      />
      
      {/* Crossbar */}
      <path 
        d="M 40 50 L 60 38 L 60 58 L 40 70 Z" 
        fill="url(#helix-center)" 
      />
    </svg>
  );
}
