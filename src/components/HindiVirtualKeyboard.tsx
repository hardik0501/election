'use client';

import React from 'react';
import { Delete } from 'lucide-react';

interface HindiVirtualKeyboardProps {
  onInsertChar: (char: string) => void;
  onBackspace: () => void;
  onClose: () => void;
}

export const HindiVirtualKeyboard: React.FC<HindiVirtualKeyboardProps> = ({
  onInsertChar,
  onBackspace,
  onClose,
}) => {
  const vowels = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'ऋ'];
  const matras = ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं', '्', '़'];
  const consonantsRow1 = ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ'];
  const consonantsRow2 = ['ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न'];
  const consonantsRow3 = ['प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श'];
  const consonantsRow4 = ['ष', 'स', 'ह', 'क्ष', 'त्र', 'ज्ञ', 'श्र', 'ड़', 'ढ़', '।'];

  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-400">हिंदी वर्चुअल कीबोर्ड</span>
          <span className="text-[11px] text-slate-400">(Devanagari Quick Input)</span>
        </div>
        <button
          onClick={onClose}
          className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          ✕ बंद करें
        </button>
      </div>

      <div className="space-y-2">
        {/* Vowels */}
        <div className="flex flex-wrap gap-1">
          {vowels.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onInsertChar(char)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-600 hover:text-slate-950 font-devanagari"
            >
              {char}
            </button>
          ))}
        </div>

        {/* Matras */}
        <div className="flex flex-wrap gap-1">
          {matras.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onInsertChar(char)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-950/60 border border-teal-800/50 text-base font-bold text-teal-300 transition-colors hover:bg-teal-500 hover:text-slate-950 font-devanagari"
            >
              क{char}
            </button>
          ))}
          <button
            type="button"
            onClick={onBackspace}
            className="flex h-9 px-3 items-center justify-center gap-1 rounded-lg bg-rose-950/60 border border-rose-800/50 text-xs font-semibold text-rose-300 hover:bg-rose-600 hover:text-white ml-auto"
          >
            <Delete className="h-4 w-4" />
            Delete
          </button>
        </div>

        {/* Consonant Rows */}
        <div className="flex flex-wrap gap-1">
          {consonantsRow1.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onInsertChar(char)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/90 text-sm font-medium text-slate-100 hover:bg-slate-700 hover:text-white font-devanagari"
            >
              {char}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {consonantsRow2.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onInsertChar(char)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/90 text-sm font-medium text-slate-100 hover:bg-slate-700 hover:text-white font-devanagari"
            >
              {char}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {consonantsRow3.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onInsertChar(char)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/90 text-sm font-medium text-slate-100 hover:bg-slate-700 hover:text-white font-devanagari"
            >
              {char}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {consonantsRow4.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onInsertChar(char)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/90 text-sm font-medium text-slate-100 hover:bg-slate-700 hover:text-white font-devanagari"
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
