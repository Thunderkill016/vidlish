"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, CheckCircle, XCircle, RotateCcw } from "lucide-react";

export interface ListenArrangeItem {
  id: string;
  audio_text: string;     // English text spoken via TTS
  prompt_vn: string;      // Vietnamese hint shown below the speaker button
  words: string[];        // Shuffled word tiles (distractors may be included)
  answer: string;         // Correct sentence (space-joined, punctuation last)
}

interface Props {
  item: ListenArrangeItem;
  onCorrect: () => void;
  onWrong: () => void;
  playCorrectSound: () => void;
  playWrongSound: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?;]/g, "").replace(/\s+/g, " ");
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type TileState = { word: string; key: string; placed: boolean };

// ─── Main Component ───────────────────────────────────────────────────────────
export function ListenAndArrangeExercise({ item, onCorrect, onWrong, playCorrectSound, playWrongSound }: Props) {
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [placed, setPlaced] = useState<TileState[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Shuffle tiles on mount / item change
  useEffect(() => {
    const shuffled = shuffleArr(item.words).map((w, i) => ({
      word: w,
      key: `${w}-${i}`,
      placed: false,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTiles(shuffled);
    setPlaced([]);
    setResult(null);
    setHasPlayed(false);
    setPlaying(false);
    window.speechSynthesis?.cancel();
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const playAudio = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(item.audio_text);
    utt.lang = "en-US";
    utt.rate = 0.82;
    utt.pitch = 1;
    // Prefer Google US voice
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === "en-US" && v.name.includes("Google")) ??
      voices.find((v) => v.lang === "en-US") ??
      voices.find((v) => v.lang.startsWith("en")) ??
      null;
    if (voice) utt.voice = voice;
    utt.onstart = () => setPlaying(true);
    utt.onend = () => { setPlaying(false); setHasPlayed(true); };
    utt.onerror = () => { setPlaying(false); setHasPlayed(true); };
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [item.audio_text, playing]);

  // Place a tile from pool into answer row
  const placeTile = (tile: TileState) => {
    if (result) return;
    if (!hasPlayed) return; // must listen first
    setTiles((prev) => prev.map((t) => t.key === tile.key ? { ...t, placed: true } : t));
    setPlaced((prev) => [...prev, tile]);
  };

  // Remove a tile from answer row back to pool
  const removeTile = (tile: TileState) => {
    if (result) return;
    setPlaced((prev) => prev.filter((t) => t.key !== tile.key));
    setTiles((prev) => prev.map((t) => t.key === tile.key ? { ...t, placed: false } : t));
  };

  const handleSubmit = useCallback(() => {
    if (placed.length === 0 || result) return;
    const userAnswer = placed.map((t) => t.word).join(" ");
    const correct = normalize(userAnswer) === normalize(item.answer);
    setResult(correct ? "correct" : "wrong");
    if (correct) {
      playCorrectSound();
      setTimeout(() => onCorrect(), 900);
    } else {
      playWrongSound();
      setTimeout(() => onWrong(), 1600);
    }
  }, [placed, result, item.answer, playCorrectSound, playWrongSound, onCorrect, onWrong]);

  const handleReset = () => {
    const shuffled = shuffleArr(item.words).map((w, i) => ({ word: w, key: `${w}-${i}`, placed: false }));
    setTiles(shuffled);
    setPlaced([]);
    setResult(null);
  };

  const answerCorrect = result === "correct";
  const answerWrong = result === "wrong";

  return (
    <div className="space-y-5">
      {/* Speaker button */}
      <div className="flex flex-col items-center gap-3">
        <motion.button
          id={`listen-arrange-play-${item.id}`}
          onClick={playAudio}
          whileTap={{ scale: 0.93 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
            playing
              ? "bg-emerald-500 ring-4 ring-emerald-400/40 shadow-emerald-900/60"
              : "bg-zinc-800 border border-white/10 hover:bg-zinc-700 hover:border-emerald-500/30"
          }`}
          aria-label="Nghe câu tiếng Anh"
        >
          {playing ? (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
            >
              <VolumeX className="w-8 h-8 text-white" />
            </motion.div>
          ) : (
            <Volume2 className={`w-8 h-8 ${hasPlayed ? "text-emerald-400" : "text-zinc-300"}`} />
          )}
        </motion.button>

        <p className="text-zinc-400 text-sm text-center">{item.prompt_vn}</p>

        {!hasPlayed && (
          <p className="text-xs text-amber-400/80 font-medium animate-pulse">
            👆 Nhấn để nghe trước khi sắp xếp
          </p>
        )}
      </div>

      {/* Answer row — placed tiles */}
      <div
        className={`min-h-[52px] p-3 rounded-2xl border-2 border-dashed flex flex-wrap gap-2 items-center transition-all ${
          answerCorrect
            ? "border-emerald-500/60 bg-emerald-950/30"
            : answerWrong
            ? "border-red-500/60 bg-red-950/20"
            : placed.length > 0
            ? "border-zinc-600 bg-white/3"
            : "border-zinc-700/50 bg-zinc-900/30"
        }`}
      >
        <AnimatePresence>
          {placed.map((tile) => (
            <motion.button
              key={tile.key}
              layout
              initial={{ opacity: 0, scale: 0.7, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              onClick={() => removeTile(tile)}
              disabled={!!result}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                answerCorrect
                  ? "bg-emerald-800/40 border-emerald-600/50 text-emerald-200 cursor-default"
                  : answerWrong
                  ? "bg-red-800/30 border-red-600/40 text-red-200 cursor-default"
                  : "bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600 hover:border-zinc-500 active:scale-95"
              }`}
            >
              {tile.word}
            </motion.button>
          ))}
        </AnimatePresence>
        {placed.length === 0 && (
          <span className="text-zinc-600 text-xs select-none">Chạm vào từ bên dưới để sắp xếp câu…</span>
        )}
      </div>

      {/* Word tile pool */}
      <div className="flex flex-wrap gap-2 justify-center min-h-[44px]">
        <AnimatePresence>
          {tiles.filter((t) => !t.placed).map((tile) => (
            <motion.button
              key={tile.key}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={() => placeTile(tile)}
              disabled={!hasPlayed || !!result}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                !hasPlayed
                  ? "bg-zinc-800/50 border-zinc-700/40 text-zinc-600 cursor-not-allowed"
                  : "bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700 hover:border-emerald-500/40 cursor-pointer"
              }`}
            >
              {tile.word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              answerCorrect
                ? "bg-emerald-950/50 border-emerald-500/40"
                : "bg-red-950/40 border-red-500/40"
            }`}
          >
            {answerCorrect ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${answerCorrect ? "text-emerald-300" : "text-red-300"}`}>
                {answerCorrect ? "Chính xác! 🎉" : "Chưa đúng"}
              </p>
              {answerWrong && (
                <p className="text-xs text-zinc-400 mt-1">
                  Đáp án đúng: <span className="text-white font-semibold">{item.answer}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex gap-3">
        {!result && placed.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 text-sm hover:bg-white/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Xóa
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={placed.length === 0 || !!result || !hasPlayed}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
            placed.length === 0 || !hasPlayed
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-900/40 active:scale-95"
          }`}
        >
          Kiểm tra
        </button>
      </div>
    </div>
  );
}
