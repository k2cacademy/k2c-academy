import { useState } from "react";
import { Bot } from "lucide-react";
import { AskNathyChat } from "./AskNathyChat";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.715.315-.93 1.002-1.246 1.918-1.246 3.21 0 .832.402 1.834.71 2.508 1.604 3.529 5.046 5.404 8.33 5.404 1.06 0 2.55-.43 3.32-1.59.187-.286.302-.628.302-.973 0-.345-.072-.66-.143-.802-.144-.215-1.504-1.16-1.776-1.275-.057-.043-.143-.057-.215-.057zM16.06 1.667C8.46 1.667 2.27 7.857 2.27 15.456c0 2.605.717 5.082 2.082 7.231L2.05 30.333l7.83-2.262a13.74 13.74 0 0 0 6.18 1.475c7.6 0 13.79-6.19 13.79-13.79.001-7.599-6.19-13.789-13.79-13.789zm.001 25.246a11.42 11.42 0 0 1-5.798-1.575l-.42-.252-4.296 1.232 1.273-4.234-.273-.42a11.42 11.42 0 0 1-1.785-6.094c0-6.336 5.156-11.49 11.49-11.49 6.336 0 11.49 5.155 11.49 11.49 0 6.336-5.155 11.49-11.49 11.49z" />
    </svg>
  );
}

export function FloatingButtons() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask Nathy AI assistant"
        className="fixed bottom-5 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-105 sm:left-5 sm:px-5"
      >
        <Bot className="h-5 w-5" />
        <span className="hidden sm:inline">Ask Nathy AI</span>
      </button>

      <a
        href="https://wa.me/2349164266235"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-5px_rgba(37,211,102,0.6)] ring-2 ring-white/20 transition-transform hover:scale-105 sm:right-5 sm:px-5"
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
          <WhatsAppIcon className="relative h-6 w-6" />
        </span>
        <span className="hidden sm:inline">Chat on WhatsApp</span>
      </a>

      <AskNathyChat open={open} onOpenChange={setOpen} />
    </>
  );
}
