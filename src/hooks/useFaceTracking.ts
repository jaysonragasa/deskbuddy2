import { useEffect, useState, useRef } from 'react';

export function useFaceTracking(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 }); // -1 to 1
  const [boundingBox, setBoundingBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setGaze({ x: 0, y: 0 });
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    let isUnmounted = false;
    const loadFaceApiAndStart = async () => {
      try {
        if (!(window as any).faceapi) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
          script.async = true;
          document.head.appendChild(script);
          await new Promise((resolve) => { script.onload = resolve; });
        }

        const faceapi = (window as any).faceapi;
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');

        if (isUnmounted) return;
        setIsLoaded(true);

        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current && !isUnmounted) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error(e);
        setError(String(e));
      }
    };

    loadFaceApiAndStart();

    return () => {
      isUnmounted = true;
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isLoaded) return;
    
    const detectionInterval = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const faceapi = (window as any).faceapi;
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160 })
        );

        if (detection) {
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          const centerX = detection.box.x + (detection.box.width / 2);
          const centerY = detection.box.y + (detection.box.height / 2);

          let normX = (centerX / videoWidth) * 2 - 1;
          let normY = (centerY / videoHeight) * 2 - 1;

          // Dampen and mirror mapping
          normX = Math.max(-1, Math.min(1, normX * 1.5));
          normY = Math.max(-1, Math.min(1, normY * 1.5));

          setGaze({ x: -normX, y: normY });
          setBoundingBox(detection.box);
        } else {
          setBoundingBox(null);
        }
      }
    }, 100);

    return () => clearInterval(detectionInterval);
  }, [enabled, isLoaded]);

  return { videoRef, gaze, boundingBox, error, isLoaded };
}
