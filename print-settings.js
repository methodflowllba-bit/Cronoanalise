const ITPrint = (() => {
  const defaults={top:12,bottom:12,left:12,right:12,repeatHeader:true,onePage:false,footer:'',pageNumbers:true};
  const settings=c=>({...defaults,...c.printSettings});
  function validate(c){
    const s=settings(c),dims=({A4:[210,297],A3:[297,420],Carta:[216,279]})[c.paper];
    if(!dims)throw Error('Selecione um papel válido.');
    const [w,h]=c.orientation==='landscape'?[dims[1],dims[0]]:dims;
    for(const key of ['top','bottom','left','right'])if(!Number.isFinite(s[key])||s[key]<0||s[key]>100)throw Error('Informe margens entre 0 e 100 mm.');
    if(w-s.left-s.right<40||h-s.top-s.bottom<50)throw Error('As margens deixam pouco espaço para o documento.');
    return {s,w,h};
  }
  function open(get,apply){
    const c=get(),s=settings(c),d=document.createElement('dialog');d.className='it-viewer-dialog';
    d.innerHTML='<h2>Configurar impressão e PDF</h2><form method="dialog"><div class="fields two"><label>Papel<select name="paper">'+['A4','A3','Carta'].map(x=>'<option '+(c.paper===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Orientação<select name="orientation"><option value="portrait">Retrato</option><option value="landscape">Paisagem</option></select></label>'+[['top','Superior'],['bottom','Inferior'],['left','Esquerda'],['right','Direita']].map(([k,l])=>'<label>Margem '+l+' (mm)<input name="'+k+'" type="number" min="0" max="100" step="1" value="'+s[k]+'" required></label>').join('')+'</div><label><input type="checkbox" name="repeatHeader" '+(s.repeatHeader?'checked':'')+'> Repetir o cabeçalho em cada página</label><label><input type="checkbox" name="onePage" '+(s.onePage?'checked':'')+'> Ajustar toda a IT em uma página (reduz o tamanho do conteúdo)</label><label>Texto do rodapé<input name="footer" maxlength="160"></label><label><input type="checkbox" name="pageNumbers" '+(s.pageNumbers?'checked':'')+'> Numerar páginas no rodapé</label><h3>Quebras de página</h3><p>Quebras automáticas conforme o espaço disponível. Marque as etapas que devem começar em nova página. A opção de uma página ignora essas quebras.</p><div id="print-breaks"></div><p class="error" role="status"></p><div class="actions"><button type="button" id="print-apply" class="primary">Aplicar configurações</button><button value="cancel">Cancelar</button></div><p>Para guardar as configurações neste documento, clique depois em Salvar instrução.</p></form>';
    const form=d.querySelector('form');form.elements.orientation.value=c.orientation;form.elements.footer.value=s.footer;
    c.steps.forEach((step,i)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.breakIndex=i;input.checked=!!step.pageBreak;label.append(input,document.createTextNode(' Nova página antes de '+(i+1)+'. '+step.activity));d.querySelector('#print-breaks').append(label);});
    d.querySelector('#print-apply').onclick=()=>{try{if(!form.reportValidity())return;const next={...s};for(const key of ['top','bottom','left','right'])next[key]=Number(form.elements[key].value);for(const key of ['repeatHeader','onePage','pageNumbers'])next[key]=form.elements[key].checked;next.footer=form.elements.footer.value;const candidate={...c,paper:form.elements.paper.value,orientation:form.elements.orientation.value,printSettings:next};validate(candidate);c.paper=candidate.paper;c.orientation=candidate.orientation;c.printSettings=next;d.querySelectorAll('[data-break-index]').forEach(el=>c.steps[Number(el.dataset.breakIndex)].pageBreak=el.checked);d.close();apply();}catch(e){d.querySelector('.error').textContent=e.message;}};
    document.body.append(d);d.showModal();d.onclose=()=>d.remove();
  }
  async function output(c,print,previewHTML){
    const win=print?window.open('about:blank','_blank'):null;
    let host;
    try{
      if(print&&!win)throw Error('Permita a janela de impressão.');
      const {s,w,h}=validate(c),width=w-s.left-s.right;
      host=document.createElement('div');host.style.cssText='position:absolute;left:-20000px;top:0;background:white;pointer-events:none;';host.innerHTML=previewHTML(c);document.body.append(host);
      const articles=[...host.querySelectorAll('.it-paper')];
      const header=articles[0]?.querySelector('.it-doc-head')?.cloneNode(true);
      for(const article of articles){article.querySelectorAll('.it-doc-head').forEach(n=>n.remove());article.style.cssText='width:'+width+'mm;padding:0;margin:0;box-shadow:none;background:white;box-sizing:border-box;';}
      if(s.onePage&&articles.length>1){articles.slice(1).forEach(a=>{articles[0].append(...a.childNodes);a.remove();});}
      let headCanvas=null,headHeight=0;
      if(header){const wrap=document.createElement('article');wrap.className='it-paper';wrap.style.cssText='width:'+width+'mm;padding:0;margin:0;box-shadow:none';wrap.append(header);host.prepend(wrap);await decode(wrap);headCanvas=await capture(wrap);headHeight=headCanvas.height/headCanvas.width*width+3;}
      const pdf=new jspdf.jsPDF({orientation:c.orientation,unit:'mm',format:[w,h]});let pages=0;
      for(const article of (s.onePage?[articles[0]]:articles)){
        if(!article)continue;await decode(article);const canvas=await capture(article);if(!canvas.width||!canvas.height)continue;
        const ratio=canvas.width/width,rect=article.getBoundingClientRect();
        const boundaries=[...article.querySelectorAll('p,tr,h3,section,img')].map(n=>Math.round((n.getBoundingClientRect().bottom-rect.top)*canvas.height/rect.height));
        let y=0;
        while(y<canvas.height){
          const showHeader=headCanvas&&(pages===0||s.repeatHeader),offset=showHeader?headHeight:0,available=h-s.top-s.bottom-offset;
          if(available<20)throw Error('Cabeçalho e margens ocupam toda a página. Reduza as margens ou o logotipo.');
          if(pages)pdf.addPage([w,h],c.orientation);pages++;
          if(showHeader)pdf.addImage(headCanvas.toDataURL('image/png'),'PNG',s.left,s.top,width,headHeight-3);
          if(s.onePage){const scale=Math.min(width/canvas.width,available/canvas.height);pdf.addImage(canvas.toDataURL('image/png'),'PNG',s.left,s.top+offset,canvas.width*scale,canvas.height*scale);y=canvas.height;}
          else{let end=Math.min(canvas.height,y+Math.floor(available*ratio));const candidates=boundaries.filter(n=>n>y+20&&n<=end);if(end<canvas.height&&candidates.length)end=Math.max(...candidates);if(end<=y)throw Error('Não foi possível paginar o documento.');const part=document.createElement('canvas');part.width=canvas.width;part.height=end-y;part.getContext('2d').drawImage(canvas,0,y,canvas.width,end-y,0,0,canvas.width,end-y);pdf.addImage(part.toDataURL('image/png'),'PNG',s.left,s.top+offset,width,part.height/ratio);y=end;}
        }
      }
      for(let n=1;n<=pages;n++){pdf.setPage(n);pdf.setFontSize(8);pdf.setTextColor(80);const footer=[s.footer,s.pageNumbers?'Página '+n+' de '+pages:''].filter(Boolean).join(' · ');if(footer)pdf.text(pdf.splitTextToSize(footer,width).slice(0,2),s.left,h-Math.max(3,s.bottom/2));}
      if(print){pdf.autoPrint();const url=pdf.output('bloburl');win.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000);}else pdf.save('instrucao-de-trabalho.pdf');
    }catch(e){win?.close();throw e;}finally{host?.remove();}
  }
  async function decode(el){await Promise.all([...el.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));}
  const capture=el=>html2canvas(el,{scale:1.5,backgroundColor:'#fff',logging:false});
  return {open,output,settings,validate};
})();
