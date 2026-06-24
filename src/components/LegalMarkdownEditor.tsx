import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Eye, 
  Edit3, 
  HelpCircle, 
  Columns, 
  FileText,
  Trash2,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface LegalMarkdownEditorProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  height?: string;
}

export default function LegalMarkdownEditor({
  label,
  value,
  onChange,
  placeholder = "Write agreements in markdown format...",
  height = "h-96"
}: LegalMarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to insert text at cursor / wraps selected text
  const handleInsertMarkup = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const originalText = textarea.value;
    const selectedText = originalText.substring(start, end);

    // If there is selection, wrap it. Else insert placeholder.
    const replacement = selectedText 
      ? `${prefix}${selectedText}${suffix}` 
      : `${prefix}placeholder${suffix}`;

    const newText = originalText.substring(0, start) + replacement + originalText.substring(end);
    onChange(newText);

    // Reposition cursor and refocus
    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + prefix.length;
      const newCursorEnd = newCursorStart + (selectedText ? selectedText.length : 'placeholder'.length);
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 50);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear this document's content?")) {
      onChange('');
    }
  };

  const wrapInBold = () => handleInsertMarkup('**', '**');
  const wrapInItalic = () => handleInsertMarkup('*', '*');
  const wrapInCode = () => handleInsertMarkup('`', '`');
  const insertH1 = () => handleInsertMarkup('\n# ', '\n');
  const insertH2 = () => handleInsertMarkup('\n## ', '\n');
  const insertH3 = () => handleInsertMarkup('\n### ', '\n');
  const insertBullet = () => handleInsertMarkup('\n- ', '');
  const insertNumbered = () => handleInsertMarkup('\n1. ', '');
  const insertQuote = () => handleInsertMarkup('\n> ', '');
  const insertHr = () => handleInsertMarkup('\n---\n', '');

  return (
    <div 
      className={`flex flex-col rounded-2xl border border-white/10 overflow-hidden bg-zinc-950/80 backdrop-blur-md transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-4 z-50 shadow-2xl m-auto bg-zinc-950/95 border-white/20' 
          : 'relative shadow-lg'
      }`}
    >
      {/* Editor Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--primary-custom,#4F46E5)]" />
          <span className="text-xs font-bold font-mono text-white tracking-wide uppercase">{label}</span>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector tabs */}
          <div className="flex p-0.5 rounded-lg bg-black/40 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                viewMode === 'edit' 
                  ? 'bg-white/10 text-white font-semibold' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                viewMode === 'preview' 
                  ? 'bg-white/10 text-white font-semibold' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                viewMode === 'split' 
                  ? 'bg-white/10 text-white font-semibold' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Columns size={13} />
              <span>Split View</span>
            </button>
          </div>

          <span className="h-4 w-px bg-white/15 hidden sm:inline" />

          {/* Fullscreen & Help Toggles */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              title="Formatting Help"
              className={`p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all ${showCheatSheet ? 'text-[var(--primary-custom,#4F46E5)] bg-white/5' : ''}`}
            >
              <HelpCircle size={15} />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              onClick={handleClear}
              title="Clear Content"
              className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-all ml-1"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Formatting Markdown Toolbar - Only shown in edit/split view */}
      {(viewMode === 'edit' || viewMode === 'split') && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-zinc-950 border-b border-white/5">
          <button
            type="button"
            onClick={wrapInBold}
            className="p-1.5 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none"
            title="Bold (**text**)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={wrapInItalic}
            className="p-1.5 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none"
            title="Italic (*text*)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={wrapInCode}
            className="p-1.5 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none"
            title="Monospace / Code (`text`)"
          >
            <Code size={14} />
          </button>

          <span className="w-px h-4 bg-white/10 mx-1" />

          <button
            type="button"
            onClick={insertH1}
            className="p-1 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none text-xs font-bold font-mono"
            title="H1 Header"
          >
            H1
          </button>
          <button
            type="button"
            onClick={insertH2}
            className="p-1 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none text-xs font-bold font-mono"
            title="H2 Header"
          >
            H2
          </button>
          <button
            type="button"
            onClick={insertH3}
            className="p-1 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none text-xs font-bold font-mono"
            title="H3 Header"
          >
            H3
          </button>

          <span className="w-px h-4 bg-white/10 mx-1" />

          <button
            type="button"
            onClick={insertBullet}
            className="p-1.5 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none"
            title="Bullet List (- item)"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={insertNumbered}
            className="p-1.5 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none"
            title="Numbered List (1. item)"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            onClick={insertQuote}
            className="p-1.5 rounded hover:bg-white/5 text-white/85 hover:text-white transition-all focus:outline-none"
            title="Quote Block (> quote)"
          >
            <Quote size={14} />
          </button>

          <span className="w-px h-4 bg-white/10 mx-1" />

          <button
            type="button"
            onClick={insertHr}
            className="px-2 py-0.5 rounded hover:bg-white/5 text-xs text-white/60 hover:text-white transition-all font-mono focus:outline-none"
            title="Horizontal Division Rule"
          >
            &mdash; Divider
          </button>
        </div>
      )}

      {/* Cheat Sheet Help Panel */}
      {showCheatSheet && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-100 p-4 text-xs font-mono grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-fade-in">
          <div>
            <div className="font-bold text-amber-400 mb-1">Emphasis</div>
            <div>**Bold** &rarr; <strong>Bold</strong></div>
            <div>*Italic* &rarr; <em>Italic</em></div>
          </div>
          <div>
            <div className="font-bold text-amber-400 mb-1">Headers</div>
            <div># Title &rarr; H1</div>
            <div>## Section &rarr; H2</div>
            <div>### Topic &rarr; H3</div>
          </div>
          <div>
            <div className="font-bold text-amber-400 mb-1">Lists</div>
            <div>- bullet item &rarr; List</div>
            <div>1. numbered &rarr; Ordered</div>
          </div>
          <div>
            <div className="font-bold text-amber-400 mb-1">Extra</div>
            <div>&gt; blockquote &rarr; Quote</div>
            <div>--- &rarr; Horizontal line</div>
          </div>
        </div>
      )}

      {/* Core Editor / Viewer Screen */}
      <div className={`flex flex-1 ${isFullscreen ? 'h-[calc(100%-8rem)]' : height} overflow-hidden`}>
        {/* EDIT PANE */}
        {(viewMode === 'edit' || (viewMode === 'split')) && (
          <div className="flex-1 min-w-0 h-full border-r border-white/5 relative bg-zinc-950/40">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-full p-4 bg-transparent text-white font-mono text-sm leading-relaxed focus:outline-none resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent focus:ring-0 placeholder-white/35"
            />
          </div>
        )}

        {/* PREVIEW PANE */}
        {(viewMode === 'preview' || (viewMode === 'split')) && (
          <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 bg-zinc-900/10 text-white/90 selection:bg-[var(--primary-custom,#4F46E5)]/30 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {value.trim() === '' ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs italic">
                <span>No content written yet. Click 'Edit' above to begin.</span>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none prose-sm leading-relaxed select-text">
                <div className="markdown-body space-y-3">
                  <Markdown>{value}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Footer Stat Bar */}
      <div className="px-4 py-2 bg-white/5 border-t border-white/5 text-[10px] text-white/40 flex items-center justify-between font-mono">
        <span>Characters: {value.length}</span>
        <span>Words: {value.trim() === "" ? 0 : value.trim().split(/\s+/).length}</span>
      </div>
    </div>
  );
}
