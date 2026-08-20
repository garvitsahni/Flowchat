import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlurFade } from "@/components/ui/blur-fade";
import { PromptInputDemo } from "./PromptInputDemo";

export function DemoHub() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-3 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
            Float<span className="text-primary">Chat</span>
          </h1>
          <span className="hidden font-mono text-xs tracking-widest text-muted-foreground sm:inline">
            COMPONENT HUB
          </span>
        </div>
        <a
          href="#/"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          ← back to app
        </a>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="prompt" className="mx-auto w-full max-w-5xl">
          <TabsList>
            <TabsTrigger value="prompt">Prompt Input</TabsTrigger>
            <TabsTrigger value="stock">Stock Chart</TabsTrigger>
          </TabsList>

          <BlurFade>
            <TabsContent value="prompt" className="mt-6">
              <PromptInputDemo />
            </TabsContent>
            <TabsContent value="stock" className="mt-6">
              <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  stock chart demo — coming soon
                </p>
                <p className="mt-2 font-mono text-[13px] text-muted-foreground/70">
                  premium dark-mode AMZN chart with 60/200 SMA (recharts)
                </p>
              </div>
            </TabsContent>
          </BlurFade>
        </Tabs>
      </main>
    </div>
  );
}