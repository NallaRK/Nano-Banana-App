/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { 
    generateEditedImage, 
    generateFilteredImage, 
    generateAdjustedImage, 
    generateWhiskedImage,
    generateExtendedBackdrop,
    generateReplacedBackdrop,
    generateEnhancedImage,
} from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import BackdropPanel from './components/BackdropPanel';
import { UndoIcon, RedoIcon, CompareViewIcon, SliderHandleIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import WhiskPanel from './components/WhiskPanel';
import BatchPanel from './components/BatchPanel';
import JSZip from 'jszip';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'retouch' | 'backdrop' | 'adjust' | 'filters' | 'crop';
type ViewMode = 'start' | 'editor' | 'whisk' | 'batch';

const App: React.FC = () => {
  // Single image editor state
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const imgRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Compare mode state
  const [isCompareModeActive, setIsCompareModeActive] = useState<boolean>(false);
  const [compareSliderPosition, setCompareSliderPosition] = useState<number>(50);
  const [isDraggingComparer, setIsDraggingComparer] = useState<boolean>(false);

  // Batch processing state
  const [batchImages, setBatchImages] = useState<File[]>([]);
  const [processedBatchImages, setProcessedBatchImages] = useState<(File | null)[]>([]);
  const [processingProgress, setProcessingProgress] = useState<{ processed: number; total: number } | null>(null);
  const [isBatchProcessingComplete, setIsBatchProcessingComplete] = useState<boolean>(false);

  // Global state
  const [viewMode, setViewMode] = useState<ViewMode>('start');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsCompareModeActive(false);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setViewMode('editor');
    setIsCompareModeActive(false);
  }, []);

  const handleBatchUpload = useCallback((files: File[]) => {
    setError(null);
    setBatchImages(files);
    setProcessedBatchImages(new Array(files.length).fill(null));
    setIsBatchProcessingComplete(false);
    setViewMode('batch');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleEnhanceQuality = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to enhance.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const enhancedImageUrl = await generateEnhancedImage(currentImage);
        const newImageFile = dataURLtoFile(enhancedImageUrl, `enhanced-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to enhance image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleExtendBackdrop = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to extend.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const extendedImageUrl = await generateExtendedBackdrop(currentImage);
        const newImageFile = dataURLtoFile(extendedImageUrl, `extended-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to extend backdrop. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
}, [currentImage, addImageToHistory]);

const handleReplaceBackdrop = useCallback(async (backgroundImage: File) => {
    if (!currentImage) {
      setError('No image loaded for backdrop replacement.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const replacedImageUrl = await generateReplacedBackdrop(currentImage, backgroundImage);
        const newImageFile = dataURLtoFile(replacedImageUrl, `replaced-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to replace backdrop. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
}, [currentImage, addImageToHistory]);

  const handleWhiskGenerate = useCallback(async (subject: File, scene: File, style: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const whiskedImageUrl = await generateWhiskedImage(subject, scene, style);
      const newImageFile = dataURLtoFile(whiskedImageUrl, `whisked-${Date.now()}.png`);
      setHistory([newImageFile]);
      setHistoryIndex(0);
      setViewMode('editor');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to whisk images. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBatchApply = useCallback(async (
    prompt: string, 
    generator: (image: File, prompt: string) => Promise<string>,
    type: string
    ) => {
      setIsLoading(true);
      setError(null);
      setIsBatchProcessingComplete(false);
      setProcessingProgress({ processed: 0, total: batchImages.length });

      const results = await Promise.allSettled(
        batchImages.map(async (image, index) => {
          try {
            const result = await generator(image, prompt);
            const newFile = dataURLtoFile(result, `${type}-${index}-${image.name}`);
            setProcessingProgress(prev => prev ? ({ ...prev, processed: prev.processed + 1 }) : null);
            return newFile;
          } catch (err) {
            console.error(`Failed to process image ${index} (${image.name}):`, err);
            setProcessingProgress(prev => prev ? ({ ...prev, processed: prev.processed + 1 }) : null);
            throw err;
          }
        })
      );

      const newProcessedImages = results.map(result => 
          result.status === 'fulfilled' ? result.value : null
      );
      
      setProcessedBatchImages(newProcessedImages);
      setIsLoading(false);
      setIsBatchProcessingComplete(true);
      setProcessingProgress(null);

      const failedCount = newProcessedImages.filter(img => img === null).length;
      if (failedCount > 0) {
          setError(`${failedCount} out of ${batchImages.length} image(s) could not be processed. They may have been blocked due to safety policies.`);
      }
  }, [batchImages]);

  const handleBatchApplyFilter = (filterPrompt: string) => handleBatchApply(filterPrompt, generateFilteredImage, 'filtered');
  const handleBatchApplyAdjustment = (adjustmentPrompt: string) => handleBatchApply(adjustmentPrompt, generateAdjustedImage, 'adjusted');

  const handleDownloadAll = useCallback(async () => {
    const zip = new JSZip();
    processedBatchImages.forEach((file) => {
        if (file) {
            zip.file(file.name || `image_${Date.now()}.png`, file);
        }
    });

    if (Object.keys(zip.files).length === 0) {
        setError("No processed images to download.");
        return;
    }

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'rakhi_visuals_processed_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (err) {
        console.error("Failed to create zip file", err);
        setError("Could not create zip file.");
    }
}, [processedBatchImages]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setIsCompareModeActive(false);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setBatchImages([]);
      setProcessedBatchImages([]);
      setIsBatchProcessingComplete(false);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setViewMode('start');
      setIsCompareModeActive(false);
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (files.length === 1) {
      handleImageUpload(files[0]);
    } else {
      handleBatchUpload(Array.from(files));
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch' || isCompareModeActive) return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
  };

  const handleToggleCompareMode = () => {
    setIsCompareModeActive(prev => {
        if (!prev) { 
            setCompareSliderPosition(50);
        }
        return !prev;
    });
  };

  // --- Compare Slider Logic ---
  const handleComparerMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingComparer(true);
  };
  const handleComparerTouchStart = (e: React.TouchEvent) => {
      setIsDraggingComparer(true);
  };
  const handleComparerActionEnd = useCallback(() => {
      setIsDraggingComparer(false);
  }, []);
  
  const handleComparerActionMove = useCallback((clientX: number) => {
    if (!isDraggingComparer || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setCompareSliderPosition(position);
  }, [isDraggingComparer]);
  
  const handleComparerMouseMove = useCallback((e: MouseEvent) => {
    handleComparerActionMove(e.clientX);
  }, [handleComparerActionMove]);
  
  const handleComparerTouchMove = useCallback((e: TouchEvent) => {
    handleComparerActionMove(e.touches[0].clientX);
  }, [handleComparerActionMove]);
  
  useEffect(() => {
      if (isDraggingComparer) {
          window.addEventListener('mousemove', handleComparerMouseMove);
          window.addEventListener('mouseup', handleComparerActionEnd);
          window.addEventListener('touchmove', handleComparerTouchMove);
          window.addEventListener('touchend', handleComparerActionEnd);
      }
      return () => {
          window.removeEventListener('mousemove', handleComparerMouseMove);
          window.removeEventListener('mouseup', handleComparerActionEnd);
          window.removeEventListener('touchmove', handleComparerTouchMove);
          window.removeEventListener('touchend', handleComparerActionEnd);
      };
  }, [isDraggingComparer, handleComparerMouseMove, handleComparerActionEnd, handleComparerTouchMove]);
  // --- End Compare Slider Logic ---


  const renderContent = () => {
    if (error && viewMode !== 'batch') {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    switch (viewMode) {
      case 'start':
        return <StartScreen onFileSelect={handleFileSelect} onSwitchToWhisk={() => setViewMode('whisk')} />;
      case 'whisk':
        return <WhiskPanel onWhisk={handleWhiskGenerate} onBack={() => setViewMode('start')} isLoading={isLoading} />;
      case 'batch':
        return <BatchPanel
            originalImages={batchImages}
            processedImages={processedBatchImages}
            onApplyFilter={handleBatchApplyFilter}
            onApplyAdjustment={handleBatchApplyAdjustment}
            onDownloadAll={handleDownloadAll}
            onStartOver={handleUploadNew}
            isLoading={isLoading}
            progress={processingProgress}
            isProcessingComplete={isBatchProcessingComplete}
            error={error}
            clearError={() => setError(null)}
        />;
    }
    
    if (!currentImageUrl) {
        // Should not happen if viewMode is 'editor', but as a fallback
        return <StartScreen onFileSelect={handleFileSelect} onSwitchToWhisk={() => setViewMode('whisk')} />;
    }
    
    const imageDisplay = (
      <>
        {/* Base image is the original, always at the bottom */}
        {originalImageUrl && (
            <img
                key={originalImageUrl}
                src={originalImageUrl}
                alt="Original"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
            />
        )}
        {/* The current image is an overlay that gets clipped for comparison */}
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl}
            alt="Current"
            onClick={!isCompareModeActive ? handleImageClick : undefined}
            style={{ clipPath: isCompareModeActive ? `inset(0 ${100 - compareSliderPosition}% 0 0)` : undefined }}
            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl ${activeTab === 'retouch' && !isCompareModeActive ? 'cursor-crosshair' : ''}`}
        />
        {/* Comparison Slider Handle */}
        {isCompareModeActive && (
            <div
                className="absolute top-0 bottom-0 w-1 bg-white/75 cursor-ew-resize select-none z-20"
                style={{ left: `calc(${compareSliderPosition}% - 2px)`}}
                onMouseDown={handleComparerMouseDown}
                onTouchStart={handleComparerTouchStart}
            >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-white/80 border-2 border-white flex items-center justify-center shadow-2xl backdrop-blur-sm">
                   <SliderHandleIcon className="w-6 h-6 text-gray-700" />
                </div>
            </div>
        )}
      </>
    );
    
    // For ReactCrop, we need a single image element. We'll use the current one.
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-full flex items-center gap-2">
            <button 
                onClick={handleUndo}
                disabled={!canUndo || isCompareModeActive}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-4 h-4 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo || isCompareModeActive}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-4 h-4 mr-2" />
                Redo
            </button>
            
            <div className="h-5 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            {canUndo && (
                <button
                    onClick={handleToggleCompareMode}
                    className={`flex items-center justify-center text-center border font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out active:scale-95 text-sm ${
                        isCompareModeActive
                        ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 hover:border-white/30'
                    }`}
                    aria-label={isCompareModeActive ? "Exit compare mode" : "Compare original and edited image"}
                  >
                      <CompareViewIcon className="w-4 h-4 mr-2" />
                      Compare
                  </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo || isCompareModeActive}
                className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>

            <button 
                onClick={handleUploadNew}
                className="ml-auto text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-sm"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-sm"
            >
                Download Image
            </button>
        </div>
      
        <div ref={imageContainerRef} className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}
            
            {activeTab === 'crop' && !isCompareModeActive ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspot && !isLoading && activeTab === 'retouch' && !isCompareModeActive && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            {(['retouch', 'backdrop', 'crop', 'adjust', 'filters'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    disabled={isCompareModeActive}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base disabled:opacity-50 disabled:cursor-not-allowed ${
                        activeTab === tab && !isCompareModeActive
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
        
        {!isCompareModeActive && (
            <div className="w-full animate-fade-in">
                {activeTab === 'retouch' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-md text-gray-400">
                            {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                        </p>
                        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                                className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isLoading || !editHotspot}
                            />
                            <button 
                                type="submit"
                                className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                                disabled={isLoading || !prompt.trim() || !editHotspot}
                            >
                                Generate
                            </button>
                        </form>
                    </div>
                )}
                {activeTab === 'backdrop' && <BackdropPanel onExtendBackdrop={handleExtendBackdrop} onReplaceBackdrop={handleReplaceBackdrop} isLoading={isLoading} />}
                {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
                {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} onEnhanceQuality={handleEnhanceQuality} isLoading={isLoading} />}
                {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
            </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${viewMode === 'editor' ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
