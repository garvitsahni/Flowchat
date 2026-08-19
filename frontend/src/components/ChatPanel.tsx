import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Language, QueryResponse } from "../types";
import { ask } from "../lib/api";
import { cn } from "../lib/cn";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ExplainabilityDrawer } from "./ExplainabilityDrawer";

interface Message {
  role: "user" | "system";
  text: string;
  response?: QueryResponse;
  kind?: "error" | "refusal";
}

const SUGGESTIONS = [
  "How did temperature change in the Bay of Bengal in 2003?",
  "Show the depth profile for float 2900226",
  "Was March 2003 unusually warm in the Bay of Bengal?",
  "बंगाल की खाड़ी में 2003 में तापमान कैसे बदला?",
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

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

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-bio-400/30 bg-abyss-800/80">
              <SonarIcon />
            </div>
            <p className="font-mono text-sm text-foam-200">Ask about the Indian Ocean float data.</p>
            <p className="mt-1 font-mono text-[11px] text-current-300">
              Live dataset: float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles
            </p>
            <div className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={busy}
                  className="rounded-full border border-current-500/50 bg-abyss-800/60 px-3.5 py-1.5 text-[13px] text-foam-200 transition-colors hover:border-bio-400/70 hover:text-foam-50 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-current-500 bg-current-500/70 px-3.5 py-2 text-[14px] leading-relaxed text-foam-50">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl rounded-bl-sm border-l-2 bg-abyss-800 px-3.5 py-2.5",
                      msg.kind === "error"
                        ? "border-flag-500"
                        : msg.kind === "refusal"
                          ? "border-scan-500"
                          : "border-bio-400"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[14px] leading-relaxed text-foam-50",
                        msg.kind === "error" && "font-mono text-[13px] text-flag-500"
                      )}
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
                      <ExplainabilityDrawer
                        info={msg.response.explainability}
                        confidence={msg.response.confidence}
                      />
                    )}
                  </div>
                </div>
              )
            )}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border-l-2 border-bio-400 bg-abyss-800 px-4 py-3">
                  <div className="sonar-sweep h-4 w-24" aria-label="thinking" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-current-500/30 pt-3">
        <form onSubmit={onSubmit}>
          <div className="cursor-text rounded-2xl border border-current-500/50 bg-abyss-800 shadow-[0_0_15px_rgba(0,0,0,0.4)] transition-shadow focus-within:border-bio-400/70 focus-within:shadow-[0_0_0_1px_rgba(45,225,194,0.4),0_0_20px_rgba(45,225,194,0.15)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Ask about floats, regions, or measurements…"
              disabled={busy}
              rows={1}
              className="w-full resize-none overflow-hidden bg-transparent px-3.5 pb-0 pt-3 text-[14px] leading-[1.6] text-foam-50 outline-none placeholder:text-foam-200/40 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-2">
              <div className="flex items-center gap-1 pl-1.5">
                <LanguageToggle language={language} onChange={onLanguageChange} />
              </div>
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150",
                  input.trim() && !busy
                    ? "bg-bio-400 text-abyss-950 shadow-[0_0_12px_rgba(45,225,194,0.4)] hover:bg-bio-300"
                    : "bg-abyss-900 text-foam-200/40"
                )}
              >
                <SendIcon />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-center font-mono text-[10px] tracking-wide text-current-300">
            enter to send · shift+enter for a new line
          </p>
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
    <div className="flex overflow-hidden rounded-full border border-current-500/50">
      {(["en", "hi"] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={cn(
            "px-2.5 py-1 font-mono text-[11px] transition-colors",
            language === lang
              ? "bg-bio-400/15 text-bio-400"
              : "text-foam-200/60 hover:text-foam-50"
          )}
        >
          {lang === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function SonarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="2" className="text-bio-400" />
      <circle cx="12" cy="12" r="7" className="text-bio-400/50" />
      <circle cx="12" cy="12" r="11" className="text-bio-400/25" />
    </svg>
  );
}
