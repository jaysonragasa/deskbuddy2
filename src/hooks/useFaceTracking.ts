import { useEffect, useState, useRef } from 'react';

export function useFaceTracking(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 }); // -1 to 1
  const [boundingBox, setBoundingBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [recognizedName, setRecognizedName] = useState<string | null>(null);

  const faceMatcherRef = useRef<any>(null);
  const lastDescriptorRef = useRef<Float32Array | null>(null);

  const updateFaceMatcher = () => {
    try {
      const stored = localStorage.getItem('mochiFaces');
      if (stored) {
        const parsed = JSON.parse(stored);
        const faceapi = (window as any).faceapi;
        if (!faceapi) return;
        
        const labeledDescriptors = Object.keys(parsed).map(name => {
          return new faceapi.LabeledFaceDescriptors(
            name,
            [new Float32Array(parsed[name])]
          );
        });
        
        if (labeledDescriptors.length > 0) {
          faceMatcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleRegister = (e: CustomEvent) => {
      const name = e.detail.name;
      if (lastDescriptorRef.current) {
        const stored = JSON.parse(localStorage.getItem('mochiFaces') || '{}');
        stored[name] = Array.from(lastDescriptorRef.current);
        localStorage.setItem('mochiFaces', JSON.stringify(stored));
        updateFaceMatcher();
      }
    };
    window.addEventListener('MOCHI_REGISTER_FACE' as any, handleRegister);
    return () => window.removeEventListener('MOCHI_REGISTER_FACE' as any, handleRegister);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setGaze({ x: 0, y: 0 });
      setBoundingBox(null);
      setRecognizedName(null);
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
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        updateFaceMatcher();

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
    let isActive = true;
    if (!enabled || !isLoaded) return;
    
    // We poll recognize name to not switch wildly
    const recognizedCounts: Record<string, number> = {};

    const detectionInterval = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const faceapi = (window as any).faceapi;
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160 })
        ).withFaceLandmarks().withFaceDescriptor();

        if (!isActive) return;

        if (detection) {
          lastDescriptorRef.current = detection.descriptor;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          const centerX = detection.detection.box.x + (detection.detection.box.width / 2);
          const centerY = detection.detection.box.y + (detection.detection.box.height / 2);

          let normX = (centerX / videoWidth) * 2 - 1;
          let normY = (centerY / videoHeight) * 2 - 1;

          // Dampen and mirror mapping
          normX = Math.max(-1, Math.min(1, normX * 1.5));
          normY = Math.max(-1, Math.min(1, normY * 1.5));

          setGaze({ x: -normX, y: normY });
          setBoundingBox(detection.detection.box);

          if (faceMatcherRef.current) {
            const match = faceMatcherRef.current.findBestMatch(detection.descriptor);
            if (match.label !== 'unknown') {
              setRecognizedName(match.label);
            } else {
              setRecognizedName(null);
            }
          }
        } else {
          setGaze({ x: 0, y: 0 });
          setBoundingBox(null);
          setRecognizedName(null);
        }
      }
    }, 100);

    return () => {
      isActive = false;
      clearInterval(detectionInterval);
    };
  }, [enabled, isLoaded]);

  return { videoRef, gaze, boundingBox, error, isLoaded, recognizedName };
}
