"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import * as C from "@/engine/core.js";
import { createFsrsAdapter } from "@/engine/fsrs-adapter.js";
import DictationExercise from "@/components/exercises/DictationExercise";
import WordBankExercise from "@/components/exercises/WordBankExercise";

export default function V4EnginePage() {
  const [db, setDb] = useState<any>(null);
  const [scheduler, setScheduler] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // V4 State
  const [selectedProbe, setSelectedProbe] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState(0);

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
    try {
      const next = C.selectNext(currentDb, currentScheduler, new Date());
      if (!next) {
        setSelectedProbe({ type: 'empty' });
        return;
      }
      setSelectedProbe(next);
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
    
    // Quick mock of evidence creation - full logic goes here
    const evidence = C.createEvidence(selectedProbe.item.id, selectedProbe.claimId, correct ? 1 : 0, {
      probeId: selectedProbe.probe.id,
      probeKind: selectedProbe.probe.kind,
      typed: answerData,
      hintLevel: 0
    });
    
    const newDb = { ...db };
    newDb.history.evidence.push(evidence);
    
    // (Optional FSRS logic placeholder)
    
    setDb(newDb);
    setSessionCount(prev => prev + 1);

    // Save to Supabase
    await supabase.from('v4_user_states').upsert({
      user_id: user.id,
      state_json: newDb,
      storage_revision: (newDb.storageRevision || 0) + 1
    });

    // Move to next probe
    setTimeout(() => nextProbe(newDb, scheduler), 1000);
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

        {selectedProbe?.probe && (
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 pb-4 border-b border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {selectedProbe.claimId} • {selectedProbe.probe.kind}
              </span>
              <p className="mt-3 text-lg font-medium text-gray-800">{selectedProbe.probe.instruction}</p>
            </div>

            {/* RENDER EXERCISES DYNAMICALLY */}
            {selectedProbe.probe.kind === 'listening-dictation' ? (
              <DictationExercise 
                key={selectedProbe.probe.id}
                question={{
                  id: selectedProbe.probe.id,
                  text: selectedProbe.probe.answer || '',
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
                  answer: selectedProbe.probe.answer || ''
                }}
                onAnswer={handleAnswer}
                showFeedback={true}
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
      </main>
    </div>
  );
}
