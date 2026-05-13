import { useState, useEffect, useRef, MouseEvent } from 'react';
import { Settings, Mic, MicOff, Maximize, Minimize, MessageSquare, MessageSquareOff } from 'lucide-react';
import { MochiFace } from './components/MochiFace';
import { MochiSettings, Emotion } from './types';
import { useFaceTracking } from './hooks/useFaceTracking';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import { DEFAULT_SETTINGS } from './utils/constants';
import { SettingsPanel } from './components/SettingsPanel';

export default function App() {
  const [openAccordion, setOpenAccordion] = useState<string>('features');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

  const [settings, setSettings] = useState<MochiSettings>(() => {
    const saved = localStorage.getItem('mochiSettings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch(e) {}
    }
    return DEFAULT_SETTINGS;
  });

  const fetchOllamaModels = async () => {
    setIsFetchingModels(true);
    setModelFetchError(null);
    try {
      const url = settings.ollamaUrl.replace(/\/$/, '') + '/api/tags';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.models) {
        setAvailableModels(data.models.map((m: any) => m.name));
      } else {
        setAvailableModels([]);
      }
    } catch (e: any) {
      setModelFetchError(e.message || 'Failed to fetch models');
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('mochiSettings', JSON.stringify(settings));
  }, [settings]);

  const toggleAccordion = (section: string) => {
    setOpenAccordion(prev => prev === section ? '' : section);
  };

  const { videoRef, gaze, boundingBox, error: faceError, isLoaded: faceLoaded, recognizedName } = useFaceTracking(settings.faceTrackingEnabled);
  const { toggleListening, isListening, isSpeaking, currentEmotion, statusText, log, handleTranscription, submitMessage } = useVoiceAgent(settings.ollamaUrl, settings.ollamaModel, settings.toolsEnabled);

  const lastGreetedName = useRef<string | null>(null);

  // When recognizedName changes and we have a valid name, we can greet them
  useEffect(() => {
    if (recognizedName && recognizedName !== lastGreetedName.current) {
      lastGreetedName.current = recognizedName;
      
      // Wake up if sleeping
      if (idleState === 'SLEEPING') {
        setIsWakingUp(true);
        if (wakeUpTimeoutRef.current) clearTimeout(wakeUpTimeoutRef.current);
        wakeUpTimeoutRef.current = setTimeout(() => {
          setIsWakingUp(false);
          setIdleState('ACTIVE');
          lastActiveTime.current = Date.now();
        }, 2000);
      } else {
        setIdleState('ACTIVE');
        lastActiveTime.current = Date.now();
      }
      
      submitMessage(`System Context: Mochi just recognized the user named ${recognizedName}. Greet them happily in a short sentence.`);
    } else if (!recognizedName) {
      // Set a small timeout so we don't clear the last greeted name immediately from a flicker
      const timeoutId = setTimeout(() => {
        lastGreetedName.current = null;
      }, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [recognizedName]);

  const [idleState, setIdleState] = useState<'ACTIVE' | 'IDLE_RANDOM' | 'SLEEPING'>('ACTIVE');
  const [randomEmotion, setRandomEmotion] = useState<any>('IDLE');
  const [isWakingUp, setIsWakingUp] = useState(false);
  const wakeUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTime = useRef<number>(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCameraMaximized, setIsCameraMaximized] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [isSubtitleVisible, setIsSubtitleVisible] = useState(false);

  useEffect(() => {
    // Show subtitles if speaking or if the last message in log is from mochi
    const lastEntry = log[log.length - 1];
    const hasRecentMochiMessage = lastEntry && lastEntry.role === 'mochi';
    
    if (isSpeaking || hasRecentMochiMessage) {
      setIsSubtitleVisible(true);
    }
    
    if (!isSpeaking) {
      const timer = setTimeout(() => setIsSubtitleVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, log]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = (e: MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const isBusy = isListening || isSpeaking || currentEmotion !== 'IDLE' || settings.manualEmotion !== 'AUTO' || statusText === 'Thinking...' || statusText.startsWith('Running tool');

  useEffect(() => {
    if (isBusy) {
      lastActiveTime.current = Date.now();
      setIdleState('ACTIVE');
      setIsWakingUp(false);
      if (wakeUpTimeoutRef.current) clearTimeout(wakeUpTimeoutRef.current);
    }
  }, [isBusy]);

  const handleWakeUp = () => {
    // Initialize speech synthesis on user interaction to unblock audio
    if ('speechSynthesis' in window && !isListening && !isSpeaking) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }

    if (idleState === 'SLEEPING' && settings.manualEmotion === 'AUTO') {
      setIsWakingUp(true);
      if (wakeUpTimeoutRef.current) clearTimeout(wakeUpTimeoutRef.current);
      wakeUpTimeoutRef.current = setTimeout(() => {
        setIsWakingUp(false);
        setIdleState('ACTIVE');
        lastActiveTime.current = Date.now();
      }, 2000);
    } else {
      lastActiveTime.current = Date.now();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (isBusy) {
        lastActiveTime.current = now;
        return;
      }
      
      const secondsSinceActive = (now - lastActiveTime.current) / 1000;
      
      if (secondsSinceActive > settings.sleepTimeout) {
        if (idleState !== 'SLEEPING') {
          setIdleState('SLEEPING');
        }
      } else if (secondsSinceActive > settings.idleEmotionTimeout) {
        if (idleState !== 'IDLE_RANDOM') {
          setIdleState('IDLE_RANDOM');
        }
        if (Math.random() < 0.2) {
          const idles: Emotion[] = ['IDLE', 'HAPPY', 'WINK', 'SKEPTICAL', 'IDLE'];
          setRandomEmotion(idles[Math.floor(Math.random() * idles.length)]);
        }
      } else {
        if (idleState !== 'ACTIVE') {
          setIdleState('ACTIVE');
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isBusy, idleState, settings.sleepTimeout, settings.idleEmotionTimeout]);

  const displayedEmotion = settings.manualEmotion !== 'AUTO'
      ? settings.manualEmotion
      : isWakingUp
          ? 'AMAZED'
          : currentEmotion !== 'IDLE' 
              ? currentEmotion 
              : idleState === 'IDLE_RANDOM'
                  ? randomEmotion 
                  : 'IDLE';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black text-gray-100 font-sans overflow-hidden relative">
      <SettingsPanel 
        settings={settings}
        setSettings={setSettings}
        isFetchingModels={isFetchingModels}
        availableModels={availableModels}
        modelFetchError={modelFetchError}
        fetchOllamaModels={fetchOllamaModels}
        openAccordion={openAccordion}
        toggleAccordion={toggleAccordion}
        SettingsIcon={Settings}
        log={log}
        testMessage={testMessage}
        setTestMessage={setTestMessage}
        submitMessage={submitMessage}
        isListening={isListening}
        toggleListening={toggleListening}
        statusText={statusText}
        faceError={faceError}
      />
      
      {/* Main View */}
      <div 
        className="flex-1 relative flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
        onClick={handleWakeUp}
      >
        <button 
          onClick={() => setSettings(s => ({ ...s, isSidebarOpen: !s.isSidebarOpen }))}
          className={`absolute top-6 left-6 z-10 p-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all shadow-lg border border-gray-700 ${settings.isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Settings className="w-5 h-5" />
        </button>

        <button 
          onClick={(e) => toggleFullscreen(e as any)}
          className="absolute top-6 right-6 z-10 p-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all shadow-lg border border-gray-700 opacity-100"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); setSettings(s => ({ ...s, showSubtitles: !s.showSubtitles })); }}
          className="absolute top-6 right-20 z-10 p-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all shadow-lg border border-gray-700 opacity-100"
        >
          {settings.showSubtitles ? <MessageSquare className="w-5 h-5" /> : <MessageSquareOff className="w-5 h-5" />}
        </button>
        
        <div className="relative z-10 w-full flex-1 flex items-center justify-center pointer-events-none">
          <MochiFace
              gaze={gaze}
              emotion={displayedEmotion}
              isSpeaking={isSpeaking}
              scale={settings.eyeScale}
              eyeWidthScale={settings.eyeWidthScale}
              eyeHeightScale={settings.eyeHeightScale}
              gazeScale={settings.gazeScale}
              showMouth={settings.showMouth}
              faceColor={settings.faceColor}
              faceGlow={settings.faceGlow}
              eyeDistance={settings.eyeDistance}
              mouthYOffset={settings.mouthYOffset}
              isSleeping={idleState === 'SLEEPING' && settings.manualEmotion === 'AUTO'}
              isWakingUp={isWakingUp}
              isIdleRandom={idleState === 'IDLE_RANDOM' && settings.manualEmotion === 'AUTO'}
          />
        </div>

        {settings.showSubtitles && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 max-w-2xl w-full flex flex-col items-center gap-3 pointer-events-none z-10 px-4">
             {log.filter(e => e.role === 'mochi').slice(-1).map((entry, index) => (
               <div 
                 key={index} 
                 className={`px-8 py-4 text-white font-medium text-center text-xl w-auto max-w-full transition-opacity duration-500 ease-in-out ${isSubtitleVisible ? 'opacity-100' : 'opacity-0'}`}
                 style={{ textShadow: '0 0 20px rgba(255,255,255,1), 0 0 10px rgba(255,255,255,0.8)' }}
               >
                 {entry.text}
               </div>
             ))}
          </div>
        )}

        <div className={`absolute transition-all duration-500 origin-bottom-right overflow-hidden bg-black ${
          settings.faceTrackingEnabled && settings.showVideoStream ? 'opacity-100 scale-100 block' : 'opacity-0 scale-90 pointer-events-none'
        } ${
          isCameraMaximized 
            ? 'inset-0 w-full h-full rounded-none border-none z-0' 
            : 'bottom-6 right-6 w-48 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-4 border-white z-20 hover:scale-105'
        }`}>
          <div className={`relative w-full h-full ${!isCameraMaximized ? 'aspect-[4/3]' : ''}`}>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsCameraMaximized(!isCameraMaximized); }}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors z-20 border border-white/20"
                title={isCameraMaximized ? "Minimize Camera" : "Maximize Camera"}
              >
                {isCameraMaximized ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: settings.flipVideoStream ? 'scaleX(-1)' : 'none' }}
              />
              {boundingBox && faceLoaded && videoRef.current && (
                  <div 
                    className="absolute border-2 border-green-500 rounded pointer-events-none z-10"
                    style={{
                      left: `${(settings.flipVideoStream ? (videoRef.current.videoWidth - boundingBox.x - boundingBox.width) : boundingBox.x) / videoRef.current.videoWidth * 100}%`,
                      top: `${boundingBox.y / videoRef.current.videoHeight * 100}%`,
                      width: `${boundingBox.width / videoRef.current.videoWidth * 100}%`,
                      height: `${boundingBox.height / videoRef.current.videoHeight * 100}%`,
                    }}
                  />
              )}
              {recognizedName && (
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {recognizedName}
                </div>
              )}
          </div>
          {faceError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
                  <p className="text-red-400 text-xs text-center">{faceError}</p>
              </div>
          )}
        </div>

      </div>
    </div>
  );
}
