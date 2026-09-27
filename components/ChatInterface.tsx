import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Role, Attachment, ChatSettings, ImageGenConfig, VideoGenConfig, Conversation, AVAILABLE_MODELS } from '../types';
import { sendMessageStream, initializeChat, generateImage, generateVideo, hasApiKey, getEffectiveApiKey } from '../services/geminiService';
import ChatMessage from './ChatMessage';
import Logo from './Logo';
import LiveSession from './LiveSession';
import SettingsModal from './SettingsModal';
import { 
  Settings, Paperclip, Send, Loader2, Sparkles, User, LogOut, Plus, 
  Square, Mic, MicOff, MessageSquare, Trash2, Key, ChevronDown, 
  Brain, Globe, HelpCircle, ArrowUp, Cpu 
} from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

const STORAGE_CONVERSATIONS = 'slbot_conversations_v2';
const STORAGE_CURRENT_CONV_ID = 'slbot_active_conv_id';

export default function ChatInterface({ onLogout }: { onLogout: () => void; key?: React.Key }) {
  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONVERSATIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [currentConvId, setCurrentConvId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_CURRENT_CONV_ID) || '';
    } catch (e) {
      return '';
    }
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Modals & Panels
  const [liveActive, setLiveActive] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Settings & Modes
  const [settings, setSettings] = useState<ChatSettings>({
    selectedModel: 'gemini-2.5-flash',
    thinkingMode: false,
    thinkingBudget: 2048,
    useSearch: false,
    useMaps: false,
    temperature: 0.7,
    systemInstruction: "You are SLBot Advanced, a futuristic AI platform engineered by Sriram Kumar. Respond with clarity, elegance, and deep intellect."
  });

  const [genMode, setGenMode] = useState<'chat' | 'image' | 'video'>('chat');
  const [imgConfig, setImgConfig] = useState<ImageGenConfig>({ aspectRatio: '1:1', size: '1K' });
  const [vidConfig, setVidConfig] = useState<VideoGenConfig>({ aspectRatio: '16:9', resolution: '720p' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize active chat or create first conversation
  useEffect(() => {
    initializeChat(settings.selectedModel, settings.systemInstruction);

    if (conversations.length === 0) {
      const initialId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: initialId,
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      setConversations([newConv]);
      setCurrentConvId(initialId);
      setMessages([]);
    } else {
      const active = conversations.find(c => c.id === currentConvId) || conversations[0];
      if (active) {
        setCurrentConvId(active.id);
        setMessages(active.messages || []);
      }
    }
  }, []);

  // Auto-save active conversation to localStorage
  useEffect(() => {
    if (!currentConvId) return;

    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === currentConvId) {
          let title = conv.title;
          if (title === 'New Conversation' && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === Role.USER);
            if (firstUserMsg && firstUserMsg.text) {
              title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
            }
          }
          return {
            ...conv,
            title,
            updatedAt: Date.now(),
            messages
          };
        }
        return conv;
      });

      try {
        localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(updated));
        localStorage.setItem(STORAGE_CURRENT_CONV_ID, currentConvId);
      } catch (e) {}

      return updated;
    });
  }, [messages, currentConvId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Speech Recognition (Voice input)
  const toggleVoiceInput = () => {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInputValue(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  // Create a new chat session
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConvId(newId);
    setMessages([]);
    setAttachments([]);
    setInputValue('');
    setIsLoading(false);
    initializeChat(settings.selectedModel, settings.systemInstruction);
  };

  // Switch to another conversation
  const handleSelectConv = (id: string) => {
    const target = conversations.find(c => c.id === id);
    if (target) {
      setCurrentConvId(id);
      setMessages(target.messages || []);
      setAttachments([]);
      setInputValue('');
      setIsLoading(false);
      setShowSidebar(false);
    }
  };

  // Delete a conversation
  const handleDeleteConv = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const remaining = conversations.filter(c => c.id !== id);
    if (remaining.length === 0) {
      handleNewChat();
    } else {
      setConversations(remaining);
      if (currentConvId === id) {
        setCurrentConvId(remaining[0].id);
        setMessages(remaining[0].messages || []);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        let type: 'image' | 'video' | 'audio' | 'document' = 'image';
        if (file.type.startsWith('video')) type = 'video';
        else if (file.type.startsWith('audio')) type = 'audio';
        else if (file.type.includes('pdf') || file.type.includes('text')) type = 'document';
        
        setAttachments(prev => [...prev, {
          file,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64,
          type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt !== undefined ? overridePrompt : inputValue;
    if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;

    const text = textToSend.trim();
    setInputValue('');
    
    // Check signoff
    const isBye = /^(bye|goodbye|see you|good night|catch you later|exit)$/i.test(text);

    const userMsg: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: Role.USER,
      text: text,
      timestamp: Date.now(),
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMsg]);
    setAttachments([]);
    setIsLoading(true);
    
    const startTime = Date.now();

    if (isBye) {
      setTimeout(() => {
        setIsSigningOff(true);
        setTimeout(() => {
          onLogout();
        }, 2500);
      }, 800);
      return;
    }

    // Image generation mode
    if (genMode === 'image') {
      const botId = `bot-${Date.now()}-${Math.random()}`;
      setMessages(prev => [...prev, { 
        id: botId, 
        role: Role.MODEL, 
        text: 'Synthesizing visual art...', 
        isStreaming: true, 
        timestamp: Date.now() 
      }]);

      try {
        const imgBase64 = await generateImage(text, imgConfig);
        const generationTimeMs = Date.now() - startTime;
        setMessages(prev => prev.map(m => m.id === botId ? { 
          ...m, 
          text: `Visualized: "${text}"`, 
          generatedImage: imgBase64, 
          isStreaming: false, 
          generationTimeMs 
        } : m));
      } catch (err: any) {
        setMessages(prev => prev.map(m => m.id === botId ? {
          ...m,
          text: `⚠️ Image generation error: ${err.message || 'Unable to generate image.'}`,
          isStreaming: false,
          isError: true,
          generationTimeMs: Date.now() - startTime
        } : m));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Video generation mode
    if (genMode === 'video') {
      const botId = `bot-${Date.now()}-${Math.random()}`;
      setMessages(prev => [...prev, { 
        id: botId, 
        role: Role.MODEL, 
        text: 'Generating cinematic video...', 
        isStreaming: true, 
        timestamp: Date.now() 
      }]);

      try {
        const refImage = userMsg.attachments?.find(a => a.type === 'image')?.data;
        const videoUri = await generateVideo(text, vidConfig, refImage);
        const generationTimeMs = Date.now() - startTime;
        setMessages(prev => prev.map(m => m.id === botId ? { 
          ...m, 
          text: `Cinematic clip for: "${text}"`, 
          generatedVideo: videoUri, 
          isStreaming: false, 
          generationTimeMs 
        } : m));
      } catch (err: any) {
        setMessages(prev => prev.map(m => m.id === botId ? {
          ...m,
          text: `⚠️ Video generation: ${err.message || 'Veo video generation requires an authorized Cloud account.'}`,
          isStreaming: false,
          isError: true,
          generationTimeMs: Date.now() - startTime
        } : m));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Chat stream mode
    const botMsgId = `bot-${Date.now()}-${Math.random()}`;
    setMessages(prev => [...prev, {
      id: botMsgId,
      role: Role.MODEL,
      text: '',
      isStreaming: true,
      timestamp: Date.now(),
      isThinking: settings.thinkingMode,
      modelUsed: settings.selectedModel
    }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const stream = sendMessageStream(
        text, 
        userMsg.attachments || [], 
        settings, 
        abortController.signal
      );

      let fullText = '';
      let grounding: any[] = [];

      for await (const chunk of stream) {
        const c = chunk as any;
        if (c.type === 'text' && c.text) {
          fullText += c.text;
        } else if (c.type === 'grounding' && c.data) {
          const chunks = c.data.groundingChunks || [];
          chunks.forEach((g: any) => {
            if (g.web?.uri) grounding.push({ title: g.web.title, uri: g.web.uri });
            if (g.maps) grounding.push({ title: "Map Result", uri: g.maps.googleMapsLink || "" });
          });
        }

        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId 
            ? { ...msg, text: fullText, groundingSources: grounding.length > 0 ? grounding : undefined }
            : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { ...msg, isStreaming: false, isThinking: false, generationTimeMs: Date.now() - startTime } 
          : msg
      ));

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg = error?.message || "Unable to complete request.";
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { 
              ...msg, 
              text: `⚠️ ${errorMsg}`, 
              isStreaming: false, 
              isThinking: false, 
              isError: true,
              generationTimeMs: Date.now() - startTime 
            } 
          : msg
      ));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateLast = () => {
    if (messages.length < 2 || isLoading) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === Role.USER);
    if (lastUserMsg) {
      handleSend(lastUserMsg.text);
    }
  };

  const handleLogout = () => {
    setIsSigningOff(true);
    setTimeout(() => {
      onLogout();
    }, 2500);
  };

  const isKeyActive = hasApiKey();
  const currentModelName = AVAILABLE_MODELS.find(m => m.id === settings.selectedModel)?.name || 'Gemini 2.5 Flash';

  if (isSigningOff) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white"
      >
        <motion.div animate={{ rotate: 360, scale: [1, 1.2, 0] }} transition={{ duration: 2, ease: "easeInOut" }}>
          <Logo size="large" />
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-3xl font-light tracking-[0.25em] text-violet-300"
        >
          DISCONNECTING...
        </motion.h2>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 220 }}
          transition={{ delay: 0.8, duration: 1.4 }}
          className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 mt-4 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.6)]"
        />
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen bg-[#07070b] text-white font-sans overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-fuchsia-600/10 rounded-full blur-[160px]" />
      </div>

      {/* Live Voice API Session Modal */}
      {liveActive && <LiveSession onClose={() => setLiveActive(false)} />}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        messages={messages}
        onClearChat={() => {
          setMessages([]);
          handleNewChat();
        }}
      />

      {/* Sidebar: Conversation History (Desktop + Mobile Drawer) */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#0a0a10]/95 md:bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-transform duration-300 md:translate-x-0 shadow-2xl",
        showSidebar ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size="small" />
            <span className="font-bold tracking-wider text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              SLBot AI
            </span>
          </div>
          
          <button
            onClick={handleNewChat}
            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition flex items-center gap-1.5 text-xs font-semibold shadow-[0_0_15px_rgba(139,92,246,0.4)]"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide">
          <div className="text-[11px] font-mono uppercase text-gray-500 px-3 py-1.5 tracking-wider">
            Conversations
          </div>

          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => handleSelectConv(conv.id)}
              className={cn(
                "group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition cursor-pointer",
                conv.id === currentConvId 
                  ? "bg-violet-600/20 text-white font-medium border border-violet-500/30 shadow-sm" 
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <MessageSquare className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <span className="truncate">{conv.title || 'Conversation'}</span>
              </div>
              
              <button
                onClick={(e) => handleDeleteConv(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <button
            onClick={() => {
              setShowSidebar(false);
              setShowSettingsModal(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/5 hover:text-white transition"
          >
            <Settings className="w-4 h-4 text-violet-400" /> Settings & API Key
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 bg-[#07070b]/80 backdrop-blur-2xl border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition"
              title="Open Chat List"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <Logo size="small" />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base md:text-lg tracking-wide text-white">SLBot</h1>
                
                {/* Active Model Switcher Pill */}
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 transition"
                  title="Click to switch model"
                >
                  <Cpu className="w-3 h-3 text-violet-400" />
                  <span>{currentModelName}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                <span>v2.5</span>
                {settings.thinkingMode && (
                  <span className="text-fuchsia-400 font-bold flex items-center gap-1">
                    • <Brain className="w-3 h-3" /> Thinking Mode
                  </span>
                )}
                {settings.useSearch && (
                  <span className="text-blue-400 flex items-center gap-1">
                    • <Globe className="w-3 h-3" /> Search
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* API Key Status Pill */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition",
                isKeyActive 
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 animate-pulse"
              )}
            >
              <span className={`w-2 h-2 rounded-full ${isKeyActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <Key className="w-3 h-3" />
              <span>{isKeyActive ? 'Key Active' : 'Setup Key'}</span>
            </button>

            {/* Time Widget */}
            <div className="hidden lg:flex text-gray-400 font-mono text-xs bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/5 flex-col items-end leading-tight">
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            
            {/* Live Audio Session Button */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!isKeyActive) {
                  setShowSettingsModal(true);
                } else {
                  setLiveActive(true);
                }
              }}
              className="px-3.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition shadow-sm"
              title="Start Live Spatial Voice Session"
            >
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
              <span>Live</span>
            </motion.button>

            {/* Settings button */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/5 transition"
              title="Settings & Key Configuration"
            >
              <Settings className="w-4 h-4" />
            </motion.button>

            {/* Profile Menu */}
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowProfile(!showProfile)}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center border border-white/20 shadow-md relative"
              >
                <User className="w-4 h-4 text-white" />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black"></div>
              </motion.button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-60 bg-[#0d0e17]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-white/5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white">Sriram Kumar</h3>
                        <p className="text-[11px] text-gray-400">SLBot Master User</p>
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={() => {
                          setShowProfile(false);
                          setShowSettingsModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 rounded-xl transition text-xs text-gray-300"
                      >
                        <Settings className="w-3.5 h-3.5 text-violet-400" /> Preferences & Key
                      </button>
                      <button 
                        onClick={() => {
                          setShowProfile(false);
                          handleNewChat();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 rounded-xl transition text-xs text-gray-300"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" /> Start Fresh Chat
                      </button>
                      <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 text-red-400 rounded-xl transition text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide z-10">
          <div className="max-w-4xl mx-auto w-full pb-48">
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[55vh] text-center"
              >
                <div className="relative mb-6">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-6 border border-white/5 rounded-full border-t-violet-500/30 border-l-fuchsia-500/20"
                  />
                  <Logo size="large" />
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                  SLBot Advanced Intelligence
                </h2>
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-8 font-light">
                  Powered by Google Gemini 2.5 & crafted by Sriram Kumar. Streaming cognition, live spatial voice, and multimodal reasoning.
                </p>

                {/* API Key prompt alert banner if no key */}
                {!isKeyActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30 max-w-lg w-full flex items-center justify-between text-left shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-300">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">Activate Full Gemini Power</h4>
                        <p className="text-[11px] text-gray-400">Configure your free Google API key for live responses</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md transition"
                    >
                      Setup Key
                    </button>
                  </motion.div>
                )}
                
                {/* Suggested Prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    { title: "Generate an image of a futuristic cyber city", icon: "🎨", type: "image" },
                    { title: "Write a high-performance TypeScript async worker", icon: "⚡", type: "chat" },
                    { title: "Explain quantum computing and superposition simply", icon: "🔬", type: "chat" },
                    { title: "Create a cinematic video of an orbital space station", icon: "🎥", type: "video" }
                  ].map((item, i) => (
                    <motion.button 
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInputValue(item.title);
                        setGenMode(item.type as any);
                      }}
                      className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-violet-500/30 rounded-2xl p-4 flex items-center gap-3.5 text-left transition shadow-lg group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                      <span className="text-xs text-gray-300 group-hover:text-white font-medium leading-relaxed">{item.title}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages List */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6"
                >
                  <ChatMessage 
                    message={msg} 
                    onRegenerate={msg.role === Role.MODEL ? handleRegenerateLast : undefined}
                    onOpenSettings={() => setShowSettingsModal(true)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar & Controls (Sticky Bottom) */}
        <div className="fixed bottom-0 left-0 right-0 md:left-72 p-4 md:p-6 bg-gradient-to-t from-[#07070b] via-[#07070b]/90 to-transparent z-20 pointer-events-none">
          <div className="max-w-4xl mx-auto space-y-3 pointer-events-auto">
            
            {/* Quick Mode & Options Panel (Toggleable via Sparkles) */}
            <AnimatePresence>
              {showTools && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: 15 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 15 }}
                  className="bg-[#10121d]/90 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl mb-3 flex flex-wrap gap-6 items-center text-xs shadow-2xl overflow-hidden"
                >
                  {/* Mode switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono text-[10px] uppercase tracking-wider">Mode:</span>
                    <div className="flex gap-1 bg-black/50 p-1 rounded-xl border border-white/5">
                      {(['chat', 'image', 'video'] as const).map(m => (
                        <button 
                          key={m} 
                          onClick={() => setGenMode(m)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg capitalize transition font-medium",
                            genMode === m ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode-specific quick toggles */}
                  {genMode === 'chat' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSettings(s => ({ ...s, thinkingMode: !s.thinkingMode }))}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5",
                          settings.thinkingMode ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 font-semibold' : 'border-white/10 text-gray-400 hover:bg-white/5'
                        )}
                      >
                        <Brain className="w-3.5 h-3.5" /> Deep Reasoning
                      </button>

                      <button 
                        onClick={() => setSettings(s => ({ ...s, useSearch: !s.useSearch }))}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5",
                          settings.useSearch ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold' : 'border-white/10 text-gray-400 hover:bg-white/5'
                        )}
                      >
                        <Globe className="w-3.5 h-3.5" /> Google Search
                      </button>
                    </div>
                  )}

                  {genMode === 'image' && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono text-[10px]">Ratio:</span>
                      <select 
                        value={imgConfig.aspectRatio} 
                        onChange={e => setImgConfig({ ...imgConfig, aspectRatio: e.target.value as any })}
                        className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:3">4:3 Standard</option>
                      </select>
                    </div>
                  )}

                  {genMode === 'video' && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono text-[10px]">Aspect:</span>
                      <select 
                        value={vidConfig.aspectRatio} 
                        onChange={e => setVidConfig({ ...vidConfig, aspectRatio: e.target.value as any })}
                        className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                      </select>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attachments Preview Row */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex gap-2.5 overflow-x-auto py-1 scrollbar-hide"
                >
                  {attachments.map((att, i) => (
                    <div key={i} className="relative h-16 w-16 bg-white/5 rounded-xl overflow-hidden border border-white/10 shadow-lg group flex-shrink-0">
                      {att.type === 'image' && (
                        <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="h-full w-full object-cover" />
                      )}
                      {att.type !== 'image' && (
                        <div className="h-full w-full flex items-center justify-center text-xs font-mono">
                          {att.type === 'video' ? '📹' : att.type === 'audio' ? '🎵' : '📄'}
                        </div>
                      )}
                      <button 
                        onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Interactive Input Bar */}
            <motion.div 
              className={cn(
                "flex items-center gap-2 p-2 rounded-2xl md:rounded-3xl border transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-3xl",
                isLoading 
                  ? "bg-violet-950/20 border-violet-500/40" 
                  : "bg-[#11121b]/90 border-white/10 focus-within:border-violet-500/50 focus-within:bg-[#141522]"
              )}
              layout
            >
              {/* Quick Tools & Modes Button */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTools(!showTools)}
                className={cn(
                  "p-3 rounded-xl transition",
                  showTools ? 'bg-violet-600 text-white' : 'hover:bg-white/10 text-gray-400'
                )}
                title="Modes & Tools"
              >
                <Sparkles className="w-4 h-4" />
              </motion.button>

              {/* Attach File Button */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition"
                title="Attach image, video, audio or document"
              >
                <Paperclip className="w-4 h-4" />
              </motion.button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                multiple 
                accept="image/*,video/*,audio/*,application/pdf,text/*"
              />

              {/* Text Input Field */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={
                  genMode === 'image' ? "Describe image to synthesize with Imagen 3..." : 
                  genMode === 'video' ? "Describe scene for Veo video generation..." : 
                  "Ask SLBot anything, or request code, analysis, or creative ideas..."
                }
                disabled={isLoading}
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none py-2 px-1 text-sm md:text-base"
              />

              {/* Voice Dictation (Microphone) */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleVoiceInput}
                className={cn(
                  "p-3 rounded-xl transition",
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-gray-400 hover:text-white'
                )}
                title={isListening ? "Stop listening" : "Voice dictation"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>

              {/* Send / Stop Generation Button */}
              {isLoading ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStopGeneration}
                  className="p-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition flex items-center justify-center shadow-lg"
                  title="Stop generation"
                >
                  <Square className="w-4 h-4 fill-white" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className={cn(
                    "p-3 rounded-xl flex items-center justify-center transition-all",
                    (!inputValue.trim() && attachments.length === 0) 
                      ? "bg-white/5 text-gray-600 cursor-not-allowed" 
                      : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                  )}
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
