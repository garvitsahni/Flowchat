import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-1",
        size === "sm" ? "h-7" : "h-9"
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-full outline-none transition-colors",
              size === "sm" ? "px-2.5" : "px-4",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-thumb"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <span
              className={cn(
                "relative z-10 font-mono text-xs",
                size === "md" && "text-sm"
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}