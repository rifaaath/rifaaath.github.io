
"use client";

import { useState, useEffect } from 'react';

// Durations for each phase in the 15-minute quarter
const GENDER_SPECIFIC_SECONDS = 10 * 60; // 10 minutes
const NO_ENTRY_SECONDS = 5 * 60; // 5 minutes
const QUARTER_DURATION_SECONDS = GENDER_SPECIFIC_SECONDS + NO_ENTRY_SECONDS; // 15 minutes total
const CYCLE_DURATION_FOR_CLOCK_SEGMENTS = 60 * 60; // 60 minutes for the visual cycle

interface CurrentPhaseInfo {
  name: 'Men' | 'Women' | 'No Entry';
  displayName: string;
  statusColor: string; // Tailwind text color class
  nextPhaseName: 'Men' | 'Women' | 'No Entry';
  timeRemainingInPhase: number;
}

// Segments for the clock background, representing a 60-minute cycle
const clockDisplaySegments = [
  { duration: GENDER_SPECIFIC_SECONDS, fill: 'hsl(var(--clock-man-color))' },       // Q1: Men
  { duration: NO_ENTRY_SECONDS, fill: 'url(#stripes-clock-man)' },           // Q1: No Entry (Man's slot)
  { duration: GENDER_SPECIFIC_SECONDS, fill: 'hsl(var(--clock-woman-color))' },    // Q2: Women
  { duration: NO_ENTRY_SECONDS, fill: 'url(#stripes-clock-woman)' },         // Q2: No Entry (Woman's slot)
  { duration: GENDER_SPECIFIC_SECONDS, fill: 'hsl(var(--clock-man-color))' },       // Q3: Men
  { duration: NO_ENTRY_SECONDS, fill: 'url(#stripes-clock-man)' },           // Q3: No Entry (Man's slot)
  { duration: GENDER_SPECIFIC_SECONDS, fill: 'hsl(var(--clock-woman-color))' },    // Q4: Women
  { duration: NO_ENTRY_SECONDS, fill: 'url(#stripes-clock-woman)' },         // Q4: No Entry (Woman's slot)
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
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [currentPhaseInfo, setCurrentPhaseInfo] = useState<CurrentPhaseInfo | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now);

      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const currentQuarter = Math.floor(minutes / 15); // 0, 1, 2, 3
      const secondsIntoQuarter = (minutes % 15) * 60 + seconds; // Seconds into the current 15-min quarter

      let phaseName: 'Men' | 'Women' | 'No Entry';
      let displayName: string;
      let statusColor: string; // This will be a Tailwind class like 'text-primary', 'text-accent', 'text-destructive'
      let nextPhaseName: 'Men' | 'Women' | 'No Entry';
      let timeRemainingInPhase: number;

      const isGenderPhase = secondsIntoQuarter < GENDER_SPECIFIC_SECONDS;

      if (isGenderPhase) { // First 10 minutes: Gender specific
        timeRemainingInPhase = GENDER_SPECIFIC_SECONDS - secondsIntoQuarter;
        if (currentQuarter === 0 || currentQuarter === 2) { // Men's turn
          phaseName = 'Men';
          displayName = 'MEN';
          statusColor = 'text-[hsl(var(--clock-man-color))]'; // Use clock-specific color variable
          nextPhaseName = 'No Entry';
        } else { // Women's turn
          phaseName = 'Women';
          displayName = 'WOMEN';
          statusColor = 'text-[hsl(var(--clock-woman-color))]'; // Use clock-specific color variable
          nextPhaseName = 'No Entry';
        }
      } else { // Last 5 minutes: No Entry
        timeRemainingInPhase = QUARTER_DURATION_SECONDS - secondsIntoQuarter;
        phaseName = 'No Entry';
        displayName = 'NO ENTRY';
        statusColor = 'text-destructive font-semibold'; // Uses the theme's destructive color
        // Determine next gender phase after "No Entry"
        if (currentQuarter === 0 || currentQuarter === 2) { // No Entry after Men's turn -> next is Women
          nextPhaseName = 'Women';
        } else { // No Entry after Women's turn -> next is Men
          nextPhaseName = 'Men';
        }
      }
      
      setCurrentPhaseInfo({ name: phaseName, displayName, statusColor, nextPhaseName, timeRemainingInPhase });
    };
    
    updateClock(); // Initial call to set time immediately
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, []);

  if (!currentTime || !currentPhaseInfo) {
    return (
      <div className="flex flex-col items-center w-full max-w-xs sm:max-w-sm">
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 mb-4 bg-muted/30 rounded-full animate-pulse">
        </div>
        <div className="bg-card p-4 rounded-lg shadow-lg w-full text-center text-card-foreground">
          <div className="mb-2 h-6 bg-muted/40 rounded w-3/4 mx-auto animate-pulse"></div>
          <div className="h-4 bg-muted/30 rounded w-1/2 mx-auto mb-1 animate-pulse"></div>
          <div className="h-4 bg-muted/30 rounded w-2/3 mx-auto mb-3 animate-pulse"></div>
          <div className="flex justify-center items-center space-x-3 sm:space-x-4 text-xs sm:text-sm">
            <div className="flex items-center h-4 bg-muted/20 rounded w-12 animate-pulse"></div>
            <div className="flex items-center h-4 bg-muted/20 rounded w-12 animate-pulse"></div>
            <div className="flex items-center h-4 bg-muted/20 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  
  const minutesRemaining = Math.floor(currentPhaseInfo.timeRemainingInPhase / 60);
  const secondsRemaining = currentPhaseInfo.timeRemainingInPhase % 60;

  const hourHandRotation = ((hours % 12 + minutes / 60) / 12) * 360;
  const minuteHandRotation = ((minutes + seconds / 60) / 60) * 360;

  const svgSize = 200; 
  const center = svgSize / 2;
  const segmentRingRadius = 75; 
  const segmentRingStrokeWidth = 28; 
  const pathRadius = segmentRingRadius;
  
  let startAngleRad = -Math.PI / 2; 

  const tickRadiusOuter = segmentRingRadius + segmentRingStrokeWidth / 2 + 2;
  const hourTickLength = 7; 
  const minuteTickLength = 3.5; 

  return (
    <div className="flex flex-col items-center w-full max-w-xs sm:max-w-sm">
      <div className="relative w-52 h-52 sm:w-56 sm:h-56 mb-4"> 
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full h-full">
          <defs>
            <pattern id="stripes-clock-man" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="hsl(var(--clock-man-color))"></rect>
              <path d="M 0 0 L 6 0" stroke="hsl(var(--primary-foreground))" strokeWidth="2.5" opacity="0.5"></path>
            </pattern>
            <pattern id="stripes-clock-woman" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="hsl(var(--clock-woman-color))"></rect>
              <path d="M 0 0 L 6 0" stroke="hsl(var(--primary-foreground))" strokeWidth="2.5" opacity="0.5"></path>
            </pattern>
          </defs>
          
          {clockDisplaySegments.map((segment, index) => {
            const phaseProportion = segment.duration / CYCLE_DURATION_FOR_CLOCK_SEGMENTS;
            const endAngleRad = startAngleRad + phaseProportion * 2 * Math.PI;
            const pathData = getArcPath(center, center, pathRadius, startAngleRad, endAngleRad);
            startAngleRad = endAngleRad;
            return (
              <path
                key={`segment-${index}`}
                d={pathData}
                fill="none"
                stroke={segment.fill} 
                strokeWidth={segmentRingStrokeWidth}
              />
            );
          })}

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

          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - (segmentRingRadius * 0.50)} 
            stroke="hsl(var(--foreground))"
            strokeWidth="4.5" 
            strokeLinecap="round"
            transform={`rotate(${hourHandRotation}, ${center}, ${center})`}
            style={{ transition: 'transform 0.3s linear' }}
          />

          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - (segmentRingRadius * 0.75)} 
            stroke="hsl(var(--foreground))"
            strokeWidth="2.5" 
            strokeLinecap="round"
            transform={`rotate(${minuteHandRotation}, ${center}, ${center})`}
            style={{ transition: 'transform 0.3s linear' }}
          />
          
          <circle cx={center} cy={center} r="4" fill="hsl(var(--foreground))" /> 
          <circle cx={center} cy={center} r="2" fill="hsl(var(--background))" />
        </svg>
      </div>

      <div className="bg-card p-4 rounded-lg shadow-lg w-full text-center text-card-foreground">
        <div className="mb-2"> 
          <span className="text-sm sm:text-md text-muted-foreground">Current Status: </span>
          <span className={`text-lg sm:text-xl font-bold ${currentPhaseInfo.statusColor}`}>
            {currentPhaseInfo.displayName}
          </span>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground mb-0.5"> 
          Current Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground mb-3"> 
          Time remaining: {String(minutesRemaining).padStart(2, '0')}:{String(secondsRemaining).padStart(2, '0')} until {currentPhaseInfo.nextPhaseName}
        </div>
        
        <div className="flex justify-center items-center space-x-3 sm:space-x-4 text-xs sm:text-sm">
          <div className="flex items-center">
            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm bg-[hsl(var(--clock-man-color))] mr-1.5 sm:mr-2"></span>Men
          </div>
          <div className="flex items-center">
            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm bg-[hsl(var(--clock-woman-color))] mr-1.5 sm:mr-2"></span>Women
          </div>
          <div className="flex items-center">
            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm bg-destructive mr-1.5 sm:mr-2"></span>No Entry
          </div>
        </div>
      </div>
    </div>
  );
}
