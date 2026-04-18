import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ScoreRing } from '@/components/ui/score-ring';
import { TrendingUp, Shield, DollarSign } from 'lucide-react';

const SAMPLE_COUNTRIES = [
    { name: 'Germany', score: 82, flag: '🇩🇪', color: 'text-[hsl(var(--success))]' },
    { name: 'Finland', score: 76, flag: '🇫🇮', color: 'text-[hsl(var(--primary))]' },
    { name: 'Norway', score: 71, flag: '🇳🇴', color: 'text-[hsl(var(--warning))]' },
];

export const MiniDemoPreview: React.FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-30px' });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative max-w-xl mx-auto mt-14"
        >
            {/* Label */}
            <p className="text-sm text-white font-bold text-center mb-4 uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                Sample Evaluation Preview
            </p>

            {/* Card */}
            <div className="rounded-xl bg-card border border-border shadow-lg overflow-hidden">
                {/* Top bar */}
                <div className="px-5 py-3 bg-primary/5 border-b border-border flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success))]/60" />
                    <span className="ml-2 text-[10px] text-muted-foreground font-mono">feasibility-report.view</span>
                </div>

                {/* Content */}
                <div className="p-5">
                    <div className="grid grid-cols-3 gap-4">
                        {SAMPLE_COUNTRIES.map((country, i) => (
                            <motion.div
                                key={country.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ delay: 0.4 + i * 0.15, duration: 0.4 }}
                                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                            >
                                <span className="text-xl">{country.flag}</span>
                                <ScoreRing score={country.score} size="sm" showLabel />
                                <span className="text-xs font-medium text-foreground">{country.name}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Mini metrics */}
                    <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
                        {[
                            { icon: TrendingUp, label: 'Eligibility', value: 'High' },
                            { icon: DollarSign, label: 'Affordable', value: '3/5' },
                            { icon: Shield, label: 'Low Risk', value: '4/5' },
                        ].map((metric, i) => (
                            <motion.div
                                key={metric.label}
                                initial={{ opacity: 0 }}
                                animate={isInView ? { opacity: 1 } : {}}
                                transition={{ delay: 0.7 + i * 0.1 }}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground"
                            >
                                <metric.icon className="w-3.5 h-3.5" />
                                <span>{metric.label}:</span>
                                <span className="font-semibold text-foreground">{metric.value}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating badge */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -right-2 top-12 hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium shadow-lg"
            >
                <TrendingUp className="w-3 h-3" /> Live Analysis
            </motion.div>
        </motion.div>
    );
};
