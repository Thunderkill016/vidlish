import * as tsFsrs from 'ts-fsrs';

function loadLib(){
  return Promise.resolve(tsFsrs);
}

function serializeCard(card){
  return {
    ...card,
    due: card.due instanceof Date ? card.due.toISOString() : card.due,
    last_review: card.last_review instanceof Date ? card.last_review.toISOString() : (card.last_review ?? null),
  };
}

function deserializeCard(raw){
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  };
}

export async function createFsrsAdapter(){
  const { createEmptyCard, fsrs, Rating, FSRSVersion } = await loadLib();
  const scheduler = fsrs({
    request_retention: 0.9,
    maximum_interval: 36500,
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: ['1m','10m'],
    relearning_steps: ['10m'],
  });

  function ratingForVerdict(verdict){
    if(verdict === 'uncertain') return null;
    if(verdict === 'fail') return Rating.Again;
    if(verdict === 'partial') return Rating.Hard;
    return Rating.Good;
  }

  return {
    packageVersion: '5.4.1',
    algorithmVersion: FSRSVersion || 'FSRS-6',
    newCard(now = new Date()){
      return serializeCard(createEmptyCard(now));
    },
    retrievability(stored, now = new Date()){
      const card = deserializeCard(stored);
      if(!card.reps) return 0;
      return scheduler.get_retrievability(card, now, false);
    },
    schedule(stored, verdict, now = new Date()){
      const before = serializeCard(deserializeCard(stored));
      const rating = ratingForVerdict(verdict);
      const retrievabilityBefore = before.reps ? scheduler.get_retrievability(deserializeCard(before), now, false) : 0;
      if(rating === null){
        return {updated:false,rating:null,before,after:before,log:null,retrievabilityBefore};
      }
      const result = scheduler.next(deserializeCard(before), now, rating);
      return {
        updated:true,
        rating,
        before,
        after:serializeCard(result.card),
        log:JSON.parse(JSON.stringify(result.log)),
        retrievabilityBefore,
      };
    }
  };
}
