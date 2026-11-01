import type {Decision,Gauges,Revision,SelfReport} from './types';
export interface SavedSession {version:1;log:Decision[];self:SelfReport;gauges:Gauges;term:number;revisions:Revision[];createdAt:string;complete:boolean}
const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function parseSession(text:string|null):SavedSession|null{
 try{const value=JSON.parse(text||'null');
  if(!value||value.version!==1||!Array.isArray(value.log)||value.log.length>45||!['cautious','open','unknown'].includes(value.self?.risk)||![0,1,2,3].includes(value.self?.level)||![1,2].includes(value.term)||typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt)))return null;
  if(['nav','trust','risk','research'].some(k=>!finite(value.gauges?.[k],0,100)))return null;
  if(value.log.some((d:Decision)=>!d||typeof d.cardId!=='string'||!['story','knowledge','market','tutorial'].includes(d.kind)||!['left','right','up'].includes(d.choice)||!finite(d.confidence,0,1)||!finite(d.sequence,0,45)||typeof d.label!=='string'||!Array.isArray(d.reports)||d.reports.some(r=>!['fundamental','technical','flow'].includes(r))))return null;
  if(!Array.isArray(value.revisions)||value.revisions.length>7)return null;
  return value as SavedSession;
 }catch{return null;}
}
