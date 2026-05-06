import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Emotion } from '../types';

interface Props {
  gaze: { x: number; y: number }; // -1 to 1
  emotion: Emotion;
  isSpeaking: boolean;
  scale?: number;
  eyeWidthScale?: number;
  eyeHeightScale?: number;
  gazeScale?: number;
  showMouth?: boolean;
  faceColor?: string;
  faceGlow?: boolean;
  eyeDistance?: number;
  mouthYOffset?: number;
  isSleeping?: boolean;
  isWakingUp?: boolean;
}

export function MochiFace({ 
  gaze, 
  emotion, 
  isSpeaking, 
  scale = 1.0, 
  eyeWidthScale = 1.0, 
  eyeHeightScale = 1.0, 
  gazeScale = 25.0, 
  showMouth = true,
  faceColor = '#3b82f6',
  faceGlow = true,
  eyeDistance = 1.0,
  mouthYOffset = 0,
  isSleeping = false,
  isWakingUp = false
}: Props) {
  const [idleGaze, setIdleGaze] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  // Blinking animation
  useEffect(() => {
    let timeoutId: number;
    const blink = () => {
      setIsBlinking(true);
      window.setTimeout(() => setIsBlinking(false), 150);
      timeoutId = window.setTimeout(blink, Math.random() * 4000 + 2000);
    };
    timeoutId = window.setTimeout(blink, 2000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Idle wandering gaze animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        setIdleGaze({
          x: (Math.random() - 0.5) * 0.4,
          y: (Math.random() - 0.5) * 0.4
        });
      } else {
        setIdleGaze({ x: 0, y: 0 }); // reset occasionally
      }
    }, 1500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const hasActiveGaze = Math.abs(gaze.x) > 0.01 || Math.abs(gaze.y) > 0.01;
  const actualGaze = {
    x: hasActiveGaze ? gaze.x : idleGaze.x,
    y: hasActiveGaze ? gaze.y : idleGaze.y,
  };

  const pupilX = actualGaze.x * gazeScale;
  const pupilY = actualGaze.y * gazeScale;

  const getEyeProps = (isLeft: boolean) => {
    let baseWidth = emotion === 'AMAZED' || emotion === 'SCARED' ? 100 : 80;
    let baseHeight = emotion === 'AMAZED' || emotion === 'SCARED' ? 100 : (emotion === 'SURPRISED' ? 90 : 80);
    let rx = emotion === 'AMAZED' || emotion === 'SCARED' ? 50 : 24;

    if (isSleeping) {
      baseWidth = 80;
      baseHeight = 6;
      rx = 3;
    } else if (isBlinking || (isLeft && emotion === 'WINK')) {
      baseHeight = 8;
      rx = 4;
    } else if (isLeft && emotion === 'SKEPTICAL') {
      baseHeight = 40;
    }

    const width = baseWidth * eyeWidthScale;
    const height = baseHeight * eyeHeightScale;
    
    // Maintain vertical center based on original coordinate mapping
    let baseY = -40;
    if (isSleeping) baseY = 0;
    else if (isBlinking || (isLeft && emotion === 'WINK')) baseY = -4;
    else if (isLeft && emotion === 'SKEPTICAL') baseY = -20;
    else if (emotion === 'AMAZED' || emotion === 'SCARED') baseY = -50;

    return {
      x: -width / 2,
      y: baseY * eyeHeightScale,
      width,
      height,
      rx
    };
  };

  const leftEyeProps = getEyeProps(true);
  const rightEyeProps = getEyeProps(false);

  const getEyeClipPath = (emotion: string, isLeft: boolean) => {
    let tl = { x: -150, y: -150 };
    let tr = { x: 150, y: -150 };
    let br = { x: 150, y: 150 };
    let bl = { x: -150, y: 150 };
    let bm = { x: 0, y: 150 }; // Midpoint for Q curve

    if (emotion === 'HAPPY' || (emotion === 'WINK' && !isLeft)) {
        // Clips bottom, curve up
        br.y = 15;
        bl.y = 15;
        bm.y = -30;
    } else if (emotion === 'SAD') {
        if (isLeft) {
            tl.y = 5; tr.y = -40;
        } else {
            tl.y = -40; tr.y = 5;
        }
    } else if (emotion === 'ANGRY') {
        if (isLeft) {
            tl.y = -40; tr.y = 5;
        } else {
            tl.y = 5; tr.y = -40;
        }
    } else if (emotion === 'SKEPTICAL' && isLeft) {
        tl.y = -40; tr.y = 5;
    }

    return `M ${tl.x} ${tl.y} L ${tr.x} ${tr.y} L ${br.x} ${br.y} Q ${bm.x} ${bm.y} ${bl.x} ${bl.y} Z`;
  };

  const actualFaceColor = isWakingUp ? '#ffffff' : faceColor;
  const filterString = faceGlow ? `drop-shadow(0 0 ${isWakingUp ? '40px' : '15px'} ${actualFaceColor})` : 'none';

  return (
    <motion.div
       className="relative aspect-square w-full max-w-[500px]"
       initial={false}
       animate={{ scale: isSpeaking ? 1.02 : 1 }}
       transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.svg 
        viewBox="0 0 400 400" 
        className="w-full h-full overflow-visible" 
        animate={{ filter: filterString }}
      >
        <defs>
          <clipPath id="left-eye-clip">
             <motion.path 
               animate={{ d: getEyeClipPath(emotion, true) }} 
               transition={{ type: "spring", stiffness: 120, damping: 15 }} 
             />
          </clipPath>
          <clipPath id="right-eye-clip">
             <motion.path 
               animate={{ d: getEyeClipPath(emotion, false) }} 
               transition={{ type: "spring", stiffness: 120, damping: 15 }} 
             />
          </clipPath>
        </defs>

        <motion.g 
          animate={{ scale, x: pupilX, y: pupilY }} 
          style={{ transformOrigin: '200px 200px' }} 
          transition={{ 
            scale: { type: "spring", stiffness: 300, damping: 20 },
            x: { type: "spring", stiffness: 150, damping: 15 },
            y: { type: "spring", stiffness: 150, damping: 15 }
          }}
        >
          {/* Left Eye */}
          <motion.g animate={{ x: 200 - 80 * eyeDistance, y: 180 }}>
                 <g clipPath="url(#left-eye-clip)">
                     <motion.rect
                         animate={leftEyeProps}
                         transition={{ type: "spring", stiffness: isBlinking ? 700 : 120, damping: isBlinking ? 40 : 15 }}
                         fill={actualFaceColor}
                     />
                 </g>
          </motion.g>

          {/* Right Eye */}
          <motion.g animate={{ x: 200 + 80 * eyeDistance, y: 180 }}>
                 <g clipPath="url(#right-eye-clip)">
                     <motion.rect
                         animate={rightEyeProps}
                         transition={{ type: "spring", stiffness: isBlinking ? 700 : 120, damping: isBlinking ? 40 : 15 }}
                         fill={actualFaceColor}
                     />
                 </g>
          </motion.g>

          {/* Mouth */}
        {showMouth && (
        <motion.g animate={{ x: 200, y: 260 + mouthYOffset }}>
           <motion.ellipse
               cx="0"
               cy="0"
               animate={{
                   rx: isSpeaking ? [2, 6, 2] : (emotion === 'AMAZED' ? 12 : 2),
                   ry: isSpeaking ? [2, 6, 2] : (emotion === 'AMAZED' ? 15 : 2)
               }}
               transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.15 }}
               fill={actualFaceColor}
           />
           {emotion !== 'IDLE' && emotion !== 'SURPRISED' && emotion !== 'AMAZED' && (
             <motion.path
                 animate={{
                     d: emotion === 'HAPPY' && !isSpeaking ? "M -6 0 Q 0 8 6 0" :
                        (emotion === 'SAD' || emotion === 'SCARED') && !isSpeaking ? "M -6 0 Q 0 -8 6 0" :
                        "M -6 0 Q 0 0 6 0"
                 }}
                 fill="transparent"
                 stroke={actualFaceColor}
                 strokeWidth="3"
                 strokeLinecap="round"
                 style={{ originX: "50%", originY: "50%" }}
             />
           )}
        </motion.g>
        )}
        </motion.g>
        
        {isSleeping && (
             <g>
                <motion.text
                   initial={{ opacity: 0, y: 120, x: 260 }}
                   animate={{ opacity: [0, 1, 0], y: [120, 80, 40], x: [260, 280, 300] }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 0 }}
                   fontSize="40" fill={actualFaceColor} fontWeight="bold" style={{ fontFamily: "monospace" }}
                >Z</motion.text>
                <motion.text
                   initial={{ opacity: 0, y: 120, x: 260 }}
                   animate={{ opacity: [0, 1, 0], y: [120, 80, 40], x: [260, 280, 300] }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1 }}
                   fontSize="30" fill={actualFaceColor} fontWeight="bold" style={{ fontFamily: "monospace" }}
                >z</motion.text>
                <motion.text
                   initial={{ opacity: 0, y: 120, x: 260 }}
                   animate={{ opacity: [0, 1, 0], y: [120, 80, 40], x: [260, 280, 300] }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 2 }}
                   fontSize="20" fill={actualFaceColor} fontWeight="bold" style={{ fontFamily: "monospace" }}
                >z</motion.text>
             </g>
        )}
      </motion.svg>
    </motion.div>
  );
}
