"use client";

import { ConversationView } from "@/components/conversation/ConversationView";

// The conversation space is the primary surface: opening the app always lands
// here, on the participant's current dialogue with the Return backend. The
// original local-first seven-module space remains reachable as a secondary
// surface via the drawer, and it belongs to whoever that session names.
export default function Page() {
  return <ConversationView />;
}
