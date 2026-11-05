"use client";

import dynamic from "next/dynamic";

const AudioController = dynamic(() => import("../AudioController"), { ssr: false });

export default function GlobalAudio() {
  return <AudioController />;
}
