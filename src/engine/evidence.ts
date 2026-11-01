import type {Card,Decision,Direction,Episode,Report} from './types';
export function makeDecision(card:Card,choice:Direction,sequence:number,confidence:number,reports:Report[],episode?:Episode):Decision {
 const option=choice==='left'?card.left:card.right;
 const base:Decision={cardId:card.id,kind:card.kind,choice,label:choice==='up'?'观望':option.text,sequence,confidence,reports:[...reports],reportAvailable:card.report,risk:option.risk,market:option.market,style:option.style,correct:option.correct,literacy:option.literacy,discipline:option.discipline};
 if(episode){const direction=choice==='right'?1:choice==='left'?-1:0;
  base.risk=direction*(confidence===0.9?2:1);
  base.ret20=episode.outcome.ret20; base.loss=direction*base.ret20<0;
  base.correct=direction===0?undefined:direction*base.ret20>0;
  // The deck chose this asset, so exposure to A-shares is not a market preference vote.
  base.style=direction===1 ? (episode.style==='value'?'value':episode.hint.ret60>0?'trend':'reversal') : undefined;
 }
 return base;
}
