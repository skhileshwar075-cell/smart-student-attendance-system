import React, { useRef, useEffect, useState } from 'react';
import { Camera, XCircle, Loader, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';

export default function QRScanner({ onDetected, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Waiting for QR code...');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        streamRef.current = stream;
        setCameraReady(true);
        setError('');
      } catch (err) {
        setError('Unable to access camera. Please allow camera permissions.');
      }
    };
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;

    intervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height);
      if (code?.data) {
        setStatus('QR code detected. Processing...');
        clearInterval(intervalRef.current);
        onDetected(code.data);
      }
    }, 300);

    return () => clearInterval(intervalRef.current);
  }, [cameraReady, onDetected]);

  return (
    <div className="attendance-card">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="text-blue-600" size={18} />
        <h3 className="font-semibold text-gray-700">QR Scanner</h3>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg mb-2 flex items-center gap-1">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3', maxHeight: 320 }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {!cameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader className="animate-spin text-white" size={28} />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/60 rounded-3xl" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400">{status}</p>
        <button onClick={onCancel} className="btn-secondary text-xs py-2 px-3">
          <XCircle size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
