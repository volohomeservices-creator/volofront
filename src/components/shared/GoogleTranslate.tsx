'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function GoogleTranslate() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // @ts-ignore
    window.googleTranslateElementInit = () => {
      // @ts-ignore
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,hi,te',
        autoDisplay: false
      }, 'google_translate_element');
    };
  }, []);

  if (!isMounted) return null;

  return (
    <>
      {/* Hidden element for google translate to hook into */}
      <div id="google_translate_element" style={{ display: 'none' }} className="hidden"></div>
      
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="lazyOnload"
      />
      
      <style jsx global>{`
        /* Hide the default Google Translate top banner */
        body { top: 0 !important; }
        .skiptranslate { display: none !important; }
        #goog-gt-tt { display: none !important; }
        .goog-te-banner-frame { display: none !important; }
        .goog-te-spinner-pos { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
      `}</style>
    </>
  );
}
