import React, { SetStateAction } from 'react';
import { MochiSettings, LogEntry } from '../types';
import { ChevronDown, ChevronUp, RefreshCw, Camera, Video, Mic, MicOff, X } from 'lucide-react';

interface SettingsPanelProps {
  settings: MochiSettings;
  setSettings: React.Dispatch<SetStateAction<MochiSettings>>;
  isFetchingModels: boolean;
  availableModels: string[];
  modelFetchError: string | null;
  fetchOllamaModels: () => Promise<void>;
  openAccordion: string;
  toggleAccordion: (section: string) => void;
  SettingsIcon: any;
  log: LogEntry[];
  testMessage: string;
  setTestMessage: (val: string) => void;
  submitMessage: (val: string) => void;
  isListening: boolean;
  toggleListening: () => void;
  statusText: string;
  faceError: string | null;
}

export function SettingsPanel({
  settings,
  setSettings,
  isFetchingModels,
  availableModels,
  modelFetchError,
  fetchOllamaModels,
  openAccordion,
  toggleAccordion,
  SettingsIcon,
  log,
  testMessage,
  setTestMessage,
  submitMessage,
  isListening,
  toggleListening,
  statusText,
  faceError
}: SettingsPanelProps) {
  return (
    <div 
      className={`w-full md:w-80 bg-gray-900 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden shadow-xl transition-all duration-300 h-full z-50 absolute md:relative top-0 left-0 ${settings.isSidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:translate-x-0 md:-ml-80'}`}
    >
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2 text-white">
           <SettingsIcon className="w-5 h-5 text-blue-400" /> Mochi AI
        </h1>
        <button 
          onClick={(e) => { e.stopPropagation(); setSettings(s => ({...s, isSidebarOpen: false})); }}
          className="p-2 sm:p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-md"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
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
               <div className="flex items-center justify-between py-2 border-b border-gray-800">
                 <label className="text-xs font-medium text-gray-400">Show Clock Face</label>
                 <button 
                     onClick={() => setSettings(s => ({...s, showClockFace: !s.showClockFace}))}
                     className={`w-10 h-6 rounded-full relative transition-colors ${settings.showClockFace ? 'bg-blue-600' : 'bg-gray-700'}`}
                 >
                     <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.showClockFace ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
               </div>
               <div className="flex items-center justify-between py-2 border-b border-gray-800">
                 <label className="text-xs font-medium text-gray-400">Keep Screen Awake</label>
                 <button 
                     onClick={() => setSettings(s => ({...s, keepAwake: !s.keepAwake}))}
                     className={`w-10 h-6 rounded-full relative transition-colors ${settings.keepAwake ? 'bg-blue-600' : 'bg-gray-700'}`}
                 >
                     <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.keepAwake ? 'translate-x-4' : 'translate-x-0'}`} />
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
             Agent Setup
             {openAccordion === 'ollama' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
           </button>
           
           {openAccordion === 'ollama' && (
             <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
               <div className="flex items-center justify-between py-2 border-b border-gray-800">
                 <label className="text-xs font-medium text-gray-400">Enable Tools</label>
                 <button 
                     onClick={() => setSettings(s => ({...s, toolsEnabled: !s.toolsEnabled}))}
                     className={`w-10 h-6 rounded-full relative transition-colors ${settings.toolsEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                 >
                     <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.toolsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
               </div>
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
               
               <div>
                   <label className="block text-xs font-medium mb-1 text-gray-400">OpenWeather API Key</label>
                   <input
                       type="password"
                       spellCheck={false}
                       value={settings.openWeatherApiKey}
                       onChange={(e) => setSettings(s => ({...s, openWeatherApiKey: e.target.value}))}
                       className="w-full text-sm p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500"
                       placeholder="xxxxxxxxxxxxxx"
                   />
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

        <div className="mt-8 bg-gray-900 rounded-xl p-4 border border-gray-700 text-xs flex-shrink-0">
            <h3 className="font-bold mb-3 text-gray-300">Chat Log</h3>
            <div className="max-h-48 overflow-y-auto">
              {log.length === 0 ? (
                  <span className="text-gray-500 block pb-2">No history yet. Start speaking!</span>
              ) : (
                 <div className="space-y-3">
                    {log.map((l, i) => (
                        <div key={i} className={`${l.role === 'user' ? 'text-blue-400' : l.role === 'system' ? 'text-amber-400' : 'text-gray-300'} leading-relaxed`}>
                            <strong className="block mb-0.5 opacity-80">{l.role === 'user' ? 'You' : l.role === 'system' ? 'System' : 'Mochi'}:</strong> 
                            {l.text}
                        </div>
                    ))}
                 </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
