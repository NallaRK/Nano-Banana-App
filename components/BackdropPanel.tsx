/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import { BackdropIcon } from './icons';
import Spinner from './Spinner';

interface BackdropPanelProps {
  onExtendBackdrop: () => void;
  onReplaceBackdrop: (backgroundImage: File) => void;
  isLoading: boolean;
}

const BackdropPanel: React.FC<BackdropPanelProps> = ({ onExtendBackdrop, onReplaceBackdrop, isLoading }) => {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleReplaceClick = () => {
    if (backgroundFile) {
      onReplaceBackdrop(backgroundFile);
    }
  };
  
  const handleLoadFromUrl = async () => {
    if (!imageUrl.trim()) return;
    setIsFetchingUrl(true);
    setUrlError(null);
    setBackgroundFile(null);

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image. Server responded with status: ${response.status}`);
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('The URL did not point to a valid image file (e.g., JPEG, PNG).');
      }
      // Try to get a filename from the URL
      const urlPath = new URL(imageUrl).pathname;
      const filename = urlPath.substring(urlPath.lastIndexOf('/') + 1) || `background-from-url.png`;
      
      const file = new File([blob], filename, { type: blob.type });
      setBackgroundFile(file);
      setImageUrl('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setUrlError(`Could not load image. Please check the URL and try again. Note: Some websites may block direct image loading (CORS policy). Error: ${message}`);
    } finally {
      setIsFetchingUrl(false);
    }
  };


  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-6 animate-fade-in backdrop-blur-sm">
      {/* Extend Backdrop Section */}
      <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-black/20 rounded-lg">
        <div className="flex-shrink-0">
          <BackdropIcon className="w-10 h-10 text-blue-400" />
        </div>
        <div className="flex-grow text-center md:text-left">
          <h3 className="text-lg font-semibold text-gray-200">Extend Backdrop</h3>
          <p className="text-sm text-gray-400">
            Let AI seamlessly extend the existing background to fill the entire image.
          </p>
        </div>
        <button
          onClick={onExtendBackdrop}
          disabled={isLoading}
          className="w-full md:w-auto flex-shrink-0 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          Extend
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink mx-4 text-gray-400 font-semibold">OR</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>

      {/* Replace Backdrop Section */}
      <div className="flex flex-col items-center gap-4 p-4 bg-black/20 rounded-lg">
        <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-200">Replace Backdrop</h3>
            <p className="text-sm text-gray-400">
                Upload a new background and the AI will blend your subject into the new scene.
            </p>
        </div>
        <div className="w-full max-w-sm">
            <ImageUploader 
                file={backgroundFile}
                onFileChange={setBackgroundFile} 
                label="Upload New Background"
                id="background-upload" 
            />
        </div>
        
        <div className="relative w-full max-w-sm flex items-center mt-2">
            <div className="flex-grow border-t border-gray-600/50"></div>
            <span className="flex-shrink mx-2 text-gray-500 text-xs">or use URL</span>
            <div className="flex-grow border-t border-gray-600/50"></div>
        </div>

        <div className="w-full max-w-sm flex gap-2">
            <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL here"
                className="flex-grow bg-gray-900/50 border border-gray-600 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || isFetchingUrl}
            />
            <button
                onClick={handleLoadFromUrl}
                disabled={isLoading || isFetchingUrl || !imageUrl.trim()}
                className="flex-shrink-0 bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-cyan-500 active:scale-95 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isFetchingUrl ? 'Loading...' : 'Load'}
            </button>
        </div>
        
        {urlError && <p className="text-red-400 text-sm text-center max-w-sm mt-2">{urlError}</p>}

        {(backgroundFile || isFetchingUrl) && (
            <div className="w-full max-w-sm mt-4">
              {isFetchingUrl ? (
                <div className="flex justify-center items-center h-14">
                  <Spinner />
                </div>
              ) : (
                <button
                  onClick={handleReplaceClick}
                  disabled={isLoading || !backgroundFile}
                  className="w-full bg-gradient-to-br from-cyan-600 to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-cyan-800 disabled:to-cyan-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none animate-fade-in"
              >
                  Replace Background
              </button>
              )}
            </div>
        )}
      </div>
    </div>
  );
};

export default BackdropPanel;
