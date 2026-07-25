"use client";

import { useChat } from "./ChatProvider";
import { ChatIcon } from "./icons";

// Vertically centered on the right edge — easier to reach/notice while
// hovering over the page content than tucked down by the bottom nav, and
// still clear of the Toast stack (centered, bottom-24, z-[60]) and
// BottomNav. A floating entry point rather than a 6th nav tab, since the
// bottom nav is already tight at 5 tabs for entrepreneur-tier users.
export function ChatButton() {
  const { isOpen, open } = useChat();
  if (isOpen) return null;

  return (
    <button
      onClick={open}
      aria-label="Ask your budget"
      title="Ask your budget"
      className="fixed top-1/2 right-4 z-40 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-card-border bg-accent text-accent-foreground shadow-lg hover:bg-accent-hover"
    >
      <ChatIcon className="h-6 w-6" />
    </button>
  );
}
