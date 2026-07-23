'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check } from 'lucide-react';
import { usePathname } from 'next/navigation';

const LANGUAGES = [
  { code: 'en', name: 'English', localName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', localName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', localName: 'తెలుగు', flag: '🇮🇳' }
];

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isDark = pathname?.includes('/worker');

  useEffect(() => {
    // Read the googtrans cookie to set initial state
    const match = document.cookie.match(new RegExp('(^| )googtrans=([^;]+)'));
    if (match) {
      const val = match[2];
      const lang = val.split('/')[2];
      if (lang) {
        setCurrentLang(lang);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (code: string) => {
    setCurrentLang(code);
    setIsOpen(false);
    
    // Set Google Translate cookie
    // Format: /source_lang/target_lang
    const cookieString = code === 'en' ? `/en/en` : `/en/${code}`;
    document.cookie = `googtrans=${cookieString}; path=/`;
    document.cookie = `googtrans=${cookieString}; path=/; domain=${window.location.hostname}`;
    
    // Reload to apply translation
    window.location.reload();
  };

  const activeLang = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative z-50 select-none" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border border-transparent rounded-full transition-all cursor-pointer active:scale-95 ${
          isDark 
            ? 'text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20' 
            : 'text-slate-600 hover:bg-slate-100 hover:border-slate-200'
        }`}
      >
        <Globe className="h-4 w-4" />
        <span className="text-[11px] font-black font-mono hidden sm:block uppercase tracking-widest">{activeLang.code}</span>
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-48 border rounded-2xl py-2 animate-fade-in-up ${
          isDark 
            ? 'bg-[#0F172A] border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]' 
            : 'bg-white border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]'
        }`}>
          <div className={`px-4 py-2 border-b mb-1 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">Select Language</span>
          </div>
          <div className="space-y-0.5 px-1">
            {LANGUAGES.map((lang) => {
              const isSelected = currentLang === lang.code;
              let btnClass = isDark
                ? (isSelected ? 'bg-orange-500/10 text-[#FF7A00]' : 'text-slate-300 hover:bg-white/5 hover:text-white')
                : (isSelected ? 'bg-orange-50 text-[#F97316]' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900');

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${btnClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{lang.flag}</span>
                    <div className="flex flex-col items-start">
                      <span className="text-[13px] font-black leading-none">{lang.name}</span>
                      <span className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lang.localName}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#F97316] stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
