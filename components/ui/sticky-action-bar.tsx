"use client";

import * as React from "react";

export interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyActionBar({ children, className = "" }: StickyActionBarProps) {
  return (
    <div className={`sticky bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 pb-safe shadow-lg transition-all ${className}`}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}

export default StickyActionBar;
