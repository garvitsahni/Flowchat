import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { FlaskConical, TriangleAlert, Waves } from "lucide-react";
import type { QueryResponse } from "../types";
import { TrajectoryMap } from "./TrajectoryMap";
import { DepthProfileChart } from "./charts/DepthProfileChart";
import { ComparisonChart } from "./charts/ComparisonChart";
import { ScientificChart } from "./charts/ScientificChart";
import { HeatmapChart } from "./charts/HeatmapChart";
import { Skeleton } from "@/components/ui/skeleton";

export function VizPanel({
  response,
  loading,
}: {
  response: QueryResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-full min-h-[280px] flex-col border border-border bg-[#111313]">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <Skeleton className="h-3 w-28 bg-muted" />
          <Skeleton className="h-3 w-24 bg-muted" />
        </div>
        <div className="min-h-0 flex-1 p-3">
          <Skeleton className="h-full w-full bg-muted" />
        </div>
      </div>
    );
  }
  if (!response) {
    return (
      <StateCard
        icon={<Waves className="text-primary" size={20} strokeWidth={1.5} />}
        title="query the floats to render a visualization"
        detail="live dataset: float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles"
      />
    );
  }
  const { chart_type: type, chart_data: data } = response;

  if (type === "none") {
    const reason = response.refusal_reason;
    const title =
      reason === "no_data"
        ? "no data in scope"
        : reason === "unsafe"
          ? "couldn't answer safely"
          : "out of scope";
    const detail =
      reason === "no_data"
        ? "no measurements exist for this region and time window"
        : reason === "unsafe"
          ? "the generated query was rejected by the guardrail layer"
          : "this question is outside the Indian Ocean ARGO subset";
    return (
      <StateCard
        icon={<TriangleAlert className="text-warning" size={20} strokeWidth={1.5} />}
        title={title}
        detail={detail}
        tone="warning"
      />
    );
  }

  if (type === "trajectory") {
    return (
      <ChartShell title="trajectory" subtitle={data.region as string | undefined}>
        <TrajectoryMap
          latitudes={data.latitudes as number[]}
          longitudes={data.longitudes as number[]}
          floatId={data.float_id as string}
        />
      </ChartShell>
    );
  }

  if (type === "comparison" && (data.target === null || data.baseline === null)) {
    return (
      <StateCard
        icon={<FlaskConical className="text-warning" size={20} strokeWidth={1.5} />}
        title="insufficient data"
        detail="not enough measurements in this region and period to compare against a baseline"
        tone="warning"
      />
    );
  }

  if (type === "time_series") {
    return <ScientificChart key={response as unknown as string} response={response} />;
  }

  if (type === "heatmap") {
    const title = "heatmap";
    const subtitle = `${data.region as string}${data.period ? ` · ${data.period as string}` : ""}`;
    return (
      <ChartShell title={title} subtitle={subtitle}>
        <HeatmapChart data={data.rows as any[]} />
      </ChartShell>
    );
  }

  const title = type === "depth_profile" ? "depth profile" : "comparison";
  const subtitle = `${data.region as string}${data.period ? ` · ${data.period as string}` : ""}`;
  return (
    <ChartShell title={title} subtitle={subtitle}>
      {type === "depth_profile" ? (
        <DepthProfileChart
          depths={data.depths_m as number[]}
          temps={data.temperatures_c as number[]}
          sals={data.salinities_psu as number[]}
        />
      ) : (
        <ComparisonChart target={data.target as number} baseline={data.baseline as number} />
      )}
    </ChartShell>
  );
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full min-h-[280px] flex-col overflow-hidden border border-border bg-[#111313]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="font-mono text-xs text-muted-foreground/70">{subtitle}</span>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 p-2.5">{children}</div>
    </motion.div>
  );
}

function StateCard({
  icon,
  title,
  detail,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex h-full min-h-[280px] flex-col items-center justify-center gap-3 border px-6 text-center ${
        tone === "warning" ? "border-amber-400/40 bg-[#111313]" : "border-dashed border-border bg-[#111313]"
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center border border-border bg-[#0D0F0F]">
        {icon}
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="max-w-xs font-mono text-[13px] leading-relaxed text-muted-foreground/70">{detail}</p>
    </motion.div>
  );
}