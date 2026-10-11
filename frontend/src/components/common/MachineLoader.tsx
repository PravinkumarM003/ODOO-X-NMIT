"use client";

import React from "react";

export default function MachineLoader({ message = "Syncing textile operations..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full space-y-6">
      <div className="relative w-32 h-32">
        {/* Machine Base */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          {/* Main frame */}
          <rect x="20" y="30" width="60" height="50" rx="4" fill="none" stroke="#203B46" strokeWidth="3" />
          <path d="M 20 80 L 10 90 L 90 90 L 80 80" fill="none" stroke="#203B46" strokeWidth="3" />
          
          {/* Rotating gear/wheel 1 */}
          <g style={{ transformOrigin: '35px 55px', animation: 'gearRotate 3s linear infinite' }}>
            <circle cx="35" cy="55" r="12" fill="none" stroke="#00F0FF" strokeWidth="2" strokeDasharray="4 4" className="opacity-80" />
            <circle cx="35" cy="55" r="4" fill="#00F0FF" />
          </g>
          
          {/* Rotating gear/wheel 2 */}
          <g style={{ transformOrigin: '65px 55px', animation: 'gearRotate 3s linear infinite reverse' }}>
            <circle cx="65" cy="55" r="12" fill="none" stroke="#00F0FF" strokeWidth="2" strokeDasharray="4 4" className="opacity-80" />
            <circle cx="65" cy="55" r="4" fill="#00F0FF" />
          </g>

          {/* Animated Yarn Thread */}
          <path 
            d="M 10 40 Q 35 30 35 55 T 65 55 T 90 40" 
            fill="none" 
            stroke="#00F0FF" 
            strokeWidth="2" 
            strokeDasharray="10 10"
            style={{ animation: 'threadMove 1s linear infinite' }}
            className="animate-pulse-glow"
          />
        </svg>
      </div>
      <p className="font-medium text-sm text-[#00F0FF] animate-pulse tracking-wide font-mono-id">
        {message}
      </p>
    </div>
  );
}
