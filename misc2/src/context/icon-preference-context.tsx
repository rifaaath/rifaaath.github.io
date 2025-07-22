
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

type IconPreference = 'default' | 'alternative';

interface IconPreferenceContextType {
  iconPreference: IconPreference;
  setIconPreference: (preference: IconPreference) => void;
}

const defaultContextValue: IconPreferenceContextType = {
  iconPreference: 'default',
  setIconPreference: () => {},
};

export const IconPreferenceContext = createContext<IconPreferenceContextType>(defaultContextValue);

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

  const setIconPreferenceCallback = useCallback((preference: IconPreference) => {
    setIconPreferenceState(preference);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iconPreference', preference);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (manifestLink) {
          manifestLink.href = iconPreference === 'alternative' ? '/manifest-alt.json' : '/manifest.json';
      }

      let appleTouchIconLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (appleTouchIconLink) {
          appleTouchIconLink.href = iconPreference === 'alternative' ? '/apple-touch-icon-alt.png' : '/apple-touch-icon.png';
           if (iconPreference === 'alternative') {
            appleTouchIconLink.setAttribute('data-ai-hint', 'logo icon alternative');
        } else {
            appleTouchIconLink.setAttribute('data-ai-hint', 'logo icon');
        }
      }
    }
  }, [iconPreference, isMounted]);

  const providerValue = useMemo(() => {
    return { iconPreference, setIconPreference: setIconPreferenceCallback };
  }, [iconPreference, setIconPreferenceCallback]);

  return (
    <IconPreferenceContext.Provider value={providerValue}>
      {children}
    </IconPreferenceContext.Provider>
  );
};

export const useIconPreference = () => {
  const context = useContext(IconPreferenceContext);
  return context;
};
