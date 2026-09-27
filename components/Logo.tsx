import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Brain } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  size?: 'small' | 'large';
  className?: string;
}

export default function Logo({ size = 'large', className }: LogoProps) {
  const isLarge = size === 'large';
  
  return (
    <div className={cn("relative flex items-center justify-center", className, isLarge ? "w-32 h-32" : "w-10 h-10")}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className={cn(
          "absolute rounded-full border border-violet-500/30 border-t-violet-500",
          isLarge ? "inset-0" : "inset-0"
        )}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className={cn(
          "absolute rounded-full border border-fuchsia-500/30 border-b-fuchsia-500",
          isLarge ? "inset-2" : "inset-0.5"
        )}
      />
      
      <div className={cn(
        "relative rounded-full bg-gradient-to-tr from-violet-900/40 to-fuchsia-900/40 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]",
        isLarge ? "w-24 h-24" : "w-7 h-7"
      )}>
        {isLarge ? (
            <Brain className="w-10 h-10 text-violet-300" />
        ) : (
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
        )}
      </div>
    </div>
  );
}
