import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, ShieldCheck, Cpu, Sliders, Sparkles, ExternalLink, CheckCircle2, AlertTriangle, Trash2, Eye, EyeOff, Bot, Download } from 'lucide-react';
import { ChatSettings, AVAILABLE_MODELS, Message } from '../types';
import { getStoredApiKey, setStoredApiKey, validateApiKey, hasApiKey } from '../services/geminiService';
import confetti from 'canvas-confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onUpdateSettings: (newSettings: ChatSettings) => void;
  messages: Message[];
  onClearChat: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  messages,
  onClearChat
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'model' | 'persona' | 'data'>('api');

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setStoredApiKey('');
      setTestStatus('idle');
      setTestMessage('API Key removed. SLBot will run in Demo Mode.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Validating API key with Google Gemini...');
    
    const result = await validateApiKey(apiKey);
    if (result.valid) {
      setStoredApiKey(apiKey);
      setTestStatus('success');
      setTestMessage(result.message);
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}
    } else {
      setTestStatus('error');
      setTestMessage(result.message);
    }
  };

  const handlePresetPersona = (prompt: string) => {
    onUpdateSettings({ ...settings, systemInstruction: prompt });
  };

  const handleExportChat = (format: 'markdown' | 'json') => {
    if (messages.length === 0) return;
    
    let content = '';
    let filename = `slbot-chat-${Date.now()}`;

    if (format === 'markdown') {
      content = `# SLBot Conversation Export\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
      messages.forEach(m => {
        content += `### ${m.role === 'user' ? 'User' : 'SLBot'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.text}\n\n`;
      });
      filename += '.md';
    } else {
      content = JSON.stringify(messages, null, 2);
      filename += '.json';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isKeyActive = hasApiKey();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-[#0c0d14]/95 border border-white/10 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">SLBot Configuration</h2>
                <p className="text-xs text-gray-400">Settings, Gemini AI Engine & API Preferences</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-6 pt-3 border-b border-white/5 gap-4 text-sm font-medium overflow-x-auto scrollbar-hide">
            {[
              { id: 'api', label: 'API Key & Auth', icon: Key },
              { id: 'model', label: 'Model & Reasoning', icon: Cpu },
              { id: 'persona', label: 'Persona & System', icon: Bot },
              { id: 'data', label: 'Data & Export', icon: Download },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-violet-500 text-violet-300 font-semibold'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* TAB 1: API KEY */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                {/* Status indicator */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${isKeyActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {isKeyActive ? 'Gemini API Connected' : 'Demo Mode Active (No Key Configured)'}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {isKeyActive 
                          ? 'Using your custom Gemini API key for high-intelligence streaming.'
                          : 'You can test basic chat in demo mode, or add a key below for full Google AI power.'}
                      </p>
                    </div>
                  </div>
                  {isKeyActive && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center justify-between">
                    <span>Google Gemini API Key</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-[11px] lowercase font-sans font-normal"
                    >
                      Get free key <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>

                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 pr-24 text-sm text-white focus:outline-none focus:border-violet-500 font-mono transition"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
                        title={showKey ? 'Hide Key' : 'Show Key'}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Your key is saved locally in your browser's encrypted storage and sent directly to Google's API.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveKey}
                    disabled={testStatus === 'testing'}
                    className="flex-1 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {testStatus === 'testing' ? (
                      <span className="animate-pulse">Validating Connection...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Save & Test Key
                      </>
                    )}
                  </button>

                  {apiKey && (
                    <button
                      onClick={() => {
                        setApiKey('');
                        setStoredApiKey('');
                        setTestStatus('idle');
                        setTestMessage('Key cleared.');
                      }}
                      className="px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/5 transition text-sm flex items-center gap-1.5"
                      title="Clear key"
                    >
                      <Trash2 className="w-4 h-4" /> Clear
                    </button>
                  )}
                </div>

                {/* Status Message */}
                {testMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      testStatus === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : testStatus === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    {testStatus === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <span>{testMessage}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* TAB 2: MODEL SELECTION & REASONING */}
            {activeTab === 'model' && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-3 block">
                    Default AI Model
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {AVAILABLE_MODELS.map(model => (
                      <div
                        key={model.id}
                        onClick={() => onUpdateSettings({ ...settings, selectedModel: model.id })}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          settings.selectedModel === model.id
                            ? 'bg-violet-600/15 border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-white flex items-center gap-2">
                            {model.name}
                            {model.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                {model.badge}
                              </span>
                            )}
                          </span>
                          <input
                            type="radio"
                            checked={settings.selectedModel === model.id}
                            onChange={() => onUpdateSettings({ ...settings, selectedModel: model.id })}
                            className="accent-violet-500"
                          />
                        </div>
                        <p className="text-xs text-gray-400">{model.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deep Thinking Parameters */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Deep Thinking Mode</h4>
                      <p className="text-xs text-gray-400">Allocates cognitive budget for step-by-step reasoning</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.thinkingMode}
                      onChange={(e) => onUpdateSettings({ ...settings, thinkingMode: e.target.checked })}
                      className="w-5 h-5 accent-violet-500 rounded cursor-pointer"
                    />
                  </div>

                  {settings.thinkingMode && (
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="flex justify-between text-xs text-gray-300 font-mono">
                        <span>Thinking Token Budget</span>
                        <span className="text-violet-400 font-semibold">{settings.thinkingBudget || 2048} tokens</span>
                      </div>
                      <input
                        type="range"
                        min="1024"
                        max="16384"
                        step="1024"
                        value={settings.thinkingBudget || 2048}
                        onChange={(e) => onUpdateSettings({ ...settings, thinkingBudget: parseInt(e.target.value) })}
                        className="w-full accent-violet-500"
                      />
                    </div>
                  )}
                </div>

                {/* Temperature slider */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span className="font-semibold text-white">Creativity / Temperature</span>
                    <span className="text-violet-400 font-mono font-semibold">{settings.temperature ?? 0.7}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.1"
                    value={settings.temperature ?? 0.7}
                    onChange={(e) => onUpdateSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Precise & Analytical (0.0)</span>
                    <span>Balanced (0.7)</span>
                    <span>Creative & Unbounded (1.5)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PERSONA & SYSTEM INSTRUCTION */}
            {activeTab === 'persona' && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2 block">
                    Quick Persona Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        title: "SLBot Elite",
                        desc: "Cybernetic, futuristic & polite",
                        prompt: "You are SLBot Advanced, a futuristic elite AI platform engineered by Sriram Kumar. Respond with clarity, elegance, and deep intellect."
                      },
                      {
                        title: "Senior Architect",
                        desc: "Deep code analysis & design",
                        prompt: "You are a Principal Software Architect. Prioritize performant, secure, clean code, scalable architecture, and comprehensive technical solutions."
                      },
                      {
                        title: "Concise & Fast",
                        desc: "Direct answers without fluff",
                        prompt: "You are an ultra-concise assistant. Deliver direct, accurate, bulleted answers with minimal preamble."
                      },
                      {
                        title: "Creative Spark",
                        desc: "Vivid imagination & ideas",
                        prompt: "You are an imaginative creative collaborator. Bring inventive metaphors, novel perspectives, and inspiring prose."
                      }
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handlePresetPersona(p.prompt)}
                        className="p-3 text-left rounded-xl bg-white/[0.03] hover:bg-violet-600/20 border border-white/5 hover:border-violet-500/40 transition group"
                      >
                        <div className="text-xs font-semibold text-white group-hover:text-violet-300">{p.title}</div>
                        <div className="text-[11px] text-gray-400">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400 block">
                    Custom System Instruction
                  </label>
                  <textarea
                    rows={5}
                    value={settings.systemInstruction}
                    onChange={(e) => onUpdateSettings({ ...settings, systemInstruction: e.target.value })}
                    placeholder="Provide specific guidelines, roles, or instructions..."
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-xs font-mono text-gray-200 focus:outline-none focus:border-violet-500 transition leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: DATA & EXPORT */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <h4 className="text-sm font-semibold text-white">Export Conversation</h4>
                  <p className="text-xs text-gray-400">
                    Download the current conversation history formatted for documentation or archival.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleExportChat('markdown')}
                      disabled={messages.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition disabled:opacity-40 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-violet-400" /> Export Markdown (.md)
                    </button>
                    <button
                      onClick={() => handleExportChat('json')}
                      disabled={messages.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition disabled:opacity-40 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-blue-400" /> Export JSON (.json)
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
                  <h4 className="text-sm font-semibold text-red-400">Clear Conversation</h4>
                  <p className="text-xs text-gray-400">
                    Permanently delete all messages and media in the active chat session.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear this entire chat?")) {
                        onClearChat();
                        onClose();
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-xs font-semibold text-red-300 transition flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Clear Current Chat
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-gray-400">
            <span>SLBot Advanced v2.5 • Sriram Kumar</span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
