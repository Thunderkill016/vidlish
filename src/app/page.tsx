"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import * as C from "@/engine/core.js";
import { createFsrsAdapter } from "@/engine/fsrs-adapter.js";
import { DictationExercise } from "@/components/exercises/DictationExercise";
import { WordBankExercise } from "@/components/exercises/WordBankExercise";

export default function V4EnginePage() {
  const [db, setDb] = useState<any>(null);
  const [scheduler, setScheduler] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // V4 State
  const [selectedProbe, setSelectedProbe] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [feedback, setFeedback] = useState<any>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  // 1. Init Database and Scheduler
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setUser(session.user);
      
      const { data } = await supabase
        .from('v4_user_states')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      const loadedDb = data?.state_json ? C.migrateDb(data.state_json) : C.createInitialDb();
      setDb(loadedDb);
      
      const adapter = await createFsrsAdapter();
      setScheduler(adapter);
      setLoading(false);
    }
    loadData();
  }, []);

  // 2. Select Next Probe
  const nextProbe = useCallback((currentDb: any, currentScheduler: any) => {
    setFeedback(null);
    setStartedAt(Date.now());
    try {
      const next = C.selectNext(currentDb, currentScheduler, new Date());
      if (!next) {
        setSelectedProbe({ type: 'empty' });
        return;
      }
      setSelectedProbe(next);

      // Auto-play audio if dictation
      if (next.probe?.kind === 'listening-dictation' && 'speechSynthesis' in window) {
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(next.item.canonicalForm);
          u.lang = 'en-US';
          window.speechSynthesis.speak(u);
        }, 300);
      }
    } catch (err: any) {
      console.error(err);
      setSelectedProbe({ type: 'error', message: err.message });
    }
  }, []);

  // Run nextProbe initially when DB and Scheduler are ready
  useEffect(() => {
    if (db && scheduler && !selectedProbe) {
      nextProbe(db, scheduler);
    }
  }, [db, scheduler, selectedProbe, nextProbe]);

  // 3. Handle Answer from UI Components
  const handleAnswer = async (correct: boolean, answerData: string) => {
    if (!selectedProbe || !db || !scheduler || !user) return;
    
    // Core Engine Processing
    const res = C.processReview(db, scheduler, {
      probe: selectedProbe.probe,
      decisionId: selectedProbe.decision?.id || selectedProbe.candidate?.id,
      answer: answerData,
      hintLevel: 0,
      attemptCount: 1,
      startedAt
    }, new Date());
    
    setDb({ ...db });
    setSessionCount(prev => prev + 1);
    setFeedback({ grading: res.grading, schedule: res.schedule, answer: answerData, item: selectedProbe.item });

    // Save to Supabase
    await supabase.from('v4_user_states').upsert({
      user_id: user.id,
      state_json: db,
      storage_revision: (db.storageRevision || 0) + 1
    });
  };

  const playAudio = () => {
    if (selectedProbe?.item && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(selectedProbe.item.canonicalForm);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500 font-medium">Khởi động V4 Cognitive Engine...</p></div>;

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50 font-sans border-x border-gray-200 flex flex-col">
      <header className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-gray-800">Nếp <span className="font-normal text-gray-500">V4 Active</span></h1>
        <div className="text-sm font-medium px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
          Phiên học: {sessionCount}/12
        </div>
      </header>
      
      <main className="flex-1 p-6 flex flex-col items-center justify-center">
        {selectedProbe?.type === 'empty' && (
          <div className="text-center text-gray-500">🎉 Bạn đã hoàn thành tất cả các mục cần ôn tập hôm nay!</div>
        )}

        {selectedProbe?.type === 'error' && (
          <div className="text-red-500 text-center bg-red-50 p-4 rounded-xl">{selectedProbe.message}</div>
        )}

        {selectedProbe?.probe && !feedback && (
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {selectedProbe.claimId} • {selectedProbe.probe.kind}
                </span>
                <p className="mt-3 text-lg font-medium text-gray-800">{selectedProbe.probe.instruction}</p>
              </div>
              {selectedProbe.probe.kind === 'listening-dictation' && (
                <button onClick={playAudio} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 10v4a2 2 0 002 2h2.586l3.707 3.707A.996.996 0 0014 21V3a.996.996 0 00-1.707-.707L7.586 8H7a2 2 0 00-2 2z" /></svg>
                </button>
              )}
            </div>

            {/* RENDER EXERCISES DYNAMICALLY */}
            {selectedProbe.probe.kind === 'listening-dictation' ? (
              <DictationExercise 
                key={selectedProbe.probe.id}
                question={{
                  id: selectedProbe.probe.id,
                  text: selectedProbe.probe.answer || selectedProbe.item.canonicalForm || '',
                  hint_vn: selectedProbe.probe.prompt
                }}
                onAnswer={handleAnswer}
              />
            ) : selectedProbe.probe.responseType === 'word-bank' ? (
              <WordBankExercise 
                key={selectedProbe.probe.id}
                question={{
                  id: selectedProbe.probe.id,
                  prompt_vn: selectedProbe.probe.prompt,
                  words: selectedProbe.probe.pool || [],
                  answer: selectedProbe.probe.answer || selectedProbe.item.canonicalForm || ''
                }}
                onAnswer={handleAnswer}
                showFeedback={false}
              />
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">{selectedProbe.probe.prompt}</p>
                <button 
                  onClick={() => handleAnswer(true, 'fallback')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Đánh dấu Đã Hiểu
                </button>
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK UI */}
        {feedback && (
          <div className={`w-full max-w-lg rounded-2xl shadow-sm border p-6 ${feedback.grading.verdict === 'pass' ? 'bg-green-50 border-green-200' : feedback.grading.verdict === 'partial' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className={`text-xl font-bold mb-2 ${feedback.grading.verdict === 'pass' ? 'text-green-700' : feedback.grading.verdict === 'partial' ? 'text-yellow-700' : 'text-red-700'}`}>
              {feedback.grading.verdict === 'pass' ? 'Lấy được từ trí nhớ' : feedback.grading.verdict === 'partial' ? 'Gần đúng' : 'Chưa lấy ra được'}
            </h3>
            
            <p className="text-gray-700 mb-4">
              {feedback.grading.verdict === 'pass' ? 'Ghi nhận bằng chứng trực tiếp.' : feedback.grading.verdict === 'partial' ? 'Có nhớ nhưng còn lỗi.' : 'Lần này thất bại; lịch ôn sẽ phản ứng nếu đây là loại memory FSRS quản lý.'}
              {feedback.grading.errorTags?.length > 0 && ` Lỗi: ${feedback.grading.errorTags.join(', ')}`}
            </p>

            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
              <p className="text-sm text-gray-500 mb-1">Mục tiêu (Target):</p>
              <p className="font-bold text-gray-900 text-lg">{feedback.item.canonicalForm}</p>
              
              {feedback.answer && (
                <>
                  <p className="text-sm text-gray-500 mt-3 mb-1">Đã trả lời:</p>
                  <p className="text-gray-700 line-through">{feedback.answer}</p>
                </>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-6">
              {feedback.schedule?.updated ? `FSRS: Sẽ ôn lại vào ${new Date(feedback.schedule.after.due).toLocaleString('vi-VN')}` : 'FSRS không cập nhật cho loại bài này.'}
            </p>

            <button 
              onClick={() => nextProbe(db, scheduler)}
              className="w-full bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-lg font-medium shadow-sm transition"
            >
              Tiếp tục
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
