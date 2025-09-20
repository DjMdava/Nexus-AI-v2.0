import React, { useState, useCallback } from 'react';
import { generateImage } from '../services/geminiService';
import Spinner from './Spinner';
import { Icon } from './Icon';

type AspectRatio = '1:1' | '16:9' | '9:16';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    setLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      const url = await generateImage(prompt, aspectRatio);
      setImageUrl(url);
    } catch (e: any) {
      setError(e.message || 'Failed to generate image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, aspectRatio]);

  const AspectRatioButton: React.FC<{ value: AspectRatio; label: string }> = ({ value, label }) => (
    <button
      onClick={() => setAspectRatio(value)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        aspectRatio === value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-slate-100">AI Image Generator (Imagen 4)</h2>
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A majestic forest, a cinematic landscape of a futuristic city..."
          className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200 resize-none h-24"
          disabled={loading}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Aspect Ratio</label>
            <div className="flex space-x-2">
              <AspectRatioButton value="1:1" label="Square (1:1)" />
              <AspectRatioButton value="16:9" label="Landscape (16:9)" />
              <AspectRatioButton value="9:16" label="Portrait (9:16)" />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-6 rounded-lg transition-transform duration-200 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
            <span>{loading ? 'Generating...' : 'Generate Image'}</span>
          </button>
        </div>
      </div>
      
      {error && <div className="mt-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}

      <div className="mt-6 min-h-[300px] flex items-center justify-center bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700">
        {loading && <div className="text-center text-slate-400"><Spinner size="lg" /><p className="mt-2">Conjuring your vision...</p></div>}
        {imageUrl && !loading && (
          <div className="p-4 relative group">
            <img src={imageUrl} alt="Generated" className="max-w-full max-h-[500px] rounded-lg shadow-lg" />
            <a
              href={imageUrl}
              download={`nexus-ai-image-${Date.now()}.png`}
              className="absolute bottom-4 right-4 bg-slate-900/70 text-white p-2 rounded-full hover:bg-indigo-600 transition-all opacity-0 group-hover:opacity-100"
              title="Download Image"
            >
              <Icon name="download" className="w-6 h-6" />
            </a>
          </div>
        )}
        {!imageUrl && !loading && (
          <div className="text-center text-slate-500">
            <Icon name="image" className="w-16 h-16 mx-auto text-slate-600" />
            <p>Your generated image will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;