import { useState } from "react";
import { ArrowUp, Command } from "lucide-react";

export function CommandInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (question: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue("");
  };
  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-end gap-1 font-mono text-[10px] text-muted-foreground/50">
        <Command size={10} />
        <span>Enter to analyze</span>
      </div>
      <div className="flex items-center gap-2 border border-border bg-[#0D0F0F] px-3 py-2 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_0_1px_rgba(45,212,191,0.15)]">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about floats, regions, or measurements..."
          aria-label="Question"
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send question"
          disabled={disabled || !value.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-40"
        >
          <ArrowUp size={14} />
        </button>
      </div>
    </div>
  );
}