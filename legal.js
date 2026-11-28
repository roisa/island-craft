// The privacy and support pages: the EN / ID switch, remembered together with the marketing page's choice.
(function () {
  var root = document.documentElement, saved = null;
  try { saved = new URLSearchParams(location.search).get('lang') || localStorage.getItem('mocraft-lang'); } catch (e) { /* private mode */ }
  var lang = saved === 'id' || saved === 'en' ? saved : ((navigator.language || '').toLowerCase().indexOf('id') === 0 ? 'id' : 'en');
  function set(l) {
    root.dataset.lang = l; root.lang = l;
    document.querySelectorAll('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === l)); });
    try { localStorage.setItem('mocraft-lang', l); } catch (e) { /* private mode */ }
  }
  document.querySelectorAll('.seg button').forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.set); }); });
  set(lang);
})();
