
import React, { useState, useCallback } from 'react';
import { generateVideo } from '../services/geminiService';
import Spinner from './Spinner';
import { Icon } from './Icon';

const loadingMessages = [
  "Warming up the video engine...",
  "Generating initial storyboard...",
  "Rendering high-resolution frames (this can take a moment)...",
  "Applying visual effects...",
  "Encoding your masterpiece...",
  "Finalizing and preparing for download...",
];

const VideoCreator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage(loadingMessages[0]);
    
    try {
      let messageIndex = 0;
      const url = await generateVideo(prompt, () => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      });
      setVideoUrl(url);
    } catch (e: any) {
      setError(e.message || 'Failed to generate video. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-slate-100">Video Creator AI Engine (Veo)</h2>
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A neon hologram of a cat driving at top speed, a serene lake at sunrise with mist rolling over the water..."
          className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200 resize-none h-24"
          disabled={loading}
        />
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-6 rounded-lg transition-transform duration-200 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
            <span>{loading ? 'Generating...' : 'Generate Video'}</span>
          </button>
        </div>
      </div>
      
      {error && <div className="mt-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}

      <div className="mt-6 min-h-[300px] flex items-center justify-center bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700">
        {loading && (
          <div className="text-center text-slate-400 p-4">
            <Spinner size="lg" />
            <p className="mt-4 font-medium">{loadingMessage}</p>
            <p className="text-sm text-slate-500 mt-1">Video generation can take a few minutes. Please be patient.</p>
          </div>
        )}
        {videoUrl && !loading && (
          <div className="p-4 w-full">
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg shadow-lg">
              Your browser does not support the video tag.
            </video>
             <a
              href={videoUrl}
              download={`nexus-ai-video-${Date.now()}.mp4`}
              className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              <Icon name="download" className="w-5 h-5" />
              Download Video
            </a>
          </div>
        )}
        {!videoUrl && !loading && (
          <div className="text-center text-slate-500">
            <Icon name="video" className="w-16 h-16 mx-auto text-slate-600" />
            <p>Your generated video will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCreator;
