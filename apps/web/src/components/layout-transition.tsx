"use client";

import * as React from "react";

export function LayoutTransition({ children, layoutKey }: { children: React.ReactNode; layoutKey: string }) {
  return (
    <div
      key={layoutKey}
      className="min-w-0 animate-fade-in"
    >
      {children}
    </div>
  );
}
