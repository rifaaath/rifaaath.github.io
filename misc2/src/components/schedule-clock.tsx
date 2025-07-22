
"use client";

import { useState, useEffect } from 'react';

// Durations for each phase in the 15-minute quarter
const GENDER_PHASE_SECONDS = 10 * 60; // 10 minutes in seconds
const NO_ENTRY_PHASE_SECONDS = 5 * 60; // 5 minutes in seconds
const QUARTER_DURATION_SECONDS = GENDER_PHASE_SECONDS + NO_ENTRY_PHASE_SECONDS; // 15 minutes total
const CYCLE_DURATION_FOR_CLOCK_SEGMENTS = 60 * 60; // 60 minutes total for the visual cycle

interface CurrentPhaseInfo {
  name: 'Men' | 'Women' | 'No Entry';
  displayName: string;
  statusColor: string;
  nextPhaseName: 'Men' | 'Women' | 'No Entry';
}

interface ClockDisplaySegment {
  duration: number; // in seconds
  fill: string;
}

// Segments for the clock background, representing a 60-minute cycle
// 10 min gender, 5 min no entry, repeating
const clockDisplaySegments: ClockDisplaySegment[] = [
  { duration: GENDER_PHASE_SECONDS, fill: 'hsl(var(--primary))' },        // Men (0-10 min of quarter 1)
  { duration: NO_ENTRY_PHASE_SECONDS, fill: 'url(#stripes-primary)' },    // No Entry (10-15 min of quarter 1)
  { duration: GENDER_PHASE_SECONDS, fill: 'hsl(var(--accent))' },         // Women (0-10 min of quarter 2)
  { duration: NO_ENTRY_PHASE_SECONDS, fill: 'url(#stripes-accent)' },     // No Entry (10-15 min of quarter 2)
  { duration: GENDER_PHASE_SECONDS, fill: 'hsl(var(--primary))' },        // Men (0-10 min of quarter 3)
  { duration: NO_ENTRY_PHASE_SECONDS, fill: 'url(#stripes-primary)' },    // No Entry (10-15 min of quarter 3)
  { duration: GENDER_PHASE_SECONDS, fill: 'hsl(var(--accent))' },         // Women (0-10 min of quarter 4)
  { duration: NO_ENTRY_PHASE_SECONDS, fill: 'url(#stripes-accent)' },     // No Entry (10-15 min of quarter 4)
];

const getArcPath = (x: number, y: number, radius: number, startAngle: number, endAngle: number): string => {
  const startPt = {
    x: x + radius * Math.cos(startAngle),
    y: y + radius * Math.sin(startAngle),
  };
  const endPt = {
    x: x + radius * Math.cos(endAngle),
    y: y + radius * Math.sin(endAngle),
  };
  const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
  return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPt.x} ${endPt.y}`;
};

export default function ScheduleClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();

  let currentPhase: CurrentPhaseInfo;
  let secondsIntoCurrentSubPhase: number; // Seconds into either the 10-min gender phase or 5-min no-entry phase
  let timeRemainingInSubPhase: number;

  const minuteInHour = minutes; // 0-59
  const currentQuarter = Math.floor(minuteInHour / 15); // 0, 1, 2, 3
  const minuteInQuarter = minuteInHour % 15; // 0-14

  if (minuteInQuarter < 10) { // First 10 minutes of the quarter: Gender specific
    secondsIntoCurrentSubPhase = minuteInQuarter * 60 + seconds;
    timeRemainingInSubPhase = GENDER_PHASE_SECONDS - secondsIntoCurrentSubPhase;
    if (currentQuarter === 0 || currentQuarter === 2) { // Men's turn (0-14 min, 30-44 min)
      currentPhase = { name: 'Men', displayName: 'MEN', statusColor: 'text-primary', nextPhaseName: 'No Entry' };
    } else { // Women's turn (15-29 min, 45-59 min)
      currentPhase = { name: 'Women', displayName: 'WOMEN', statusColor: 'text-accent', nextPhaseName: 'No Entry' };
    }
  } else { // Last 5 minutes of the quarter: No Entry
    secondsIntoCurrentSubPhase = (minuteInQuarter - 10) * 60 + seconds;
    timeRemainingInSubPhase = NO_ENTRY_PHASE_SECONDS - secondsIntoCurrentSubPhase;
    currentPhase = { name: 'No Entry', displayName: 'NO ENTRY', statusColor: 'text-destructive font-semibold', nextPhaseName: (currentQuarter === 1 || currentQuarter === 3) ? 'Men' : 'Women' };
     // Determine next phase after "No Entry"
    if (currentQuarter === 0 || currentQuarter === 2) { // No Entry after Men's turn
       currentPhase.nextPhaseName = 'Women';
    } else { // No Entry after Women's turn
       currentPhase.nextPhaseName = 'Men';
    }
    if (currentQuarter === 3 && minuteInQuarter >= 10) { // Last No Entry of the hour, next is Men of next hour's first quarter
        currentPhase.nextPhaseName = 'Men';
    }
  }
  
  const minutesRemaining = Math.floor(timeRemainingInSubPhase / 60);
  const secondsRemaining = timeRemainingInSubPhase % 60;

  // Clock hands rotation (standard 12-hour clock)
  const hourHandRotation = ((hours % 12 + minutes / 60) / 12) * 360;
  const minuteHandRotation = ((minutes + seconds / 60) / 60) * 360;

  const svgSize = 200; 
  const center = svgSize / 2;
  const segmentRingRadius = 75; 
  const segmentRingStrokeWidth = 28; 
  const pathRadius = segmentRingRadius;
  
  let startAngleRad = -Math.PI / 2; // Start at 12 o'clock for segments

  const tickRadiusOuter = segmentRingRadius + segmentRingStrokeWidth / 2 + 2;
  const hourTickLength = 7; 
  const minuteTickLength = 3.5; 

  return (
    <div className="flex flex-col items-center w-full max-w-xs sm:max-w-sm">
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 mb-6"> 
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full h-full">
          <defs>
            <pattern id="stripes-primary" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="hsl(var(--primary))"></rect>
              <path d="M 0 0 L 6 0" stroke="hsl(var(--primary-foreground))" strokeWidth="2.5" opacity="0.5"></path>
            </pattern>
            <pattern id="stripes-accent" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="hsl(var(--accent))"></rect>
              <path d="M 0 0 L 6 0" stroke="hsl(var(--accent-foreground))" strokeWidth="2.5" opacity="0.5"></path>
            </pattern>
          </defs>
          
          {/* Background Segments for 60-min cycle */}
          {clockDisplaySegments.map((segment, index) => {
            const phaseProportion = segment.duration / CYCLE_DURATION_FOR_CLOCK_SEGMENTS;
            const endAngleRad = startAngleRad + phaseProportion * 2 * Math.PI;
            const pathData = getArcPath(center, center, pathRadius, startAngleRad, endAngleRad);
            startAngleRad = endAngleRad;
            return (
              <path
                key={`segment-${index}`}
                d={pathData}
                fill={segment.fill}
                stroke={segment.fill} /* Use fill for stroke to avoid thin lines if stroke is different */
                strokeWidth={segmentRingStrokeWidth}
              />
            );
          })}

          {/* Clock Tick Marks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * 360 - 90;
            const isHourTick = i % 5 === 0;
            const len = isHourTick ? hourTickLength : minuteTickLength;
            const rOuter = tickRadiusOuter;
            const rInner = rOuter - len;
            
            const x1 = center + rInner * Math.cos(angle * Math.PI / 180);
            const y1 = center + rInner * Math.sin(angle * Math.PI / 180);
            const x2 = center + rOuter * Math.cos(angle * Math.PI / 180);
            const y2 = center + rOuter * Math.sin(angle * Math.PI / 180);
            return (
              <line
                key={`tick-min-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={isHourTick ? "1.3" : "0.7"} 
              />
            );
          })}
          
          {/* Hour Numbers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const hour = i + 1;
            const angle = (hour / 12) * 360 - 90;
            const textRadius = segmentRingRadius - segmentRingStrokeWidth / 2 - 12; 
            const x = center + textRadius * Math.cos(angle * Math.PI / 180);
            const y = center + textRadius * Math.sin(angle * Math.PI / 180);
            return (
              <text
                key={`hour-num-${hour}`}
                x={x}
                y={y}
                dy="0.35em"
                textAnchor="middle"
                fontSize="10" 
                fill="hsl(var(--foreground))"
                className="font-sans"
              >
                {hour}
              </text>
            );
          })}

          {/* Hour Hand */}
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - (segmentRingRadius * 0.50)} 
            stroke="hsl(var(--foreground))"
            strokeWidth="4.5" 
            strokeLinecap="round"
            transform={`rotate(${hourHandRotation}, ${center}, ${center})`}
            style={{ transition: 'transform 0.5s linear' }}
          />

          {/* Minute Hand */}
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - (segmentRingRadius * 0.75)} 
            stroke="hsl(var(--foreground))"
            strokeWidth="2.5" 
            strokeLinecap="round"
            transform={`rotate(${minuteHandRotation}, ${center}, ${center})`}
            style={{ transition: 'transform 0.5s linear' }}
          />
          
          {/* Center dot */}
          <circle cx={center} cy={center} r="4" fill="hsl(var(--foreground))" /> 
          <circle cx={center} cy={center} r="2" fill="hsl(var(--background))" />
        </svg>
      </div>

      <div className="bg-card p-5 rounded-lg shadow-xl w-full text-center text-card-foreground">
        <div className="mb-2.5"> 
          <span className="text-md sm:text-lg text-muted-foreground">Current Slot: </span>
          <span className={`text-xl sm:text-2xl font-bold ${currentPhase.statusColor}`}>
            {currentPhase.displayName}
          </span>
        </div>
        <div className="text-sm sm:text-md text-muted-foreground mb-0.5"> 
          Current Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
        <div className="text-sm sm:text-md text-muted-foreground mb-4"> 
          Time remaining in phase: {String(minutesRemaining).padStart(2, '0')}:{String(secondsRemaining).padStart(2, '0')} until {currentPhase.nextPhaseName}
        </div>
        
        <div className="flex justify-center items-center space-x-3 sm:space-x-4 text-xs sm:text-sm">
          <div className="flex items-center">
            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm bg-primary mr-1.5 sm:mr-2"></span>Men
          </div>
          <div className="flex items-center">
            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm bg-accent mr-1.5 sm:mr-2"></span>Women
          </div>
          <div className="flex items-center">
            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm bg-destructive mr-1.5 sm:mr-2"></span>No Entry
          </div>
        </div>
      </div>
    </div>
  );
}