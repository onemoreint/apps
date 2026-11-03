// Voz con las tecnologías del navegador. Detecta qué hay disponible y explica los límites.

const ERRORS = {
  'not-allowed': 'El navegador no tiene permiso para usar el micrófono. Actívalo en los ajustes del sitio y vuelve a intentarlo.',
  'service-not-allowed': 'Este navegador o dispositivo no permite el reconocimiento de voz aquí. Puedes escribir tu mensaje.',
  'audio-capture': 'No detecto un micrófono. Revisa que esté conectado y disponible.',
  network: 'El reconocimiento de voz necesita internet y no pudo conectarse. Puedes escribir tu mensaje.',
  'language-not-supported': 'Este navegador no reconoce el acento elegido. Cambia el idioma en Configuración.',
  'no-speech': 'No escuché nada. Pulsa el micrófono y habla de nuevo.',
};

export function voiceCapabilities() {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  return {
    recognition: Boolean(SR),
    synthesis: 'speechSynthesis' in globalThis && 'SpeechSynthesisUtterance' in globalThis,
    secure: globalThis.isSecureContext !== false,
  };
}

/** Quita elementos visuales para que suenen bien al leerlos. */
export function speakableText(text) {
  return String(text)
    .replace(/https?:\/\/\S+/g, 'enlace')
    .replace(/^[•*-]\s*/gm, '')
    .replace(/^(\d+)\.\s+/gm, '$1: ')
    .replace(/[«»"]/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\.\s*\./g, '.')
    .trim();
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
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
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
    return synth.getVoices().filter((v) => /^es([-_]|$)/i.test(v.lang));
  }

  function chooseVoice() {
    const { voiceURI, lang } = getSettings();
    const voices = spanishVoices();
    if (!voices.length) return null;
    return voices.find((v) => v.voiceURI === voiceURI)
      || voices.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
      || voices.find((v) => /419|CO|MX|US|VE/i.test(v.lang))
      || voices[0];
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
      onError('Este navegador no tiene reconocimiento de voz. Usa Chrome o Edge, o escribe tu mensaje.');
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
