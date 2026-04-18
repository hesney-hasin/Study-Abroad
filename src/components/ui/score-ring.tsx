import * as React from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { size: 60, strokeWidth: 4, fontSize: "text-sm" },
  md: { size: 80, strokeWidth: 5, fontSize: "text-lg" },
  lg: { size: 120, strokeWidth: 6, fontSize: "text-2xl" },
  xl: { size: 160, strokeWidth: 8, fontSize: "text-4xl" },
};

const getScoreColor = (score: number): string => {
  if (score >= 70) return "hsl(var(--success))";
  if (score >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
};

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = "md",
  showLabel = true,
  label,
  className,
}) => {
  const config = sizeConfig[size];
  const radius = (config.size - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="score-ring" style={{ width: config.size, height: config.size }}>
        <svg
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            className="score-ring-bg"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            className="score-ring-progress"
            stroke={getScoreColor(score)}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1s ease-out, stroke 0.3s ease",
            }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ width: config.size, height: config.size }}
        >
          <span className={cn("font-bold", config.fontSize)} style={{ color: getScoreColor(score) }}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && label && (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
};
