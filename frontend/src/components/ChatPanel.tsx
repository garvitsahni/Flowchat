import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Language, QueryResponse } from "../types";
import { ask } from "../lib/api";
import { TIME_SERIES } from "../lib/mock";
import { ChatMessage, type Message } from "./chat/ChatMessage";
import { CommandInput } from "./chat/CommandInput";
import { TypingIndicator } from "@/components/ui/typing-indicator";

const EXAMPLE_QUESTION = "How did temperature change in the Bay of Bengal in 2003?";

const SEED: Message[] = [
  { role: "user", text: EXAMPLE_QUESTION },
  { role: "system", text: TIME_SERIES.answer_text, response: TIME_SERIES },
];

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
  const [messages, setMessages] = useState<Message[]>(SEED);
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
      setMessages((m) => [...m, { role: "system", text: msg, kind: "error" }]);
      onVizChange(null);
      toast.error("Query failed", { description: msg });
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3 lg:p-4">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto py-1 pr-1">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} onRelated={send} />
        ))}
        {busy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex justify-start"
          >
            <div className="border border-border bg-[#111313] px-4 py-3">
              <TypingIndicator />
            </div>
          </motion.div>
        )}
      </div>
      <div className="shrink-0">
        <CommandInput onSubmit={(q) => void send(q)} disabled={busy} />
      </div>
    </div>
  );
}
