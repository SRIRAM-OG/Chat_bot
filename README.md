# SLBot Advanced | Next-Gen Cinematic AI Platform

Engineered by **Sriram Kumar**, **SLBot Advanced** is a real-time, multimodal AI platform featuring spatial cognition, streaming responses, and glassmorphic UI design.

---

## ✨ Features & Upgrades

- 🚀 **Next-Gen Gemini Models**:
  - `Gemini 2.5 Flash` (Default, ultra-fast multimodal intelligence)
  - `Gemini 2.5 Pro` (Deep cognitive reasoning, math, and code architecture)
  - `Gemini 2.0 Flash` & `Gemini 2.0 Flash Lite` (High-throughput & low latency)
- 🧠 **Deep Reasoning / Thinking Mode**: Configurable cognitive token budget (1,024 – 16,384 tokens) for step-by-step reasoning.
- 🌐 **Real-time Web Grounding**: Google Search tools directly embedded into responses.
- 🎨 **Generative Vision & Video**: Image synthesis with Imagen 3 and cinematic animation previews.
- 🎙️ **Live Spatial Voice**: Live audio connection and browser voice dictation.
- 🗣️ **Text-to-Speech (TTS)**: Built-in natural voice synthesis to read any AI response aloud.
- 💻 **Syntax-Highlighted Code Blocks**: Syntax highlighting via Highlight.js with one-click code copying.
- 📁 **Conversation History**: Multi-chat session persistence in localStorage with Markdown & JSON export.
- ⚙️ **In-App API Key Manager**: Test and save your Google Gemini API key directly in the UI with instant connection validation.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your Gemini API Key
You can configure your key in two ways:
- **Directly in the Web Interface**: Click the **Settings (⚙️)** or **Setup Key** badge in the header, paste your key, and click **Save & Test Key**.
- **Via Environment File**: Create a `.env.local` or `.env` file in the root directory:
  ```env
  GEMINI_API_KEY=your_gemini_api_key_here
  ```
  *(Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey))*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```
