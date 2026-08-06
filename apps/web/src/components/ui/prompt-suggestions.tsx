interface PromptSuggestionsProps {
  label: string;
  append: (message: { role: "user"; content: string }) => void;
  suggestions: string[];
}

export function PromptSuggestions({ label, append, suggestions }: PromptSuggestionsProps) {
  return (
    <div className="flex h-full flex-col justify-center py-4">
      <div className="space-y-4">
        <h2 className="text-center font-bold font-bricolage text-brand-navy text-lg sm:text-xl">{label}</h2>
        <div className="flex flex-col gap-2">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => append({ role: "user", content: suggestion })}
              className="rounded-xl border border-gray-200 bg-white p-3.5 font-manrope text-sm text-text-main shadow-xs transition-all hover:border-mentor-teal/40 hover:bg-mentor-teal/5 hover:text-brand-navy active:scale-[0.99]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
