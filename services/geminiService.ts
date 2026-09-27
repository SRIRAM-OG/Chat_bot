import { GoogleGenAI, Chat, LiveServerMessage, Modality } from "@google/genai";
import { Attachment, ChatSettings, ImageGenConfig, VideoGenConfig, AVAILABLE_MODELS } from "../types";

// Local storage key for persistent user API key
const STORAGE_KEY_API = 'slbot_gemini_api_key';
const STORAGE_KEY_MODEL = 'slbot_selected_model';
const STORAGE_KEY_INSTRUCTION = 'slbot_system_instruction';

/**
 * Returns the active API key: checks localStorage first, then environment variables
 */
export const getEffectiveApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem(STORAGE_KEY_API);
    if (localKey && localKey.trim().length > 0) {
      return localKey.trim();
    }
  }
  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return envKey.trim();
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_API, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_API);
    }
  }
  chatSession = null; // Invalidate chat session so new key is applied
};

export const getStoredApiKey = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY_API) || '';
  }
  return '';
};

export const hasApiKey = (): boolean => {
  return getEffectiveApiKey().length > 0;
};

/**
 * Validates a Gemini API key by making a minimal ping request
 */
export const validateApiKey = async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, message: 'API key cannot be empty.' };
  }
  try {
    const ai = new GoogleGenAI({ apiKey: trimmed });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });
    if (response) {
      return { valid: true, message: 'Connected to Gemini API successfully!' };
    }
    return { valid: false, message: 'No response received from Gemini.' };
  } catch (err: any) {
    const errText = err?.message || String(err);
    if (errText.includes('API_KEY_INVALID') || errText.includes('403') || errText.includes('PERMISSION_DENIED')) {
      return { valid: false, message: 'Invalid API key or permission denied. Please verify your key.' };
    }
    return { valid: false, message: `Validation error: ${errText.slice(0, 150)}` };
  }
};

/**
 * Helper to construct the GoogleGenAI instance with the active key
 */
const getAi = (customKey?: string) => {
  const key = customKey || getEffectiveApiKey();
  if (!key) {
    throw new Error("NO_API_KEY");
  }
  return new GoogleGenAI({ apiKey: key });
};

let chatSession: Chat | null = null;
let currentModel: string = 'gemini-2.5-flash';
let currentSystemInstruction: string = '';

export const initializeChat = (
  model: string = 'gemini-2.5-flash',
  systemInstruction?: string
) => {
  currentModel = model;
  currentSystemInstruction = systemInstruction || 
    "You are SLBot Advanced, a cutting-edge futuristic AI intelligence crafted by Sriram Kumar. You have deep knowledge across programming, science, mathematics, creative writing, and spatial cognition. Communicate clearly, provide well-structured markdown with code blocks where helpful, and embody a sleek, confident, and polite cybernetic persona.";

  const apiKey = getEffectiveApiKey();
  if (!apiKey) {
    chatSession = null;
    return;
  }

  try {
    chatSession = getAi().chats.create({
      model: currentModel,
      config: {
        systemInstruction: currentSystemInstruction,
      },
    });
  } catch (e) {
    console.warn("Could not pre-initialize chat session:", e);
    chatSession = null;
  }
};

export const getModelForTask = (settings: ChatSettings, attachments: Attachment[]): string => {
  // If user selected a specific model in settings, honor it
  if (settings.selectedModel) {
    return settings.selectedModel;
  }

  if (settings.thinkingMode) {
    return 'gemini-2.5-pro';
  }

  const hasMedia = attachments.some(a => a.type === 'video' || a.type === 'image' || a.type === 'audio');
  if (hasMedia) {
    return 'gemini-2.5-flash';
  }

  return 'gemini-2.5-flash';
};

/**
 * Simulated Demo Generator when user doesn't have an API key configured yet
 */
async function* generateDemoStream(message: string, settings: ChatSettings) {
  const lower = message.toLowerCase();
  let responseText = "";

  if (lower.includes("who made you") || lower.includes("creator") || lower.includes("who are you")) {
    responseText = "I am **SLBot Advanced**, an elite, next-generation AI platform engineered by **Sriram Kumar**. I blend spatial cognition, real-time multimodal reasoning, and high-performance design.";
  } else if (lower.includes("code") || lower.includes("python") || lower.includes("javascript") || lower.includes("react")) {
    responseText = "Here is an optimized implementation demonstrating modern asynchronous patterns:\n\n```typescript\n// High-performance stream processor by SLBot\nasync function processStream<T>(generator: AsyncIterable<T>): Promise<T[]> {\n  const results: T[] = [];\n  for await (const chunk of generator) {\n    results.push(chunk);\n  }\n  return results;\n}\n```\n\n*Note: To unlock live code execution and the complete Gemini 2.5 Pro reasoning engine, configure your API Key in Settings (⚙️).*";
  } else {
    responseText = `**SLBot Advanced Online**\n\nI received your query: *"${message}"*\n\n> 💡 **Notice**: You are currently viewing in **Demo Mode**. To activate live real-time answers powered by Google's **Gemini 2.5 Flash** & **Gemini 2.5 Pro**, please click the **Settings (⚙️)** icon in the header and paste your free Google Gemini API key!\n\nYou can get a free key instantly from [Google AI Studio](https://aistudio.google.com/app/apikey).`;
  }

  // Stream character by character or word by word to give smooth typing effect
  const words = responseText.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise(r => setTimeout(r, 25));
    yield { type: 'text', text: (i === 0 ? '' : ' ') + words[i] };
  }
}

/**
 * Stream messages with full support for tools, thinking budgets, attachments, and error recovery
 */
export async function* sendMessageStream(
  message: string,
  attachments: Attachment[],
  settings: ChatSettings,
  signal?: AbortSignal
) {
  const apiKey = getEffectiveApiKey();

  // If no API key configured, use intelligent demo mode so the user can test the UI immediately!
  if (!apiKey) {
    yield* generateDemoStream(message, settings);
    return;
  }

  const targetModel = getModelForTask(settings, attachments);

  // Configure Tools & Parameters
  const config: any = {
    systemInstruction: settings.systemInstruction || 
      "You are SLBot Advanced, a cutting-edge futuristic AI assistant created by Sriram Kumar. Answer thoroughly with rich Markdown and code highlighting. When asked who made you, proudly say Sriram Kumar.",
  };

  if (settings.temperature !== undefined) {
    config.temperature = settings.temperature;
  }

  // Tools: Web Search
  if (settings.useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  // Thinking mode configuration
  if (settings.thinkingMode) {
    config.thinkingConfig = {
      thinkingBudget: settings.thinkingBudget || 2048,
    };
  }

  // Re-create session if needed or model/settings changed
  if (!chatSession || currentModel !== targetModel) {
    chatSession = getAi().chats.create({
      model: targetModel,
      config,
    });
    currentModel = targetModel;
  }

  // Construct payload parts
  const parts: any[] = [];

  for (const att of attachments) {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data,
      },
    });
  }

  if (message && message.trim().length > 0) {
    parts.push({ text: message });
  }

  try {
    const result = await chatSession.sendMessageStream({
      message: parts,
    } as any);

    for await (const chunk of result) {
      if (signal?.aborted) {
        break;
      }

      // Grounding metadata (Web Search results)
      const grounding = chunk.candidates?.[0]?.groundingMetadata;
      if (grounding) {
        yield { type: 'grounding', data: grounding };
      }

      const text = chunk.text;
      if (text) {
        yield { type: 'text', text };
      }
    }
  } catch (error: any) {
    console.error("Gemini Chat Stream Error:", error);
    chatSession = null; // Reset session on failure

    const errorStr = String(error?.message || error);

    if (errorStr.includes('API_KEY_INVALID') || errorStr.includes('403') || errorStr.includes('PERMISSION_DENIED')) {
      throw new Error("Invalid or expired API Key. Please verify your Google Gemini API key in Settings (⚙️).");
    } else if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Gemini API Rate Limit / Quota reached. Please wait a moment or switch to Gemini 2.0 Flash in Settings.");
    } else if (errorStr.includes('404') || errorStr.includes('NOT_FOUND')) {
      // Model not found fallback
      throw new Error(`The requested model (${targetModel}) was not found for this API tier. Please try switching to Gemini 2.5 Flash in Settings.`);
    }

    throw new Error(error?.message || "Failed to communicate with Gemini API. Check your connection or API key.");
  }
}

/**
 * Image Generation with Imagen 3 and high-tech procedural fallback
 */
export const generateImage = async (prompt: string, config: ImageGenConfig): Promise<string> => {
  const apiKey = getEffectiveApiKey();

  if (!apiKey) {
    // Generate an aesthetically pleasing procedural placeholder if no key
    return generateProceduralCanvasImage(prompt, config);
  }

  try {
    const ai = getAi();
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: config.aspectRatio || '1:1',
        outputMimeType: 'image/jpeg',
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (imageBytes) {
      return imageBytes;
    }
    throw new Error("No image data returned from Imagen model");
  } catch (err: any) {
    console.warn("Imagen generation failed or quota restricted. Using procedural visualizer:", err);
    return generateProceduralCanvasImage(prompt, config);
  }
};

/**
 * Procedural futuristic artwork generator for offline/demo/fallback mode
 */
const generateProceduralCanvasImage = (prompt: string, config: ImageGenConfig): string => {
  const canvas = document.createElement('canvas');
  let width = 800;
  let height = 800;

  if (config.aspectRatio === '16:9') {
    width = 960;
    height = 540;
  } else if (config.aspectRatio === '9:16') {
    width = 540;
    height = 960;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Background deep cybernetic gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090a14');
  bgGrad.addColorStop(0.5, '#120f26');
  bgGrad.addColorStop(1, '#050508');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Glowing geometric mesh
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Glowing central orbital rings
  const cx = width / 2;
  const cy = height / 2;

  const ringGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 200);
  ringGrad.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
  ringGrad.addColorStop(0.5, 'rgba(217, 70, 239, 0.3)');
  ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 220, 0, Math.PI * 2);
  ctx.fill();

  // Floating nodes
  for (let i = 0; i < 25; i++) {
    const rx = cx + (Math.cos(i) * 160) + (Math.sin(i * 2) * 50);
    const ry = cy + (Math.sin(i) * 160) + (Math.cos(i * 3) * 40);
    ctx.fillStyle = i % 2 === 0 ? '#c084fc' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(rx, ry, Math.random() * 4 + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title / Prompt overlay
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SLBot Generative Vision', cx, cy - 30);

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'italic 16px "Outfit", sans-serif';
  const truncatedPrompt = prompt.length > 55 ? prompt.slice(0, 52) + '...' : prompt;
  ctx.fillText(`"${truncatedPrompt}"`, cx, cy + 15);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('POWERED BY SRIRAM KUMAR • AI VISION', cx, cy + 60);

  return canvas.toDataURL('image/png').split(',')[1];
};

/**
 * Video Generation with Veo 2
 */
export const generateVideo = async (
  prompt: string,
  config: VideoGenConfig,
  imageBase64?: string
): Promise<string> => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) {
    throw new Error("An API key with Veo access is required to generate video. Please configure in Settings.");
  }

  const ai = getAi();
  const model = 'veo-2.0-generate-001';

  try {
    let operation;
    if (imageBase64) {
      operation = await ai.models.generateVideos({
        model,
        prompt: prompt || "Animate this cinematic visual",
        image: { imageBytes: imageBase64, mimeType: 'image/png' },
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
        },
      });
    } else {
      operation = await ai.models.generateVideos({
        model,
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
        },
      });
    }

    let pollAttempts = 0;
    while (!operation.done && pollAttempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
      pollAttempts++;
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("Video processing did not yield a valid video URI.");
    }
    return `${videoUri}&key=${apiKey}`;
  } catch (err: any) {
    console.error("Video Generation Error:", err);
    throw new Error(err?.message || "Veo Video Generation requires an approved Cloud Project tier.");
  }
};

/**
 * Text-to-Speech using standard Web Speech API with natural voice selection
 */
export const speakText = (text: string, onEnd?: () => void): boolean => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn("SpeechSynthesis not supported in this browser.");
    return false;
  }

  // Cancel any existing speech
  window.speechSynthesis.cancel();

  // Strip markdown characters from speech for clean pronunciation
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/[*#_`>~-]/g, '')
    .trim();

  if (!cleanText) return false;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  // Prefer high quality English voice
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => 
    v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
  ) || voices.find(v => v.lang.startsWith('en'));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return true;
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Live Realtime Audio WebSocket Connection using Gemini 2.0 Flash Realtime
 */
export const connectLive = (onAudio: (data: string) => void) => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) {
    throw new Error("API Key required for Live Spatial Session. Please configure in Settings.");
  }

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  let nextStartTime = 0;

  return getAi().live.connect({
    model: 'gemini-2.0-flash-exp',
    callbacks: {
      onopen: () => console.log('Live Spatial Audio Connected'),
      onmessage: async (msg: LiveServerMessage) => {
        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          onAudio(audioData);

          try {
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);

            const now = audioContext.currentTime;
            nextStartTime = Math.max(nextStartTime, now);
            source.start(nextStartTime);
            nextStartTime += buffer.duration;
          } catch (e) {
            console.error("Error decoding PCM live audio:", e);
          }
        }
      },
      onclose: () => console.log('Live Spatial Audio Closed'),
      onerror: (err) => console.error('Live Audio Stream Error', err),
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });
};