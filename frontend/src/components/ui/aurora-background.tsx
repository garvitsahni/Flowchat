import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string[]> = {
  ocean: ["#0a2836", "#0a4a4a", "#0c2f3d"],
  ice: ["#12253f", "#1f4f70", "#163a52"],
  ember: ["#2b1a0d", "#6b381f", "#42220f"],
};

interface Blob {
  size: string;
  top: string;
  left: string;
  driftX: number;
  driftY: number;
  duration: number;
}

const BLOBS: Blob[] = [
  { size: "72vmax", top: "-30%", left: "-25%", driftX: 60, driftY: 40, duration: 20 },
  { size: "58vmax", top: "-15%", left: "35%", driftX: -50, driftY: 55, duration: 26 },
  { size: "64vmax", top: "40%", left: "-20%", driftX: 40, driftY: -45, duration: 22 },
];

export function AuroraBackground({
  variant = "ocean",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const colors = VARIANTS[variant];
  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)}>
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle at 40% 40%, ${colors[i % colors.length]} 0%, transparent 68%)`,
          }}
          animate={{ x: [0, b.driftX, 0], y: [0, b.driftY, 0] }}
          transition={{ duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(174, 174, 178, 0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--background) / 0.25), hsl(var(--background)) 92%)",
        }}
      />
    </div>
  );
}