
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { editImage } from '../services/geminiService';
import Spinner from './Spinner';
import { Icon } from './Icon';

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

interface EditHistoryItem {
  id: number;
  prompt: string;
  originalUrl: string;
  editedUrl: string;
}

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('imageEditingHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load image editing history from localStorage", error);
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    setError(null);
    setEditedImage(null);
    setResponseText(null);
    const url = await fileToDataUrl(file);
    setOriginalImage(url);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt to describe your edit.');
      return;
    }
    if (!originalImage) {
      setError('Please upload an image to edit.');
      return;
    }
    setLoading(true);
    setError(null);
    setEditedImage(null);
    setResponseText(null);
    
    try {
      // Extract base64 data and mime type from data URL
      const [header, data] = originalImage.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

      const result = await editImage(prompt, { data, mimeType });
      
      if (result.imageUrl) {
        setEditedImage(result.imageUrl);
      }
      if (result.text) {
        setResponseText(result.text);
      }

      const newHistoryItem: EditHistoryItem = {
        id: Date.now(),
        prompt,
        originalUrl: originalImage,
        editedUrl: result.imageUrl!,
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 20); // Keep last 20 edits
      setHistory(updatedHistory);
      localStorage.setItem('imageEditingHistory', JSON.stringify(updatedHistory));

    } catch (e: any) {
      setError(e.message || 'Failed to edit image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, originalImage, history]);
  
  const handleSelectFromHistory = (item: EditHistoryItem) => {
    setPrompt(item.prompt);
    setOriginalImage(item.originalUrl);
    setEditedImage(item.editedUrl);
    setError(null);
    setResponseText(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the entire image editing history? This action cannot be undone.')) {
      setHistory([]);
      localStorage.removeItem('imageEditingHistory');
    }
  };


  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-slate-100">AI Image Editor (Gemini)</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Image Panel */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-slate-300">1. Upload an Image</h3>
          <div 
            className="w-full aspect-square bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center p-4 relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleImageUpload(e.dataTransfer.files[0]); }}
          >
            {originalImage ? (
              <>
                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-md" />
                 <button 
                  onClick={() => setOriginalImage(null)} 
                  className="absolute top-2 right-2 bg-slate-900/70 text-white p-1.5 rounded-full hover:bg-red-600 transition-all"
                  title="Remove Image"
                >
                    <Icon name="close" className="w-5 h-5" />
                 </button>
              </>
            ) : (
              <div className="text-center text-slate-500">
                <Icon name="image" className="w-16 h-16 mx-auto text-slate-600" />
                <p>Drag & drop, or click to upload</p>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {originalImage ? 'Change Image' : 'Select Image from Device'}
          </button>
        </div>

        {/* Edited Image Panel */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-slate-300">3. View Result</h3>
          <div className="w-full aspect-square bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center p-4 relative group">
            {loading && <div className="text-center text-slate-400"><Spinner size="lg" /><p className="mt-2">Editing your image...</p></div>}
            {editedImage && !loading && (
              <>
                <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-md shadow-lg" />
                <a
                  href={editedImage}
                  download={`nexus-ai-edited-${Date.now()}.png`}
                  className="absolute bottom-4 right-4 bg-slate-900/70 text-white p-2 rounded-full hover:bg-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                  title="Download Image"
                >
                  <Icon name="download" className="w-6 h-6" />
                </a>
              </>
            )}
            {!editedImage && !loading && (
              <div className="text-center text-slate-500">
                <Icon name="sparkles" className="w-16 h-16 mx-auto text-slate-600" />
                <p>Your edited image will appear here.</p>
              </div>
            )}
          </div>
          {responseText && !loading && (
            <div className="text-sm p-3 bg-slate-900/70 rounded-md text-slate-300 italic">
                <p>{responseText}</p>
            </div>
           )}
        </div>
      </div>
      
      {/* Prompt and Generate Button */}
      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">2. Describe Your Edit</h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Add a futuristic city in the background, make the cat wear a wizard hat, change the season to winter..."
            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200 resize-none h-24"
            disabled={loading || !originalImage}
          />
        </div>
        <div className="flex justify-end">
           <button
            onClick={handleGenerate}
            disabled={loading || !prompt || !originalImage}
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-6 rounded-lg transition-transform duration-200 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? <Spinner /> : <Icon name="edit-image" className="w-5 h-5" />}
            <span>{loading ? 'Generating...' : 'Generate Edit'}</span>
          </button>
        </div>
      </div>
      
      {error && <div className="mt-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}

      {history.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-200">History</h3>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-red-900/50 text-red-300 hover:bg-red-900/80 transition-colors"
              title="Clear all history"
            >
              <Icon name="trash" className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square group cursor-pointer"
                onClick={() => handleSelectFromHistory(item)}
              >
                <img
                  src={item.editedUrl}
                  alt={item.prompt}
                  className="w-full h-full object-cover rounded-lg shadow-md transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-end p-2">
                  <p className="text-xs text-white truncate" title={item.prompt}>{item.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
