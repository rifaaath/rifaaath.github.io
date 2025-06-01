
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type IconPreference = 'default' | 'alternative';

interface IconPreferenceContextType {
  iconPreference: IconPreference;
  setIconPreference: (preference: IconPreference) => void;
}

// Define a default context value to be used when no provider is found
// or during build-time rendering before client-side hydration.
const defaultContextValue: IconPreferenceContextType = {
  iconPreference: 'default',
  setIconPreference: (preference: IconPreference) => {
    // This function will be a no-op if called without a provider,
    // which is fine for SSR/build as preferences are client-side.
    console.warn(
      'Attempted to set icon preference when IconPreferenceProvider is not fully initialized (e.g., during SSR/build). Preference: ',
      preference
    );
  },
};

const IconPreferenceContext = createContext<IconPreferenceContextType>(defaultContextValue);

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
  
  return (
    <IconPreferenceContext.Provider value={{ iconPreference, setIconPreference }}>
      {children}
    </IconPreferenceContext.Provider>
  );
};

export const useIconPreference = () => {
  const context = useContext(IconPreferenceContext);
  // Since createContext now has a default value, context should never be undefined.
  // The original check `if (context === undefined)` that threw the error can be removed
  // or kept if you want to distinguish if the *actual* provider is missing vs. using the default.
  // For build purposes, always returning a valid context (even the default) is key.
  if (context === undefined) {
     // This should ideally not be reached if createContext has a default.
     // If it is, something is fundamentally wrong with React's context mechanism.
     console.error("Critical: IconPreferenceContext is undefined despite a default value in createContext.");
     return defaultContextValue; // Fallback to default to prevent crash
  }
  return context;
};
