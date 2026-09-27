import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Role } from '../types';
import { Bot, User, Brain, Copy, Check, Volume2, VolumeX, RotateCcw, Download, Globe, Map, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import MarkdownContent from './MarkdownContent';
import { speakText, stopSpeech } from '../services/geminiService';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  onOpenSettings?: () => void;
}

export default function ChatMessage({ message, onRegenerate, onOpenSettings }: ChatMessageProps) {
  const isUser = message.role === Role.USER;
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    let interval: any;
    if (message.isStreaming && !isUser) {
      interval = setInterval(() => {
        setElapsedMs(Date.now() - message.timestamp);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [message.isStreaming, message.timestamp, isUser]);

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      const spoke = speakText(message.text, () => setIsSpeaking(false));
      if (!spoke) setIsSpeaking(false);
    }
  };

  const handleDownloadImage = (base64: string) => {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `slbot-generated-${Date.now()}.png`;
    a.click();
  };

  const isKeyError = message.text && (message.text.includes('API Key') || message.text.includes('API key') || message.text.includes('Settings'));

  return (
    <div className={cn("flex w-full gap-3 md:gap-4 items-start group", isUser ? 'justify-end' : 'justify-start')}>
      
      {!isUser && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(139,92,246,0.5)] flex-shrink-0 mt-1"
        >
          <Bot className="w-5 h-5 text-white" />
        </motion.div>
      )}

      <motion.div 
        layout
        className={cn(
          "max-w-[90%] md:max-w-[80%] rounded-[1.75rem] p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all",
          isUser 
            ? 'bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-600 text-white rounded-tr-md border border-white/20 shadow-[0_10px_30px_rgba(139,92,246,0.25)]' 
            : message.isError
            ? 'bg-red-950/40 text-red-200 border border-red-500/30 rounded-tl-md shadow-[0_10px_30px_rgba(239,68,68,0.15)]'
            : 'bg-[#12131c]/90 text-gray-100 rounded-tl-md border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)]'
        )}
      >
        {/* Thinking Indicator */}
        <AnimatePresence>
          {message.isThinking && !isUser && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 text-xs text-fuchsia-300 flex items-center gap-2 font-mono uppercase tracking-wider bg-fuchsia-500/10 px-3 py-1.5 rounded-xl border border-fuchsia-500/20 w-fit"
            >
              <Brain className="w-4 h-4 animate-pulse text-fuchsia-400" />
              <span>Deep Reasoning Processing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-3 mb-4 flex-wrap">
            {message.attachments.map((att, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                key={i} 
                className="rounded-xl overflow-hidden border border-white/20 shadow-lg max-w-[240px] bg-black/40"
              >
                {att.type === 'image' && (
                  <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-auto object-cover max-h-48" />
                )}
                {att.type === 'video' && (
                  <div className="p-3 text-xs flex items-center gap-2 text-white">
                    <span className="text-xl">📹</span> Video Attached
                  </div>
                )}
                {att.type === 'audio' && (
                  <div className="p-3 text-xs flex items-center gap-2 text-white">
                    <span className="text-xl">🎵</span> Audio Attached
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Text Content */}
        {message.text && (
          <div className="leading-relaxed">
            {isUser ? (
              <div className="whitespace-pre-wrap font-sans text-white/95 text-[0.98rem]">
                {message.text}
              </div>
            ) : (
              <MarkdownContent content={message.text} />
            )}
          </div>
        )}

        {/* Quick Settings Action on Key Error */}
        {isKeyError && onOpenSettings && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4" />
              <span>Key setup required for live model</span>
            </div>
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Configure Key
            </button>
          </motion.div>
        )}

        {/* Generated Image */}
        {message.generatedImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="mt-4 rounded-2xl overflow-hidden border border-white/20 shadow-2xl relative group/img bg-black"
          >
            <img 
              src={`data:image/png;base64,${message.generatedImage}`} 
              alt="Generated Art" 
              className="w-full h-auto max-h-[480px] object-contain" 
            />
            <button
              onClick={() => handleDownloadImage(message.generatedImage!)}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-medium flex items-center gap-1.5 transition opacity-0 group-hover/img:opacity-100 shadow-lg border border-white/10"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </motion.div>
        )}

        {/* Generated Video */}
        {message.generatedVideo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="mt-4 rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl"
          >
            <video controls className="w-full h-auto max-h-[480px]" src={message.generatedVideo} />
          </motion.div>
        )}

        {/* Grounding Sources (Search Results) */}
        {message.groundingSources && message.groundingSources.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="mt-4 pt-3 border-t border-white/10"
          >
            <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-mono flex items-center gap-1">
              <Globe className="w-3 h-3 text-violet-400" /> Grounded Web Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {message.groundingSources.map((source, i) => (
                <a 
                  key={i} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/40 px-3 py-1.5 rounded-xl text-violet-300 truncate max-w-[240px] flex items-center gap-1.5 transition shadow-sm"
                >
                  {source.title === "Map Result" ? <Map className="w-3 h-3 text-emerald-400" /> : <Globe className="w-3 h-3" />}
                  <span className="truncate">{source.title || source.uri}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                </a>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Footer Bar: Actions, Generation Time, and Timestamp */}
        <div className={cn(
          "text-[11px] mt-3.5 pt-2 border-t border-white/5 flex items-center justify-between font-mono tracking-wider",
          isUser ? 'text-white/70' : 'text-gray-400'
        )}>
          {/* Left: Interactive action tools */}
          <div className="flex items-center gap-1">
            {!isUser && message.text && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                  title="Copy message"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={handleSpeak}
                  className={`p-1.5 rounded-lg transition ${isSpeaking ? 'bg-violet-600/30 text-violet-300' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                  title={isSpeaking ? "Stop speaking" : "Read aloud"}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right: Timing info */}
          <div className="flex items-center gap-2">
            {message.generationTimeMs && (
              <span className="text-violet-400 font-semibold text-[10px]">
                {(message.generationTimeMs / 1000).toFixed(1)}s
              </span>
            )}

            {message.isStreaming && (
              <div className="flex items-center gap-1.5 text-violet-300 text-[10px]">
                <span>{(elapsedMs / 1000).toFixed(1)}s</span>
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping" />
              </div>
            )}

            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </motion.div>
      
      {isUser && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 flex-shrink-0 mt-1 backdrop-blur-md shadow-lg"
        >
          <User className="w-5 h-5 text-white" />
        </motion.div>
      )}

    </div>
  );
}
