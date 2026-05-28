export type Emotion = 'IDLE' | 'HAPPY' | 'SAD' | 'ANGRY' | 'SURPRISED' | 'WINK' | 'SKEPTICAL' | 'AMAZED' | 'SCARED';

export interface LogEntry {
  role: 'user' | 'mochi' | 'system';
  text: string;
}

export interface MochiSettings {
  ollamaUrl: string;
  ollamaModel: string;
  openWeatherApiKey: string;
  toolsEnabled: boolean;
  faceTrackingEnabled: boolean;
  voiceEnabled: boolean;
  manualEmotion: Emotion | 'AUTO';
  eyeScale: number;
  eyeWidthScale: number;
  eyeHeightScale: number;
  gazeScale: number;
  showMouth: boolean;
  faceColor: string;
  faceGlow: boolean;
  eyeDistance: number;
  mouthYOffset: number;
  showVideoStream: boolean;
  flipVideoStream: boolean;
  idleEmotionTimeout: number;
  sleepTimeout: number;
  isSidebarOpen: boolean;
  showSubtitles: boolean;
  showClockFace: boolean;
}
