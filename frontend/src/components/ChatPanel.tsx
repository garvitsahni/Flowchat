import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Language, QueryResponse } from "../types";
import { ask } from "../lib/api";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ExplainabilityDrawer } from "./ExplainabilityDrawer";

interface Message {
  role: "user" | "system";
  text: string;
  response?: QueryResponse;
  kind?: "error" | "refusal";
}

const SUGGESTIONS = [
  "Show the depth profile of temperature for float 2900226",
  "Where has float 2900226 traveled?",
  "How has temperature changed in the Bay of Bengal since 2003?",
  "Was 2003 unusually warm in the Arabian Sea?",
];

export function ChatPanel({
  language,
  onLanguageChange,
  onVizChange,
}: {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onVizChange: (response: QueryResponse | null) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const response = await ask(text, language);
      const kind: Message["kind"] =
        response.chart_type === "none" && response.refusal_reason ? "refusal" : undefined;
      setMessages((m) => [...m, { role: "system", text: response.answer_text, response, kind }]);
      onVizChange(response);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: err instanceof Error ? err.message : "Something went wrong.",
          kind: "error",
        },
      ]);
      onVizChange(null);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-4">
        {messages.length === 0 && (
          <div className="pt-8 text-center">
            <p className="font-mono text-sm text-foam-200">Ask about the Indian Ocean float data.</p>
            <div className="mx-auto mt-5 flex max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={busy}
                  className="rounded-lg border border-current-500/40 bg-abyss-800/60 px-3 py-2 text-left text-[13px] text-foam-200 transition-colors hover:border-bio-400/60 hover:text-foam-50 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {msg.role === "user" ? (
              <div className="max-w-[80%] rounded-lg rounded-br-sm border border-current-500 bg-current-500/70 px-3 py-2 text-[14px] leading-relaxed text-foam-50">
                {msg.text}
              </div>
            ) : (
              <div
                className={`max-w-[85%] border-l-2 bg-abyss-800 px-3 py-2.5 ${
                  msg.kind === "error"
                    ? "border-flag-500"
                    : msg.kind === "refusal"
                      ? "border-scan-500"
                      : "border-bio-400"
                }`}
              >
                <p
                  className={`text-[14px] leading-relaxed text-foam-50 ${
                    msg.kind === "error" ? "font-mono text-[13px] text-flag-500" : ""
                  }`}
                >
                  {msg.text}
                </p>
                {msg.kind === "refusal" && (
                  <div className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-scan-500">
                    {msg.response?.refusal_reason === "no_data"
                      ? "no data in scope"
                      : msg.response?.refusal_reason === "unsafe"
                        ? "couldn't answer safely"
                        : "out of scope"}
                  </div>
                )}
                {msg.response && msg.kind !== "refusal" && (
                  <div className="mt-2 flex items-center gap-3">
                    <ConfidenceBadge
                      confidence={msg.response.confidence}
                      note={msg.response.confidence_note}
                    />
                  </div>
                )}
                {msg.response && msg.kind !== "refusal" && (
                  <ExplainabilityDrawer info={msg.response.explainability} />
                )}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-lg border-l-2 border-bio-400 bg-abyss-800 px-4 py-3">
              <div className="sonar-sweep h-4 w-24" aria-label="thinking" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-current-500/30 pt-3">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about floats, regions, or measurements…"
            disabled={busy}
            className="flex-1 rounded-lg border border-current-500/50 bg-abyss-800 px-3 py-2.5 text-[14px] text-foam-50 placeholder:text-foam-200/50 focus:border-bio-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg border border-bio-400 bg-bio-400/10 px-4 py-2.5 font-mono text-[13px] text-bio-400 transition-colors hover:bg-bio-400/20 disabled:opacity-40"
          >
            SEND
          </button>
          <LanguageToggle language={language} onChange={onLanguageChange} />
        </form>
      </div>
    </div>
  );
}

function LanguageToggle({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-current-500/50">
      {(["en", "hi"] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={`px-2.5 py-2.5 font-mono text-[12px] transition-colors ${
            language === lang
              ? "bg-bio-400/15 text-bio-400"
              : "text-foam-200/60 hover:text-foam-50"
          }`}
        >
          {lang === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}