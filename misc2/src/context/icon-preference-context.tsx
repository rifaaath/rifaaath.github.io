
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

type IconPreference = 'default' | 'alternative';

interface IconPreferenceContextType {
  iconPreference: IconPreference;
  setIconPreference: (preference: IconPreference) => void;
}

const defaultContextValue: IconPreferenceContextType = {
  iconPreference: 'default',
  setIconPreference: (preference: IconPreference) => {
    // This log should ideally not be seen after the provider is properly initialized and consumed.
    console.log('[IconProvider] DEFAULT CONTEXT setIconPreference CALLED - THIS IS UNEXPECTED POST-INIT. Preference:', preference);
  },
};

// Exporting the context object itself for debugging purposes
export const IconPreferenceContext = createContext<IconPreferenceContextType>(defaultContextValue);

export const IconPreferenceProvider = ({ children }: { children: ReactNode }) => {
  const [iconPreference, setIconPreferenceState] = useState<IconPreference>('default');
  const [isMounted, setIsMounted] = useState(false);

  console.log('[IconProvider] Provider rendering. State - iconPreference:', iconPreference, 'isMounted:', isMounted);

  useEffect(() => {
    console.log('[IconProvider] Mount useEffect started.');
    setIsMounted(true);
    const storedPreference = localStorage.getItem('iconPreference') as IconPreference | null;
    console.log('[IconProvider] Mount useEffect - Stored preference from localStorage:', storedPreference);
    if (storedPreference) {
      console.log('[IconProvider] Mount useEffect - Setting preference from localStorage to:', storedPreference);
      setIconPreferenceState(storedPreference);
    }
    console.log('[IconProvider] Mount useEffect finished.');
  }, []);

  const setIconPreferenceCallback = useCallback((preference: IconPreference) => {
    console.log('[IconProvider] setIconPreferenceCallback called with:', preference);
    setIconPreferenceState(preference);
  }, []);

  useEffect(() => {
    console.log('[IconProvider] iconPreference/isMounted useEffect started. Current iconPreference:', iconPreference, 'isMounted:', isMounted);
    if (!isMounted) {
      console.log('[IconProvider] iconPreference/isMounted useEffect: SKIPPING because not mounted yet.');
      return;
    }

    console.log('[IconProvider] iconPreference/isMounted useEffect: Updating localStorage and document links for preference:', iconPreference);
    localStorage.setItem('iconPreference', iconPreference);

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifestLink) {
        manifestLink.href = iconPreference === 'alternative' ? '/manifest-alt.json' : '/manifest.json';
        console.log('[IconProvider] Updated manifest link to:', manifestLink.href);
    } else {
        console.warn('[IconProvider] Manifest link not found during update.');
    }

    let appleTouchIconLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (appleTouchIconLink) {
        appleTouchIconLink.href = iconPreference === 'alternative' ? '/apple-touch-icon-alt.png' : '/apple-touch-icon.png';
        console.log('[IconProvider] Updated apple touch icon link to:', appleTouchIconLink.href);
        if (iconPreference === 'alternative') {
            appleTouchIconLink.setAttribute('data-ai-hint', 'logo icon alternative');
        } else {
            appleTouchIconLink.setAttribute('data-ai-hint', 'logo icon');
        }
    } else {
        console.warn('[IconProvider] Apple touch icon link not found during update.');
    }
    console.log('[IconProvider] iconPreference/isMounted useEffect finished. iconPreference state in provider is now:', iconPreference);
  }, [iconPreference, isMounted]);

  const providerValue = useMemo(() => {
    console.log('[IconProvider] Recalculating providerValue. Current iconPreference:', iconPreference);
    return { iconPreference, setIconPreference: setIconPreferenceCallback };
  }, [iconPreference, setIconPreferenceCallback]);

  console.log('[IconProvider] Returning Provider component with value:', providerValue.iconPreference);
  return (
    <IconPreferenceContext.Provider value={providerValue}>
      {children}
    </IconPreferenceContext.Provider>
  );
};

export const useIconPreference = () => {
  const context = useContext(IconPreferenceContext);
  console.log('[useIconPreference] Context consumed in hook. Current iconPreference in context:', context.iconPreference);
  return context;
};
