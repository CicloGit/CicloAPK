import React, { useMemo, useRef, useState } from 'react';

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

interface VoiceCommandPanelProps {
  title?: string;
  hints?: string[];
  onCommand: (command: string) => void;
  className?: string;
}

const VoiceCommandPanel: React.FC<VoiceCommandPanelProps> = ({
  title = 'Comandos por voz',
  hints = [],
  onCommand,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const recognitionSupported = useMemo(
    () => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  const stopListening = () => {
    setIsListening(false);
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    setVoiceError(null);
    if (!recognitionSupported) {
      setVoiceError('Reconhecimento de voz nao suportado neste navegador.');
      return;
    }

    try {
      const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!RecognitionCtor) {
        setVoiceError('Reconhecimento de voz indisponivel.');
        return;
      }

      const recognition = new RecognitionCtor();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        const result = event.results?.[event.resultIndex];
        const transcript = result?.[0]?.transcript ? String(result[0].transcript).trim() : '';
        if (!transcript) {
          return;
        }
        setLastCommand(transcript);
        onCommand(transcript);
      };
      recognition.onerror = (event: any) => {
        const detail = event?.error ? String(event.error) : 'erro desconhecido';
        setVoiceError(`Falha no reconhecimento de voz: ${detail}.`);
      };
      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Falha ao iniciar reconhecimento de voz.');
      setIsListening(false);
    }
  };

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-3 space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <div className="flex gap-2">
          {!isListening && (
            <button
              type="button"
              onClick={startListening}
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
            >
              Ouvir comando
            </button>
          )}
          {isListening && (
            <button
              type="button"
              onClick={stopListening}
              className="px-3 py-1.5 rounded-md bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Parar
            </button>
          )}
        </div>
      </div>
      {hints.length > 0 && (
        <p className="text-[11px] text-slate-500">
          Exemplos: {hints.slice(0, 4).join(' | ')}
        </p>
      )}
      {isListening && (
        <p className="text-[11px] text-emerald-700">Escutando... fale um comando para abrir aba ou preencher campos.</p>
      )}
      {lastCommand && (
        <p className="text-[11px] text-indigo-700">
          Ultimo comando: <strong>{lastCommand}</strong>
        </p>
      )}
      {voiceError && <p className="text-[11px] text-red-700">{voiceError}</p>}
    </div>
  );
};

export default VoiceCommandPanel;
