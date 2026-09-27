import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, MessageSquare, Video, Zap, ArrowRight, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LandingPage({ onStart }: { onStart: () => void; key?: React.Key }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-20 brightness-100 contrast-150 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center"
      >
        <motion.div variants={itemVariants} className="mb-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition duration-700" />
          <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            <Bot className="w-12 h-12 text-violet-300" />
          </div>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
        >
          Intelligence,<br/> redefined.
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-2xl text-gray-400 max-w-2xl font-light mb-12"
        >
          Experience a cinematic, next-generation AI platform powered by Sriram Kumar. Real-time vision, streaming cognition, and spatial design.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-20 w-full max-w-md justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="relative overflow-hidden group bg-white text-black px-8 py-4 rounded-full font-medium text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
          >
            <span className="relative z-10 flex items-center gap-2">
              Initialize System <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-200 to-fuchsia-200 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        </motion.div>

        {/* Floating Cards (3D Glassmorphism) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            { icon: Sparkles, title: 'Spatial Cognition', desc: 'Advanced reasoning with fluid, character-by-character streaming.' },
            { icon: Video, title: 'Multimodal Vision', desc: 'Seamlessly process images and real-time video context.' },
            { icon: Zap, title: 'Cinematic UI', desc: 'Butter-smooth animations with 60FPS glassmorphism.' }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10, rotateX: 5, rotateY: -5 }}
              className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-8 text-left transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/[0.05] hover:border-white/[0.15]"
              style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                <feature.icon className="w-6 h-6 text-violet-300" />
              </div>
              <h3 className="text-xl font-semibold text-white/90 mb-3">{feature.title}</h3>
              <p className="text-gray-400 font-light leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
