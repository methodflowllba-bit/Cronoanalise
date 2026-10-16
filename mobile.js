const Mobile = (() => {
  let cleanup;
  let scrollCleanup;
  function bind() {
    if (cleanup) cleanup();
    if (scrollCleanup) scrollCleanup();
    scrollCleanup = bindYamazumiScroll();
    const toggle = document.querySelector('#mobile-menu-toggle');
    const sidebar = document.querySelector('#mobile-sidebar');
    const backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!toggle || !sidebar || !backdrop) return;
    const media = window.matchMedia('(max-width: 900px)');
    let open = false;
    function setOpen(value, restoreFocus = false) {
      open = value && media.matches;
      document.body.classList.toggle('mobile-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      sidebar.inert = media.matches && !open;
      backdrop.hidden = !open;
      if (open) sidebar.querySelector('.mobile-menu-close').focus();
      else if (restoreFocus) toggle.focus();
    }
    function keydown(event) {
      if (!open) return;
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
      if (event.key === 'Tab') {
        const buttons = [...sidebar.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    const resize = () => setOpen(false);
    toggle.onclick = () => setOpen(!open, true);
    backdrop.onclick = () => setOpen(false, true);
    sidebar.querySelector('.mobile-menu-close').onclick = () => setOpen(false, true);
    sidebar.addEventListener('click', event => { if (event.target.closest('.nav')) setOpen(false); });
    document.addEventListener('keydown', keydown);
    media.addEventListener('change', resize);
    setOpen(false);
    cleanup = () => {
      document.removeEventListener('keydown', keydown);
      media.removeEventListener('change', resize);
      document.body.classList.remove('mobile-menu-open');
    };
  }
  function bindYamazumiScroll() {
    if (typeof tab === 'undefined' || tab !== 'Yamazumi') return () => {};
    const disposers = [];
    document.querySelectorAll('main table').forEach(table => {
      if (!table.closest('.table-wrap')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrap';
        table.before(wrapper); wrapper.append(table);
      }
    });
    document.querySelectorAll('main .table-wrap').forEach((area, index) => {
      area.tabIndex = 0;
      area.setAttribute('aria-label', 'Área com rolagem horizontal do Yamazumi');
      const bar = document.createElement('div'); bar.className = 'yam-scroll-controls';
      const label = document.createElement('span'); label.textContent = 'Deslize para ver os lados';
      const left = document.createElement('button'); left.type = 'button'; left.textContent = '◀'; left.setAttribute('aria-label', 'Rolar para a esquerda');
      const right = document.createElement('button'); right.type = 'button'; right.textContent = '▶'; right.setAttribute('aria-label', 'Rolar para a direita');
      const range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.step = '1'; range.setAttribute('aria-label', 'Posição horizontal '+(index+1));
      bar.append(label, left, range, right); area.before(bar);
      const update = () => {
        const max = Math.max(0, area.scrollWidth - area.clientWidth);
        bar.hidden = max < 2; range.max = String(max); range.value = String(area.scrollLeft);
        left.disabled = area.scrollLeft <= 1; right.disabled = area.scrollLeft >= max - 1;
      };
      left.onclick = () => area.scrollBy({left:-area.clientWidth * .7,behavior:'smooth'});
      right.onclick = () => area.scrollBy({left:area.clientWidth * .7,behavior:'smooth'});
      range.oninput = () => {area.scrollLeft = Number(range.value); update();};
      area.addEventListener('scroll', update, {passive:true});
      const observer = new ResizeObserver(update); observer.observe(area);
      if(area.firstElementChild)observer.observe(area.firstElementChild);
      update();
      disposers.push(() => {observer.disconnect();area.removeEventListener('scroll',update);bar.remove();});
    });
    return () => disposers.forEach(dispose => dispose());
  }
  return { bind };
})();
