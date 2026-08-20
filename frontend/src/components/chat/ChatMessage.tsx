import { motion } from "framer-motion";
import type { QueryResponse } from "../../types";
import { AnswerCard } from "./AnswerCard";
import { RelatedQueries } from "./RelatedQueries";

export interface Message {
  role: "user" | "system";
  text: string;
  response?: QueryResponse;
  kind?: "error" | "refusal";
}

const ROW_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export function ChatMessage({
  message,
  onRelated,
}: {
  message: Message;
  onRelated?: (q: string) => void;
}) {
  if (message.role === "user") {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-end">
        <div className="max-w-[80%] rounded-sm border border-primary/40 bg-primary/10 px-3.5 py-2 text-[15px] leading-relaxed text-foreground">
          {message.text}
        </div>
      </motion.div>
    );
  }
  if (message.kind === "error") {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-start">
        <p className="max-w-[85%] border-l-2 border-destructive px-3 py-2 font-mono text-sm text-destructive">
          {message.text}
        </p>
      </motion.div>
    );
  }
  if (message.kind === "refusal" || !message.response) {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-start">
        <p className="max-w-[85%] border-l-2 border-warning px-3 py-2 font-mono text-sm text-warning">
          {message.text}
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div {...ROW_MOTION} className="flex justify-start">
      <div className="w-full max-w-[92%]">
        <AnswerCard text={message.text} response={message.response} />
        {onRelated ? <RelatedQueries onSelect={onRelated} /> : null}
      </div>
    </motion.div>
  );
}
