/* Kit Digital del Networker · temas visuales
   Se elige con ?t=aurora | sol | esmeralda en el enlace. Sin ?t= la página se ve como siempre.
   Solo cambia la apariencia: no toca preguntas, cálculos, datos ni los parámetros n, w, c, v.
   Cada página declara window.KIT_PAGE = 'oportunidad' | 'bienestar' antes de cargar este archivo. */
(function () {
  function extraBienestar(rgb, fin) {
    var a = function (x) { return 'rgba(' + rgb + ',' + x + ')'; };
    return '.logo-badge{background:' + a(.12) + '!important;border-color:' + a(.32) + '!important;color:var(--accent)!important}' +
      '.btn-primary,.cierre-cta{background:linear-gradient(135deg,var(--accent),' + fin + ')!important;box-shadow:0 0 40px ' + a(.32) + '!important}' +
      '.option-card:hover{border-color:' + a(.45) + '!important}' +
      '.option-card.selected{background:' + a(.1) + '!important;box-shadow:0 0 20px ' + a(.18) + '!important}' +
      '.insight-card{background:linear-gradient(135deg,' + a(.08) + ',rgba(255,255,255,.02))!important;border-color:' + a(.24) + '!important}' +
      '.path-yes{background:' + a(.06) + '!important;border-color:' + a(.22) + '!important}' +
      '.field input:focus,.field select:focus,.field textarea:focus{box-shadow:0 0 0 3px ' + a(.14) + '!important}';
  }

  var TEMAS = {
    aurora: {
      fuentes: 'Sora:wght@400;600;700;800',
      display: "'Sora',system-ui,sans-serif",
      oportunidad:
        ':root{--bg:#07060f;--card:rgba(22,18,44,.72);--text:#EEEBFF;--muted:#A49FC4;--line:rgba(255,255,255,.10);--brand:#7C5CFF;--brand2:#22D3EE;--brand3:#E879F9;--shadow:0 30px 80px rgba(0,0,0,.55)}' +
        'body{background:radial-gradient(60% 50% at 0% 0%,rgba(124,92,255,.35),transparent 60%),radial-gradient(50% 45% at 100% 10%,rgba(34,211,238,.22),transparent 60%),radial-gradient(60% 50% at 50% 100%,rgba(232,121,249,.18),transparent 60%),#07060f!important;background-attachment:fixed!important}' +
        '.card{background:var(--card)!important;border:1px solid rgba(255,255,255,.09)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}' +
        '.pill,.mini,input,select,textarea,.option span,.chip,.tag{background:rgba(255,255,255,.05)!important;color:var(--text)!important}' +
        '.panel,.tile,.info-card,.final-cta,.video-card,.goal,.path-card{background:rgba(255,255,255,.04)!important}' +
        '.path-card.recommended{background:linear-gradient(180deg,rgba(34,211,238,.14),rgba(255,255,255,.03))!important;border-color:rgba(34,211,238,.4)!important}' +
        '.btn-secondary{background:rgba(255,255,255,.07)!important;color:var(--text)!important}' +
        '.btn-primary{box-shadow:0 10px 40px rgba(124,92,255,.45)}' +
        '.mini span,.tile h4,.info-card p,.foot,.small-note,.btn-ghost,.muted,.lead{color:var(--muted)!important}' +
        '.progress,.meter-item .line,.video-wrap{background:rgba(255,255,255,.07)!important}' +
        '.profile-card,.big-stat{background:linear-gradient(135deg,#7C5CFF,#E879F9)!important}' +
        '.badge{background:rgba(124,92,255,.18)!important;color:#C9BCFF!important;border-color:rgba(124,92,255,.4)!important}' +
        'h1{background:linear-gradient(100deg,#fff 20%,#C9BCFF 55%,#67E8F9);-webkit-background-clip:text;background-clip:text;color:transparent!important}' +
        'input::placeholder,textarea::placeholder{color:#7d77a3}' +
        'label,.pill,.goal,h2,h3,h4{color:var(--text)!important}',
      bienestar:
        ':root{--bg:#07060f;--surface:#120f24;--surface2:#1a1633;--border:rgba(255,255,255,.09);--accent:#22D3EE;--accent2:#7C5CFF;--accent3:#E879F9;--text:#EEEBFF;--muted:#9C97BE;--good:#22D3EE}' +
        'body{background:radial-gradient(60% 45% at 0% 0%,rgba(124,92,255,.32),transparent 60%),radial-gradient(50% 40% at 100% 20%,rgba(34,211,238,.18),transparent 60%),#07060f!important}' +
        extraBienestar('34,211,238', '#7C5CFF')
    },

    sol: {
      fuentes: 'Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800',
      display: "'Bricolage Grotesque',system-ui,sans-serif",
      oportunidad:
        ':root{--bg:#FBF7EF;--card:#fff;--text:#14110F;--muted:#6E655C;--line:#E8E0D2;--brand:#14110F;--brand2:#3B3530;--brand3:#E0A800;--shadow:0 24px 60px rgba(20,17,15,.12);--radius:26px}' +
        'body{background:#FBF7EF!important}' +
        '.hero{background:#14110F!important;color:#fff;border-color:#14110F!important}' +
        '.hero .lead,.hero .muted{color:#D8D0C4!important}' +
        '.hero h1{color:#fff!important}' +
        '.hero .mini,.hero .pill{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.12)!important;color:#fff!important}' +
        '.hero .mini span{color:#B9B0A3!important}' +
        '.badge{background:#FFD23F!important;color:#14110F!important;border:0!important;font-weight:800}' +
        '.btn-primary{background:#FFD23F!important;color:#14110F!important;box-shadow:0 6px 0 #D9A90F!important;font-weight:800}' +
        '.hero .btn-secondary{background:transparent!important;color:#fff!important;border:2px solid #fff!important}' +
        '.btn-secondary{background:#F3ECDF!important;color:#14110F!important}' +
        '.pill,.mini,input,select,textarea,.option span,.chip,.tag{background:#FFFDF8!important}' +
        '.progress,.meter-item .line,.video-wrap{background:#F3ECDF!important}' +
        '.fill,.progress>*{background:#FFD23F!important}' +
        '.profile-card,.big-stat{background:#14110F!important;color:#fff!important}' +
        '.path-card.recommended{background:#FFF6D6!important;border-color:#FFD23F!important}' +
        '.chip.active{background:#FFD23F!important;color:#14110F!important;border-color:#FFD23F!important}',
      bienestar:
        ':root{--bg:#14110F;--surface:#1E1A17;--surface2:#27221E;--border:rgba(255,255,255,.08);--accent:#FFD23F;--accent2:#FF8A3D;--accent3:#FFD23F;--text:#FBF7EF;--muted:#A69D90;--good:#FFD23F}' +
        'body{background:radial-gradient(55% 40% at 50% 0%,rgba(255,210,63,.16),transparent 65%),#14110F!important}' +
        extraBienestar('255,210,63', '#FF8A3D')
    },

    esmeralda: {
      fuentes: 'Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600',
      display: "'Fraunces',Georgia,serif",
      oportunidad:
        ':root{--bg:#F6F1E7;--card:#FFFDF8;--text:#123329;--muted:#5E7A70;--line:#E2DACB;--brand:#0F5B46;--brand2:#2F8F6B;--brand3:#B8913A;--shadow:0 24px 60px rgba(18,51,41,.10);--radius:28px}' +
        'body{background:radial-gradient(70% 50% at 100% 0%,rgba(184,145,58,.14),transparent 60%),radial-gradient(60% 50% at 0% 100%,rgba(15,91,70,.10),transparent 60%),#F6F1E7!important;font-family:Inter,system-ui,sans-serif!important}' +
        '.card{border:1px solid #E2DACB!important}' +
        '.pill,.mini,input,select,textarea,.option span,.chip,.tag{background:#FBF8F1!important}' +
        '.panel,.tile,.info-card,.final-cta,.video-card,.goal,.path-card{background:#FFFDF8!important}' +
        '.progress,.meter-item .line,.video-wrap{background:#EEE7D9!important}' +
        '.badge{background:#0F5B46!important;color:#F3E3B5!important;border:0!important;letter-spacing:.04em}' +
        '.btn-secondary{background:#EEE7D9!important;color:#123329!important}' +
        '.profile-card,.big-stat{background:linear-gradient(135deg,#0F5B46,#0B3D30)!important;color:#F6F1E7!important}' +
        '.path-card.recommended{background:linear-gradient(180deg,rgba(184,145,58,.12),#FFFDF8)!important;border-color:rgba(184,145,58,.5)!important}' +
        'h1 em,h1 mark{color:#B8913A}',
      bienestar:
        ':root{--bg:#061A14;--surface:#0B241C;--surface2:#0F2E24;--border:rgba(243,227,181,.10);--accent:#D9B45A;--accent2:#3FB68B;--accent3:#D9B45A;--text:#F6F1E7;--muted:#8FAFA3;--good:#3FB68B}' +
        'body{background:radial-gradient(60% 45% at 50% 0%,rgba(217,180,90,.16),transparent 65%),#061A14!important}' +
        extraBienestar('217,180,90', '#B8913A')
    }
  };

  var t = new URLSearchParams(location.search).get('t');
  var tema = TEMAS[t];
  var pagina = window.KIT_PAGE;
  if (!tema || !tema[pagina]) return;
  if (window.KIT) window.KIT.tema = t;

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + tema.fuentes + '&display=swap';
  document.head.appendChild(link);

  var css = tema[pagina] +
    'h1,h2,h3,.hero-title,.hero-title div{font-family:' + tema.display + '!important;letter-spacing:-.02em}';
  if (pagina === 'bienestar') css += '.hero-title{letter-spacing:-.01em;line-height:.95}';
  // Prioridad sobre los estilos de la página: :root:root gana a :root y el bloque se inserta al final.
  css = css.replace(/:root\{/g, ':root:root{');
  var style = document.createElement('style');
  style.id = 'kit-tema';
  style.textContent = css;
  var poner = function () { (document.body || document.head).appendChild(style); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poner);
  else poner();
  document.documentElement.setAttribute('data-tema', t);

  var meta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
  meta.content = { aurora: '#07060f', sol: '#14110F', esmeralda: pagina === 'bienestar' ? '#061A14' : '#0F5B46' }[t];
})();
