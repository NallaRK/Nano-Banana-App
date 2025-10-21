/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import FilterPanel from './FilterPanel';
import AdjustmentPanel from './AdjustmentPanel';
import Spinner from './Spinner';
import { DownloadIcon, ZipIcon } from './icons';

interface BatchPanelProps {
  originalImages: File[];
  processedImages: (File | null)[];
  onApplyFilter: (prompt: string) => void;
  onApplyAdjustment: (prompt: string) => void;
  onDownloadAll: () => void;
  onStartOver: () => void;
  isLoading: boolean;
  progress: { processed: number, total: number } | null;
  isProcessingComplete: boolean;
  error: string | null;
  clearError: () => void;
}

const ImageThumbnail: React.FC<{ originalFile: File, processedFile: File | null, hasFailed: boolean }> = ({ originalFile, processedFile, hasFailed }) => {
    const [url, setUrl] = useState('');
    const fileToDisplay = processedFile || originalFile;

    useEffect(() => {
        if (!fileToDisplay) return;
        const objectUrl = URL.createObjectURL(fileToDisplay);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [fileToDisplay]);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!processedFile) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = `processed-${processedFile.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!url) return <div className="aspect-square bg-gray-900 rounded-lg animate-pulse"></div>;

    return (
        <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden group shadow-lg">
            <img src={url} alt={originalFile.name} className="w-full h-full object-cover" />
            {processedFile && (
                <button onClick={handleDownload} className="absolute bottom-2 right-2 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-blue-500 transition-colors opacity-0 group-hover:opacity-100" aria-label={`Download ${originalFile.name}`}>
                    <DownloadIcon className="w-5 h-5" />
                </button>
            )}
            {hasFailed && (
                <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center text-center p-2">
                    <p className="text-white font-bold text-sm">Processing Failed</p>
                </div>
            )}
        </div>
    );
};

const BatchPanel: React.FC<BatchPanelProps> = ({
  originalImages,
  processedImages,
  onApplyFilter,
  onApplyAdjustment,
  onDownloadAll,
  onStartOver,
  isLoading,
  progress,
  isProcessingComplete,
  error,
  clearError
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'adjust'>('filters');

  const hasAnyProcessed = processedImages.some(img => img !== null);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in relative">
      {isLoading && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4 animate-fade-in backdrop-blur-sm">
          <Spinner />
          <p className="text-gray-300 text-lg font-medium">Applying AI to your images...</p>
          {progress && (
            <div className="w-64 bg-gray-700 rounded-full h-2.5 mt-2">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(progress.processed / progress.total) * 100}%` }}></div>
            </div>
          )}
          {progress && <p className="text-gray-400">{`Processing ${progress.processed} of ${progress.total}`}</p>}
        </div>
      )}
      
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-100">Batch Processing</h2>
        <p className="text-lg text-gray-400 mt-1">{originalImages.length} images loaded</p>
      </div>

      <div className="w-full max-w-4xl bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
        {(['filters', 'adjust'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                activeTab === tab 
                ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

       <div className="w-full max-w-4xl">
            {activeTab === 'filters' && <FilterPanel onApplyFilter={onApplyFilter} isLoading={isLoading} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={onApplyAdjustment} isLoading={isLoading} />}
       </div>

        {error && (
             <div className="w-full max-w-4xl text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center justify-between gap-4">
              <p className="text-md text-red-400">{error}</p>
              <button
                  onClick={clearError}
                  className="bg-red-500/20 hover:bg-red-500/40 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors"
                >
                  Dismiss
              </button>
            </div>
        )}

      <div className="w-full border-t border-gray-700 my-4"></div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {originalImages.map((original, index) => {
            const processed = processedImages[index];
            const hasFailed = isProcessingComplete && !processed;
            return <ImageThumbnail key={index} originalFile={original} processedFile={processed} hasFailed={hasFailed} />;
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
        <button 
            onClick={onStartOver}
            className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-6 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
        >
            Start Over
        </button>
        <button 
            onClick={onDownloadAll}
            disabled={!hasAnyProcessed || isLoading}
            className="flex items-center justify-center gap-3 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
            <ZipIcon className="w-6 h-6" />
            Download All (.zip)
        </button>
      </div>

    </div>
  );
};

export default BatchPanel;