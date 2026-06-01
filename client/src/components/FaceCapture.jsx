import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import { useFaceDetection } from '../hooks/useFaceDetection';

export default function FaceCapture({ onVerified, onSkip, allowSkip = true, title = 'Face Verification' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [camError, setCamError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const { loadModel, detectFace, isModelLoaded, isLoading, faceDetected, error: modelError } = useFaceDetection();

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraActive(true);
      setCamError('');
    } catch {
      setCamError('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    clearInterval(intervalRef.current);
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (cameraActive && isModelLoaded && videoRef.current) {
      intervalRef.current = setInterval(async () => {
        const { detected, embedding } = await detectFace(videoRef.current);
        setScanCount((c) => c + 1);
        if (detected) {
          clearInterval(intervalRef.current);
          setVerifying(true);
          setTimeout(() => {
            stopCamera();
            setVerifying(false);
            onVerified(true, embedding);
          }, 1000);
        }
      }, 500);
    }
    return () => clearInterval(intervalRef.current);
  }, [cameraActive, isModelLoaded, detectFace, onVerified, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="attendance-card">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="text-blue-600" size={18} />
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">TensorFlow.js</span>
      </div>

      {modelError && (
        <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg mb-2">{modelError}</div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Loader className="animate-spin" size={14} /> Loading face detection model...
        </div>
      )}

      <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3', maxHeight: 200 }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="text-gray-600" size={40} />
          </div>
        )}
        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-32 h-36 border-2 rounded-3xl transition-colors ${faceDetected ? 'border-green-400' : 'border-white/50'}`} style={{ boxShadow: faceDetected ? '0 0 20px rgba(74,222,128,0.5)' : 'none' }} />
          </div>
        )}
        {verifying && (
          <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
            <CheckCircle className="text-green-400" size={48} />
          </div>
        )}
      </div>

      {camError && <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg mb-2 flex items-center gap-1"><AlertCircle size={12} />{camError}</div>}

      {cameraActive && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full animate-pulse ${faceDetected ? 'bg-green-500' : 'bg-orange-400'}`} />
          {faceDetected ? 'Face detected — verifying...' : `Scanning for face... (${scanCount})`}
        </div>
      )}

      <div className="flex gap-2">
        {!cameraActive ? (
          <button onClick={startCamera} disabled={isLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Camera size={16} /> {isModelLoaded ? 'Start Face Scan' : 'Loading...'}
          </button>
        ) : (
          <button onClick={stopCamera} className="btn-secondary flex-1">Stop Camera</button>
        )}
        {allowSkip !== false && (
          <button onClick={() => { stopCamera(); onSkip(); }} className="btn-secondary flex items-center gap-1 text-xs">
            Skip
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">Face verification adds an extra layer of security</p>
    </div>
  );
}
