import { useState, useRef, useCallback } from 'react';

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
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const faceDetection = await import('@tensorflow-models/face-detection');
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      detectorRef.current = await faceDetection.createDetector(model, {
        runtime: 'tfjs',
        maxFaces: 1,
      });
      setIsModelLoaded(true);
    } catch (err) {
      setError('Failed to load face detection model');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const detectFace = useCallback(async (videoElement) => {
    if (!detectorRef.current || !videoElement) return false;
    try {
      const faces = await detectorRef.current.estimateFaces(videoElement);
      const detected = faces.length > 0;
      setFaceDetected(detected);
      return detected;
    } catch (err) {
      console.error('Face detection error:', err);
      return false;
    }
  }, []);

  return { loadModel, detectFace, isModelLoaded, isLoading, faceDetected, error };
}
