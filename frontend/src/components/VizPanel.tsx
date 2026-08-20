import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { FlaskConical, TriangleAlert, Waves } from "lucide-react";
import type { QueryResponse } from "../types";
import { TrajectoryMap } from "./TrajectoryMap";
import { DepthProfileChart } from "./charts/DepthProfileChart";
import { TimeSeriesChart } from "./charts/TimeSeriesChart";
import { ComparisonChart } from "./charts/ComparisonChart";

export function VizPanel({ response }: { response: QueryResponse | null }) {
  if (!response) {
    return (
      <StateCard
        icon={<Waves className="text-primary" size={22} strokeWidth={1.5} />}
        title="query the floats to render a visualization"
        detail="live dataset: float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles"
      />
    );
  }
  return <VizInner response={response} />;
}

function VizInner({ response }: { response: QueryResponse }) {
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
        icon={<TriangleAlert className="text-warning" size={22} strokeWidth={1.5} />}
        title={title}
        detail={detail}
        tone="warning"
      />
    );
  }

  if (type === "trajectory") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="h-full min-h-64"
      >
        <TrajectoryMap
          latitudes={data.latitudes as number[]}
          longitudes={data.longitudes as number[]}
          floatId={data.float_id as string}
        />
      </motion.div>
    );
  }

  if (type === "comparison" && (data.target === null || data.baseline === null)) {
    return (
      <StateCard
        icon={<FlaskConical className="text-warning" size={22} strokeWidth={1.5} />}
        title="insufficient data"
        detail="not enough measurements in this region and period to compare against a baseline"
        tone="warning"
      />
    );
  }

  const title =
    type === "depth_profile"
      ? "depth profile"
      : type === "time_series"
        ? "monthly mean"
        : "comparison";
  const subtitle = `${data.region as string}${data.period ? ` · ${data.period as string}` : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full min-h-64 flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <span className="font-mono text-xs text-muted-foreground/70">{subtitle}</span>
      </header>
      <div className="min-h-0 flex-1 p-3">
        {type === "depth_profile" && (
          <DepthProfileChart
            depths={data.depths_m as number[]}
            temps={data.temperatures_c as number[]}
            sals={data.salinities_psu as number[]}
          />
        )}
        {type === "time_series" && (
          <TimeSeriesChart
            months={data.months as string[]}
            values={data.values as number[]}
            unit={data.unit as string}
          />
        )}
        {type === "comparison" && (
          <ComparisonChart
            target={data.target as number}
            baseline={data.baseline as number}
          />
        )}
      </div>
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
      className={`
        flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border px-6 text-center
        ${tone === "warning" ? "border-warning/40 bg-card" : "border-dashed border-border bg-card"}
      `}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/40">
        {icon}
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="max-w-xs font-mono text-[13px] leading-relaxed text-muted-foreground/70">
        {detail}
      </p>
    </motion.div>
  );
}