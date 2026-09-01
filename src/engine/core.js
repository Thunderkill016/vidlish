import { BASELINE_UNITS, CONTENT_PACK_VERSION } from './baseline-content.js';

export const SCHEMA_VERSION = 4;
export const VERSIONS = Object.freeze({
  schema: 4,
  policy: 'near-rule-v1.2',
  projector: 'claim-beta-v1.2',
  grader: 'deterministic-v2.1',
  probe: 'ecd-probe-v1.2',
  evaluation: 'holdout-v1.2',
});

export const CLAIMS = Object.freeze({
  understand_written: {
    label: 'Hiểu khi đọc',
    plain: 'Nhìn câu và hiểu ý',
    memoryFamily: 'receptive_meaning',
    order: 0,
  },
  retrieve_form: {
    label: 'Tự nhớ câu',
    plain: 'Tự bật được câu tiếng Anh',
    memoryFamily: 'productive_form',
    order: 1,
  },
  recognize_audio: {
    label: 'Nghe ra câu',
    plain: 'Nghe và nhận ra câu',
    memoryFamily: 'listening_form',
    order: 2,
  },
  use_novel_context: {
    label: 'Dùng trong tình huống mới',
    plain: 'Biết dùng câu khi tình huống đổi',
    memoryFamily: null,
    order: 3,
  },
});

export const CLAIM_IDS = Object.keys(CLAIMS);
export const DAY_MS = 86_400_000;

export const SEED_UNITS = BASELINE_UNITS;

export function uid(prefix='id'){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}
export function clone(v){ return JSON.parse(JSON.stringify(v)); }
export function normalize(text){
  return String(text||'').toLowerCase().normalize('NFKD')
    .replace(/[’‘]/g,"'").replace(/[“”]/g,'"')
    .replace(/[^a-z0-9'\s]/g,' ').replace(/\s+/g,' ').trim();
}
export function tokens(text){ return normalize(text).split(' ').filter(Boolean); }
export function levenshtein(a,b){
  a=normalize(a); b=normalize(b); const m=a.length,n=b.length;
  if(!m)return n;if(!n)return m; const prev=Array.from({length:n+1},(_,i)=>i),cur=new Array(n+1);
  for(let i=1;i<=m;i++){cur[0]=i;for(let j=1;j<=n;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=n;j++)prev[j]=cur[j];}
  return prev[n];
}
export function tokenF1(a,b){
  const aa=tokens(a),bb=tokens(b); if(!aa.length||!bb.length)return 0;
  const counts=new Map(); aa.forEach(t=>counts.set(t,(counts.get(t)||0)+1)); let overlap=0;
  bb.forEach(t=>{if((counts.get(t)||0)>0){overlap++;counts.set(t,counts.get(t)-1)}});
  const p=overlap/aa.length,r=overlap/bb.length; return p+r?2*p*r/(p+r):0;
}
export function containsPhrase(answer,phrase){return ` ${normalize(answer)} `.includes(` ${normalize(phrase)} `)}

export function createInitialDb(now=Date.now()){
  return {
    schemaVersion:SCHEMA_VERSION,
    createdAt:now,
    units:clone(BASELINE_UNITS),
    contentPackVersion:CONTENT_PACK_VERSION,
    memoryTraces:{},
    reviewEvents:[],
    evidence:[],
    policyDecisions:[],
    evaluationTasks:[],
    evaluationEvents:[],
    session:{recentItemIds:[],reviewCount:0},
    settings:{desiredRetention:.9,newItemWindow:4},
    versions:clone(VERSIONS),
  };
}

export function migrateDb(raw,now=Date.now()){
  if(!raw)return createInitialDb(now);
  if(raw.schemaVersion!==SCHEMA_VERSION || !Array.isArray(raw.units)){
    throw new Error(`Không thể mở dữ liệu schema ${raw.schemaVersion??'không xác định'} bằng V4; dữ liệu gốc chưa bị thay thế.`);
  }
  raw.memoryTraces ||= {}; raw.reviewEvents ||= []; raw.evidence ||= []; raw.policyDecisions ||= [];
  raw.evaluationTasks ||= []; raw.evaluationEvents ||= []; raw.session ||= {recentItemIds:[],reviewCount:0};
  raw.settings = {desiredRetention:.9,newItemWindow:4,...(raw.settings||{})};
  raw.versions = {...(raw.versions||{}),...VERSIONS};

  // Built-in content is versioned independently from learner history. Refresh the
  // curated pack by stable id, while keeping user-created units and all events.
  const builtInIds=new Set(BASELINE_UNITS.map(u=>u.id));
  const customUnits=raw.units.filter(u=>!builtInIds.has(u.id));
  raw.units=[...clone(BASELINE_UNITS),...customUnits];
  raw.contentPackVersion=CONTENT_PACK_VERSION;
  supersedeNoncanonicalHoldouts(raw,now);
  return raw;
}

export function getUnit(db,itemId){ return db.units.find(u=>u.id===itemId)||null; }
export function claimKey(itemId,claimId){ return `${itemId}::${claimId}`; }

export function evidenceForClaim(db,itemId,claimId){
  return db.evidence.filter(e=>e.itemId===itemId && e.claimId===claimId);
}

export function projectClaimState(db,itemId,claimId){
  const ev=evidenceForClaim(db,itemId,claimId); let alpha=1,beta=1,directCount=0,directPasses=0,independentPasses=0,lastDirect=null;
  for(const e of ev){
    if(e.source==='direct'){
      directCount++;
      if(!lastDirect||Number(e.createdAt||0)>Number(lastDirect.createdAt||0))lastDirect=e;
      if(e.verdict==='pass'){
        directPasses++;
        const unassisted=Number(e.metadata?.hintLevel)===0;
        const independentKind=claimId!=='retrieve_form'||e.metadata?.probeKind!=='reorder';
        if(unassisted&&independentKind)independentPasses++;
      }
    }
    const sourceScale=e.source==='direct'?1:.35;
    const w=Math.max(0,Number(e.weight||0))*Math.max(.1,Number(e.confidence||0))*sourceScale;
    if(!w || e.verdict==='uncertain')continue;
    if(e.verdict==='pass')alpha+=w;
    else if(e.verdict==='partial'){alpha+=w*.38;beta+=w*.62;}
    else beta+=w;
  }
  const mean=alpha/(alpha+beta),mass=Math.max(0,alpha+beta-2),confidence=1-Math.exp(-mass/2.8);
  let label='Chưa kiểm tra';
  if(directCount){
    if(confidence<.35)label='Chưa đủ dữ liệu';
    else if(mean>=.8)label='Có dấu hiệu vững';
    else if(mean>=.58)label='Đang hình thành';
    else label='Cần luyện thêm';
  }
  return {itemId,claimId,alpha,beta,mean,confidence,directCount,directPasses,independentPasses,lastDirect,label,evidenceMass:mass};
}

export function allClaimStates(db,itemId){
  return Object.fromEntries(CLAIM_IDS.map(id=>[id,projectClaimState(db,itemId,id)]));
}

export function detectErrors(answer,target,matched){
  const a=normalize(answer),t=normalize(matched||target),errors=[]; if(!a)return ['no_recall'];
  const at=tokens(a),tt=tokens(t),missing=tt.filter(w=>!at.includes(w));
  if(tt.includes('to')&&!at.includes('to'))errors.push('missing_preposition');
  if(tt.includes('that')&&!at.includes('that'))errors.push('missing_that');
  if(['a','an','the'].some(x=>tt.includes(x)&&!at.includes(x)))errors.push('missing_article');
  if(at.length===tt.length&&[...at].sort().join('|')===[...tt].sort().join('|')&&a!==t)errors.push('word_order');
  const d=levenshtein(a,t)/Math.max(a.length,t.length,1); if(d>0&&d<=.18&&!errors.length)errors.push('spelling');
  if(missing.length&&!errors.length)errors.push('missing_word'); if(!errors.length&&a!==t)errors.push('form_or_meaning');
  return [...new Set(errors)];
}

export function gradeText(answer,accepted,{target,requireTargetInSentence=false,allowUncertain=false}={}){
  const clean=normalize(answer); if(!clean)return {verdict:'fail',confidence:1,reason:'empty',matched:accepted[0]||'',errorTags:['no_recall']};
  for(const c of accepted)if(clean===normalize(c))return {verdict:'pass',confidence:1,reason:'exact',matched:c,errorTags:[]};
  if(requireTargetInSentence){
    for(const c of accepted)if(containsPhrase(answer,c))return {verdict:'uncertain',confidence:.45,reason:'target-present-context-unverified',matched:c,errorTags:[]};
  }
  let best={candidate:accepted[0]||'',f1:0,edit:1};
  for(const c of accepted){const f1=tokenF1(clean,c),edit=levenshtein(clean,c)/Math.max(clean.length,normalize(c).length,1);if(f1-edit>best.f1-best.edit)best={candidate:c,f1,edit};}
  if(best.f1>=.92&&best.edit<=.14)return {verdict:'pass',confidence:.92,reason:'near-exact',matched:best.candidate,errorTags:detectErrors(answer,target,best.candidate)};
  if(best.f1>=.65||best.edit<=.27)return {verdict:'partial',confidence:.82,reason:'near-match',matched:best.candidate,errorTags:detectErrors(answer,target,best.candidate)};
  return {verdict:allowUncertain?'uncertain':'fail',confidence:allowUncertain?.45:.94,reason:allowUncertain?'semantic-uncertain':'mismatch',matched:best.candidate,errorTags:detectErrors(answer,target,best.candidate)};
}

export function gradeProbe(probe,answer){
  if(probe.responseType==='choice'){
    const ok=String(answer)===String(probe.correctOption);
    return {verdict:ok?'pass':'fail',confidence:1,reason:ok?'choice-correct':'choice-wrong',matched:ok?probe.correctOption:null,errorTags:ok?[]:['meaning_mismatch']};
  }
  return gradeText(answer,probe.accepted,{target:probe.target,requireTargetInSentence:probe.responseType==='free-production',allowUncertain:probe.responseType==='free-production'});
}

function stableHash(seed){
  let s=0; for(const ch of String(seed))s=(s*31+ch.charCodeAt(0))>>>0; return s;
}

function shuffleDeterministic(arr,seed){
  const x=[...arr]; let s=stableHash(seed);
  for(let i=x.length-1;i>0;i--){s=(1664525*s+1013904223)>>>0;const j=s%(i+1);[x[i],x[j]]=[x[j],x[i]];}
  return x;
}

export function latestDirectEvidence(db,itemId,claimId){
  const x=evidenceForClaim(db,itemId,claimId).filter(e=>e.source==='direct').sort((a,b)=>b.createdAt-a.createdAt); return x[0]||null;
}

export function contextCoverage(db,itemId){
  const use=evidenceForClaim(db,itemId,'use_novel_context').filter(e=>e.source==='direct');
  const ids=new Set(use.map(e=>e.contextId).filter(Boolean));
  const passIds=new Set(use.filter(e=>e.verdict==='pass').map(e=>e.contextId).filter(Boolean));
  return {attempts:use.length,distinctContexts:ids.size,successfulContexts:passIds.size};
}

export function deriveErrorPatterns(db,itemId=null){
  const map=new Map();
  for(const ev of db.reviewEvents){
    if(itemId&&ev.itemId!==itemId)continue;
    for(const tag of ev.grading?.errorTags||[]){
      const key=`${ev.itemId}::${tag}`; const cur=map.get(key)||{itemId:ev.itemId,tag,occurrences:0,lastSeenAt:0,correctedAfter:0};
      cur.occurrences++;cur.lastSeenAt=Math.max(cur.lastSeenAt,ev.createdAt||0);map.set(key,cur);
    }
  }
  for(const p of map.values()){
    p.correctedAfter=db.reviewEvents.filter(ev=>
      ev.itemId===p.itemId &&
      (ev.createdAt||0)>p.lastSeenAt &&
      ev.grading?.verdict==='pass' &&
      (
        (ev.probe?.kind==='diagnostic-cloze'&&ev.probe?.diagnosticError===p.tag) ||
        (ev.probe?.kind==='recall-text'&&ev.probe?.claimId==='retrieve_form'&&Number(ev.hintLevel)===0)
      )
    ).length;
  }
  return [...map.values()].sort((a,b)=>b.occurrences-a.occurrences||b.lastSeenAt-a.lastSeenAt);
}

function meaningOptions(db,item){
  const correct=item.meanings[0],unique=new Map();
  for(const unit of db.units){
    if(unit.id===item.id)continue;
    const meaning=unit.meanings?.[0],key=normalize(meaning);
    if(key&&key!==normalize(correct)&&!unique.has(key))unique.set(key,meaning);
  }
  const seed=`${item.id}:${db.reviewEvents.length}`;
  const distractors=shuffleDeterministic([...unique.values()],`${seed}:distractors`).slice(0,3);
  return shuffleDeterministic([correct,...distractors],`${seed}:options`);
}

function chooseTrainContext(item,db){
  const used=new Set(db.reviewEvents.filter(e=>e.itemId===item.id).map(e=>e.probe?.contextId).filter(Boolean));
  return item.trainContexts.find(c=>!used.has(c.id))||item.trainContexts[(db.reviewEvents.filter(e=>e.itemId===item.id).length)%item.trainContexts.length]||null;
}

export function buildProbe(db,item,claimId,{diagnosticError=null}={}){
  const claimState=projectClaimState(db,item.id,claimId); const target=item.canonicalForm; const accepted=[target,...(item.accepted||[])];
  if(diagnosticError){
    const expected=diagnosticToken(target,diagnosticError.tag);
    if(expected){
      const blank=target.replace(new RegExp(`\\b${expected}\\b`,'i'),'___');
      return {id:uid('probe'),version:VERSIONS.probe,itemId:item.id,targetClaims:[],claimId,kind:'diagnostic-cloze',instruction:'Điền phần còn thiếu',prompt:blank,responseType:'text',target:expected,accepted:[expected],contextId:null,context:null,cueStrength:.45,contextNovelty:'none',leakageRisk:'low',diagnosticError:diagnosticError.tag,memoryEligible:false};
    }
  }
  if(claimId==='understand_written'){
    const options=meaningOptions(db,item);
    return {id:uid('probe'),version:VERSIONS.probe,itemId:item.id,targetClaims:[claimId],claimId,kind:'meaning-choice',instruction:'Câu này có ý gì?',prompt:target,responseType:'choice',options,correctOption:item.meanings[0],target,accepted:[item.meanings[0]],contextId:null,context:null,cueStrength:.8,contextNovelty:'none',leakageRisk:'medium'};
  }
  if(claimId==='retrieve_form'){
    const useConstruct=claimState.directCount<1 || claimState.mean<.58;
    if(useConstruct){
      return {id:uid('probe'),version:VERSIONS.probe,itemId:item.id,targetClaims:[claimId],claimId,kind:'reorder',instruction:'Tự dựng câu tiếng Anh',prompt:item.meanings[0],responseType:'reorder',wordBank:shuffleDeterministic(tokens(target),item.id+db.reviewEvents.length),target,accepted,contextId:null,context:null,cueStrength:.5,contextNovelty:'none',leakageRisk:'low',memoryEligible:false};
    }
    return {id:uid('probe'),version:VERSIONS.probe,itemId:item.id,targetClaims:[claimId],claimId,kind:'recall-text',instruction:'Tự nhớ câu tiếng Anh',prompt:item.meanings[0],responseType:'text',target,accepted,contextId:null,context:null,cueStrength:.2,contextNovelty:'none',leakageRisk:'low'};
  }
  if(claimId==='recognize_audio'){
    return {id:uid('probe'),version:VERSIONS.probe,itemId:item.id,targetClaims:[claimId],claimId,kind:'listening-dictation',instruction:'Nghe rồi gõ lại',prompt:'',responseType:'text',audioText:target,target,accepted,contextId:null,context:null,cueStrength:.15,contextNovelty:'none',leakageRisk:'low'};
  }
  const ctx=chooseTrainContext(item,db);
  return {id:uid('probe'),version:VERSIONS.probe,itemId:item.id,targetClaims:[claimId],claimId,kind:'context-production',instruction:'Bạn sẽ nói gì?',prompt:ctx?.text||item.meanings[0],responseType:'free-production',target,accepted,contextId:ctx?.id||null,context:ctx?.text||null,cueStrength:.05,contextNovelty:'training-varied',leakageRisk:'low'};
}

export function evidenceSignalsFromReview(probe,grading,{hintLevel=0,latencyMs=0}={}){
  const base=grading.verdict==='pass'?1:grading.verdict==='partial'?.55:grading.verdict==='fail'?1:0;
  const normalizedHintLevel=Math.max(0,Math.min(3,Number(hintLevel)||0));
  const hintScale=Math.max(.2,1-normalizedHintLevel*.25); const directWeight=Number((base*hintScale).toFixed(3));
  const signals=probe.targetClaims.map(claimId=>({claimId,source:'direct',weight:directWeight,confidence:grading.confidence,verdict:grading.verdict,metadata:{hintLevel:normalizedHintLevel,latencyMs,probeKind:probe.kind}}));
  if(probe.claimId==='use_novel_context'&&['pass','partial'].includes(grading.verdict))signals.push({claimId:'retrieve_form',source:'indirect',weight:Number((directWeight*.55).toFixed(3)),confidence:grading.confidence,verdict:grading.verdict,metadata:{reason:'successful_context_use_supports_form_recall'}});
  if(probe.claimId==='recognize_audio'&&grading.verdict==='pass')signals.push({claimId:'understand_written',source:'indirect',weight:Number((directWeight*.25).toFixed(3)),confidence:grading.confidence,verdict:'pass',metadata:{reason:'audio_recognition_supports_meaning_access'}});
  return signals;
}

export function ensureMemoryTrace(db,itemId,claimId,scheduler,now=new Date()){
  const family=CLAIMS[claimId]?.memoryFamily; if(!family)return null;
  const key=`${itemId}::${family}`; if(!db.memoryTraces[key])db.memoryTraces[key]={key,itemId,family,scheduler:'ts-fsrs-5.4.1',card:scheduler.newCard(now),createdAt:now.getTime(),updatedAt:now.getTime()};
  return db.memoryTraces[key];
}

function readiness(db,item,claimId){
  const meaning=projectClaimState(db,item.id,'understand_written'); const recall=projectClaimState(db,item.id,'retrieve_form');
  if(claimId==='understand_written')return 1;
  if(claimId==='retrieve_form')return meaning.directPasses>0||meaning.mean>.62?.95:.25;
  if(claimId==='recognize_audio')return meaning.directPasses>0||meaning.mean>.58?.9:.35;
  if(claimId==='use_novel_context')return recall.independentPasses>0?.95:.12;
  return 0;
}

function recentPenalty(db,itemId){
  const r=db.session?.recentItemIds||[]; const idx=r.lastIndexOf(itemId); if(idx<0)return 0; const distance=r.length-1-idx; return distance<=1?.9:distance===2?.55:distance===3?.25:0;
}

const DIAGNOSTIC_TOKENS=Object.freeze({
  missing_preposition:['to'],
  missing_that:['that'],
  missing_article:['a','an','the'],
});

function diagnosticToken(target,tag){
  const candidates=DIAGNOSTIC_TOKENS[tag]; if(!candidates)return null;
  const targetTokens=tokens(target); return candidates.find(token=>targetTokens.includes(token))||null;
}

function diagnosticCandidate(db,item){
  const p=deriveErrorPatterns(db,item.id).find(x=>x.occurrences>=2&&x.correctedAfter===0&&diagnosticToken(item.canonicalForm,x.tag)); return p||null;
}

export function explainCandidate(c){
  const parts=[];
  if(c.features.dueUrgency>.8)parts.push('đến lúc cần ôn');
  if(c.features.evidenceNeed>.65)parts.push('chưa có đủ bằng chứng');
  if(c.claimId==='use_novel_context')parts.push('cần thử ở tình huống khác');
  if(c.diagnosticError)parts.push(`lỗi ${c.diagnosticError.tag} lặp lại`);
  if(!parts.length)parts.push('thử thách này có ích nhất lúc này');
  return parts.join(' · ');
}

function directEvidenceItemIds(db){
  return new Set(db.evidence.filter(e=>e.source==='direct').map(e=>e.itemId));
}

export function activeLearningPool(db){
  const started=directEvidenceItemIds(db);
  const open=[];
  for(const item of db.units){
    if(!started.has(item.id))continue;
    const recall=projectClaimState(db,item.id,'retrieve_form');
    if(recall.independentPasses===0)open.push(item.id);
  }
  const window=Math.max(1,Number(db.settings?.newItemWindow||4));
  const slots=Math.max(0,window-open.length);
  const nextNew=db.units.filter(u=>!started.has(u.id)).slice(0,slots).map(u=>u.id);
  return {window,openItemIds:open,newItemIds:nextNew,allowedItemIds:new Set([...started,...nextNew])};
}

export function rankCandidates(db,scheduler,now=new Date()){
  const out=[];
  const pool=activeLearningPool(db);
  for(const item of db.units){
    if(!pool.allowedItemIds.has(item.id))continue;
    const diag=diagnosticCandidate(db,item);
    for(const claimId of CLAIM_IDS){
      const ready=readiness(db,item,claimId); if(ready<.18)continue;
      const state=projectClaimState(db,item.id,claimId);
      const family=CLAIMS[claimId]?.memoryFamily;
      const trace=family?db.memoryTraces[`${item.id}::${family}`]||null:null;
      let R=null,due=false,dueUrgency=.25;
      if(trace){
        R=scheduler.retrievability(trace.card,now);
        due=new Date(trace.card.due).getTime()<=now.getTime();
        dueUrgency=trace.card.reps===0?.75:(due?1+Math.max(0,1-(R||0)):.15*Math.max(0,1-(R||0)));
      }else if(family){
        // Candidate ranking is pure: considering a probe must not create memory state.
        due=true; dueUrgency=.75;
      }else{
        const last=state.lastDirect?.createdAt||0,days=last?(now.getTime()-last)/DAY_MS:999;
        due=state.directCount===0||days>=2;dueUrgency=state.directCount===0?.65:Math.min(1,days/4);
      }
      const evidenceNeed=state.directCount===0?1:Math.max(.08,1-state.mean*state.confidence);
      const predictedSuccess=state.directCount?state.mean:.55;
      const target=claimId==='use_novel_context'?.58:claimId==='retrieve_form'?.68:.74;
      const challengeFit=Math.max(.15,1-Math.abs(predictedSuccess-target));
      const recent=recentPenalty(db,item.id);
      let suppression=0;
      if(claimId==='understand_written'&&state.mean>.84&&state.directPasses>=2&&!due)suppression=.8;
      if(claimId==='retrieve_form'&&state.mean>.88&&state.directPasses>=3&&!due)suppression=.45;
      const context=claimId==='use_novel_context'?contextCoverage(db,item.id):null;
      const contextNeed=context?Math.max(.15,1-Math.min(1,context.successfulContexts/2)):0;
      const score=ready*item.utility*(.45+dueUrgency*.9+evidenceNeed*.7+challengeFit*.28+contextNeed*.35)-(recent*.9+suppression);
      if(score<=0)continue;
      out.push({id:`cand:${item.id}:${claimId}`,itemId:item.id,claimId,score:Number(score.toFixed(4)),diagnosticError:diag&&claimId==='retrieve_form'?diag:null,features:{ready,R,due,dueUrgency,evidenceNeed,predictedSuccess,challengeFit,recentPenalty:recent,suppression,contextNeed,poolOpen:pool.openItemIds.length,poolWindow:pool.window}});
    }
  }
  return out.sort((a,b)=>b.score-a.score);
}

export function selectNext(db,scheduler,now=new Date()){
  const ranked=rankCandidates(db,scheduler,now); const chosen=ranked[0]||null; if(!chosen)return null;
  const item=getUnit(db,chosen.itemId); const probe=buildProbe(db,item,chosen.claimId,{diagnosticError:chosen.diagnosticError});
  const decision={id:uid('policy'),createdAt:now.getTime(),policyVersion:VERSIONS.policy,candidateProbeIds:ranked.slice(0,12).map(c=>c.id),candidates:ranked.slice(0,12),selectedCandidateId:chosen.id,selectedProbeId:probe.id,selectedItemId:item.id,selectedClaimId:chosen.claimId,selectionProbability:1,selectionReason:explainCandidate(chosen)};
  db.policyDecisions.push(decision);
  db.session.recentItemIds=[...(db.session.recentItemIds||[]),item.id].slice(-8);
  return {item,probe,decision,candidate:chosen};
}

const HOLDOUT_CELLS=Object.freeze([
  Object.freeze({checkpoint:'1d',delay:DAY_MS,claimId:'retrieve_form',contextIndex:null}),
  Object.freeze({checkpoint:'1d',delay:DAY_MS,claimId:'use_novel_context',contextIndex:0}),
  Object.freeze({checkpoint:'7d',delay:7*DAY_MS,claimId:'retrieve_form',contextIndex:null}),
  Object.freeze({checkpoint:'7d',delay:7*DAY_MS,claimId:'use_novel_context',contextIndex:1}),
]);

function holdoutSpec(item){
  const cell=HOLDOUT_CELLS[stableHash(item.id)%HOLDOUT_CELLS.length];
  const ctx=cell.contextIndex===null?null:item.evalContexts?.[cell.contextIndex%item.evalContexts.length]||null;
  if(cell.claimId==='use_novel_context'&&!ctx)return null;
  const key=`${item.id}:${cell.claimId}:${cell.checkpoint}:${VERSIONS.evaluation}`;
  return {...cell,itemId:item.id,key,id:`evaltask:${key}`,contextId:ctx?.id||null,context:ctx?.text||null};
}

function taskMatchesHoldoutSpec(task,spec){
  return Boolean(spec) &&
    task.id===spec.id && task.key===spec.key && task.itemId===spec.itemId &&
    task.claimId===spec.claimId && task.checkpoint===spec.checkpoint &&
    task.contextId===spec.contextId && task.context===spec.context &&
    task.assignmentVersion===VERSIONS.evaluation &&
    Number(task.dueAt)-Number(task.createdAt)===spec.delay;
}

function supersedeNoncanonicalHoldouts(db,nowMs){
  for(const task of db.evaluationTasks){
    if(task.status!=='scheduled')continue;
    const item=getUnit(db,task.itemId),spec=item?holdoutSpec(item):null;
    if(taskMatchesHoldoutSpec(task,spec))continue;
    task.status='superseded'; task.supersededAt=nowMs; task.supersededReason='noncanonical-holdout-assignment';
  }
}

export function scheduleEvaluationTasks(db,itemId,nowMs){
  const item=getUnit(db,itemId),spec=item?holdoutSpec(item):null; if(!spec)return null;
  const existing=db.evaluationTasks.find(task=>task.id===spec.id); if(existing)return existing;
  const task={id:spec.id,key:spec.key,itemId,claimId:spec.claimId,checkpoint:spec.checkpoint,dueAt:nowMs+spec.delay,contextId:spec.contextId,context:spec.context,status:'scheduled',createdAt:nowMs,assignmentVersion:VERSIONS.evaluation};
  db.evaluationTasks.push(task); return task;
}

function independentReviewPass(probe,grading,hintLevel){
  return grading.verdict==='pass' && Number(hintLevel)===0 &&
    Array.isArray(probe.targetClaims) && probe.targetClaims.includes(probe.claimId) &&
    !(probe.claimId==='retrieve_form'&&probe.kind==='reorder');
}

export function processReview(db,scheduler,{probe,decisionId,answer,hintLevel=0,attemptCount=1,startedAt},now=new Date()){
  const item=getUnit(db,probe.itemId); const grading=gradeProbe(probe,answer); const latencyMs=Math.max(0,now.getTime()-(startedAt||now.getTime()));
  const normalizedHintLevel=Math.max(0,Math.min(3,Number(hintLevel)||0));
  let schedule=null; const trace=probe.memoryEligible===false?null:ensureMemoryTrace(db,item.id,probe.claimId,scheduler,now);
  if(trace){
    const schedulerVerdict=grading.verdict==='pass'&&normalizedHintLevel>0?'partial':grading.verdict;
    schedule=scheduler.schedule(trace.card,schedulerVerdict,now);if(schedule.updated){trace.card=schedule.after;trace.updatedAt=now.getTime();}
  }
  const event={id:uid('review'),createdAt:now.getTime(),itemId:item.id,probe:clone(probe),policyDecisionId:decisionId||null,answer,normalizedAnswer:normalize(answer),hintLevel:normalizedHintLevel,attemptCount,latencyMs,grading:clone(grading),scheduler:schedule?{version:'ts-fsrs-5.4.1',before:schedule.before,after:schedule.after,rating:schedule.rating,updated:schedule.updated,retrievabilityBefore:schedule.retrievabilityBefore}:null,versions:clone(VERSIONS)};
  db.reviewEvents.push(event);
  const signals=evidenceSignalsFromReview(probe,grading,{hintLevel:normalizedHintLevel,latencyMs});
  for(const s of signals)db.evidence.push({id:uid('evidence'),reviewEventId:event.id,itemId:item.id,claimId:s.claimId,source:s.source,weight:s.weight,confidence:s.confidence,verdict:s.verdict,contextId:probe.contextId||null,createdAt:now.getTime(),metadata:s.metadata});
  if(independentReviewPass(probe,grading,normalizedHintLevel)&&['retrieve_form','use_novel_context'].includes(probe.claimId))scheduleEvaluationTasks(db,item.id,now.getTime());
  db.session.reviewCount=(db.session.reviewCount||0)+1;
  return {event,grading,signals,schedule,claimState:projectClaimState(db,item.id,probe.claimId),errors:deriveErrorPatterns(db,item.id)};
}

export function dueEvaluationTasks(db,now=Date.now()){
  return db.evaluationTasks.filter(t=>{
    const item=getUnit(db,t.itemId),spec=item?holdoutSpec(item):null;
    return t.status==='scheduled'&&taskMatchesHoldoutSpec(t,spec)&&t.dueAt<=now;
  }).sort((a,b)=>a.dueAt-b.dueAt);
}
export function nextEvaluationAt(db){
  const x=db.evaluationTasks.filter(t=>{
    const item=getUnit(db,t.itemId),spec=item?holdoutSpec(item):null;
    return t.status==='scheduled'&&taskMatchesHoldoutSpec(t,spec);
  }).sort((a,b)=>a.dueAt-b.dueAt)[0]; return x?.dueAt||null;
}
export function buildEvaluationProbe(db,task){
  const item=getUnit(db,task.itemId),accepted=[item.canonicalForm,...(item.accepted||[])];
  if(task.claimId==='retrieve_form')return {id:`${task.id}:probe`,itemId:item.id,claimId:task.claimId,instruction:'Bài kiểm tra độc lập · tự nhớ câu tiếng Anh',prompt:item.meanings[0],responseType:'text',target:item.canonicalForm,accepted,contextId:null,context:null,holdout:true};
  return {id:`${task.id}:probe`,itemId:item.id,claimId:task.claimId,instruction:'Bài kiểm tra độc lập · tình huống chưa dùng để luyện',prompt:task.context,responseType:'free-production',target:item.canonicalForm,accepted,contextId:task.contextId,context:task.context,holdout:true};
}

function sameEvaluationProbe(actual,expected){
  const fields=['id','itemId','claimId','instruction','prompt','responseType','target','accepted','contextId','context','holdout'];
  return fields.every(field=>JSON.stringify(actual?.[field])===JSON.stringify(expected[field]));
}

export function processEvaluation(db,task,probe,answer,startedAt,now=Date.now()){
  const nowMs=now instanceof Date?now.getTime():Number(now);
  const canonicalTask=db.evaluationTasks.find(candidate=>candidate.id===task?.id);
  if(!canonicalTask)throw new Error('Evaluation task không tồn tại trong dữ liệu hiện tại.');
  const item=getUnit(db,canonicalTask.itemId),spec=item?holdoutSpec(item):null;
  if(!taskMatchesHoldoutSpec(canonicalTask,spec))throw new Error('Evaluation task không khớp holdout assignment hiện tại.');
  if(canonicalTask.status!=='scheduled'||db.evaluationEvents.some(event=>event.taskId===canonicalTask.id))throw new Error('Evaluation task đã được xử lý.');
  if(!Number.isFinite(nowMs)||canonicalTask.dueAt>nowMs)throw new Error('Evaluation task chưa đến hạn.');
  const expectedProbe=buildEvaluationProbe(db,canonicalTask);
  if(!sameEvaluationProbe(probe,expectedProbe))throw new Error('Evaluation probe không khớp task chuẩn.');
  const grading=gradeProbe(expectedProbe,answer),event={id:uid('eval'),taskId:canonicalTask.id,itemId:canonicalTask.itemId,claimId:canonicalTask.claimId,checkpoint:canonicalTask.checkpoint,createdAt:nowMs,probe:clone(expectedProbe),answer,normalizedAnswer:normalize(answer),latencyMs:Math.max(0,nowMs-(startedAt||nowMs)),grading:clone(grading),evaluationVersion:VERSIONS.evaluation};
  db.evaluationEvents.push(event); canonicalTask.status='completed';canonicalTask.completedAt=nowMs;canonicalTask.result=grading.verdict; return event;
}

export function evaluationSummary(db){
  const completed=db.evaluationEvents,byCp={};
  for(const e of completed){
    const k=e.checkpoint;
    byCp[k]||={total:0,pass:0,partial:0,fail:0,uncertain:0};
    byCp[k].total++; byCp[k][e.grading.verdict]=(byCp[k][e.grading.verdict]||0)+1;
  }
  for(const v of Object.values(byCp)){
    v.strictPassRate=v.total?Number((v.pass/v.total).toFixed(3)):0;
    v.creditRate=v.total?Number(((v.pass+.5*v.partial)/v.total).toFixed(3)):0;
  }
  const scheduled=db.evaluationTasks.filter(task=>{
    const item=getUnit(db,task.itemId),spec=item?holdoutSpec(item):null;
    return task.status==='scheduled'&&taskMatchesHoldoutSpec(task,spec);
  }).length;
  return {completed:completed.length,scheduled,byCheckpoint:byCp};
}

export function addUnit(db,input){
  const target=String(input.canonicalForm||'').trim(),meaning=String(input.meaning||'').trim(); if(!target||!meaning)throw new Error('Cần English target và nghĩa.');
  const id=uid('unit'); db.units.push({id,type:input.type||'expression',canonicalForm:target,meanings:[meaning],accepted:[],utility:1,tags:[],encounters:input.sourceSentence?[{id:uid('enc'),sourceType:'captured',label:'Captured context',originalSentence:input.sourceSentence,note:'Nguồn người học thêm.'}]:[],trainContexts:input.trainContext?[{id:uid('train'),text:input.trainContext}]:[],evalContexts:[]}); return id;
}

export function exportResearchSnapshot(db){
  return {
    exportedAt:new Date().toISOString(),schemaVersion:db.schemaVersion,contentPackVersion:db.contentPackVersion,versions:db.versions,settings:db.settings,
    counts:{units:db.units.length,reviews:db.reviewEvents.length,evidence:db.evidence.length,policyDecisions:db.policyDecisions.length,evaluationEvents:db.evaluationEvents.length},
    units:db.units,memoryTraces:db.memoryTraces,reviewEvents:db.reviewEvents,evidence:db.evidence,policyDecisions:db.policyDecisions,evaluationTasks:db.evaluationTasks,evaluationEvents:db.evaluationEvents,
  };
}
