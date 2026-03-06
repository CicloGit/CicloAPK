import React, { useEffect, useMemo, useRef, useState } from 'react';

type ScannerMode = 'ANY' | 'QR_ONLY' | 'BARCODE_ONLY';

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string; format?: string }>>;
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructorLike;
  }
}

interface CodeScannerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: ScannerMode;
  helperText?: string;
  className?: string;
}

const MODE_FORMATS: Record<ScannerMode, string[]> = {
  ANY: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'],
  QR_ONLY: ['qr_code'],
  BARCODE_ONLY: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'],
};

const CodeScannerField: React.FC<CodeScannerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  mode = 'ANY',
  helperText,
  className = '',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [isScanningImage, setIsScanningImage] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const detectingRef = useRef(false);

  const requestedFormats = useMemo(() => MODE_FORMATS[mode], [mode]);

  const stopScanning = () => {
    activeRef.current = false;
    setIsScanning(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectingRef.current = false;
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const resolveDetector = async (): Promise<BarcodeDetectorLike> => {
    const detectorCtor = window.BarcodeDetector;
    if (!detectorCtor) {
      throw new Error('Leitura por camera indisponivel neste navegador.');
    }

    let formats = [...requestedFormats];
    if (typeof detectorCtor.getSupportedFormats === 'function') {
      const supported = await detectorCtor.getSupportedFormats();
      const filtered = formats.filter((format) => supported.includes(format));
      if (filtered.length > 0) {
        formats = filtered;
      }
    }

    return new detectorCtor(formats.length > 0 ? { formats } : undefined);
  };

  const detectFromSource = async (source: ImageBitmapSource): Promise<string | null> => {
    if (!detectorRef.current) {
      detectorRef.current = await resolveDetector();
    }
    const codes = await detectorRef.current.detect(source);
    const match = codes.find((item) => typeof item.rawValue === 'string' && item.rawValue.trim().length > 0);
    return match?.rawValue?.trim() ?? null;
  };

  const scanLoop = async () => {
    if (!activeRef.current || !videoRef.current) {
      return;
    }

    if (detectingRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        void scanLoop();
      });
      return;
    }

    const video = videoRef.current;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(() => {
        void scanLoop();
      });
      return;
    }

    detectingRef.current = true;
    try {
      const code = await detectFromSource(video);
      if (code) {
        onChange(code);
        setScanHint(`Codigo detectado: ${code}`);
        stopScanning();
        return;
      }
    } catch (error) {
      setScannerError(error instanceof Error ? error.message : 'Falha na leitura pela camera.');
      stopScanning();
      return;
    } finally {
      detectingRef.current = false;
    }

    rafRef.current = requestAnimationFrame(() => {
      void scanLoop();
    });
  };

  const startCameraScanning = async () => {
    setScannerError(null);
    setScanHint(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera nao disponivel neste dispositivo.');
      }

      detectorRef.current = await resolveDetector();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      streamRef.current = stream;
      activeRef.current = true;
      setIsScanning(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(() => {
        void scanLoop();
      });
    } catch (error) {
      setScannerError(error instanceof Error ? error.message : 'Nao foi possivel iniciar leitura por camera.');
      stopScanning();
    }
  };

  const handleImageScan = async (file: File | null) => {
    if (!file) {
      return;
    }

    setScannerError(null);
    setScanHint(null);
    setIsScanningImage(true);
    try {
      detectorRef.current = await resolveDetector();
      const bitmap = await createImageBitmap(file);
      const code = await detectFromSource(bitmap);
      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }
      if (!code) {
        throw new Error('Nenhum codigo detectado na imagem enviada.');
      }
      onChange(code);
      setScanHint(`Codigo detectado na imagem: ${code}`);
    } catch (error) {
      setScannerError(error instanceof Error ? error.message : 'Falha ao ler codigo pela imagem.');
    } finally {
      setIsScanningImage(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm text-slate-700 space-y-1 block">
        <span>{label}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full p-2 border border-slate-300 rounded-md bg-white"
          placeholder={placeholder || 'Digite ou escaneie o codigo'}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {!isScanning && (
          <button
            type="button"
            onClick={() => void startCameraScanning()}
            className="px-3 py-2 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
          >
            Ler pela camera
          </button>
        )}
        {isScanning && (
          <button
            type="button"
            onClick={stopScanning}
            className="px-3 py-2 rounded-md bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800"
          >
            Parar camera
          </button>
        )}
        <label className="px-3 py-2 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 bg-white cursor-pointer hover:bg-slate-50">
          {isScanningImage ? 'Lendo imagem...' : 'Ler por imagem'}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleImageScan(file);
              event.target.value = '';
            }}
            className="hidden"
          />
        </label>
      </div>
      {isScanning && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2">
          <video ref={videoRef} className="w-full max-h-48 rounded border border-indigo-100 bg-black/80" muted playsInline />
          <p className="text-[11px] text-indigo-700 mt-1">
            Aponte a camera para o QR ou codigo de barras para leitura automatica.
          </p>
        </div>
      )}
      {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
      {scanHint && <p className="text-[11px] text-emerald-700">{scanHint}</p>}
      {scannerError && <p className="text-[11px] text-red-700">{scannerError}</p>}
    </div>
  );
};

export default CodeScannerField;
