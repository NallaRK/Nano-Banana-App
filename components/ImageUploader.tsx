/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  label: string;
  id: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ file, onFileChange, label, id }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      onFileChange(selectedFile);
    }
  };

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onFileChange(null);
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <h3 className="text-lg font-semibold text-gray-200">{label}</h3>
      <label
        htmlFor={id}
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
          ${isDraggingOver ? 'border-blue-400 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt={`${label} preview`} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white font-bold">Change Image</p>
            </div>
            <button 
                onClick={handleClear}
                className="absolute top-2 right-2 z-10 bg-black/70 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
                aria-label={`Clear ${label} image`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-8 h-8 mb-4 text-gray-400" />
            <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span></p>
            <p className="text-xs text-gray-500">or drag and drop</p>
          </div>
        )}
        <input id={id} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
};

export default ImageUploader;
