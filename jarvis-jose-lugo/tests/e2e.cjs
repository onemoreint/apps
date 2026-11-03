// Prueba la app en un navegador real, en móvil y escritorio. Uso: node tests/e2e.cjs [carpeta de capturas]
const { chromium, devices } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'); const OUT = process.argv[2] || path.join(ROOT, 'tests', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2' };
// Se sirve bajo una subcarpeta, como en GitHub Pages.
const server = http.createServer((req,res)=>{ let u=decodeURIComponent(req.url.split('?')[0]);
  if(!u.startsWith('/jarvis/')){res.writeHead(404);return res.end();} u=u.slice('/jarvis'.length); if(u==='/')u='/index.html';
  const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res); });
let pass=0, fail=0; const check=(name,ok,extra='')=>{ if(ok){pass++;console.log('ok  ',name);} else {fail++;console.log('FAIL',name,extra);} };

// Simula las API de voz, que un navegador sin audio no puede ejercer.
const VOICE_MOCK = () => {
  window.__spoken=[];
  class SR { start(){ window.__rec=this; setTimeout(()=>this.onstart&&this.onstart(),10);} stop(){ setTimeout(()=>this.onend&&this.onend(),10);} abort(){this.stop();} }
  window.webkitSpeechRecognition=SR; window.SpeechRecognition=SR;
  window.__hear=(t)=>{const r=window.__rec; r.onresult({results:[[{transcript:t}]]}); r.stop();};
  window.__micError=(e)=>{const r=window.__rec; r.onerror({error:e}); r.stop();};
  const voices=[{name:'Eddy (español (México))',lang:'es-MX',voiceURI:'eddy'},{name:'Paulina',lang:'es-MX',voiceURI:'paulina'},{name:'Microsoft Salome Online (Natural) - Spanish (Colombia)',lang:'es-CO',voiceURI:'salome',localService:false}];
  window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
  const synth={speaking:false,getVoices:()=>voices,cancel(){this.q&&clearTimeout(this.q);this.speaking=false;},addEventListener(){},
    speak(u){window.__spoken.push(u.text);window.__voice=u.voice&&u.voice.name;this.speaking=true;setTimeout(()=>u.onstart&&u.onstart(),5);setTimeout(()=>u.onboundary&&u.onboundary(),20);this.q=setTimeout(()=>{this.speaking=false;u.onend&&u.onend();},window.__speakMs||60);}};
  Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});
};

async function say(page,text){ await page.fill('#composer-input',text); await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
const lastMsg=(page)=>page.locator('.msg-jarvis').last().innerText();

(async()=>{
  await new Promise(r=>server.listen(0,r)); const URL_=`http://localhost:${server.address().port}/jarvis/`;
  const browser=await chromium.launch();
  const errors=[];

  // ---------- Escritorio ----------
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:URL_.replace('/jarvis/','')});
  await ctx.addInitScript(VOICE_MOCK);
  await ctx.route('https://wa.me/**',r=>r.fulfill({status:200,contentType:'text/html',body:'ok'}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('status of 500'))errors.push(m.text());});
  await page.goto(URL_); await page.waitForTimeout(800);
  await page.screenshot({path:path.join(OUT,'01-escritorio-inicio.png')});
  check('saludo dinámico',/(Buenos días|Buenas tardes|Buenas noches), José/.test(await page.innerText('#greeting-text')));
  check('fecha visible',(await page.innerText('#date-text')).length>10);
  check('indica modo local',/Modo local, sin IA/.test(await page.innerText('#conn-chip')));
  check('estado inicial En espera',await page.innerText('#state-label')==='En espera');

  // Comandos locales
  await say(page,'Agrega tarea preparar la presentación');
  check('tarea por comando',(await page.innerText('#task-list')).includes('Preparar la presentación'));
  await say(page,'Tarea urgente pagar el dominio para mañana');
  check('tarea urgente',(await page.innerText('#task-list')).includes('Urgente'));
  await say(page,'Recuérdame llamar a Pedro mañana a las 3 de la tarde');
  check('recordatorio por comando',(await page.innerText('#reminder-list')).includes('Llamar a Pedro'));
  await say(page,'Anota que el cliente prefiere pago por Bold');
  check('nota por comando',(await page.innerText('#memory-list')).includes('pago por Bold'));
  await say(page,'Recuerda que prefiero reuniones en la mañana');
  await page.click('[data-memory-tab="prefs"]');
  check('preferencia guardada',(await page.innerText('#memory-list')).includes('reuniones en la mañana'));
  await page.click('[data-memory-tab="notes"]');
  await say(page,'Busca Bold en la memoria');
  check('consulta de memoria',(await lastMsg(page)).includes('pago por Bold'));
  await say(page,'¿Cuál es el sentido de la vida?');
  check('no finge entender',(await lastMsg(page)).includes('sin un modelo de IA'));
  check('etiqueta origen local',(await lastMsg(page)).includes('Modo local, sin IA'));
  check('habló en voz alta',(await page.evaluate(()=>window.__spoken.length))>0);
  check('elige la voz más natural',/Salome/.test(await page.evaluate(()=>window.__voice)));

  // XSS: el texto del usuario nunca se interpreta
  await say(page,'Agrega tarea <img src=x onerror="window.__xss=1"> revisar');
  await page.waitForTimeout(100);
  check('sin inyección de HTML',!(await page.evaluate(()=>window.__xss)) && await page.locator('#task-list img').count()===0);

  // Paneles con formularios
  await page.fill('#task-input','Tarea desde panel'); await page.click('#task-form .btn-add');
  check('tarea desde panel',(await page.innerText('#task-list')).includes('Tarea desde panel'));
  const row=page.locator('#task-list .item',{hasText:'Tarea desde panel'});
  await row.locator('input[type=checkbox]').click();
  await page.click('[data-task-filter="done"]');
  check('filtro de hechas',(await page.innerText('#task-list')).includes('Tarea desde panel'));
  await page.click('[data-task-filter="pending"]');
  await page.fill('#memory-input','Idea del panel'); await page.click('#memory-form .btn-add');
  await page.fill('#memory-search','panel');
  check('búsqueda en panel',(await page.locator('#memory-list .item').count())===1);
  await page.fill('#memory-search','');
  const noteRow=page.locator('#memory-list .item',{hasText:'Idea del panel'});
  await noteRow.locator('.mini').click();
  check('eliminar nota',!(await page.innerText('#memory-list')).includes('Idea del panel'));
  await page.locator('.toast button',{hasText:'Deshacer'}).click();
  check('deshacer',(await page.innerText('#memory-list')).includes('Idea del panel'));

  // Autorizaciones: nada ocurre hasta pulsar el botón
  await say(page,'Autoriza');
  check('autorizar por texto se niega',(await lastMsg(page)).includes('botón'));
  const pagesBefore=ctx.pages().length;
  await say(page,'Envía un WhatsApp a 3001234567 diciendo ya tengo la propuesta lista');
  await page.waitForTimeout(300);
  check('propuesta no abre nada',ctx.pages().length===pagesBefore);
  check('propuesta en panel',(await page.innerText('#auth-list')).includes('+573001234567'));
  await page.screenshot({path:path.join(OUT,'02-escritorio-autorizacion.png')});
  const [pop]=await Promise.all([ctx.waitForEvent('page'),page.locator('#auth-list .btn-auth').first().click()]);
  check('autorizar abre WhatsApp con el texto',pop.url()==='https://wa.me/573001234567?text=Ya%20tengo%20la%20propuesta%20lista',pop.url());
  await pop.close(); await page.waitForTimeout(150);
  check('resultado informado',(await page.locator('.msg-jarvis').last().innerText()).includes('aún no se ha enviado'));
  check('sin pendientes tras autorizar',(await page.locator('#auth-list .btn-auth').count())===0);
  // Rechazar
  await say(page,'Busca en internet precios de hosting');
  const before2=ctx.pages().length;
  await page.locator('#auth-list .btn-reject').first().click(); await page.waitForTimeout(150);
  check('rechazar no abre nada',ctx.pages().length===before2);
  // Borrar por comando exige autorización
  const countT=await page.locator('#task-list .item').count();
  await say(page,'Elimina la tarea 1');
  check('borrar requiere autorización',(await page.locator('#task-list .item').count())===countT);
  await page.locator('#auth-list .btn-auth').first().click(); await page.waitForTimeout(150);
  check('borrar autorizado',(await page.locator('#task-list .item').count())===countT-1);
  await page.click('[data-auth-tab="history"]');
  check('historial',(await page.innerText('#auth-list')).includes('Rechazada'));
  await page.click('[data-auth-tab="pending"]');
  // Planificar
  await say(page,'Planifica el proyecto lanzamiento de catálogo');
  check('plantilla identificada',(await page.locator('.msg-jarvis').last().innerText()).includes('no un análisis de IA'));
  await page.locator('#auth-list .btn-auth').first().click(); await page.waitForTimeout(150);
  check('plan crea tareas',(await page.innerText('#task-list')).includes('Lanzamiento de catálogo'));
  // Analizar
  await say(page,'Analiza: Debo enviar la cotización a ana@correo.com. Hay que revisar el presupuesto de 2.500 dólares.');
  const an=await page.locator('.msg-jarvis').last().innerText();
  check('análisis local',an.includes('2.500')&&an.includes('ana@correo.com')&&an.includes('sin IA'),an);
  await page.locator('#auth-list .btn-reject').first().click();

  // Estados del reactor con voz simulada
  await page.click('#btn-mic'); await page.waitForTimeout(60);
  check('estado escuchando',await page.evaluate(()=>document.body.dataset.state)==='listening');
  check('botón pasa a detener',await page.getAttribute('#btn-mic','aria-pressed')==='true');
  await page.screenshot({path:path.join(OUT,'03-escuchando.png')});
  await page.evaluate(()=>{window.__speakMs=800;window.__hear('qué hora es');}); await page.waitForTimeout(220);
  check('voz llega como mensaje',(await page.locator('.msg-user').last().innerText())==='qué hora es');
  check('estado respondiendo',await page.evaluate(()=>document.body.dataset.state)==='speaking');
  await page.screenshot({path:path.join(OUT,'04-respondiendo.png')});
  await page.waitForTimeout(900);
  check('vuelve a en espera',await page.evaluate(()=>document.body.dataset.state)==='idle');
  await page.click('#btn-mic'); await page.waitForTimeout(40);
  await page.evaluate(()=>window.__micError('not-allowed')); await page.waitForTimeout(80);
  check('permiso denegado explicado',(await page.locator('.msg-alert').last().innerText()).includes('permiso'));
  check('estado error',await page.evaluate(()=>document.body.dataset.state)==='error');
  await page.screenshot({path:path.join(OUT,'05-error.png')});
  await page.evaluate(()=>{document.body.dataset.state='processing'}); await page.waitForTimeout(350);
  await page.screenshot({path:path.join(OUT,'06-procesando.png')});
  await page.evaluate(()=>{document.body.dataset.state='executing'}); await page.waitForTimeout(350);
  await page.screenshot({path:path.join(OUT,'07-ejecutando.png')});
  await page.evaluate(()=>{document.body.dataset.state='idle'});

  // Recordatorio que vence
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('jarvis.v1'));return d.reminders.length});
  await say(page,'Recuérdame probar el aviso en 0 minutos');
  await page.waitForTimeout(5500);
  check('recordatorio avisa',(await page.locator('.msg-alert').last().innerText()).includes('Probar el aviso'));
  check('recordatorio con acciones',(await page.locator('.toast button',{hasText:'Posponer'}).count())>0);
  await page.locator('.toast button',{hasText:'Posponer'}).first().click();

  // Persistencia
  await page.reload(); await page.waitForTimeout(500);
  check('los datos sobreviven al recargar',(await page.innerText('#task-list')).includes('Lanzamiento de catálogo'));

  // Configuración
  await page.click('#btn-settings'); await page.waitForTimeout(150);
  await page.screenshot({path:path.join(OUT,'08-configuracion.png')});
  await page.fill('#set-ai-url','https://mi-backend.example'); await page.fill('#set-ai-token','sk-ant-abc123'); await page.click('#set-ai-enabled'); await page.waitForTimeout(100);
  check('rechaza clave de API',(await page.innerText('#ai-result')).includes('clave de API'));
  check('no guardó la clave',!(await page.evaluate(()=>localStorage.getItem('jarvis.v1'))).includes('sk-ant'));
  check('diagnóstico',(await page.innerText('#diag')).includes('Reconocimiento de voz'));
  check('lista marca voces naturales',(await page.locator('#set-voice option').nth(1).innerText()).startsWith('Natural: Microsoft Salome'));
  await page.selectOption('#set-voice','paulina'); await page.waitForTimeout(40);
  check('elegir una voz la reproduce y se recuerda',await page.evaluate(()=>window.__voice==='Paulina'&&JSON.parse(localStorage.getItem('jarvis.v1')).settings.voiceURI==='paulina'));
  await page.selectOption('#set-voice','');
  await page.fill('#set-owner','Jefe'); await page.locator('#set-owner').blur(); await page.waitForTimeout(50);
  check('nombre configurable',(await page.innerText('#greeting-text')).includes('Jefe'));
  await page.fill('#set-owner','José'); await page.locator('#set-owner').blur();
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#btn-export')]);
  const file=path.join(OUT,'copia.json'); await dl.saveAs(file);
  const exported=JSON.parse(fs.readFileSync(file,'utf8'));
  check('exportar sin código',exported.settings.ai.token===''&&exported.tasks.length>0);
  await page.locator('#dlg-settings [data-close]').click();
  // Ayuda
  await page.click('#btn-help'); await page.waitForTimeout(100);
  await page.screenshot({path:path.join(OUT,'09-ayuda.png')});
  await page.locator('#help-groups .chip',{hasText:'Qué hora es'}).click(); await page.waitForTimeout(150);
  check('ejemplo de ayuda se ejecuta',(await page.locator('.msg-jarvis').last().innerText()).includes('Son las'));

  // Backend simulado: conexión, respuesta de IA y fallo
  await page.route('https://mi-backend.example/**',async route=>{
    const u=route.request().url();
    if(route.request().method()==='OPTIONS') return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
    if(u.endsWith('/health')) return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true,"model":"modelo-prueba"}'});
    if(page.__fail) return route.fulfill({status:500,headers:{'Access-Control-Allow-Origin':'*'},body:'{}'});
    return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({reply:'Respuesta simulada.',proposals:[{type:'delete_item',params:{collection:'tasks',id:'x'}},{type:'transferir',params:{}},{type:'web_search',params:{query:'hola'}}]})});
  });
  await page.click('#btn-settings'); await page.fill('#set-ai-url','https://mi-backend.example'); await page.fill('#set-ai-token','codigo'); await page.check('#set-ai-enabled'); await page.waitForTimeout(300);
  check('prueba de conexión',(await page.innerText('#ai-result')).includes('modelo-prueba'),await page.innerText('#ai-result'));
  await page.locator('#dlg-settings [data-close]').click();
  check('indicador conectado',(await page.innerText('#conn-chip')).includes('IA conectada'));
  await say(page,'Cuéntame algo interesante'); await page.waitForTimeout(250);
  const ai=await page.locator('.msg-jarvis').last().innerText();
  check('respuesta marcada como IA',ai.includes('Respuesta simulada')&&ai.includes('Respuesta de la IA'),ai);
  check('IA: solo pasa la propuesta permitida',(await page.locator('#auth-list .btn-auth').count())===1 && ai.includes('Descarté'));
  await page.locator('#auth-list .btn-reject').first().click();
  page.__fail=true;
  await say(page,'Otra pregunta libre'); await page.waitForTimeout(250);
  check('fallo de IA: mensaje claro',(await page.locator('.msg-jarvis').last().innerText()).includes('La IA no respondió'));
  check('fallo de IA: indicador',(await page.innerText('#conn-chip')).includes('IA sin respuesta'));
  await say(page,'Agrega tarea siguió funcionando');
  check('fallo de IA: el modo local sigue',(await page.innerText('#task-list')).includes('Siguió funcionando'));
  await page.click('#btn-settings'); await page.uncheck('#set-ai-enabled'); await page.waitForTimeout(100); await page.locator('#dlg-settings [data-close]').click();

  // PWA sin conexión
  const manifest=await page.evaluate(async()=>(await fetch('manifest.json')).json());
  check('manifest instalable',manifest.icons.some(i=>i.purpose==='maskable')&&manifest.display==='standalone');
  await page.evaluate(()=>navigator.serviceWorker.ready); await page.reload(); await page.waitForTimeout(600);
  check('service worker controla',await page.evaluate(()=>Boolean(navigator.serviceWorker.controller)));
  await ctx.setOffline(true); await page.reload(); await page.waitForTimeout(600);
  check('abre sin conexión',(await page.innerText('#state-label'))==='En espera');
  check('indica sin internet',(await page.innerText('#conn-chip')).includes('Sin internet'));
  await say(page,'Agrega tarea hecha sin conexión');
  check('funciona sin conexión',(await page.innerText('#task-list')).includes('Hecha sin conexión'));
  await ctx.setOffline(false); await page.waitForTimeout(100);
  await page.screenshot({path:path.join(OUT,'10-escritorio-con-datos.png')});
  await ctx.close();

  // ---------- MacBook ----------
  const mac=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:2});
  await mac.addInitScript(VOICE_MOCK);
  const mp=await mac.newPage(); await mp.goto(URL_); await mp.waitForTimeout(500);
  await say(mp,'Agrega tarea revisar en MacBook');
  await mp.screenshot({path:path.join(OUT,'11-macbook.png')});
  check('MacBook sin desbordes',await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
  await mac.close();

  // ---------- Android ----------
  const phone=await browser.newContext({...devices['Pixel 7']});
  await phone.addInitScript(VOICE_MOCK);
  const mob=await phone.newPage(); mob.on('pageerror',e=>errors.push(e.message));
  await mob.goto(URL_); await mob.waitForTimeout(500);
  await mob.screenshot({path:path.join(OUT,'20-android-inicio.png')});
  check('móvil sin scroll horizontal',await mob.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await say(mob,'Recuérdame llamar a Pedro mañana a las 3'); await say(mob,'Tarea urgente enviar cotización');
  await say(mob,'Envía un WhatsApp diciendo hola, te escribo por la propuesta');
  await mob.screenshot({path:path.join(OUT,'21-android-chat.png')});
  check('tarjeta de autorización en el chat',(await mob.locator('#chat-log .btn-auth').count())===1);
  for(const [v,f] of [['tasks','22-android-tareas'],['reminders','23-android-avisos'],['memory','24-android-memoria'],['auth','25-android-permisos']]){
    await mob.tap(`[data-nav="${v}"]`); await mob.waitForTimeout(120);
    await mob.screenshot({path:path.join(OUT,f+'.png')});
    check(`vista ${v} visible`,await mob.locator(`[data-view-name="${v}"]`).isVisible());
    check(`vista ${v} sin desborde`,await mob.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await mob.tap('#btn-settings'); await mob.waitForTimeout(120);
  await mob.screenshot({path:path.join(OUT,'26-android-configuracion.png')});
  check('configuración en móvil',await mob.locator('#dlg-settings').isVisible());
  await phone.close();

  // ---------- Navegador sin voz ----------
  const nov=await browser.newContext({viewport:{width:1280,height:800}});
  await nov.addInitScript(()=>{delete window.webkitSpeechRecognition;delete window.SpeechRecognition;Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined});Object.defineProperty(window,'SpeechRecognition',{value:undefined});});
  const np=await nov.newPage(); await np.goto(URL_); await np.waitForTimeout(400);
  await np.click('#btn-mic'); await np.waitForTimeout(100);
  check('sin micrófono: explica y permite escribir',(await np.locator('.msg-alert').last().innerText()).includes('escribe tu mensaje'));
  await nov.close();

  check('sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close(); server.close();
  console.log(`\n${pass} correctas, ${fail} fallidas`); process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
