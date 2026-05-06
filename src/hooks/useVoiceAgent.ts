import { useState, useRef, useEffect } from 'react';
import { Emotion } from '../types';

export function useVoiceAgent(ollamaUrl: string, ollamaModel: string) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('IDLE');
  const [statusText, setStatusText] = useState('Idle');
  const [log, setLog] = useState<{ role: 'user' | 'mochi', text: string }[]>([]);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
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

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
      setStatusText('Microphone off');
    } else {
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
      const res = await fetch(`${formattedUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel || 'llama3',
          prompt: `You are Mochi, a lively cute visual face assistant. Keep answers short (1-2 sentences max). You must ALWAYS prefix your response with precisely one of these tags: [IDLE], [HAPPY], [SAD], [ANGRY], [SURPRISED].\n\nUser said: "${text}"\n\nMochi says:`,
          stream: false
        })
      });

      if (!res.ok) throw new Error('Ollama HTTP error');

      const data = await res.json();
      const responseText = data.response;

      let nextEmotion: Emotion = 'IDLE';
      const tags: Emotion[] = ['IDLE', 'HAPPY', 'SAD', 'ANGRY', 'SURPRISED'];
      let cleanText = responseText;

      for (const tag of tags) {
        const bracketTag = `[${tag}]`;
        if (responseText.includes(bracketTag)) {
          nextEmotion = tag;
          cleanText = responseText.replace(bracketTag, '').trim();
          break;
        }
      }

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
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusText('Speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentEmotion('IDLE');
      if (isListeningRef.current) {
        setStatusText('Listening...');
        try { recognitionRef.current?.start(); } catch(e){}
      } else {
        setStatusText('Idle');
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (isListeningRef.current) {
         setStatusText('Listening...');
         try { recognitionRef.current?.start(); } catch(e){}
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  return { toggleListening, isListening, isSpeaking, currentEmotion, statusText, log };
}
