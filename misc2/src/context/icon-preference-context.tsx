
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type IconPreference = 'default' | 'alternative';

interface IconPreferenceContextType {
  iconPreference: IconPreference;
  setIconPreference: (preference: IconPreference) => void;
}

const IconPreferenceContext = createContext<IconPreferenceContextType | undefined>(undefined);

export const IconPreferenceProvider = ({ children }: { children: ReactNode }) => {
  const [iconPreference, setIconPreferenceState] = useState<IconPreference>('default');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedPreference = localStorage.getItem('iconPreference') as IconPreference | null;
    if (storedPreference) {
      setIconPreferenceState(storedPreference);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    localStorage.setItem('iconPreference', iconPreference);

    // Update manifest link
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = iconPreference === 'alternative' ? '/manifest-alt.json' : '/manifest.json';

    // Update apple-touch-icon link
    let appleTouchIconLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleTouchIconLink) {
      appleTouchIconLink = document.createElement('link');
      appleTouchIconLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchIconLink);
    }
    appleTouchIconLink.href = iconPreference === 'alternative' ? '/apple-touch-icon-alt.png' : '/apple-touch-icon.png';
    if (iconPreference === 'alternative') {
      appleTouchIconLink.setAttribute('data-ai-hint', 'logo icon alternative');
    } else {
      appleTouchIconLink.setAttribute('data-ai-hint', 'logo icon');
    }
  }, [iconPreference, isMounted]);

  const setIconPreference = (preference: IconPreference) => {
    setIconPreferenceState(preference);
  };
  
  // Removed the problematic block:
  // if (!isMounted) {
  //     return null; 
  // }

  return (
    <IconPreferenceContext.Provider value={{ iconPreference, setIconPreference }}>
      {children}
    </IconPreferenceContext.Provider>
  );
};

export const useIconPreference = () => {
  const context = useContext(IconPreferenceContext);
  if (context === undefined) {
    throw new Error('useIconPreference must be used within an IconPreferenceProvider');
  }
  return context;
};
