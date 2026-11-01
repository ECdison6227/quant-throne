(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const $=id=>document.getElementById(id);

 // Statement: per-character ink reveal (Vivic-style).
 document.querySelectorAll('[data-ink]').forEach(el=>{
  let i=0;
  el.querySelectorAll('.lp-ink-line').forEach(line=>{
   const text=line.textContent;line.textContent='';
   for(const c of text){const s=document.createElement('span');s.className='ch';s.style.setProperty('--i',i++);s.textContent=c;line.appendChild(s);}
  });
 });

 const targets=document.querySelectorAll('.reveal,[data-ink]');
 if(reduce||!('IntersectionObserver' in window))targets.forEach(t=>t.classList.add('in'));
 else{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.15,rootMargin:'0px 0px -6% 0px'});targets.forEach(t=>io.observe(t));}

 // Real read-only close from the Quant Throne API proxy. Never fills in sample numbers.
 const close=$('quote-close'),detail=$('quote-detail');
 if(close&&detail){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),45000);
  fetch('/quant-throne/api/market?symbol=000300.SH',{signal:ctl.signal})
   .then(r=>r.json().then(d=>{if(!r.ok||!d.ok||typeof d.close!=='number')throw new Error('unavailable');return d;}))
   .then(d=>{close.textContent=d.close.toFixed(2);
     const chg=typeof d.chg20d==='number'?` · 近 20 日 ${d.chg20d>=0?'+':''}${(d.chg20d*100).toFixed(2)}%`:'';
     detail.textContent=`截至 ${d.asOf}${chg}`;})
   .catch(()=>{close.textContent='—';detail.textContent='实时快照暂不可用';})
   .finally(()=>clearTimeout(t));
 }
})();
