"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { SentenceCorrectionExercise as SCExercise } from "@/components/learn/UnitTemplate";

interface Props {
  exercise: SCExercise;
  onComplete: (correct: boolean) => void;
}

// Tokenize sentence — split on spaces, preserving punctuation with each word
function tokenize(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean);
}

export function SentenceCorrectionExercise({ exercise, onComplete }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(false);

  const tokens = tokenize(exercise.sentence);

  // The "error" token might include trailing punctuation — strip for comparison
  const normalize = (s: string) => s.replace(/[.,!?;:]+$/, "").toLowerCase();

  const isCorrectClick = (token: string) =>
    normalize(token) === normalize(exercise.errorWord);

  const handleTokenClick = (token: string) => {
    if (submitted) return;
    setSelected(token);

    if (isCorrectClick(token)) {
      setSubmitted(true);
      onComplete(true);
    } else {
      // Wrong click — shake and reset after 700ms
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setSelected(null);
      }, 700);
      onComplete(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={15} className="text-orange-400 shrink-0" />
        <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
          Tìm lỗi sai — Nhấn vào từ SAI trong câu
        </p>
      </div>

      {/* Sentence tokens */}
      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[44px] items-center">
        {tokens.map((token, i) => {
          const isError = normalize(token) === normalize(exercise.errorWord);
          const isPicked = selected === token && !submitted;
          const isRevealedError = submitted && isError;

          let cls =
            "inline-flex items-center px-2.5 py-1.5 rounded-xl text-sm font-medium border cursor-pointer select-none transition-all duration-200 ";

          if (submitted) {
            if (isRevealedError) {
              cls +=
                "bg-red-900/40 border-red-500/70 text-red-300 line-through cursor-default";
            } else {
              cls +=
                "bg-zinc-800/40 border-zinc-700/30 text-zinc-400 cursor-default";
            }
          } else {
            if (isPicked) {
              cls +=
                "bg-red-900/30 border-red-500 text-red-300 scale-95";
            } else {
              cls +=
                "bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-orange-500/60 hover:bg-orange-900/20 hover:text-orange-200 active:scale-95";
            }
          }

          return (
            <motion.button
              key={i}
              onClick={() => handleTokenClick(token)}
              disabled={submitted}
              animate={shake && isPicked ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={cls}
            >
              {token}
            </motion.button>
          );
        })}
      </div>

      {/* Result reveal */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            {/* Correction */}
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-600/30 rounded-xl px-3 py-2.5">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <p className="text-sm">
                <span className="text-zinc-400">Sửa thành: </span>
                <span className="text-emerald-300 font-bold">&ldquo;{exercise.correction}&rdquo;</span>
              </p>
            </div>
            {/* Vietnamese explanation */}
            <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-700/40 rounded-xl px-3 py-2.5">
              <span className="text-amber-400 text-sm shrink-0">💡</span>
              <p className="text-amber-200 text-xs leading-relaxed">
                {exercise.explanation_vn}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
