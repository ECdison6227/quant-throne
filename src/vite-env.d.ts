/// <reference types="vite/client" />
interface Window { __EDISONC_GAME__?:{pause:()=>void;resume:()=>void;isReady:()=>boolean}; }
interface Window { __QUANT_AUDIO__?:()=>{unlocked:boolean;sfx:boolean;music:boolean;voice:boolean;activeSfx:number;activeVoice:number;bgmPlaying:boolean;peak:number;volume:number;musicVolume:number;voiceVolume:number}; }
