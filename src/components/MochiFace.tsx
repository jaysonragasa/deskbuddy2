import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Emotion } from "../types";

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
  isIdleRandom?: boolean;
  showClockFace?: boolean;
  clockType?: "ANALOG" | "DIGITAL";
  clockColor?: string;
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
  faceColor = "#3b82f6",
  faceGlow = true,
  eyeDistance = 1.0,
  mouthYOffset = 0,
  isSleeping = false,
  isWakingUp = false,
  isIdleRandom = false,
  showClockFace = false,
  clockType = "ANALOG",
  clockColor = "#ffffff",
}: Props) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [randomAction, setRandomAction] = useState<
    "NONE" | "JUMP" | "LOOK_AROUND" | "THINKING" | "EXPLORE" | "WALK_OFF"
  >("NONE");
  const [randomGaze, setRandomGaze] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!showClockFace || clockType !== "DIGITAL") return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [showClockFace, clockType]);

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

  // Idle animations
  useEffect(() => {
    let timeoutId: number;
    let lookIntervalId: number;

    if (isIdleRandom && !isSleeping && !isSpeaking) {
      const triggerAction = () => {
        const actions = ["NONE", "JUMP", "LOOK_AROUND", "THINKING", "EXPLORE"];
        const action = actions[
          Math.floor(Math.random() * actions.length)
        ] as any;
        setRandomAction(action);

        if (action === "JUMP") {
          timeoutId = window.setTimeout(() => setRandomAction("NONE"), 1500);
        } else if (action === "EXPLORE") {
          let looks = 0;
          lookIntervalId = window.setInterval(() => {
            setRandomGaze({
              x: Math.random() > 0.5 ? 0.8 : -0.8,
              y: (Math.random() * 2 - 1) * 0.4,
            });
            looks++;
            if (looks > 3) {
              clearInterval(lookIntervalId);
              setRandomGaze({ x: 0, y: 0 });
              setRandomAction("WALK_OFF");
              timeoutId = window.setTimeout(
                () => setRandomAction("NONE"),
                4000,
              );
            }
          }, 500);
          // We do an early return since timeoutId is set inside
          return;
        } else if (action === "LOOK_AROUND") {
          let looks = 0;
          lookIntervalId = window.setInterval(() => {
            setRandomGaze({
              x: (Math.random() * 2 - 1) * 0.8,
              y: (Math.random() * 2 - 1) * 0.8,
            });
            looks++;
            if (looks > 4) {
              clearInterval(lookIntervalId);
              setRandomAction("NONE");
              setRandomGaze({ x: 0, y: 0 });
            }
          }, 500);
        } else if (action === "THINKING") {
          let looks = 0;
          lookIntervalId = window.setInterval(() => {
            setRandomGaze({
              x: looks % 2 === 0 ? 0.7 : -0.7,
              y: -0.8, // look up
            });
            looks++;
            if (looks > 5) {
              clearInterval(lookIntervalId);
              setRandomAction("NONE");
              setRandomGaze({ x: 0, y: 0 });
            }
          }, 400);
        } else {
          setRandomGaze({ x: 0, y: 0 });
          timeoutId = window.setTimeout(
            triggerAction,
            Math.random() * 2000 + 2000,
          );
          return;
        }

        // Wait for current action to finish before triggering next
        timeoutId = window.setTimeout(
          triggerAction,
          Math.random() * 4000 + 3000,
        );
      };
      timeoutId = window.setTimeout(triggerAction, Math.random() * 2000 + 1000);
    } else {
      setRandomAction("NONE");
      setRandomGaze({ x: 0, y: 0 });
    }

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(lookIntervalId);
    };
  }, [isIdleRandom, isSleeping, isSpeaking]);

  const targetGaze =
    randomAction === "LOOK_AROUND" ||
    randomAction === "THINKING" ||
    randomAction === "EXPLORE"
      ? randomGaze
      : gaze;

  const actualGaze = targetGaze;

  const pupilX = actualGaze.x * gazeScale;
  const pupilY = actualGaze.y * gazeScale;

  const getEyeProps = (isLeft: boolean) => {
    let baseWidth = emotion === "AMAZED" || emotion === "SCARED" ? 100 : 80;
    let baseHeight =
      emotion === "AMAZED" || emotion === "SCARED"
        ? 100
        : emotion === "SURPRISED"
          ? 90
          : 80;
    let rx = emotion === "AMAZED" || emotion === "SCARED" ? 50 : 24;

    if (isSleeping) {
      baseWidth = 80;
      baseHeight = 6;
      rx = 3;
    } else if (isBlinking || (isLeft && emotion === "WINK")) {
      baseHeight = 8;
      rx = 4;
    } else if (isLeft && emotion === "SKEPTICAL") {
      baseHeight = 40;
    }

    const width = baseWidth * eyeWidthScale;
    const height = baseHeight * eyeHeightScale;

    // Maintain vertical center based on original coordinate mapping
    let baseY = -40;
    if (isSleeping) baseY = 0;
    else if (isBlinking || (isLeft && emotion === "WINK")) baseY = -4;
    else if (isLeft && emotion === "SKEPTICAL") baseY = -20;
    else if (emotion === "AMAZED" || emotion === "SCARED") baseY = -50;

    return {
      x: -width / 2,
      y: baseY * eyeHeightScale,
      width,
      height,
      rx,
    };
  };

  const leftEyeProps = getEyeProps(true);
  const rightEyeProps = getEyeProps(false);

  const getRectPath = (props: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
  }) => {
    const { x, y, width, height, rx } = props;
    const r = Math.min(rx, width / 2, height / 2);
    return `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  };

  const getEyeClipPath = (emotion: string, isLeft: boolean) => {
    let tl = { x: -150, y: -150 };
    let tr = { x: 150, y: -150 };
    let br = { x: 150, y: 150 };
    let bl = { x: -150, y: 150 };
    let bm = { x: 0, y: 150 }; // Midpoint for Q curve

    if (emotion === "HAPPY" || (emotion === "WINK" && !isLeft)) {
      // Clips bottom, curve up
      br.y = 15;
      bl.y = 15;
      bm.y = -30;
    } else if (emotion === "SAD") {
      if (isLeft) {
        tl.y = 5;
        tr.y = -40;
      } else {
        tl.y = -40;
        tr.y = 5;
      }
    } else if (emotion === "ANGRY") {
      if (isLeft) {
        tl.y = -40;
        tr.y = 5;
      } else {
        tl.y = 5;
        tr.y = -40;
      }
    } else if (emotion === "SKEPTICAL" && isLeft) {
      tl.y = -40;
      tr.y = 5;
    }

    return `M ${tl.x} ${tl.y} L ${tr.x} ${tr.y} L ${br.x} ${br.y} Q ${bm.x} ${bm.y} ${bl.x} ${bl.y} Z`;
  };

  const actualFaceColor = isWakingUp ? "#ffffff" : faceColor;
  const filterString = faceGlow
    ? `drop-shadow(0 0 ${isWakingUp || randomAction === "THINKING" ? "40px" : "15px"} ${actualFaceColor})`
    : "none";

  return (
    <motion.div
      className="relative aspect-square w-full max-w-[500px]"
      initial={false}
      animate={{
        scale: isSpeaking ? 1.02 : 1,
        y: randomAction === "JUMP" ? [0, -50, 0, -25, 0] : 0,
        x: randomAction === "WALK_OFF" ? [0, 1500, 1500, 0] : 0,
      }}
      transition={{
        scale: { type: "spring", stiffness: 300, damping: 20 },
        y: { duration: 0.6, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeInOut" },
        x: { duration: 4, times: [0, 0.25, 0.75, 1], ease: "easeInOut" },
      }}
    >
      <motion.svg
        viewBox="0 0 400 400"
        className="w-full h-full overflow-visible"
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
          <clipPath id="left-eye-rect-clip">
            <motion.path
              animate={{ d: getRectPath(leftEyeProps) }}
              transition={{
                type: "spring",
                stiffness: isBlinking ? 700 : 120,
                damping: isBlinking ? 40 : 15,
              }}
            />
          </clipPath>
          <clipPath id="right-eye-rect-clip">
            <motion.path
              animate={{ d: getRectPath(rightEyeProps) }}
              transition={{
                type: "spring",
                stiffness: isBlinking ? 700 : 120,
                damping: isBlinking ? 40 : 15,
              }}
            />
          </clipPath>
        </defs>

        {showClockFace && clockType === "ANALOG" && (
          <circle
            cx="200"
            cy="200"
            r={40 + 100 * scale * (eyeDistance * 0.5 + 0.5)}
            fill="black"
          />
        )}

        <motion.g animate={{ filter: filterString }}>
          <motion.g
            animate={{ scale, x: pupilX, y: pupilY }}
            style={{ transformOrigin: "200px 200px" }}
            transition={{
              scale: { type: "spring", stiffness: 300, damping: 20 },
              x: { type: "spring", stiffness: 150, damping: 15 },
              y: { type: "spring", stiffness: 150, damping: 15 },
            }}
          >
            {/* Left Eye */}
            <motion.g animate={{ x: 200 - 80 * eyeDistance, y: 180 }}>
              <g clipPath="url(#left-eye-clip)">
                <g clipPath="url(#left-eye-rect-clip)">
                  <motion.rect
                    animate={leftEyeProps}
                    transition={{
                      type: "spring",
                      stiffness: isBlinking ? 700 : 120,
                      damping: isBlinking ? 40 : 15,
                    }}
                    fill={actualFaceColor}
                  />
                  {showClockFace && clockType === "DIGITAL" && (
                    <motion.text
                      animate={{
                        x: leftEyeProps.x + leftEyeProps.width / 2,
                        y: leftEyeProps.y + leftEyeProps.height / 2 + 5,
                      }}
                      fill={clockColor}
                      fontSize="40"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-mono"
                    >
                      {time.getHours().toString().padStart(2, "0")}
                    </motion.text>
                  )}
                </g>
              </g>
            </motion.g>

            {/* Right Eye */}
            <motion.g animate={{ x: 200 + 80 * eyeDistance, y: 180 }}>
              <g clipPath="url(#right-eye-clip)">
                <g clipPath="url(#right-eye-rect-clip)">
                  <motion.rect
                    animate={rightEyeProps}
                    transition={{
                      type: "spring",
                      stiffness: isBlinking ? 700 : 120,
                      damping: isBlinking ? 40 : 15,
                    }}
                    fill={actualFaceColor}
                  />
                  {showClockFace && clockType === "DIGITAL" && (
                    <motion.text
                      animate={{
                        x: rightEyeProps.x + rightEyeProps.width / 2,
                        y: rightEyeProps.y + rightEyeProps.height / 2 + 5,
                      }}
                      fill={clockColor}
                      fontSize="40"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-mono"
                    >
                      {time.getMinutes().toString().padStart(2, "0")}
                    </motion.text>
                  )}
                </g>
              </g>
            </motion.g>

            {/* Mouth */}
            {showMouth && (
              <motion.g animate={{ x: 200, y: 260 + mouthYOffset }}>
                <motion.ellipse
                  cx="0"
                  cy="0"
                  animate={{
                    rx: isSpeaking ? [2, 6, 2] : emotion === "AMAZED" ? 12 : 2,
                    ry: isSpeaking ? [2, 6, 2] : emotion === "AMAZED" ? 15 : 2,
                  }}
                  transition={{
                    repeat: isSpeaking ? Infinity : 0,
                    duration: 0.15,
                  }}
                  fill={actualFaceColor}
                />
                {emotion !== "IDLE" &&
                  emotion !== "SURPRISED" &&
                  emotion !== "AMAZED" && (
                    <motion.path
                      animate={{
                        d:
                          emotion === "HAPPY" && !isSpeaking
                            ? "M -6 0 Q 0 8 6 0"
                            : (emotion === "SAD" || emotion === "SCARED") &&
                                !isSpeaking
                              ? "M -6 0 Q 0 -8 6 0"
                              : "M -6 0 Q 0 0 6 0",
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
                animate={{
                  opacity: [0, 1, 0],
                  y: [120, 80, 40],
                  x: [260, 280, 300],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0,
                }}
                fontSize="40"
                fill={actualFaceColor}
                fontWeight="bold"
                style={{ fontFamily: "monospace" }}
              >
                Z
              </motion.text>
              <motion.text
                initial={{ opacity: 0, y: 120, x: 260 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [120, 80, 40],
                  x: [260, 280, 300],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 1,
                }}
                fontSize="30"
                fill={actualFaceColor}
                fontWeight="bold"
                style={{ fontFamily: "monospace" }}
              >
                z
              </motion.text>
              <motion.text
                initial={{ opacity: 0, y: 120, x: 260 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [120, 80, 40],
                  x: [260, 280, 300],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 2,
                }}
                fontSize="20"
                fill={actualFaceColor}
                fontWeight="bold"
                style={{ fontFamily: "monospace" }}
              >
                z
              </motion.text>
            </g>
          )}
        </motion.g>
      </motion.svg>
    </motion.div>
  );
}
