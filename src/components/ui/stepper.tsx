import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

const stepColors = [
  { bg: 'bg-blue-500', text: 'text-white', dot: 'bg-blue-500', completed: 'bg-blue-400', muted: 'bg-blue-500/20' },
  { bg: 'bg-violet-500', text: 'text-white', dot: 'bg-violet-500', completed: 'bg-violet-400', muted: 'bg-violet-500/20' },
  { bg: 'bg-amber-500', text: 'text-white', dot: 'bg-amber-500', completed: 'bg-amber-400', muted: 'bg-amber-500/20' },
  { bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-emerald-500', completed: 'bg-emerald-400', muted: 'bg-emerald-500/20' },
];

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, className }) => {
  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: dots only */}
      <div className="flex md:hidden justify-center gap-2 mb-4">
        {steps.map((step, index) => {
          const color = stepColors[index % stepColors.length];
          return (
            <div
              key={step.id}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                index < currentStep && color.completed,
                index === currentStep && cn(color.dot, "scale-125 ring-2 ring-offset-2 ring-offset-background", `ring-current`),
                index > currentStep && "bg-muted"
              )}
              style={index <= currentStep ? { ['--tw-ring-color' as any]: undefined } : undefined}
            />
          );
        })}
      </div>

      {/* Desktop: full stepper */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const color = stepColors[index % stepColors.length];
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <motion.div
                  initial={false}
                  animate={{
                    scale: index === currentStep ? 1.1 : 1,
                  }}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300",
                    index < currentStep && cn(color.completed, color.text),
                    index === currentStep && cn(color.bg, color.text, "shadow-lg"),
                    index > currentStep && "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </motion.div>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      index <= currentStep ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-xs text-muted-foreground">{step.description}</span>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 rounded-full transition-colors",
                    index < currentStep
                      ? "bg-gradient-to-r " + (
                          index === 0 ? "from-blue-400 to-violet-400" :
                          index === 1 ? "from-violet-400 to-amber-400" :
                          "from-amber-400 to-emerald-400"
                        )
                      : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current step title on mobile */}
      <div className="md:hidden text-center">
        <span className="font-semibold text-foreground">{steps[currentStep]?.title}</span>
        {steps[currentStep]?.description && (
          <p className="text-sm text-muted-foreground mt-1">{steps[currentStep].description}</p>
        )}
      </div>
    </div>
  );
};
