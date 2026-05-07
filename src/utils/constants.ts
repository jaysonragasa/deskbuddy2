import { MochiSettings } from '../types';

export const DEFAULT_SETTINGS: MochiSettings = {
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  openWeatherApiKey: '',
  toolsEnabled: true,
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
