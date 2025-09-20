import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { Icon } from './Icon';
import { Message, MessagePart, Persona, defaultPersonas } from '../types';
import Spinner from './Spinner';
import { ai } from '../services/geminiService';
import { usePersonas } from '../hooks/usePersona';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const PersonaCreatorModal: React.FC<{
    onClose: () => void;
    onSave: (persona: Omit<Persona, 'id'>) => void;
}> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [instruction, setInstruction] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');

    const handleSave = () => {
        if(name.trim() && instruction.trim() && welcomeMessage.trim()) {
            onSave({ name, instruction, welcomeMessage });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
                <h3 className="text-xl font-bold mb-4">Create Custom Persona</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Persona Name (e.g., 'Sarcastic Robot')"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                        placeholder="Instruction Prompt (e.g., 'You are a sarcastic robot that begrudgingly helps people.')"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    />
                    <textarea
                        placeholder="Welcome Message (e.g., 'Oh, great. Another human. What do you want?')"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:bg-indigo-400" disabled={!name.trim() || !instruction.trim() || !welcomeMessage.trim()}>Save Persona</button>
                </div>
            </div>
        </div>
    );
};

const Chatbot: React.FC = () => {
  const { personas, savePersona, deletePersona } = usePersonas();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('Professional');
  const [isCreating, setIsCreating] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const personaConfig = personas[selectedPersonaId] || personas['Professional'];
  const isCustomPersona = selectedPersonaId && !defaultPersonas[selectedPersonaId];

  useEffect(() => {
    try {
        const saved = localStorage.getItem('selectedPersonaId');
        if (saved && personas[saved]) {
            setSelectedPersonaId(saved);
        }
    } catch (e) { console.error("Could not read selected persona from localStorage", e); }
  }, [personas]);

  useEffect(() => {
    try {
        localStorage.setItem('selectedPersonaId', selectedPersonaId);
    } catch (e) { console.error("Could not save selected persona to localStorage", e); }
  }, [selectedPersonaId]);

  useEffect(() => {
    if (!personaConfig) return;
    try {
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: personaConfig.instruction,
        },
      });
      setMessages([{ role: 'model', parts: [{ text: personaConfig.welcomeMessage }] }]);
      setError(null);
    } catch (e: any) {
      setError("Failed to initialize AI Chat. Please check your API key and refresh the page.");
      setMessages([]);
    }
  }, [personaConfig]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSavePersona = (newPersona: Omit<Persona, 'id'>) => {
    const id = `custom-${Date.now()}`;
    savePersona({ ...newPersona, id });
    setIsCreating(false);
    setSelectedPersonaId(id);
  };

  const handleDeletePersona = () => {
    if (!isCustomPersona) return;
    deletePersona(selectedPersonaId);
    setSelectedPersonaId('Professional');
  };

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !attachedFile) || loading) return;

    setLoading(true);
    setError(null);

    const userParts: MessagePart[] = [];
    if (attachedFile) {
      try {
        const imagePart = await fileToGenerativePart(attachedFile);
        userParts.push(imagePart);
      } catch (e) {
        setError("Failed to process the attached file.");
        setLoading(false);
        return;
      }
    }
    if (input.trim()) {
      userParts.push({ text: input });
    }

    const userMessage: Message = { role: 'user', parts: userParts };
    setMessages(prev => [...prev, userMessage]);
    
    const streamInput = { message: userParts };
    setInput('');
    setAttachedFile(null);

    try {
      if (!chatRef.current) throw new Error("Chat not initialized.");
      const stream = await chatRef.current.sendMessageStream(streamInput);

      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);
      
      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', parts: [{ text: modelResponse }] };
          return newMessages;
        });
      }
    } catch (e: any) {
        const errorMessage = e.message || 'An error occurred while getting a response.';
        setError(errorMessage);
        setMessages(prev => [...prev.slice(0, -1)]);
    } finally {
      setLoading(false);
    }
  }, [input, attachedFile, loading]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAttachedFile(event.target.files[0]);
    }
  };

  const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-lg p-3 rounded-2xl ${isUser ? 'bg-indigo-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
          {message.parts.map((part, index) => (
            <div key={index}>
              {part.inlineData && (
                <img 
                  src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                  alt="User upload" 
                  className="rounded-lg mb-2 max-w-xs"
                />
              )}
              {part.text && <p className="whitespace-pre-wrap">{part.text}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const customPersonas = Object.values(personas).filter(p => !defaultPersonas[p.id]);

  return (
    <>
      {isCreating && <PersonaCreatorModal onClose={() => setIsCreating(false)} onSave={handleSavePersona} />}
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 flex flex-col h-[70vh] animate-fade-in">
        <div className="flex flex-wrap justify-between items-center p-4 border-b border-slate-700 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">AI Chatbot (Gemini)</h2>
          <div className="flex items-center gap-2">
              <select
                  id="persona-select"
                  value={selectedPersonaId}
                  onChange={(e) => setSelectedPersonaId(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-md py-1.5 px-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  aria-label="Choose a persona for the chatbot"
              >
                  <optgroup label="Default Personas">
                    {Object.values(defaultPersonas).map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                    ))}
                  </optgroup>
                  {customPersonas.length > 0 && <optgroup label="Custom Personas">
                    {customPersonas.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                    ))}
                  </optgroup>}
              </select>
              <button onClick={() => setIsCreating(true)} className="p-1.5 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-colors" title="Create new persona">
                <Icon name="sparkles" className="w-5 h-5" />
              </button>
              {isCustomPersona && (
                <button onClick={handleDeletePersona} className="p-1.5 rounded-md text-sm font-medium bg-red-900/50 hover:bg-red-900/80 text-red-300 transition-colors" title="Delete current persona">
                    <Icon name="close" className="w-5 h-5" />
                </button>
              )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => <MessageBubble key={index} message={msg} />)}
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
               <div className="max-w-lg p-3 rounded-2xl bg-slate-700 rounded-bl-none flex items-center">
                  <Spinner /> <span className="ml-2 text-sm text-slate-400">Nexus is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && <div className="m-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}

        <div className="p-4 border-t border-slate-700">
          {attachedFile && (
            <div className="mb-2 p-2 bg-slate-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Icon name="image" className="w-5 h-5 text-slate-400" />
                <span>{attachedFile.name}</span>
              </div>
              <button onClick={() => setAttachedFile(null)} className="p-1 rounded-full hover:bg-slate-600" aria-label="Remove attached file">
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors" aria-label="Attach an image">
              <Icon name="attach" className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message or attach an image..."
              className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || (!input.trim() && !attachedFile)} className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors" aria-label="Send message">
              <Icon name="send" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
