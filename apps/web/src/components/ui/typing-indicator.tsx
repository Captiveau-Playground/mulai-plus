import { Dot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-gray-100 p-3">
        <div className="flex -space-x-2.5 text-brand-navy">
          <Dot className="h-5 w-5 animate-typing-dot-bounce" />
          <Dot className="h-5 w-5 animate-typing-dot-bounce [animation-delay:90ms]" />
          <Dot className="h-5 w-5 animate-typing-dot-bounce [animation-delay:180ms]" />
        </div>
      </div>
    </div>
  );
}
