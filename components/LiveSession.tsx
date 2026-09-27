import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { connectLive } from '../services/geminiService';
import Logo from './Logo';
import { X, Mic, MicOff, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface LiveSessionProps {
  onClose: () => void;
}

export default function LiveSession({ onClose }: LiveSessionProps) {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error' | 'denied'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(16).fill(10));
  const sessionRef = useRef<any>(null);
  
  useEffect(() => {
    let active = true;
    let inputContext: AudioContext;
    let processor: ScriptProcessorNode;
    let stream: MediaStream;
    let fallbackTimer: any;

    const startSession = async () => {
      try {
        const sessionPromise = connectLive((audioBase64) => {
          setVisualizerData(prev => prev.map(() => Math.random() * 60 + 10));
        });
        sessionRef.current = sessionPromise;

        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permErr) {
          console.error("Microphone permission denied:", permErr);
          setStatus('denied');
          return;
        }

        inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = inputContext.createMediaStreamSource(stream);
        processor = inputContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
          if (!active) return;
          const inputData = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
          const avg = sum / inputData.length;
          
          if (avg > 0.01) {
            setVisualizerData(prev => prev.map(() => Math.random() * (avg * 500) + 10));
          } else {
            setVisualizerData(prev => prev.map(() => Math.random() * 5 + 5));
          }

          const l = inputData.length;
          const int16 = new Int16Array(l);
          for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
          
          let binary = '';
          const bytes = new Uint8Array(int16.buffer);
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          sessionPromise.then(session => {
            session.sendRealtimeInput({ 
              media: { 
                mimeType: 'audio/pcm;rate=16000', 
                data: base64 
              } 
            });
          }).catch(err => {
            console.error("Live send error:", err);
          });
        };

        source.connect(processor);
        processor.connect(inputContext.destination);
        
        setStatus('active');
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setErrorMessage(err?.message || 'Connection Error');
      }
    };

    startSession();

    fallbackTimer = setInterval(() => {
      if (status === 'active' && active) {
        setVisualizerData(prev => prev.map(v => Math.max(5, v - 5)));
      }
    }, 50);

    return () => {
      active = false;
      clearInterval(fallbackTimer);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (inputContext) inputContext.close();
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => s.close()).catch(() => {});
      }
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center overflow-hidden p-4"
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[100px]"
        />
      </div>

      <div className="absolute top-8 right-8 z-10">
        <motion.button 
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose} 
          className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-md shadow-lg"
        >
          <X className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-12 relative z-10 max-w-md text-center">
        <motion.div
          animate={status === 'active' ? { y: [-10, 10, -10] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo size="large" />
        </motion.div>
        
        <div className="space-y-3">
          <h2 className="text-3xl md:text-4xl font-light text-white tracking-widest uppercase">
            Live Spatial Audio
          </h2>
          <div className="flex items-center justify-center gap-2">
            {status === 'connecting' && <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />}
            {status === 'active' && <Mic className="w-5 h-5 text-green-400" />}
            {status === 'denied' && <MicOff className="w-5 h-5 text-red-400" />}
            {status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            
            <p className={cn(
              "font-mono text-sm uppercase tracking-wider",
              status === 'active' ? 'text-green-400' : 'text-violet-300/80'
            )}>
              {status === 'connecting' ? 'Establishing link...' : 
               status === 'active' ? 'Listening...' : 
               status === 'denied' ? 'Microphone Access Denied' :
               (errorMessage || 'Connection Error')}
            </p>
          </div>
          
          {status === 'denied' && (
            <p className="text-xs text-red-400/80 mt-2">
              Please enable microphone permissions in your browser to use the Live Session feature.
            </p>
          )}

          {status === 'error' && (
            <div className="mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition"
              >
                Close & Check Settings
              </button>
            </div>
          )}
        </div>

        {/* Audio Visualizer */}
        <div className="flex items-end justify-center gap-3 h-28 w-full max-w-sm">
          <AnimatePresence>
            {visualizerData.map((h, i) => (
              <motion.div 
                key={i} 
                layout
                initial={{ height: 5 }}
                animate={{ height: Math.max(5, status === 'active' ? h : 5) }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  "w-3.5 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]",
                  status === 'denied' || status === 'error' ? 'bg-red-500/50 shadow-red-500/20' : 'bg-gradient-to-t from-violet-600 to-fuchsia-400'
                )}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
