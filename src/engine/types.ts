export type DimKey = 'risk'|'market'|'style'|'info'|'judgement'|'discipline'|'literacy';
export type Direction = 'left'|'right'|'up';
export type Market = 'a_share'|'etf_fund'|'futures'|'hk_us'|'macro'|'any';
export type Style = 'value'|'trend'|'reversal'|'event'|'factor'|'risk'|'macro'|'any';
export type Report = 'fundamental'|'technical'|'flow';
export type Gauges = {nav:number;trust:number;risk:number;research:number};
export type Point = {d:string;c:number;v:number};
export interface Episode {
  id:string;symbol:string;name:string;assetType:string;decisionDate:string;title:string;story:string;style:string;
  before:Point[];after:Point[];raw:Point[];
  outcome:{ret20:number;maxDD20:number;maxUp20:number};
  hint:{ma20_vs_ma60:string;vol_ratio:number;ret60:number;volatility60:number;maxDD60:number};
}
export interface Choice {
  text:string;delta:Partial<Gauges>;risk?:number;style?:Style;market?:Market;correct?:boolean;literacy?:number;discipline?:number;
}
export interface Card {
  id:string;kind:'story'|'knowledge'|'market'|'tutorial';title:string;text:string;character:string;role:string;
  left:Choice;right:Choice;probes:DimKey[];report?:boolean;episodeId?:string;explanation?:string;
}
export interface Decision {
  cardId:string;kind:Card['kind'];choice:Direction;label:string;sequence:number;confidence:number;reports:Report[];reportAvailable?:boolean;
  risk?:number;style?:Style;market?:Market;correct?:boolean;literacy?:number;discipline?:number;ret20?:number;loss?:boolean;
}
export interface SelfReport {risk:'cautious'|'open'|'unknown';level:0|1|2|3}
export interface Evidence {cardId:string;choice:string;effect:string;text:string}
export interface Dimension {kind:'preference'|'ability';label:string;score:number|string|null;confidence:'low'|'mid'|'high';uncertain:boolean;evidence:Evidence[]}
export interface Profile {
  dimensions:Record<DimKey,Dimension>;conflicts:{dims:DimKey[];text:string}[];uncertain:DimKey[];
  persona:{id:string;name:string;description:string};level:number;
}
export interface Resource {id:string;type:string;name:string;url:string;summary:string;markets:string[];styles:string[];minLevel:number;minutes:number;status?:string;checkedAt?:string}
export interface Recommendation extends Resource {reason:string;advanced:boolean;score:number}
export interface Task {id:string;title:string;minutes:number;data:string[];resourceId:string}
export interface Recommendations {items:Recommendation[];notRecommended:{id:string;reason:string}[];nextTask:Task}
export interface Revision {dimension:DimKey;before:number|string|null;after:number|string|null;reason:string;cards:string[]}
