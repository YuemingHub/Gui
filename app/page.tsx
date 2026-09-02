"use client";

import { useState } from "react";
import { ConversationView } from "@/components/conversation/ConversationView";
import { LocalSpace } from "./LocalSpace";

// The conversation space is the primary surface: opening the app always lands
// here, on the participant's current dialogue with the Return backend. The
// original local-first seven-module space remains reachable as a secondary
// surface via the drawer; it is kept intact and is never auto-migrated.
export default function Page() {
  const [surface, setSurface] = useState<"conversation" | "local">("conversation");

  if (surface === "local") {
    return <LocalSpace onBack={() => setSurface("conversation")} />;
  }
  return <ConversationView onGoLocal={() => setSurface("local")} />;
}
