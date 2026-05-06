import { useState, useEffect, useRef, MouseEvent } from 'react';
import { Settings, Mic, MicOff, Camera, Video, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RefreshCw, Maximize, Minimize, MessageSquare, MessageSquareOff } from 'lucide-react';
import { MochiFace } from './components/MochiFace';
import { MochiSettings } from './types';
import { useFaceTracking } from './hooks/useFaceTracking';
import { useVoiceAgent } from './hooks/useVoiceAgent';

const DEFAULT_SETTINGS: MochiSettings = {
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  faceTrackingEnabled: false,
  voiceEnabled: false,
  manualEmotion: 'AUTO',
  eyeScale: 1.0,
  eyeWidthScale: 1.0,
  eyeHeightScale: 1.0,
  gazeScale: 25.0,
  showMouth: true,
  faceColor: '#3b82f6',
  faceGlow: true,
  eyeDistance: 1.0,
  mouthYOffset: 0,
  showVideoStream: false,
  flipVideoStream: true,
  idleEmotionTimeout: 5,
  sleepTimeout: 30,
  isSidebarOpen: true,
  showSubtitles: true
};

export default function App() {
  const [openAccordion, setOpenAccordion] = useState<string>('features');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

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
  
  const [settings, setSettings] = useState<MochiSettings>(() => {
    const saved = localStorage.getItem('mochiSettings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch(e) {}
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('mochiSettings', JSON.stringify(settings));
  }, [settings]);

  const toggleAccordion = (section: string) => {
    setOpenAccordion(prev => prev === section ? '' : section);
  };

  const { videoRef, gaze, boundingBox, error: faceError, isLoaded: faceLoaded } = useFaceTracking(settings.faceTrackingEnabled);
  const { toggleListening, isListening, isSpeaking, currentEmotion, statusText, log, handleTranscription, submitMessage } = useVoiceAgent(settings.ollamaUrl, settings.ollamaModel);

  const [idleState, setIdleState] = useState<'ACTIVE' | 'IDLE_RANDOM' | 'SLEEPING'>('ACTIVE');
  const [randomEmotion, setRandomEmotion] = useState<any>('IDLE');
  const [isWakingUp, setIsWakingUp] = useState(false);
  const wakeUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTime = useRef<number>(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [isSubtitleVisible, setIsSubtitleVisible] = useState(false);

  useEffect(() => {
    if (isSpeaking) {
      setIsSubtitleVisible(true);
    } else {
      const timer = setTimeout(() => setIsSubtitleVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking]);

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
      document.exitFullscreen();
    }
  };

  const handleWakeUp = () => {
    if (idleState === 'SLEEPING') {
      setIsWakingUp(true);
      if (wakeUpTimeoutRef.current) clearTimeout(wakeUpTimeoutRef.current);
      wakeUpTimeoutRef.current = setTimeout(() => setIsWakingUp(false), 2000);
    }
    lastActiveTime.current = Date.now();
    setIdleState('ACTIVE');
  };

  const isTranscribingOrSpeaking = statusText === 'Thinking...' || statusText === 'Speaking...';
  const hasFace = boundingBox !== null;
  const isBusy = isTranscribingOrSpeaking || hasFace;

  useEffect(() => {
    if (isBusy) {
      handleWakeUp();
    }
  }, [isBusy, idleState]);

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
        // Change random emotion every few seconds if in IDLE_RANDOM
        if (Math.random() < 0.2) {
          const emotions = ['IDLE', 'HAPPY', 'SAD', 'SURPRISED', 'WINK', 'SKEPTICAL'];
          setRandomEmotion(emotions[Math.floor(Math.random() * emotions.length)]);
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
                 : idleState === 'SLEEPING'
                     ? 'IDLE' // We'll pass isSleeping so eyes are closed
                     : 'IDLE';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black text-gray-100 font-sans overflow-hidden relative">
      {/* Sidebar Config */}
      <div 
        className={`w-full md:w-80 bg-gray-900 flex-shrink-0 border-r border-gray-800 flex flex-col p-6 overflow-y-auto shadow-xl transition-all duration-300 h-full z-20 absolute md:relative top-0 left-0 ${settings.isSidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:translate-x-0 md:-ml-80'}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
             <Settings className="w-6 h-6 text-blue-400" /> Mochi AI
          </h1>
          <button 
            onClick={() => setSettings(s => ({ ...s, isSidebarOpen: false }))}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-4">
           <button 
             className="w-full flex justify-between items-center text-sm font-semibold text-gray-400 uppercase tracking-wider py-2"
             onClick={() => toggleAccordion('features')}
           >
             Features
             {openAccordion === 'features' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
           </button>
           
           {openAccordion === 'features' && (
             <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
               <button
                 onClick={() => setSettings(s => ({...s, faceTrackingEnabled: !s.faceTrackingEnabled}))}
                 className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${settings.faceTrackingEnabled ? 'bg-blue-900/40 border-blue-500/50 text-blue-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
               >
                 {settings.faceTrackingEnabled ? <Camera className="w-5 h-5"/> : <Video className="w-5 h-5 opacity-50"/>}
                 <div className="text-left">
                   <div className="font-medium">Face Tracking</div>
                   <div className="text-xs opacity-70">Eyes follow your face</div>
                 </div>
               </button>

               {settings.faceTrackingEnabled && (
                   <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 space-y-4">
                       <div>
                           <div className="flex justify-between mb-1">
                             <label className="text-xs font-medium text-gray-400">Eye Movement Focus</label>
                             <span className="text-xs text-gray-500">{settings.gazeScale.toFixed(0)}x</span>
                           </div>
                           <input
                               type="range"
                               min="10"
                               max="100"
                               step="1"
                               value={settings.gazeScale}
                               onChange={(e) => setSettings(s => ({...s, gazeScale: parseFloat(e.target.value)}))}
                               className="w-full accent-blue-500"
                           />
                       </div>
                       
                       <div className="flex items-center justify-between">
                         <label className="text-xs font-medium text-gray-400">Show Video Stream</label>
                         <button 
                             onClick={() => setSettings(s => ({...s, showVideoStream: !s.showVideoStream}))}
                             className={`w-8 h-4 rounded-full relative transition-colors ${settings.showVideoStream ? 'bg-blue-600' : 'bg-gray-700'}`}
                         >
                             <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${settings.showVideoStream ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>
                       </div>

                       <div className="flex items-center justify-between">
                         <label className="text-xs font-medium text-gray-400">Flip Video Stream</label>
                         <button 
                             onClick={() => setSettings(s => ({...s, flipVideoStream: !s.flipVideoStream}))}
                             className={`w-8 h-4 rounded-full relative transition-colors ${settings.flipVideoStream ? 'bg-blue-600' : 'bg-gray-700'}`}
                         >
                             <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${settings.flipVideoStream ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>
                       </div>
                   </div>
               )}

               <button
                 onClick={toggleListening}
                 className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${isListening ? 'bg-red-900/40 border-red-500/50 text-red-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
               >
                 {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 opacity-50" />}
                 <div className="text-left">
                   <div className="font-medium">Voice Chat</div>
                   <div className="text-xs opacity-70">{statusText}</div>
                 </div>
               </button>
               {faceError && <p className="text-red-400 text-xs">Vision Error: {faceError}</p>}
             </div>
           )}
        </div>

        <div className="space-y-4 mb-4">
           <button 
             className="w-full flex justify-between items-center text-sm font-semibold text-gray-400 uppercase tracking-wider py-2"
             onClick={() => toggleAccordion('appearance')}
           >
             Appearance
             {openAccordion === 'appearance' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
           </button>
           
           {openAccordion === 'appearance' && (
             <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
               <div>
                   <label className="block text-xs font-medium mb-1 text-gray-400">Face Color</label>
                   <input
                       type="color"
                       value={settings.faceColor}
                       onChange={(e) => setSettings(s => ({...s, faceColor: e.target.value}))}
                       className="w-full h-10 rounded cursor-pointer bg-gray-900 border border-gray-700"
                   />
               </div>
               <div className="flex items-center justify-between py-2 border-b border-gray-800">
                 <label className="text-xs font-medium text-gray-400">Glow Effect</label>
                 <button 
                     onClick={() => setSettings(s => ({...s, faceGlow: !s.faceGlow}))}
                     className={`w-10 h-6 rounded-full relative transition-colors ${settings.faceGlow ? 'bg-blue-600' : 'bg-gray-700'}`}
                 >
                     <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.faceGlow ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
               </div>
               <div className="flex items-center justify-between py-2 border-b border-gray-800">
                 <label className="text-xs font-medium text-gray-400">Show Mouth</label>
                 <button 
                     onClick={() => setSettings(s => ({...s, showMouth: !s.showMouth}))}
                     className={`w-10 h-6 rounded-full relative transition-colors ${settings.showMouth ? 'bg-blue-600' : 'bg-gray-700'}`}
                 >
                     <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.showMouth ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
               </div>
               <div>
                   <div className="flex justify-between mb-1">
                     <label className="text-xs font-medium text-gray-400">Face Scale</label>
                     <span className="text-xs text-gray-500">{settings.eyeScale.toFixed(1)}x</span>
                   </div>
                   <input
                       type="range"
                       min="0.5"
                       max="2.0"
                       step="0.1"
                       value={settings.eyeScale}
                       onChange={(e) => setSettings(s => ({...s, eyeScale: parseFloat(e.target.value)}))}
                       className="w-full accent-blue-500"
                   />
               </div>
               <div>
                   <div className="flex justify-between mb-1 mt-4">
                     <label className="text-xs font-medium text-gray-400">Eye Width</label>
                     <span className="text-xs text-gray-500">{settings.eyeWidthScale.toFixed(1)}x</span>
                   </div>
                   <input
                       type="range"
                       min="0.5"
                       max="2.0"
                       step="0.1"
                       value={settings.eyeWidthScale}
                       onChange={(e) => setSettings(s => ({...s, eyeWidthScale: parseFloat(e.target.value)}))}
                       className="w-full accent-blue-500"
                   />
               </div>
               <div>
                   <div className="flex justify-between mb-1 mt-4">
                     <label className="text-xs font-medium text-gray-400">Eye Height</label>
                     <span className="text-xs text-gray-500">{settings.eyeHeightScale.toFixed(1)}x</span>
                   </div>
                   <input
                       type="range"
                       min="0.5"
                       max="2.0"
                       step="0.1"
                       value={settings.eyeHeightScale}
                       onChange={(e) => setSettings(s => ({...s, eyeHeightScale: parseFloat(e.target.value)}))}
                       className="w-full accent-blue-500"
                   />
               </div>
               <div>
                   <div className="flex justify-between mb-1 mt-4">
                     <label className="text-xs font-medium text-gray-400">Eye Distance</label>
                     <span className="text-xs text-gray-500">{settings.eyeDistance.toFixed(1)}x</span>
                   </div>
                   <input
                       type="range"
                       min="0.5"
                       max="2.0"
                       step="0.1"
                       value={settings.eyeDistance}
                       onChange={(e) => setSettings(s => ({...s, eyeDistance: parseFloat(e.target.value)}))}
                       className="w-full accent-blue-500"
                   />
               </div>
               {settings.showMouth && (
                 <div>
                     <div className="flex justify-between mb-1 mt-4">
                       <label className="text-xs font-medium text-gray-400">Mouth Distance (Y)</label>
                       <span className="text-xs text-gray-500">{settings.mouthYOffset}px</span>
                     </div>
                     <input
                         type="range"
                         min="-100"
                         max="100"
                         step="5"
                         value={settings.mouthYOffset}
                         onChange={(e) => setSettings(s => ({...s, mouthYOffset: parseFloat(e.target.value)}))}
                         className="w-full accent-blue-500"
                     />
                 </div>
               )}
             </div>
           )}
        </div>

        <div className="space-y-4 mb-4">
           <button 
             className="w-full flex justify-between items-center text-sm font-semibold text-gray-400 uppercase tracking-wider py-2"
             onClick={() => toggleAccordion('idle')}
           >
             Idle Behavior
             {openAccordion === 'idle' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
           </button>
           
           {openAccordion === 'idle' && (
             <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
               <div>
                   <div className="flex justify-between mb-1">
                     <label className="text-xs font-medium text-gray-400">Random Emotion Timeout</label>
                     <span className="text-xs text-gray-500">{settings.idleEmotionTimeout}s</span>
                   </div>
                   <input
                       type="range"
                       min="2"
                       max="60"
                       step="1"
                       value={settings.idleEmotionTimeout}
                       onChange={(e) => setSettings(s => ({...s, idleEmotionTimeout: parseInt(e.target.value)}))}
                       className="w-full accent-blue-500"
                   />
               </div>
               <div>
                   <div className="flex justify-between mb-1 mt-4">
                     <label className="text-xs font-medium text-gray-400">Sleep Timeout</label>
                     <span className="text-xs text-gray-500">{settings.sleepTimeout}s</span>
                   </div>
                   <input
                       type="range"
                       min="5"
                       max="300"
                       step="5"
                       value={settings.sleepTimeout}
                       onChange={(e) => setSettings(s => ({...s, sleepTimeout: parseInt(e.target.value)}))}
                       className="w-full accent-blue-500"
                   />
               </div>
             </div>
           )}
        </div>

        <div className="space-y-4 mb-4">
           <button 
             className="w-full flex justify-between items-center text-sm font-semibold text-gray-400 uppercase tracking-wider py-2"
             onClick={() => toggleAccordion('ollama')}
           >
             Ollama Setup
             {openAccordion === 'ollama' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
           </button>
           
           {openAccordion === 'ollama' && (
             <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
               <div>
                   <label className="block text-xs font-medium mb-1 text-gray-400">Ollama API URL</label>
                   <input
                       type="text"
                       spellCheck={false}
                       value={settings.ollamaUrl}
                       onChange={(e) => setSettings(s => ({...s, ollamaUrl: e.target.value}))}
                       className="w-full text-sm p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500"
                       placeholder="http://localhost:11434"
                   />
               </div>
               <div>
                   <div className="flex justify-between items-end mb-1">
                       <label className="block text-xs font-medium text-gray-400">Model Name</label>
                       <button 
                           onClick={fetchOllamaModels} 
                           disabled={isFetchingModels}
                           className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                       >
                           <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                           Refresh Models
                       </button>
                   </div>
                   {availableModels.length > 0 ? (
                       <select
                           value={settings.ollamaModel}
                           onChange={(e) => setSettings(s => ({...s, ollamaModel: e.target.value}))}
                           className="w-full text-sm p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-gray-900 border-gray-700 text-gray-100"
                       >
                           {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                   ) : (
                       <input
                           type="text"
                           spellCheck={false}
                           value={settings.ollamaModel}
                           onChange={(e) => setSettings(s => ({...s, ollamaModel: e.target.value}))}
                           className="w-full text-sm p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500"
                           placeholder="llama3"
                       />
                   )}
                   {modelFetchError && <p className="text-red-400 text-xs mt-1">{modelFetchError}</p>}
               </div>
               <div className="pt-2 border-t border-gray-800">
                   <label className="block text-xs font-medium mb-1 text-gray-400">Test Message</label>
                   <div className="flex gap-2">
                     <input
                         type="text"
                         value={testMessage}
                         onChange={(e) => setTestMessage(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && testMessage.trim()) {
                             submitMessage(testMessage);
                             setTestMessage('');
                           }
                         }}
                         className="flex-1 text-sm p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500"
                         placeholder="Say hello..."
                     />
                     <button
                         onClick={() => {
                           if (testMessage.trim()) {
                             submitMessage(testMessage);
                             setTestMessage('');
                           }
                         }}
                         disabled={!testMessage.trim()}
                         className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                     >
                       Send
                     </button>
                   </div>
               </div>
               <p className="text-xs text-amber-400 bg-amber-900/20 p-3 rounded-lg border border-amber-800/30 leading-relaxed">
                  If Ollama sits on HTTP but this app is on HTTPS, your browser might block the mic or network requests. Run Ollama with <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-300 font-semibold">OLLAMA_ORIGINS="*"</code>
               </p>
             </div>
           )}
        </div>

        <div className="space-y-4 mb-4">
           <button 
             className="w-full flex justify-between items-center text-sm font-semibold text-gray-400 uppercase tracking-wider py-2"
             onClick={() => toggleAccordion('emotion')}
           >
             Emotion Override
             {openAccordion === 'emotion' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
           </button>
           
           {openAccordion === 'emotion' && (
             <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                 {['AUTO', 'IDLE', 'HAPPY', 'SAD', 'ANGRY', 'SURPRISED', 'WINK', 'SKEPTICAL', 'AMAZED', 'SCARED'].map((emo) => (
                     <button
                         key={emo}
                         onClick={() => setSettings(s => ({...s, manualEmotion: emo as any}))}
                         className={`p-2 text-xs font-medium tracking-wide rounded-lg border transition-all ${settings.manualEmotion === emo ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'}`}
                     >
                         {emo}
                     </button>
                 ))}
             </div>
           )}
        </div>

        <div className="mt-auto bg-gray-900 rounded-xl p-4 border border-gray-700 text-xs flex-shrink-0">
            <h3 className="font-bold mb-3 text-gray-300">Chat Log</h3>
            <div className="max-h-48 overflow-y-auto">
              {log.length === 0 ? (
                  <span className="text-gray-500 block pb-2">No history yet. Start speaking!</span>
              ) : (
                 <div className="space-y-3">
                    {log.map((l, i) => (
                        <div key={i} className={`${l.role === 'user' ? 'text-blue-400' : 'text-gray-300'} leading-relaxed`}>
                            <strong className="block mb-0.5 opacity-80">{l.role === 'user' ? 'You' : 'Mochi'}:</strong> 
                            {l.text}
                        </div>
                    ))}
                 </div>
              )}
            </div>
        </div>
      </div>

      {/* Main UI Stage */}
      <div 
        className="flex-1 relative flex items-center justify-center p-8 bg-black overflow-hidden cursor-pointer"
        onClick={handleWakeUp}
      >
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setSettings(s => ({ ...s, isSidebarOpen: !s.isSidebarOpen }))}
          className={`absolute top-6 left-6 z-10 p-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all shadow-lg border border-gray-700 ${settings.isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Toggle Fullscreen Button */}
        <button 
          onClick={toggleFullscreen}
          className="absolute top-6 right-6 z-10 p-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all shadow-lg border border-gray-700 opacity-100"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>

        {/* Toggle Subtitles Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setSettings(s => ({ ...s, showSubtitles: !s.showSubtitles })); }}
          className="absolute top-6 right-20 z-10 p-3 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all shadow-lg border border-gray-700 opacity-100"
        >
          {settings.showSubtitles ? <MessageSquare className="w-5 h-5" /> : <MessageSquareOff className="w-5 h-5" />}
        </button>
        
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
        />

        {/* Text dialogue */}
        {settings.showSubtitles && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 max-w-2xl w-full flex flex-col items-center gap-3 pointer-events-none z-10 px-4">
             {log.filter(e => e.role === 'mochi').slice(-1).map((entry, index) => (
               <div 
                 key={index} 
                 className={`px-8 py-4 rounded-3xl bg-black/80 backdrop-blur-md text-white font-medium text-center text-xl w-auto max-w-full shadow-2xl transition-opacity duration-500 ease-in-out ${isSubtitleVisible ? 'opacity-100' : 'opacity-0'}`}
                 style={{ textShadow: '0 0 12px rgba(255,255,255,0.7)' }}
               >
                 {entry.text}
               </div>
             ))}
          </div>
        )}

        {/* Debug Video stream view (visible when face tracking is active) */}
        <div className={`absolute bottom-6 right-6 w-48 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-4 border-white transition-all duration-500 origin-bottom-right overflow-hidden bg-black ${settings.faceTrackingEnabled && settings.showVideoStream ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
          <div className="relative w-full h-full aspect-[4/3]">
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
          </div>
        </div>
      </div>
    </div>
  );
}
