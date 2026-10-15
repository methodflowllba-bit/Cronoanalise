const Mobile = (() => {
  let cleanup;
  function bind() {
    if (cleanup) cleanup();
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
  return { bind };
})();
