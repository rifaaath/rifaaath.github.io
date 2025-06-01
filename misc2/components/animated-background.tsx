
'use client';

import { useEffect, useState } from 'react';

const AnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Avoid rendering on the server or during hydration mismatch
  }

  // Generate random initial positions and sizes for more variation
  // This will only run client-side after mount
  const elements = [
    {
      id: 1,
      sizeClass: 'w-[150px] h-[150px] sm:w-[200px] sm:h-[200px]',
      positionClasses: 'top-[10vh] left-[10vw]',
      animationClass: 'animate-drift-fade-1',
      colorClass: 'fill-primary', // Use theme primary color
      opacity: 'opacity-30 dark:opacity-20',
    },
    {
      id: 2,
      sizeClass: 'w-[100px] h-[100px] sm:w-[150px] sm:h-[150px]',
      positionClasses: 'top-[50vh] right-[15vw]',
      animationClass: 'animate-drift-fade-2',
      colorClass: 'fill-accent', // Use theme accent color
      opacity: 'opacity-30 dark:opacity-20',
    },
    {
      id: 3,
      sizeClass: 'w-[80px] h-[80px] sm:w-[120px] sm:h-[120px]',
      positionClasses: 'bottom-[15vh] left-[25vw]',
      animationClass: 'animate-drift-fade-3',
      colorClass: 'fill-secondary', // Use theme secondary color
      opacity: 'opacity-20 dark:opacity-10',
    },
     {
      id: 4,
      sizeClass: 'w-[120px] h-[120px] sm:w-[180px] sm:h-[180px]',
      positionClasses: 'bottom-[5vh] right-[5vw]',
      animationClass: 'animate-drift-fade-1', // Reuse animation with different start
      animationDelay: 'animation-delay-5s', // Example of staggering
      colorClass: 'fill-primary',
      opacity: 'opacity-20 dark:opacity-15',
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {elements.map((el) => (
        <svg
          key={el.id}
          className={`absolute ${el.sizeClass} ${el.positionClasses} ${el.animationClass} ${el.opacity} ${el.animationDelay || ''}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <circle cx="50" cy="50" r="50" className={el.colorClass} />
        </svg>
      ))}
      <style jsx>{`
        .animation-delay-5s {
          animation-delay: -5s; /* Negative delay starts animation partway through */
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;
