import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface InteractiveFeatureCardProps {
    title: string;
    desc: string;
    icon: LucideIcon;
    preview: React.ReactNode;
    index: number;
}

export const InteractiveFeatureCard: React.FC<InteractiveFeatureCardProps> = ({
    title, desc, icon: Icon, preview, index,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + index * 0.1 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative p-6 rounded-xl bg-card border border-border text-left overflow-hidden group cursor-default hover:border-primary/30 hover:shadow-lg transition-all duration-300"
        >
            {/* Gradient glow on hover */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />

            <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3
                    className="font-semibold text-sm mb-2 text-foreground"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{desc}</p>

                {/* Preview content that reveals on hover */}
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={isHovered ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <div className="pt-3 border-t border-border/50">
                        {preview}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};
