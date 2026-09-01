'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReadingPassage, ReadingQuestion } from '@/lib/lessons/lesson-spec';

// ─── Types ────────────────────────────────────────────────────────────────────
export type { ReadingPassage, ReadingQuestion } from '@/lib/lessons/lesson-spec';

interface ReadingComprehensionExerciseProps {
  passage: ReadingPassage;
  onComplete: (score: number, total: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReadingComprehensionExercise({
  passage,
  onComplete,
}: ReadingComprehensionExerciseProps) {
  const [answers, setAnswers]           = useState<Record<string, string>>({});
  const [submitted, setSubmitted]       = useState(false);
  const [passageCollapsed, setPassageCollapsed] = useState(false);

  const handleSelect = useCallback((questionId: string, option: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  }, [submitted]);

  const allAnswered = passage.questions.every(q => answers[q.id] !== undefined);

  const handleSubmit = useCallback(() => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    const correct = passage.questions.filter(q => answers[q.id] === q.answer).length;
    setTimeout(() => onComplete(correct, passage.questions.length), 1500);
  }, [allAnswered, submitted, passage.questions, answers, onComplete]);

  const score = submitted
    ? passage.questions.filter(q => answers[q.id] === q.answer).length
    : 0;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Đọc hiểu</p>
          <p className="text-white font-semibold text-sm">{passage.title}</p>
          {passage.title_vn && (
            <p className="text-zinc-500 text-xs">{passage.title_vn}</p>
          )}
        </div>
        <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-lg ${
          passage.level === 'A1' ? 'bg-emerald-500/15 text-emerald-400'
          : passage.level === 'A2' ? 'bg-blue-500/15 text-blue-400'
          : 'bg-purple-500/15 text-purple-400'
        }`}>
          {passage.level}
        </span>
      </div>

      {/* Passage */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <button
          onClick={() => setPassageCollapsed(c => !c)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-zinc-200">📄 Đoạn văn</span>
          {passageCollapsed
            ? <ChevronDown className="w-4 h-4 text-zinc-500" />
            : <ChevronUp className="w-4 h-4 text-zinc-500" />}
        </button>

        <AnimatePresence initial={false}>
          {!passageCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="px-4 pb-4 text-zinc-200 text-sm leading-relaxed">
                {passage.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {passage.questions.map((q, qi) => {
          const chosen = answers[q.id];
          const isCorrect = chosen === q.answer;

          return (
            <div key={q.id} className="space-y-2">
              <p className="text-zinc-200 text-sm font-medium">
                <span className="text-zinc-500 mr-1">{qi + 1}.</span>
                {q.question_vn}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map(opt => {
                  let cls = 'p-3 rounded-xl border text-sm font-medium text-left transition-all ';
                  if (submitted) {
                    if (opt === q.answer)
                      cls += 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300';
                    else if (opt === chosen && !isCorrect)
                      cls += 'bg-red-500/10 border-red-500/40 text-red-300';
                    else
                      cls += 'bg-white/3 border-white/8 text-zinc-500';
                  } else if (opt === chosen) {
                    cls += 'bg-blue-500/15 border-blue-500/50 text-blue-300';
                  } else {
                    cls += 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/20 cursor-pointer';
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      disabled={submitted}
                      className={cls}
                    >
                      <span className="flex items-center gap-2">
                        {submitted && opt === q.answer && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {submitted && opt === chosen && !isCorrect && (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {submitted && !isCorrect && q.explanation_vn && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/8 border border-red-500/20"
                  >
                    <span className="text-yellow-400 text-sm">💡</span>
                    <p className="text-zinc-400 text-xs">{q.explanation_vn}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Score summary */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 border text-center ${
              score === passage.questions.length
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : score >= Math.ceil(passage.questions.length * 0.6)
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <p className="text-2xl font-black text-white">
              {score}/{passage.questions.length}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              {score === passage.questions.length
                ? '🏆 Xuất sắc! Bạn hiểu đoạn văn hoàn toàn!'
                : score >= Math.ceil(passage.questions.length * 0.6)
                ? '👍 Khá tốt! Đọc lại đoạn văn để hiểu sâu hơn.'
                : '💪 Hãy đọc lại đoạn văn và thử lại!'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold transition-colors"
        >
          {allAnswered ? 'Kiểm tra đáp án' : `Còn ${passage.questions.length - Object.keys(answers).length} câu chưa trả lời`}
        </button>
      )}
    </div>
  );
}
