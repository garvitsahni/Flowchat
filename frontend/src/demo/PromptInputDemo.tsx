import { useState } from "react";
import { PromptInput } from "@/components/ui/ai-chat-input";

interface Submission {
  value: string;
  model: string;
  effort: string;
  attachments: string[];
}

export function PromptInputDemo() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const handleSubmit = (
    value: string,
    meta: { model: string; effort: string; attachments: File[] }
  ) => {
    setSubmissions((prev) => [
      { value, model: meta.model, effort: meta.effort, attachments: meta.attachments.map((f) => f.name) },
      ...prev,
    ]);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-card text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-96 rounded-full bg-muted blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
              PromptInput
            </h1>
            <span className="font-mono text-xs tracking-widest text-muted-foreground">
              ai-chat-input · DEMO
            </span>
          </div>
          <a
            href="#"
            className="rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            ← back
          </a>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-10">
          <PromptInput
            placeholder="Ask about floats, regions, or measurements…"
            onSubmit={handleSubmit}
            className="mx-auto"
          />

          <div className="w-full max-w-[480px]">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Submissions
            </h2>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-3">
              {submissions.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  No submissions yet — type and press Enter.
                </p>
              ) : (
                submissions.map((s, i) => (
                  <div key={i} className="rounded-lg bg-muted p-2.5">
                    <p className="text-sm text-foreground">{s.value}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {s.model} · {s.effort}
                      {s.attachments.length > 0 && (
                        <span> · {s.attachments.length} attachment{s.attachments.length > 1 ? "s" : ""}</span>
                      )}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}