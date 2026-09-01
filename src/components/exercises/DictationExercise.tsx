'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Mic, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DictationQuestion {
  id: string;
  /** The sentence user must listen to and type */
  text: string;
  /** Optional slow-speed audio URL */
  audio?: string;
  /** Vietnamese hint shown after wrong answer */
  hint_vn?: string;
}

interface DictationExerciseProps {
  question: DictationQuestion;
  onAnswer: (correct: boolean, typed: string) => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Normalise for comparison: lowercase, trim, collapse spaces, strip punctuation */
function normalise(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

/** Count wrong characters between typed and correct (simple Levenshtein hint) */
function diffWords(typed: string, correct: string): string[] {
  const tWords = typed.trim().split(/\s+/);
  const cWords = correct.trim().split(/\s+/);
  return cWords.map((w, i) => {
    if (tWords[i] === undefined) return `<span class="text-red-400">[thiếu: ${w}]</span>`;
    if (tWords[i].toLowerCase() !== w.toLowerCase())
      return `<span class="text-red-400 line-through">${tWords[i]}</span> <span class="text-emerald-400">${w}</span>`;
    return `<span class="text-zinc-300">${w}</span>`;
  }).concat(
    tWords.slice(cWords.length).map(w => `<span class="text-red-400 line-through">${w}</span>`)
  );
}

// ─── TTS via browser SpeechSynthesis ─────────────────────────────────────────

function useTTS(text: string) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((rate = 1) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = rate;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [text]);

  return { speak, speaking };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DictationExercise({ question, onAnswer }: DictationExerciseProps) {
  const [typed, setTyped]         = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak, speaking } = useTTS(question.text);

  // Auto-play audio once on mount
  const hasAutoPlayed = useRef(false);
  const autoPlay = useCallback(() => {
    if (!hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      setTimeout(() => speak(1), 300);
      setPlayCount(c => c + 1);
    }
  }, [speak]);

  // Focus input after audio ends
  const handleListen = useCallback((rate = 1) => {
    speak(rate);
    setPlayCount(c => c + 1);
    setTimeout(() => inputRef.current?.focus(), 600);
  }, [speak]);

  const handleSubmit = useCallback(() => {
    if (submitted || typed.trim() === '') return;
    const correct = normalise(typed) === normalise(question.text);
    setIsCorrect(correct);
    setSubmitted(true);
    setTimeout(() => onAnswer(correct, typed), 1400);
  }, [submitted, typed, question.text, onAnswer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  const diffHtml = submitted && !isCorrect
    ? diffWords(typed, question.text).join(' ')
    : null;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
        <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">
          Nghe và gõ lại câu tiếng Anh
        </p>
        <p className="text-zinc-500 text-sm">
          {playCount === 0 ? 'Nhấn nút bên dưới để nghe' : 'Bạn đã nghe — hãy gõ câu vừa nghe'}
        </p>
      </div>

      {/* Audio controls */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => handleListen(1)}
          disabled={speaking}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          {speaking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
          <span className="text-sm font-medium">Nghe</span>
        </button>

        {/* Slow speed — only shown after first listen */}
        {playCount > 0 && !submitted && (
          <button
            onClick={() => handleListen(0.65)}
            disabled={speaking}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-xs font-medium">Chậm</span>
          </button>
        )}
      </div>

      {/* Input area */}
      <motion.div
        animate={submitted && !isCorrect ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={e => { if (!submitted) setTyped(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (playCount === 0) autoPlay(); }}
          placeholder="Gõ câu tiếng Anh bạn vừa nghe…"
          disabled={submitted}
          className={`w-full px-4 py-3.5 rounded-xl border text-white text-base transition-colors outline-none focus:ring-2
            ${submitted
              ? isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/50 focus:ring-emerald-500/40'
                : 'bg-red-500/10 border-red-500/50 focus:ring-red-500/40'
              : 'bg-white/5 border-white/15 focus:border-emerald-500/50 focus:ring-emerald-500/30'
            } placeholder:text-zinc-600`}
        />
      </motion.div>

      {/* Feedback */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 border space-y-2 ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCorrect
                ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                : <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              }
              <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                {isCorrect ? 'Chính xác! 🎉' : 'Chưa đúng'}
              </p>
            </div>

            {!isCorrect && diffHtml && (
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs">So sánh từng từ:</p>
                <p
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: diffHtml }}
                />
                {question.hint_vn && (
                  <p className="text-zinc-500 text-xs mt-1 italic">💡 {question.hint_vn}</p>
                )}
              </div>
            )}

            {isCorrect && (
              <p className="text-emerald-400/70 text-xs">
                Câu đúng: <span className="text-emerald-300 font-medium">{question.text}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={typed.trim() === '' || playCount === 0}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold transition-colors"
        >
          {playCount === 0 ? 'Nghe trước khi kiểm tra' : 'Kiểm tra'}
        </button>
      )}
    </div>
  );
}
