import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

const UNITS = {
  hundred: 100,
  thousand: 1000,
  lac: 100000,
  lakh: 100000,
  lakhs: 100000,
  crore: 10000000,
  crores: 10000000,
};

const BASIC = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

function parseNumberWords(text) {
  const words = text.toLowerCase()
    .replace(/,/g, '')
    .replace(/[-]/g, ' ')
    .replace(/\b(?:rupees?|rs\.?|inr)\b/g, '')
    .replace(/\b(and)\b/g, '')
    .replace(/[^\w\s.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let current = 0;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (BASIC[word] !== undefined) {
      current += BASIC[word];
    } else if (word === 'a' && words[i + 1] === 'hundred') {
      current += 1;
    } else if (UNITS[word]) {
      const unit = UNITS[word];
      if (unit === 100) {
        current = (current || 1) * 100;
      } else {
        total += (current || 1) * unit;
        current = 0;
      }
    } else if (word === 'point') {
      const decimalWords = [];
      let j = i + 1;
      while (j < words.length && BASIC[words[j]] !== undefined) {
        const digit = BASIC[words[j]];
        if (digit >= 0 && digit <= 9) decimalWords.push(String(digit));
        j += 1;
      }
      if (decimalWords.length > 0) {
        current += Number(`0.${decimalWords.join('')}`);
        i = j - 1;
      }
      break;
    }
  }
  return total + current;
}

function parseGroupedNumericOffer(transcript) {
  const contextMatch = transcript.match(
    /\b(?:my\s+)?(?:offer|salary|budget|price|allocation)\b(?:\s+(?:is|of|at|for))?\s+(.+?)(?=\b(?:because|since|due\s+to|as)\b|$)/i,
  );
  const candidate = contextMatch ? contextMatch[1] : transcript;

  const numericMatch = candidate.match(
    /(?:rs\.?|rupees?|inr)?\s*((?:\d+(?:[,\s]+\d+)*))(?:\.(\d+))?\s*(crores?|lakhs?|lac|thousand|k)?\b/i,
  );
  if (!numericMatch) return null;

  const groupedInteger = numericMatch[1].replace(/[,\s]/g, '');
  const decimalPart = numericMatch[2];
  if (!/^\d+$/.test(groupedInteger)) return null;

  let value = Number(`${groupedInteger}${decimalPart ? `.${decimalPart}` : ''}`);
  const unit = numericMatch[3]?.toLowerCase();
  if (unit === 'crore' || unit === 'crores') value *= 10000000;
  if (unit === 'lakh' || unit === 'lakhs' || unit === 'lac') value *= 100000;
  if (unit === 'thousand' || unit === 'k') value *= 1000;

  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseOfferNumber(transcript) {
  if (!transcript || typeof transcript !== 'string') return null;

  const groupedNumeric = parseGroupedNumericOffer(transcript);
  if (groupedNumeric !== null) return groupedNumeric;

  const wordDecimalMatch = transcript.match(
    /\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[\s-]+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))*)\s+point\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(thousand|lakhs?|crores?)\b/i,
  );
  if (wordDecimalMatch) {
    const whole = parseNumberWords(wordDecimalMatch[1]);
    const fractionWord = wordDecimalMatch[2];
    const fraction = BASIC[fractionWord] ?? 0;
    let value = whole + fraction / 10;
    const unit = wordDecimalMatch[3].toLowerCase();
    if (unit.startsWith('lakh')) value *= 100000;
    else if (unit.startsWith('crore')) value *= 10000000;
    else value *= 1000;
    return Number.isFinite(value) ? value : null;
  }

  const offerPhrase = transcript.match(
    /(?:my\s+)?(?:offer|salary|budget|price|allocation|is|at|for)\s+(.+?)(?:\b(?:because|as|since|due to|for delivery|for the|with)\b|$)/i,
  );
  const candidate = offerPhrase ? offerPhrase[1] : transcript;
  const cleaned = candidate
    .replace(/\b(?:rupees?|rs\.?|inr|final|my|offer|is|at|for|the)\b/gi, ' ')
    .trim();

  if (!/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lakhs|lac|crore|crores|point)\b/i.test(cleaned)) {
    return null;
  }

  const value = parseNumberWords(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function extractVoiceOffer(transcript) {
  if (!transcript) return { offer: null, reasoning: '' };
  const offer = parseOfferNumber(transcript);
  if (offer === null) {
    return { offer: null, reasoning: transcript.trim() };
  }

  const explanation = transcript.match(/\b(?:because|since|due\s+to|as)\b\s*(.+)$/i);
  const reasoning = explanation
    ? explanation[1].replace(/[.!?]+\s*$/g, '').replace(/\s+/g, ' ').trim()
    : '';
  return { offer, reasoning };
}

export function reconstructFinalTranscript(results, resultIndex = 0) {
  if (!results || typeof results.length !== 'number') return '';

  const finalParts = [];
  for (let index = resultIndex; index < results.length; index += 1) {
    const result = results[index];
    if (result?.isFinal) {
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) finalParts.push(transcript);
    }
  }
  return finalParts.join(' ').replace(/\s+/g, ' ').trim();
}

export default function VoiceInputController({
  isDark = false,
  disabled = false,
  offerFields = [],
  onOfferResult,
  className = '',
}) {
  const recognitionRef = useRef(null);
  const finalResultMapRef = useRef(new Map());
  const processedFinalRef = useRef(false);
  const recognitionFailedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setNotice('Voice recognition stopped.');
      return;
    }
    if (recognitionRef.current) {
      setNotice('Voice recognition is already active.');
      return;
    }
    if (!Array.isArray(offerFields) || offerFields.length === 0) {
      setNotice('Voice offer entry is unavailable because this scenario has no offer fields.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice('Voice input is not supported in this browser. Try Google Chrome.');
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      finalResultMapRef.current = new Map();
      processedFinalRef.current = false;
      recognitionFailedRef.current = false;
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setNotice('Listening... Speak your offer and rationale.');
      };
      recognition.onresult = (event) => {
        const resultIndex = Number.isInteger(event.resultIndex) ? event.resultIndex : 0;
        let interimTranscript = '';

        for (let index = 0; index < event.results.length; index += 1) {
          const speechResult = event.results[index];
          const transcript = speechResult?.[0]?.transcript?.trim();
          if (!transcript) continue;

          if (speechResult.isFinal) {
            finalResultMapRef.current.set(index, transcript);
          } else if (index >= resultIndex) {
            interimTranscript = `${interimTranscript} ${transcript}`.trim();
          }
        }
        if (interimTranscript) {
          setNotice(`Listening: "${interimTranscript}"`);
        }
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        recognitionFailedRef.current = true;
        recognitionRef.current = null;
        const messages = {
          'not-allowed': 'Microphone permission denied.',
          'service-not-allowed': 'Speech recognition permission is not available.',
          'audio-capture': 'No microphone was found.',
          'network': 'The recognition service is unavailable.',
          'no-speech': 'No speech was detected. Please try again.',
        };
        setNotice(messages[event.error] || 'Voice recognition encountered an error.');
      };
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        if (recognitionFailedRef.current) return;
        const finalTranscript = Array.from(finalResultMapRef.current.entries())
          .sort(([a], [b]) => a - b)
          .map(([, transcript]) => transcript)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!finalTranscript) {
          setNotice('No speech was recognized. Please try again.');
          return;
        }
        if (processedFinalRef.current) return;

        const primaryField = offerFields[0];
        const result = extractVoiceOffer(finalTranscript);
        if (!primaryField) {
          setNotice('Voice offer entry is unavailable because this scenario has no offer fields.');
        } else if (result.offer === null) {
          setNotice(`Heard: "${finalTranscript}" - no valid offer number found.`);
        } else {
          processedFinalRef.current = true;
          onOfferResult?.({
            field: primaryField,
            offer: result.offer,
            reasoning: result.reasoning,
            transcript: finalTranscript,
          });
          setNotice(`Heard: "${finalTranscript}"`);
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
      setNotice('Voice recognition could not start. Please try again.');
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 ${
          isListening
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse shadow-[0_0_18px_rgba(244,63,94,0.35)]'
            : isDark
            ? 'bg-slate-900 border-slate-800 text-indigo-400 hover:text-white hover:border-indigo-500/40'
            : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
        }`}
        title="Speak to dictate a negotiated offer"
      >
        {isListening ? <MicOff className="w-3.5 h-3.5 animate-bounce" /> : <Mic className="w-3.5 h-3.5" />}
        <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
      </button>
      {notice && (
        <div className="mt-2 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
