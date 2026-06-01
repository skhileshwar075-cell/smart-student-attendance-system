import { useState, useRef, useCallback } from 'react';

let tf;
let blazeface;

function normalizePoint(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max === 0) return 0;
  return Math.min(Math.max(value / max, 0), 1);
}

function extractFaceEmbedding(face, width = 1, height = 1) {
  if (!face || typeof face !== 'object') return null;
  const embedding = [];
  const box = {
    xMin: Array.isArray(face.topLeft) ? face.topLeft[0] : 0,
    yMin: Array.isArray(face.topLeft) ? face.topLeft[1] : 0,
    xMax: Array.isArray(face.bottomRight) ? face.bottomRight[0] : 0,
    yMax: Array.isArray(face.bottomRight) ? face.bottomRight[1] : 0,
  };
  embedding.push(normalizePoint(box.xMin, width));
  embedding.push(normalizePoint(box.yMin, height));
  embedding.push(normalizePoint(box.xMax - box.xMin, width));
  embedding.push(normalizePoint(box.yMax - box.yMin, height));
  if (Array.isArray(face.landmarks) && face.landmarks.length > 0) {
    face.landmarks.slice(0, 16).forEach((kp) => {
      embedding.push(normalizePoint(kp[0] || 0, width));
      embedding.push(normalizePoint(kp[1] || 0, height));
    });
  }
  return embedding;
}

export function useFaceDetection() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState('');
  const detectorRef = useRef(null);

  const loadModel = useCallback(async () => {
    if (detectorRef.current || isLoading) return;
    setIsLoading(true);
    try {
      if (!tf) {
        tf = await import('@tensorflow/tfjs');
        await import('@tensorflow/tfjs-backend-webgl');
      }
      if (!blazeface) {
        blazeface = await import('@tensorflow-models/blazeface');
      }

      await tf.setBackend('webgl');
      await tf.ready();

      detectorRef.current = await blazeface.load();
      setIsModelLoaded(true);
    } catch (err) {
      const message = err?.message || 'Failed to load face detection model';
      setError(`Failed to load face detection model: ${message}`);
      console.error('Face detection load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const detectFace = useCallback(async (videoElement) => {
    if (!detectorRef.current || !videoElement) return { detected: false, embedding: null };
    try {
      const faces = await detectorRef.current.estimateFaces(videoElement, false);
      const detected = Array.isArray(faces) && faces.length > 0;
      setFaceDetected(detected);
      if (!detected) return { detected: false, embedding: null };
      const embedding = extractFaceEmbedding(faces[0], videoElement.videoWidth || videoElement.width, videoElement.videoHeight || videoElement.height);
      return { detected, embedding };
    } catch (err) {
      console.error('Face detection error:', err);
      return { detected: false, embedding: null };
    }
  }, []);

  return { loadModel, detectFace, isModelLoaded, isLoading, faceDetected, error };
}
