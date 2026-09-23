(function () {
  var cfg = window.DASH || {};
  var el = document.getElementById('dash');
  if (!el) return;
  el.innerHTML =
    '<div style="font-family:sans-serif;padding:24px;border-radius:12px;background:#18181c;color:#fff">' +
    '<b>Motor conectado ✓</b><br>versão 1.0.0<br>cliente: ' + (cfg.cliente || '(não informado)') +
    '</div>';
})();
