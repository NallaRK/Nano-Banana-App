/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import { WhiskIcon } from './icons';
import Spinner from './Spinner';

interface WhiskPanelProps {
  onWhisk: (subject: File, scene: File, style: File) => void;
  onBack: () => void;
  isLoading: boolean;
}

const WhiskPanel: React.FC<WhiskPanelProps> = ({ onWhisk, onBack, isLoading }) => {
  const [subjectFile, setSubjectFile] = useState<File | null>(null);
  const [sceneFile, setSceneFile] = useState<File | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);

  const canWhisk = subjectFile && sceneFile && styleFile;

  const handleWhiskClick = () => {
    if (canWhisk) {
      onWhisk(subjectFile, sceneFile, styleFile);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 animate-fade-in text-center p-4">
       {isLoading && (
          <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
              <Spinner />
              <p className="text-gray-300">AI is creating your masterpiece...</p>
          </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
          Create with <span className="text-cyan-400">Whisk AI</span>
        </h1>
        <p className="max-w-2xl text-md text-gray-400 md:text-lg">
          Combine three images to generate something entirely new. Upload a subject, a scene, and a style to begin.
        </p>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <ImageUploader file={subjectFile} onFileChange={setSubjectFile} label="Subject" id="subject-upload" />
        <ImageUploader file={sceneFile} onFileChange={setSceneFile} label="Scene" id="scene-upload" />
        <ImageUploader file={styleFile} onFileChange={setStyleFile} label="Style" id="style-upload" />
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={handleWhiskClick}
          disabled={!canWhisk || isLoading}
          className="relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full cursor-pointer group transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-gray-700 disabled:to-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          <WhiskIcon className="w-7 h-7 mr-3" />
          Whisk Images
        </button>
        <button
          onClick={onBack}
          disabled={isLoading}
          className="font-semibold text-gray-400 hover:text-white transition-colors py-2 px-4"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default WhiskPanel;
