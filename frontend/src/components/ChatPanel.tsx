import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Waves } from "lucide-react";
import { toast } from "sonner";
import type { Language, QueryResponse } from "../types";
import { ask } from "../lib/api";
import { cn } from "../lib/utils";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ExplainabilityDrawer } from "./ExplainabilityDrawer";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { PromptInput } from "@/components/ui/ai-chat-input";

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

const BUBBLE_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export function ChatPanel({
  language,
  busy,
  onBusyChange,
  onVizChange,
}: {
  language: Language;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onVizChange: (response: QueryResponse | null) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    onBusyChange(true);
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const response = await ask(text, language);
      const kind: Message["kind"] =
        response.chart_type === "none" && response.refusal_reason ? "refusal" : undefined;
      setMessages((m) => [...m, { role: "system", text: response.answer_text, response, kind }]);
      onVizChange(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: msg,
          kind: "error",
        },
      ]);
      onVizChange(null);
      toast.error("Query failed", { description: msg });
    } finally {
      onBusyChange(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-1 py-4">
        {empty ? (
          <EmptyState onSuggest={send} busy={busy} />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  {...BUBBLE_MOTION}
                  className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-border bg-primary/90 px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl rounded-bl-sm border-l-2 bg-card px-4 py-2.5 shadow-sm",
                        msg.kind === "error"
                          ? "border-destructive"
                          : msg.kind === "refusal"
                            ? "border-warning"
                            : "border-primary"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[15px] leading-relaxed text-foreground",
                          msg.kind === "error" && "font-mono text-[14px] text-destructive"
                        )}
                      >
                        {msg.text}
                      </p>
                      {msg.kind === "refusal" && (
                        <div className="mt-1.5 font-mono text-xs uppercase tracking-widest text-warning">
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
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {busy && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex justify-start"
              >
                <div className="rounded-2xl rounded-bl-sm border-l-2 border-primary bg-card px-4 py-3 shadow-sm">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <PromptInput
          onSubmit={(value) => void send(value)}
          placeholder="Ask about floats, regions, or measurements…"
          models={["Gemini 3.5 Flash"]}
          className="mx-auto"
        />
      </div>
    </div>
  );
}

function EmptyState({
  onSuggest,
  busy,
}: {
  onSuggest: (question: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-card"
      >
        <Waves className="text-primary" size={26} strokeWidth={1.5} />
      </motion.div>
      <p className="font-mono text-[15px] text-muted-foreground">Ask about the Indian Ocean float data.</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground/70">
        Live dataset: float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles
      </p>
      <div className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            disabled={busy}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.08, ease: "easeOut" }}
            className="rounded-full border border-border bg-card px-4 py-2 text-[14px] text-muted-foreground transition-colors hover:border-primary/70 hover:text-foreground disabled:opacity-50"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}