import { useState, useCallback } from 'react';
import { startRecognition, stopRecognition, matchChunk, isSpeechSupported } from '../services/speech';

export function useSpeech(chunkPhrase) {
  const [state, setState] = useState('idle'); // idle | recording | processing | done
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText]     = useState('');
  const [matched, setMatched]         = useState(null);
  const [error, setError]             = useState(null);

  const supported = isSpeechSupported();

  const start = useCallback(() => {
    if (!supported) {
      setError('Web Speech API không được hỗ trợ. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    setState('recording');
    setInterimText('');
    setFinalText('');
    setMatched(null);
    setError(null);

    startRecognition({
      lang: 'en-US',
      onInterim: (text) => {
        setInterimText(text);
      },
      onFinal: (text) => {
        setState('processing');
        setFinalText(text);
        setInterimText('');

        setTimeout(() => {
          const result = matchChunk(text, chunkPhrase);
          setMatched(result);
          setState('done');
        }, 400);
      },
      onError: (msg) => {
        setError(msg);
        setState('idle');
      },
    });
  }, [chunkPhrase, supported]);

  const stop = useCallback(() => {
    stopRecognition();
    if (state === 'recording') setState('processing');
  }, [state]);

  const reset = useCallback(() => {
    stopRecognition();
    setState('idle');
    setInterimText('');
    setFinalText('');
    setMatched(null);
    setError(null);
  }, []);

  return { state, interimText, finalText, matched, error, supported, start, stop, reset };
}
