import React from "react";

export function Logo({ className = "w-8 h-8", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="logo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" /> {/* Blue 600 */}
          <stop offset="100%" stopColor="#1e3a8a" /> {/* Blue 900 */}
        </linearGradient>
        <linearGradient id="logo-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" /> {/* Red 500 */}
          <stop offset="100%" stopColor="#991b1b" /> {/* Red 800 */}
        </linearGradient>
        <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
        </filter>
      </defs>
      
      {/* Dynamic Background shape */}
      <rect x="5" y="5" width="90" height="90" rx="24" fill="url(#logo-grad-1)" filter="url(#logo-shadow)" />

      {/* House / Shopping Bag Body */}
      <path d="M50 25 L20 48 H30 V75 H70 V48 H80 Z" fill="white" />

      {/* Door / Bag handle opening */}
      <path d="M40 75 V55 C40 48, 60 48, 60 55 V75" fill="url(#logo-grad-1)" />

      {/* Bag Handle Loop */}
      <path d="M35 32 C35 18, 65 18, 65 32" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />

      {/* Vibrant Red Accent Dot */}
      <circle cx="50" cy="50" r="5" fill="url(#logo-grad-2)" />
    </svg>
  );
}
