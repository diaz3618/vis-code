'use client';

import React from 'react';

type LanguageSelectorProps = {
  currentLanguage: string;
  availableLanguages: string[];
  onLanguageChange: (language: string) => void;
};

export default function LanguageSelector({
  currentLanguage,
  availableLanguages,
  onLanguageChange
}: LanguageSelectorProps) {
  if (availableLanguages.length <= 1) {
    return null; // Don't show selector if only one language is available
  }

  return (
    <div className="flex items-center space-x-2 mb-4">
      <span className="text-sm font-medium text-gray-700">Language:</span>
      <div className="flex border rounded-md overflow-hidden">
        {availableLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-3 py-1 text-sm ${
              currentLanguage === lang
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {lang.charAt(0).toUpperCase() + lang.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
