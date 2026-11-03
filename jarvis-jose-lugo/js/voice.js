// Voz con las tecnologías del navegador. Detecta qué hay disponible y explica los límites.

const ERRORS = {
  'not-allowed': 'El navegador no tiene permiso para usar el micrófono. Actívalo en los ajustes del sitio y vuelve a intentarlo.',
  'service-not-allowed': 'Este navegador o dispositivo no permite el reconocimiento de voz aquí. Puedes escribir tu mensaje.',
  'audio-capture': 'No detecto un micrófono. Revisa que esté conectado y disponible.',
  network: 'El servicio de voz de este navegador no respondió. Revisa tu internet. Si continúa, abre JARVIS en Edge o Chrome, porque algunos navegadores no incluyen este servicio. Puedes escribir tu mensaje.',
  'language-not-supported': 'Este navegador no reconoce el acento elegido. Cambia el idioma en Configuración.',
  'no-speech': 'No escuché nada. Pulsa el micrófono y habla de nuevo.',
};

// Brave expone la API de reconocimiento, pero no incluye el servicio y siempre falla con «network».
const isBrave = () => typeof globalThis.navigator?.brave?.isBrave === 'function';
const recognitionApi = () => (isBrave() ? null : globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);

export function voiceCapabilities() {
  return {
    recognition: Boolean(recognitionApi()),
    brave: isBrave(),
    synthesis: 'speechSynthesis' in globalThis && 'SpeechSynthesisUtterance' in globalThis,
    secure: globalThis.isSecureContext !== false,
  };
}

const ORDINALS = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];

function spokenTime(_, hour, minute, meridiem) {
  const h = parseInt(hour, 10);
  const pm = meridiem.toLowerCase() === 'p';
  let part = 'de la mañana';
  if (pm) part = h === 12 ? 'del día' : h >= 7 ? 'de la noche' : 'de la tarde';
  else if (h === 12) part = 'de la noche';
  const m = minute ? parseInt(minute, 10) : 0;
  const mins = m === 0 ? '' : m === 30 ? ' y media' : m === 15 ? ' y cuarto' : ` y ${m}`;
  return `${h}${mins} ${part}`;
}

/** Reescribe el texto como se diría en voz alta: horas, listas y siglas sin leer los signos. */
export function speakableText(text) {
  return String(text)
    .replace(/https?:\/\/\S+/g, 'el enlace')
    .replace(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.\s*m\.?/gi, spokenTime)
    .replace(/^[•*-]\s*/gm, '')
    .replace(/^(\d{1,2})\.\s+/gm, (_, n) => `${ORDINALS[parseInt(n, 10) - 1] || n}: `)
    .replace(/\s*\(([^)]+)\)/g, ', $1')
    .replace(/\+(\d)/g, 'más $1')
    .replace(/\bJARVIS\b/g, 'Jarvis')
    .replace(/\bIA\b/g, 'inteligencia artificial')
    .replace(/[«»"]/g, '')
    .replace(/:\s*\n+/g, ': ')
    .replace(/([^.!?:])\s*\n+/g, '$1. ')
    .replace(/\n+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|eddy|flo|fred|good news|grandma|grandpa|jester|junior|kathy|organ|ralph|reed|rocko|sandy|shelley|superstar|trinoids|whisper|wobble|zarvox|abuel[ao])\b/i;
const LATAM = /^es[-_](419|CO|VE|MX|US|AR|CL|PE|EC)/i;

/** Puntúa una voz según lo natural que suele sonar. El navegador no informa la calidad, se deduce del nombre. */
export function rankVoice(voice, lang = 'es-CO') {
  const name = voice.name || '';
  let score = 0;
  if (/natural|neural/i.test(name)) score += 100;
  else if (/premium/i.test(name)) score += 95;
  else if (/siri|enhanced|mejorada/i.test(name)) score += 85;
  else if (/\bonline\b/i.test(name)) score += 80;
  else if (/google/i.test(name)) score += 65;
  if (NOVELTY.test(name)) score -= 60;
  if (/espeak|compact|pico\b/i.test(name)) score -= 40;
  if (voice.localService === false) score += 5;
  const code = (voice.lang || '').replace('_', '-').toLowerCase();
  if (code === lang.toLowerCase()) score += 10;
  else if (LATAM.test(voice.lang || '')) score += 6;
  return score;
}

/** 50 o más significa que la voz probablemente suena natural. */
export const NATURAL_SCORE = 50;

export function voiceTips() {
  const ua = globalThis.navigator?.userAgent || '';
  if (/Android/.test(ua)) return 'Para mejorarla en Android: abre Ajustes, busca «Salida de texto a voz», elige Servicios de voz de Google, instala Español y selecciona una voz. Luego reinicia Chrome.';
  if (/iPhone|iPad|iPod/.test(ua)) return 'Para mejorarla en iPhone: abre Ajustes, Accesibilidad, Contenido leído, Voces, Español, y descarga una voz Mejorada o Premium.';
  if (/Macintosh/.test(ua) && !/Edg\//.test(ua)) return 'Para mejorarla en Mac: abre JARVIS en Microsoft Edge, que suele incluir voces Natural gratuitas, o descarga una voz Mejorada en Ajustes del Sistema, Accesibilidad, Contenido leído. Chrome a veces no muestra las voces descargadas; Safari sí.';
  if (/Edg\//.test(ua)) return 'Busca en la lista una voz con la marca Natural.';
  return 'Para mejorarla: abre JARVIS en Microsoft Edge, que suele incluir voces Natural gratuitas, o instala una voz en español en tu sistema.';
}

function chunk(text, max = 180) {
  const sentences = text.match(/[^.!?:]+[.!?:]*\s*/g) || [text];
  const out = [];
  let cur = '';
  sentences.forEach((s) => {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  });
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function createVoice({ getSettings, onListenChange, onInterim, onFinal, onError, onSpeakChange, onBoundary }) {
  const SR = recognitionApi();
  const caps = voiceCapabilities();
  const synth = caps.synthesis ? globalThis.speechSynthesis : null;
  let rec = null;
  let listening = false;
  let discard = false;
  let finalText = '';
  let speakToken = 0;
  let speaking = false;
  let startWatch = 0;

  function spanishVoices() {
    if (!synth) return [];
    const { lang } = getSettings();
    return synth.getVoices()
      .filter((v) => /^es([-_]|$)/i.test(v.lang))
      .sort((a, b) => rankVoice(b, lang) - rankVoice(a, lang));
  }

  function chooseVoice() {
    const { voiceURI } = getSettings();
    const voices = spanishVoices();
    if (!voices.length) return null;
    return voices.find((v) => v.voiceURI === voiceURI) || voices[0];
  }

  function setSpeaking(value) {
    if (speaking === value) return;
    speaking = value;
    onSpeakChange(value);
  }

  function stopSpeaking() {
    speakToken += 1;
    clearTimeout(startWatch);
    synth?.cancel();
    setSpeaking(false);
  }

  function speak(text) {
    if (!synth) return false;
    stopSpeaking();
    const parts = chunk(speakableText(text));
    if (!parts.length) return false;
    const token = speakToken;
    const settings = getSettings();
    const voice = chooseVoice();

    const finish = () => {
      if (token === speakToken) {
        clearTimeout(startWatch);
        setSpeaking(false);
      }
    };

    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = voice?.lang || settings.lang;
      if (voice) u.voice = voice;
      u.rate = settings.rate;
      u.pitch = settings.pitch;
      u.onstart = () => {
        if (token !== speakToken) return;
        clearTimeout(startWatch);
        setSpeaking(true);
      };
      u.onboundary = () => {
        if (token === speakToken) onBoundary?.();
      };
      u.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') finish();
      };
      if (i === parts.length - 1) u.onend = finish;
      synth.speak(u);
    });

    setSpeaking(true);
    // Algunos navegadores bloquean el audio sin avisar: evita que el reactor se quede en «Respondiendo».
    startWatch = setTimeout(() => {
      if (token === speakToken && !synth.speaking) finish();
    }, 3000);
    return true;
  }

  function startListening() {
    if (!SR) {
      onError(caps.brave
        ? 'Brave no incluye el servicio que convierte tu voz en texto. Para hablarme, abre JARVIS en Edge o Chrome. Aquí puedes escribir tu mensaje.'
        : 'Este navegador no tiene reconocimiento de voz. Usa Edge o Chrome, o escribe tu mensaje.', 'unsupported');
      return false;
    }
    if (!caps.secure) {
      onError('El micrófono solo funciona en una página segura (https). Abre JARVIS desde su dirección https.');
      return false;
    }
    if (listening) return true;
    stopSpeaking();
    rec = new SR();
    rec.lang = getSettings().lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalText = '';
    discard = false;

    rec.onstart = () => {
      listening = true;
      onListenChange(true);
    };
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
      finalText = text.trim();
      onInterim(finalText);
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      discard = true;
      onError(ERRORS[e.error] || `El reconocimiento de voz falló (${e.error}). Puedes escribir tu mensaje.`, e.error);
    };
    rec.onend = () => {
      listening = false;
      onListenChange(false);
      if (!discard && finalText) onFinal(finalText);
      else if (!discard) onInterim('');
      rec = null;
    };

    try {
      rec.start();
      return true;
    } catch {
      onError('No pude iniciar el micrófono. Espera un momento y vuelve a intentarlo.');
      return false;
    }
  }

  /** Detener envía lo que ya se escuchó. */
  function stopListening() {
    rec?.stop();
  }

  let onVoices = null;
  synth?.addEventListener?.('voiceschanged', () => onVoices?.());

  return {
    caps,
    get listening() { return listening; },
    get speaking() { return speaking; },
    spanishVoices,
    chooseVoice,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    set onVoicesChanged(fn) { onVoices = fn; },
  };
}
