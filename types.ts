export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  file: File;
  mimeType: string;
  data: string; // Base64
  type: 'image' | 'video' | 'audio' | 'document';
  name?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  isStreaming?: boolean;
  timestamp: number;
  attachments?: Attachment[];
  generatedImage?: string; // Base64
  generatedVideo?: string; // URI
  groundingSources?: GroundingSource[];
  isThinking?: boolean;
  generationTimeMs?: number;
  modelUsed?: string;
  isError?: boolean;
}

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  category: 'flagship' | 'fast' | 'thinking';
}

export const AVAILABLE_MODELS: AIModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fastest, highly intelligent multimodal model with optional thinking budget.',
    badge: 'Recommended',
    category: 'flagship'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Deep complex reasoning, STEM, coding, and mathematical analysis.',
    badge: 'Deep Reasoner',
    category: 'thinking'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Real-time throughput, vision, web search, and ultra-low latency.',
    badge: 'Ultra Fast',
    category: 'fast'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: 'Cost-effective, lightning quick responses for everyday questions.',
    category: 'fast'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Specialist for huge document contexts and extensive history.',
    category: 'thinking'
  }
];

export interface ChatSettings {
  selectedModel: string;
  thinkingMode: boolean;
  thinkingBudget: number;
  useSearch: boolean;
  useMaps: boolean;
  temperature: number;
  systemInstruction: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  settings?: Partial<ChatSettings>;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageSize = "1K" | "2K" | "4K";
export type VideoResolution = "720p" | "1080p";

export interface ImageGenConfig {
  aspectRatio: AspectRatio;
  size: ImageSize;
  style?: string;
}

export interface VideoGenConfig {
  aspectRatio: "16:9" | "9:16";
  resolution: VideoResolution;
}