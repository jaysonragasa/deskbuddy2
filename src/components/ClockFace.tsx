import React, { useEffect, useState } from 'react';
import { MochiSettings } from '../types';

interface ClockFaceProps {
  settings: MochiSettings;
}

export function ClockFace({ settings }: ClockFaceProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRotation = () => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const secondRotation = seconds * 6;
    const minuteRotation = minutes * 6 + seconds * 0.1;
    const hourRotation = (hours % 12) * 30 + minutes * 0.5;

    return { hourRotation, minuteRotation, secondRotation };
  };

  const { hourRotation, minuteRotation, secondRotation } = getRotation();

  const clockColor = settings.clockColor || '#ffffff';

  if (settings.clockType === 'DIGITAL') return null;

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden pb-10 md:pb-0">
      <svg 
        viewBox="-50 -50 100 100" 
        className="w-[100vmin] h-[100vmin] max-w-full max-h-full opacity-60"
        style={{ filter: settings.faceGlow ? `drop-shadow(0 0 5px ${clockColor})` : 'none' }}
      >
        {/* Minute ticks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const isHour = i % 5 === 0;
          return (
            <line
              key={i}
              x1="0"
              y1={isHour ? "-45" : "-47"}
              x2="0"
              y2="-50"
              stroke={clockColor}
              strokeWidth={isHour ? "1" : "0.5"}
              transform={`rotate(${i * 6})`}
              opacity={isHour ? 0.8 : 0.4}
            />
          );
        })}

        {/* Hour numbers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const num = i === 0 ? 12 : i;
          const angle = (i * 30 * Math.PI) / 180;
          // Position slightly inside the ticks
          const radius = 38;
          const x = Math.sin(angle) * radius;
          const y = -Math.cos(angle) * radius;
          return (
            <text
              key={i}
              x={x}
              y={y + 3} // Adjust for baseline
              fill={clockColor}
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono"
              opacity="0.9"
            >
              {num}
            </text>
          );
        })}

        {/* Hands */}
        {/* Hour hand */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-22"
          stroke={clockColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${hourRotation})`}
          opacity="0.9"
        />

        {/* Minute hand */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-34"
          stroke={clockColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${minuteRotation})`}
          opacity="0.9"
        />

        {/* Second hand */}
        <line
          x1="0"
          y1="10"
          x2="0"
          y2="-38"
          stroke="#ef4444" // Add a red tint for seconds
          strokeWidth="0.5"
          strokeLinecap="round"
          transform={`rotate(${secondRotation})`}
        />
        
        {/* Center dot for second hand */}
        <circle cx="0" cy="0" r="1.5" fill="#ef4444" />
      </svg>
    </div>
  );
}
