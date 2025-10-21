/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { EnhanceQualityIcon } from './icons';

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  onEnhanceQuality?: () => void; // Made optional
  isLoading: boolean;
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, onEnhanceQuality, isLoading }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const lightingPresets = [
    { name: 'Soft Fill Light', prompt: 'Apply soft, professional studio lighting that is even and flattering, minimizing harsh shadows and hot spots. Create subtle depth and dimension, with a gentle catchlight in the eyes.' },
    { name: 'Top-Left Key Light', prompt: 'Refine the lighting to be a gentle, directional, and slightly diffused softbox light from the top-left.' },
    { name: 'Classic Portrait', prompt: 'Introduce a soft, diffused key light from the front-right to create gentle, flattering shadows. Add a subtle, warm rim light from the left to separate the subject from the background.' },
    { name: 'Glamour Shot', prompt: 'Optimize the lighting with multiple softboxes and a spotlight to create brilliant highlights, deep shadows, and crisp reflections that emphasize sparkle and intricate details.' },
    { name: 'Dramatic Sculptural', prompt: 'Utilize a mix of hard and soft studio lighting for a high-contrast, sculptural look. Use a strong key light to define features and a subtle rim light to create a powerful halo effect, emphasizing the silhouette.' },
  ];

  const generalPresets = [
    { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
    { name: 'Enhance Details', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
    { name: 'Warmer Lighting', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
  ];

  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = () => {
    if (activePrompt) {
      onApplyAdjustment(activePrompt);
    }
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      {onEnhanceQuality && (
        <>
            <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-black/20 rounded-lg">
                <div className="flex-shrink-0 text-cyan-300">
                <EnhanceQualityIcon className="w-10 h-10" />
                </div>
                <div className="flex-grow text-center md:text-left">
                <h3 className="text-lg font-semibold text-gray-200">Enhance Quality</h3>
                <p className="text-sm text-gray-400">
                    Intelligently upscale resolution, reduce noise, and sharpen details.
                </p>
                </div>
                <button
                onClick={onEnhanceQuality}
                disabled={isLoading}
                className="w-full md:w-auto flex-shrink-0 bg-gradient-to-br from-cyan-600 to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-cyan-800 disabled:to-cyan-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                >
                Enhance
                </button>
            </div>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-400 font-semibold">OR</span>
                <div className="flex-grow border-t border-gray-600"></div>
            </div>
        </>
      )}
      
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-center text-gray-300 -mt-2">Apply a Studio Lighting Preset</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {lightingPresets.map(preset => (
            <button
                key={preset.name}
                onClick={() => handlePresetClick(preset.prompt)}
                disabled={isLoading}
                className={`w-full text-center bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/20 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500' : ''}`}
            >
                {preset.name}
            </button>
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-2">
        <h3 className="text-lg font-semibold text-center text-gray-300">Or a General Adjustment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {generalPresets.map(preset => (
            <button
                key={preset.name}
                onClick={() => handlePresetClick(preset.prompt)}
                disabled={isLoading}
                className={`w-full text-center bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500' : ''}`}
            >
                {preset.name}
            </button>
            ))}
        </div>
      </div>


      <textarea
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe a custom adjustment..."
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base resize-y"
        disabled={isLoading}
        rows={3}
      />

      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
            <button
                onClick={handleApply}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !activePrompt.trim()}
            >
                Apply Adjustment
            </button>
        </div>
      )}
    </div>
  );
};

export default AdjustmentPanel;