import React, { useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { Check, Copy } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  // Extract and render code blocks with interactive copy buttons
  // Split content by code fences: ```lang\ncode\n```
  const renderFormattedContent = () => {
    const parts: React.ReactNode[] = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let partKey = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      // Text before code block
      if (matchIndex > lastIndex) {
        const textSegment = content.slice(lastIndex, matchIndex);
        if (textSegment.trim()) {
          const rawHtml = marked.parse(textSegment, { async: false, breaks: true }) as string;
          parts.push(
            <div 
              key={`text-${partKey++}`} 
              className="markdown-body mb-2"
              dangerouslySetInnerHTML={{ __html: rawHtml }} 
            />
          );
        }
      }

      // Code Block
      const language = match[1]?.trim() || 'plaintext';
      const code = match[2];
      parts.push(
        <CodeBlock 
          key={`code-${partKey++}`} 
          language={language} 
          code={code} 
        />
      );

      lastIndex = matchIndex + match[0].length;
    }

    // Remaining text after last code block
    if (lastIndex < content.length) {
      const remaining = content.slice(lastIndex);
      if (remaining.trim()) {
        const rawHtml = marked.parse(remaining, { async: false, breaks: true }) as string;
        parts.push(
          <div 
            key={`text-${partKey++}`} 
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: rawHtml }} 
          />
        );
      }
    }

    return parts.length > 0 ? parts : (
      <div 
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: marked.parse(content || '', { async: false, breaks: true }) as string }} 
      />
    );
  };

  return (
    <div className="w-full overflow-hidden">
      {renderFormattedContent()}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string; key?: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlight
  let highlighted = code;
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
    }
  } catch (e) {
    highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a10] shadow-2xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-xs text-gray-400 font-mono">
        <span className="uppercase tracking-wider font-semibold text-violet-400">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-gray-200">
        <pre>
          <code 
            dangerouslySetInnerHTML={{ __html: highlighted }}
            className={`hljs language-${language}`}
          />
        </pre>
      </div>
    </div>
  );
}
