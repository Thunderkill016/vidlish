"use client";

import dynamic from "next/dynamic";

const CommandPalette = dynamic(() => import("./command-palette"), { ssr: false });

export default function CommandPaletteLoader() {
  return <CommandPalette />;
}