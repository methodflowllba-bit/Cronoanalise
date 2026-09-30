(function(root){
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const elapsed=(segment,now=Date.now())=>Math.max(0,(segment.end??now)-segment.start);
  const format=ms=>{const s=Math.floor(ms/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':')};
  function resolve(text,catalog){const n=normalize(text);return catalog.find(x=>normalize(x.code)===n)||catalog.find(x=>[x.activity,...x.keywords.split(',')].some(k=>normalize(k)&&normalize(k)===n))||catalog.find(x=>x.keywords.split(',').some(k=>normalize(k)&&(' '+n+' ').includes(' '+normalize(k)+' ')))||null}
  function close(session,now){const s=session.segments.at(-1);if(s&&s.end===null)s.end=now}
  function add(session,entry,now=Date.now()){close(session,now);session.segments.push({...entry,id:crypto.randomUUID(),start:now,end:null});session.paused=false}
  function validateRange(session,id,start,end){if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('O fim deve ser posterior ao início.');if(start<session.start||end>(session.end??Date.now()))throw Error('Os horários devem estar dentro do acompanhamento.');if(session.segments.some(x=>x.id!==id&&start<(x.end??Date.now())&&end>x.start))throw Error('Este intervalo sobrepõe outro trecho.');}
  function split(session,id,seconds,details){const i=session.segments.findIndex(x=>x.id===id),old=session.segments[i];if(!old||old.end===null)throw Error('Encerre o trecho antes de dividir.');const cut=old.start+Math.round(Number(seconds)*1000);if(!Number.isFinite(cut)||cut<=old.start||cut>=old.end)throw Error('A quebra deve ficar entre o início e o fim do trecho.');const first={...old,end:cut},second={...old,...details,id:crypto.randomUUID(),start:cut,end:old.end};session.audit??=[];session.audit.push({at:Date.now(),action:'split',before:{...old},after:[{...first},{...second}]});session.segments.splice(i,1,first,second);return second;}
  const api={normalize,elapsed,format,resolve,close,add,validateRange,split};root.MF=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
