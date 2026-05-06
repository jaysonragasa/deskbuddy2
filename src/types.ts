export type Emotion = 'IDLE' | 'HAPPY' | 'SAD' | 'ANGRY' | 'SURPRISED' | 'WINK' | 'SKEPTICAL' | 'AMAZED' | 'SCARED';

export interface MochiSettings {
  ollamaUrl: string;
  ollamaModel: string;
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
}
