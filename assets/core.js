(function(root){
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const elapsed=(segment,now=Date.now())=>Math.max(0,(segment.end??now)-segment.start);
  const format=ms=>{const s=Math.floor(ms/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':')};
  function resolve(text,catalog){const n=normalize(text);return catalog.find(x=>normalize(x.code)===n)||catalog.find(x=>[x.activity,...x.keywords.split(',')].some(k=>normalize(k)&&normalize(k)===n))||catalog.find(x=>x.keywords.split(',').some(k=>normalize(k)&&(' '+n+' ').includes(' '+normalize(k)+' ')))||null}
  function close(session,now){const s=session.segments.at(-1);if(s&&s.end===null)s.end=now}
  function add(session,entry,now=Date.now()){close(session,now);session.segments.push({...entry,id:crypto.randomUUID(),start:now,end:null});session.paused=false}
  const api={normalize,elapsed,format,resolve,close,add};root.MF=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
