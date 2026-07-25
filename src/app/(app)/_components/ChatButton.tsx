"use client";

import { useChat } from "./ChatProvider";
import { ChatIcon } from "./icons";

// Bottom-right corner, but constrained to the same max-w-2xl/px-4 column as
// the page content (see (app)/layout.tsx) rather than the raw viewport edge
// — on a wide desktop window the content column doesn't reach the screen
// edge, so anchoring straight to it would leave the button floating out in
// empty margin. This keeps it inset from the section content itself, still
// clear of the Toast stack (centered, bottom-24, z-[60]) and BottomNav.
export function ChatButton() {
  const { isOpen, open } = useChat();
  if (isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto max-w-2xl px-4">
      <div className="flex justify-end">
        <button
          onClick={open}
          aria-label="Ask your budget"
          title="Ask your budget"
          className="pointer-events-auto mr-4 flex h-14 w-14 items-center justify-center rounded-full border border-card-border bg-accent text-accent-foreground shadow-lg hover:bg-accent-hover"
        >
          <ChatIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
