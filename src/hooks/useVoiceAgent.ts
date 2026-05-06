import { useState, useRef, useEffect } from 'react';
import { Emotion } from '../types';

export function useVoiceAgent(ollamaUrl: string, ollamaModel: string) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('IDLE');
  const [statusText, setStatusText] = useState('Idle');
  const [log, setLog] = useState<{ role: 'user' | 'mochi', text: string }[]>([]);
  const logRef = useRef<{ role: 'user' | 'mochi', text: string }[]>([]);

  useEffect(() => {
    logRef.current = log;
  }, [log]);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // Pre-load voices on mount to avoid silent first utterance
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusText('Speech Recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatusText('Listening...');
    };

    recognition.onresult = async (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim();
      if (transcript) {
        setLog(prev => [...prev, { role: 'user', text: transcript }]);
        await handleTranscription(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setStatusText(`Mic Error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch(e) {}
      } else {
        setIsListening(false);
        setStatusText('Microphone off');
      }
    };

    recognitionRef.current = recognition;
    return () => {
      recognitionRef.current?.stop();
    };
  }, []); // Bind once to avoid restart loops, use refs where needed

  const submitMessage = async (text: string) => {
    setLog(prev => [...prev, { role: 'user', text }]);
    await handleTranscription(text);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
      setStatusText('Microphone off');
    } else {
      // Initialize speech synthesis on user interaction
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }

      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTranscription = async (text: string) => {
    setStatusText('Thinking...');
    
    // Stop listening temporarily whilst processing & speaking to avoid feedback loop
    recognitionRef.current?.stop();

    try {
      const formattedUrl = ollamaUrl.endsWith('/') ? ollamaUrl.slice(0, -1) : ollamaUrl;
      
      const systemPrompt = `You are Mochi, a lively cute visual face assistant. Keep answers short (1-2 sentences max). 

CRITICAL INSTRUCTIONS:
1. You MUST ALWAYS start your response with EXACTLY ONE of these emotion tags : [IDLE], [HAPPY], [SAD], [ANGRY], [SURPRISED], [WINK], [SKEPTICAL], [AMAZED], [SCARED]
2. DO NOT use any other emotion tags (e.g. do not use [AFFECTIONATE]).
3. DO NOT output any markdown actions like *smiles* or *neutral expression*.
4. Respond with ONLY the emotion tag followed by what you want to say.`;
      
      // logRef has the state up to the LAST render.
      // Because submitMessage and onresult call setLog AND handleTranscription synchronously,
      // logRef MIGHT not have the latest user text yet. 
      // But wait! submitMessage/onresult adds the user message to log. We can map whatever is in logRef.current 
      // (which doesn't include the NEW message yet because state update is async),
      // and then manually add the NEW user message.
      const history = logRef.current.map(entry => ({
        role: entry.role === 'mochi' ? 'assistant' : 'user',
        content: entry.text
      }));

      // Add the new message
      history.push({ role: 'user', content: `User said: "${text}"\n\nMochi says:` });

      // Keep only last 10 messages to avoid huge prompts
      const recentHistory = history.slice(-10);

      const res = await fetch(`${formattedUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel || 'llama3',
          messages: [
            { role: 'system', content: systemPrompt },
            ...recentHistory
          ],
          stream: false
        })
      });

      if (!res.ok) throw new Error('Ollama HTTP error');

      const data = await res.json();
      const responseText = data.message?.content || data.response || '';

      let nextEmotion: Emotion = 'IDLE';
      const tags: Emotion[] = ['IDLE', 'HAPPY', 'SAD', 'ANGRY', 'SURPRISED', 'WINK', 'SKEPTICAL', 'AMAZED', 'SCARED'];
      let cleanText = responseText;

      for (const tag of tags) {
        const bracketTag = `[${tag}]`;
        if (cleanText.includes(bracketTag)) {
          nextEmotion = tag;
          cleanText = cleanText.replace(bracketTag, '').trim();
          break;
        }
      }

      // Fallback: strip any remaining [UNSUPPORTED_TAGS] and *markdown actions*
      cleanText = cleanText.replace(/\[[A-Z_]+\]/g, '').trim();
      cleanText = cleanText.replace(/\*.*?\*/g, '').trim();

      setCurrentEmotion(nextEmotion);
      setLog(prev => [...prev, { role: 'mochi', text: cleanText }]);
      speakText(cleanText);

    } catch (e) {
      console.error(e);
      setStatusText('Ollama connection failed.');
      // ensure we restart listening if we failed
      if (isListeningRef.current) {
         try { recognitionRef.current?.start(); } catch(e){}
      }
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('speechSynthesis not supported');
      return;
    }
    
    console.log('Attempting to speak:', text);
    window.speechSynthesis.cancel(); // Cancel any pending utterances to avoid getting stuck
    
    // Sometimes JS garbage collects utterances, keep a global reference
    (window as any).__mochi_utterance = new SpeechSynthesisUtterance(text);
    const utterance = (window as any).__mochi_utterance;

    // Use default voice explicitly to prevent some browser silent failures
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Find a suitable english voice or fallback
      const voice = voices.find(v => v.name.includes('Google') || v.lang.includes('en')) || voices[0];
      if (voice) utterance.voice = voice;
    }

    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1.2;

    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
      setStatusText('Speaking...');
    };

    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
      setCurrentEmotion('IDLE');
      if (isListeningRef.current) {
        setStatusText('Listening...');
        try { recognitionRef.current?.start(); } catch(e){}
      } else {
        setStatusText('Idle');
      }
    };

    utterance.onerror = (e: any) => {
      console.error('Speech error', e);
      setIsSpeaking(false);
      setCurrentEmotion('IDLE');
      if (isListeningRef.current) {
         setStatusText('Listening...');
         try { recognitionRef.current?.start(); } catch(err){}
      } else {
         setStatusText('Idle');
      }
    };

    // Chrome workaround for paused state
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  };

  return { toggleListening, isListening, isSpeaking, currentEmotion, statusText, log, handleTranscription, submitMessage };
}
