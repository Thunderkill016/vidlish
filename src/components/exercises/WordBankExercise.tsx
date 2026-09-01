'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Volume2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WordBankQuestion {
  id: string;
  prompt_vn: string;          // Vietnamese prompt: "Cô ấy ___ giáo viên."
  words: string[];            // All word bank tokens (correct + distractors)
  answer: string;             // Correct assembled sentence: "She is a teacher"
  audio?: string;             // Optional TTS audio src
  hint?: string;              // Optional hint in Vietnamese
}

interface WordBankExerciseProps {
  question: WordBankQuestion;
  onAnswer: (correct: boolean, assembled: string) => void;
  showFeedback?: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ExerciseState {
  bank: { id: string; word: string }[];
  assembled: { id: string; word: string }[];
  submitted: boolean;
  isCorrect: boolean;
}

function buildState(words: string[]): ExerciseState {
  return {
    bank: shuffle(words).map((w, i) => ({ id: `w-${i}-${w}`, word: w })),
    assembled: [],
    submitted: false,
    isCorrect: false,
  };
}

export function WordBankExercise({ question, onAnswer, showFeedback = true }: WordBankExerciseProps) {
  // State is initialized once per mount. To reset between questions,
  // the parent should set key={question.id} on this component so React
  // remounts it cleanly — avoiding setState-in-effect anti-pattern.
  const [state, setState] = useState<ExerciseState>(() => buildState(question.words));

  const moveToAssembled = useCallback((token: { id: string; word: string }) => {
    setState(s => {
      if (s.submitted) return s;
      return { ...s, bank: s.bank.filter(t => t.id !== token.id), assembled: [...s.assembled, token] };
    });
  }, []);

  const moveToBank = useCallback((token: { id: string; word: string }) => {
    setState(s => {
      if (s.submitted) return s;
      return { ...s, assembled: s.assembled.filter(t => t.id !== token.id), bank: [...s.bank, token] };
    });
  }, []);

  const handleSubmit = useCallback(() => {
    setState(s => {
      if (s.assembled.length === 0 || s.submitted) return s;
      const userAnswer = s.assembled.map(t => t.word).join(' ').trim();
      const normalise = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();
      const correct = normalise(userAnswer) === normalise(question.answer);
      if (showFeedback) {
        setTimeout(() => onAnswer(correct, userAnswer), 1200);
      } else {
        onAnswer(correct, userAnswer);
      }
      return { ...s, submitted: true, isCorrect: correct };
    });
  }, [question.answer, onAnswer, showFeedback]);

  // Keyboard shortcut: Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !state.submitted && state.assembled.length > 0) handleSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, state.submitted, state.assembled.length]);

  const { bank, assembled, submitted, isCorrect } = state;
  const canSubmit = assembled.length > 0 && !submitted;

  // Shake assembly zone on wrong answer
  const shakeControls = submitted && !isCorrect
    ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
    : {};

  return (
    <div className="w-full space-y-5">
      {/* Prompt */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
        <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Xây dựng câu tiếng Anh</p>
        <p className="text-white text-lg font-semibold leading-snug">{question.prompt_vn}</p>
        {question.hint && (
          <p className="text-zinc-500 text-xs italic">{question.hint}</p>
        )}
      </div>

      {/* Assembly zone — shakes on wrong answer (Duolingo UX pattern) */}
      <motion.div
        animate={shakeControls}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className={`min-h-[64px] rounded-2xl border-2 border-dashed p-3 flex flex-wrap gap-2 items-center transition-colors duration-200 ${
          submitted
            ? isCorrect
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-red-500/50 bg-red-500/5'
            : assembled.length > 0
              ? 'border-emerald-500/30 bg-white/3'
              : 'border-white/15 bg-white/3'
        }`}
      >
        <AnimatePresence mode="popLayout">
          {assembled.length === 0 && !submitted && (
            <motion.p
              className="text-zinc-600 text-sm italic select-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Chạm vào từ bên dưới để thêm vào đây…
            </motion.p>
          )}
          {assembled.map(token => (
            <motion.button
              key={token.id}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => moveToBank(token)}
              disabled={submitted}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${
                submitted
                  ? isCorrect
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 cursor-default'
                    : 'bg-red-500/15 border-red-400 text-red-300 cursor-default'
                  : 'bg-zinc-800 border-zinc-600 text-white hover:border-zinc-400 active:scale-95 cursor-pointer'
              }`}
            >
              {token.word}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Feedback */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 rounded-xl p-3 ${
              isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}
          >
            {isCorrect
              ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                {isCorrect ? 'Chính xác! 🎉' : 'Chưa đúng'}
              </p>
              {!isCorrect && (
                <p className="text-zinc-400 text-xs mt-0.5">
                  Đáp án: <span className="text-white font-medium">{question.answer}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word bank */}
      <div className="space-y-2">
        <p className="text-zinc-500 text-xs">Từ vựng gợi ý:</p>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          <AnimatePresence mode="popLayout">
            {bank.map(token => (
              <motion.button
                key={token.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => moveToAssembled(token)}
                disabled={submitted}
                className="px-3 py-1.5 bg-white/8 border-2 border-white/15 rounded-xl text-sm font-medium text-zinc-200 hover:bg-white/15 hover:border-white/30 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                {token.word}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Submit button */}
      {!submitted && (
        <motion.button
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3.5 rounded-2xl text-base font-bold transition-all ${
            canSubmit
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-white/5 text-zinc-600 cursor-not-allowed'
          }`}
        >
          {canSubmit ? 'Kiểm tra →' : 'Chọn từ để bắt đầu'}
        </motion.button>
      )}

      {/* Keyboard hint */}
      {canSubmit && (
        <p className="text-center text-zinc-600 text-xs">hoặc nhấn <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-zinc-500 font-mono text-xs">Enter</kbd></p>
      )}
    </div>
  );
}
