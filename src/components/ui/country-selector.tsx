import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface CountrySelectorProps {
  countries: { id: string; name: string; flagEmoji: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelect?: number;
  className?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  countries,
  selected,
  onChange,
  maxSelect,
  className,
}) => {
  const toggleCountry = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id));
    } else {
      if (maxSelect && selected.length >= maxSelect) {
        // Replace the oldest selection
        onChange([...selected.slice(1), id]);
      } else {
        onChange([...selected, id]);
      }
    }
  };

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3", className)}>
      {countries.map((country) => {
        const isSelected = selected.includes(country.id);
        return (
          <motion.button
            key={country.id}
            type="button"
            onClick={() => toggleCountry(country.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
            )}
          >
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-primary-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-3xl">{country.flagEmoji}</span>
            <span className={cn(
              "text-sm font-medium text-center",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {country.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
