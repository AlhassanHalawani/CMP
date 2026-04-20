import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export type CameraErrorType = 'permission_denied' | 'no_camera' | 'camera_error';

interface Props {
  isActive: boolean;
  onDetected: (token: string) => void;
  onError: (errorType: CameraErrorType) => void;
}

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';

export function QrCameraScanner({ isActive, onDetected, onError }: Props) {
  const instanceRef = useRef<Html5Qrcode | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    firedRef.current = false;
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    instanceRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (firedRef.current) return;
          firedRef.current = true;
          onDetected(decodedText);
        },
        () => {},
      )
      .catch((err: unknown) => {
        const msg = String(err).toLowerCase();
        if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
          onError('permission_denied');
        } else if (msg.includes('not found') || msg.includes('no devices') || msg.includes('no camera')) {
          onError('no_camera');
        } else {
          onError('camera_error');
        }
      });

    return () => {
      const s = instanceRef.current;
      instanceRef.current = null;
      if (!s) return;
      (s.isScanning ? s.stop() : Promise.resolve())
        .catch(() => {})
        .finally(() => { try { s.clear(); } catch { /* ignore */ } });
    };
  }, [isActive, onDetected, onError]);

  return (
    <div
      id={SCANNER_ELEMENT_ID}
      className={isActive ? 'w-full rounded-lg overflow-hidden' : 'hidden'}
    />
  );
}
