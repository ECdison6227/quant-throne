import {readFile} from 'node:fs/promises';
import {describe,it,expect} from 'vitest';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('./quant-throne-v2.js',import.meta.url),'utf8');
const profile=JSON.parse(await readFile(new URL('../../docs/demo/path-A.profile.json',import.meta.url),'utf8'));
function page(query='?quant-throne=1'){const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://vivic.edsionc.top/'+query,runScripts:'outside-only'});dom.window.eval(source);return dom;}
describe('Vivic review bridge',()=>{
 it('exposes the game entry and opens the exact game origin only',()=>{const normal=page('');expect(normal.window.document.getElementById('quant-throne-launch')).not.toBeNull();normal.window.close();const review=page();review.window.document.getElementById('quant-throne-launch').click();expect(review.window.document.querySelector('iframe').src).toBe('https://edsionc.top/game/games/quant-throne/index.html?embed=vivic');review.window.close();});
 it('rejects wrong origins, wrong windows and invalid scores; stores only bounded summaries',()=>{
  const dom=page(),w=dom.window;w.document.getElementById('quant-throne-launch').click();const iframe=w.document.querySelector('iframe');
  const send=(origin,source,p)=>w.dispatchEvent(new w.MessageEvent('message',{origin,source,data:{type:'pandaai.profile.v1',profile:p}}));
  send('https://attacker.invalid',iframe.contentWindow,profile);expect(w.localStorage.length).toBe(0);
  send('https://edsionc.top',w,profile);expect(w.localStorage.length).toBe(0);
  const invalid=structuredClone(profile);invalid.dimensions.risk.score=1000;send('https://edsionc.top',iframe.contentWindow,invalid);expect(w.localStorage.length).toBe(0);
  send('https://edsionc.top',iframe.contentWindow,{...profile,log:[{private:'should-never-be-stored'}]});expect(w.localStorage.length).toBe(0);
  send('https://edsionc.top',iframe.contentWindow,profile);
  const stored=w.localStorage.getItem('vivic.quant-throne.summary.v1');expect(stored).toContain('竹林守夜人');expect(stored).not.toContain('should-never');expect(stored).not.toContain('evidence');
  w.document.querySelector('[aria-label="关闭量权"]').click();expect(w.document.querySelector('iframe')).toBeNull();dom.window.close();
 });
});
