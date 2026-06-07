import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal typing for the Web Speech API, which is not part of the standard DOM
 * lib types. We only declare what we use.
 */
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): { transcript: string };
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(index: number): SpeechRecognitionResultLike;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type UseSpeechToTextOptions = {
  /** Called with each finalized chunk of transcribed speech. */
  onResult: (finalText: string) => void;
  lang?: string;
};

type UseSpeechToTextReturn = {
  isSupported: boolean;
  isListening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
};

/**
 * Browser-native speech-to-text. Transcribes the patient's spoken symptoms and
 * hands finalized text back via `onResult` so the caller can append it to the
 * textarea. Falls back gracefully (isSupported = false) where unavailable.
 */
export function useSpeechToText({
  onResult,
  lang = 'en-GB',
}: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const ctorRef = useRef<SpeechRecognitionCtor | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);

  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (ctorRef.current === null) {
    ctorRef.current = getRecognitionCtor();
  }
  const isSupported = ctorRef.current !== null;

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = ctorRef.current;
    if (!Ctor) return;

    recognitionRef.current?.abort();
    setError(null);
    setInterim('');

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) {
        onResultRef.current(finalText);
      }
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setIsListening(false);
        return;
      }
      const messages: Record<string, string> = {
        'not-allowed':
          'Microphone access was blocked. Check browser permissions and try again.',
        'network':
          'Voice recognition needs an internet connection to Google\u2019s speech servers. You can type instead.',
        'service-not-allowed':
          'Voice recognition isn\u2019t available on this page. You can type instead.',
        'audio-capture':
          'No microphone was found. Check your microphone and try again.',
        'language-not-supported':
          'Voice recognition doesn\u2019t support this language. You can type instead.',
      };
      setError(
        messages[event.error] ??
          `Voice input error (${event.error}). You can type instead.`,
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setError('Could not start voice input. You can type instead.');
      setIsListening(false);
    }
  }, [lang]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, interim, error, start, stop };
}
