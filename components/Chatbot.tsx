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
    personaToEdit: Persona | null;
}> = ({ onClose, onSave, personaToEdit }) => {
    const [name, setName] = useState('');
    const [instruction, setInstruction] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const isEditing = !!personaToEdit;

    useEffect(() => {
        if (personaToEdit) {
            setName(personaToEdit.name);
            setInstruction(personaToEdit.instruction);
            setWelcomeMessage(personaToEdit.welcomeMessage);
        }
    }, [personaToEdit]);

    const handleSave = () => {
        if(name.trim() && instruction.trim() && welcomeMessage.trim()) {
            onSave({ name, instruction, welcomeMessage });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Custom Persona' : 'Create Custom Persona'}</h3>
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
                    <button onClick={handleSave} className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:bg-indigo-400" disabled={!name.trim() || !instruction.trim() || !welcomeMessage.trim()}>{isEditing ? 'Update Persona' : 'Save Persona'}</button>
                </div>
            </div>
        </div>
    );
};

const Chatbot: React.FC = () => {
  const { personas, savePersona, deletePersona } = usePersonas();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('Professional');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'audio' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(false);
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
        const ttsSaved = localStorage.getItem('isTtsEnabled');
        setIsTtsEnabled(ttsSaved === 'true');
    } catch (e) { console.error("Could not read settings from localStorage", e); }
  }, [personas]);

  useEffect(() => {
    try {
        localStorage.setItem('selectedPersonaId', selectedPersonaId);
    } catch (e) { console.error("Could not save selected persona to localStorage", e); }
  }, [selectedPersonaId]);
  
  // This effect ensures that if the selected persona becomes invalid (e.g., is deleted),
  // the component gracefully falls back to the default persona.
  useEffect(() => {
    if (!personas[selectedPersonaId]) {
      setSelectedPersonaId('Professional');
    }
  }, [personas, selectedPersonaId]);

  const toggleTts = () => {
    const newState = !isTtsEnabled;
    setIsTtsEnabled(newState);
    try {
      localStorage.setItem('isTtsEnabled', String(newState));
      if (!newState) {
        window.speechSynthesis.cancel();
      }
    } catch (e) { console.error("Could not save TTS setting to localStorage", e); }
  };

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

  // Effect to clean up speech synthesis on component unmount
  useEffect(() => {
    // This return function is a cleanup effect that runs when the component unmounts.
    // It prevents audio from continuing to play if the user navigates to another tab.
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);
  
  const handleOpenCreateModal = () => {
    setEditingPersona(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = () => {
    const currentPersona = personas[selectedPersonaId];
    if (currentPersona && isCustomPersona) {
        setEditingPersona(currentPersona);
        setIsModalOpen(true);
    }
  };

  const handleSaveOrUpdatePersona = (personaData: Omit<Persona, 'id'>) => {
    if (editingPersona) {
        savePersona({ ...personaData, id: editingPersona.id });
    } else {
        const id = `custom-${Date.now()}`;
        const newPersona = { ...personaData, id };
        savePersona(newPersona);
        setSelectedPersonaId(id);
    }
    setIsModalOpen(false);
    setEditingPersona(null);
  };

  const handleDeletePersona = () => {
    if (!isCustomPersona) return;
    if (window.confirm(`Are you sure you want to delete the "${personaConfig.name}" persona?`)) {
      deletePersona(selectedPersonaId);
      // The fallback to the default persona is now handled by the new useEffect.
    }
  };

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !attachedFile) || loading) return;

    setLoading(true);
    setError(null);
    window.speechSynthesis.cancel();

    const userParts: MessagePart[] = [];
    if (attachedFile) {
      try {
        const filePart = await fileToGenerativePart(attachedFile);
        userParts.push(filePart);
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
    setFileType(null);

    try {
      if (!chatRef.current) throw new Error("Chat not initialized.");
      const stream = await chatRef.current.sendMessageStream(streamInput);

      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        fullResponse += chunkText; // Accumulate for TTS
        
        // Update the UI by appending the new chunk to the last message
        setMessages(currentMessages => {
          const updatedMessages = [...currentMessages];
          const lastMessageIndex = updatedMessages.length - 1;
          const lastMessage = updatedMessages[lastMessageIndex];
        
          if (lastMessage?.role === 'model') {
            const existingText = lastMessage.parts[0]?.text ?? '';
            const updatedText = existingText + chunkText;
            
            // Create a new message object to ensure immutability
            updatedMessages[lastMessageIndex] = {
              ...lastMessage,
              parts: [{ text: updatedText }],
            };
          }
          
          return updatedMessages;
        });
      }

      if (isTtsEnabled && fullResponse) {
        const utterance = new SpeechSynthesisUtterance(fullResponse);
        window.speechSynthesis.speak(utterance);
      }

    } catch (e: any) {
        const errorMessage = e.message || 'An error occurred while getting a response.';
        setError(errorMessage);
        setMessages(prev => [...prev.slice(0, -1)]);
    } finally {
      setLoading(false);
    }
  }, [input, attachedFile, loading, isTtsEnabled]);

  const transcribeAudio = useCallback(async (file: File) => {
    setIsTranscribing(true);
    setError(null);
    try {
        const audioPart = await fileToGenerativePart(file);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: "Transcribe the following audio file precisely:" }, audioPart] },
        });
        const transcription = response.text;
        setInput(prev => (prev ? prev + ' ' + transcription : transcription).trim());
    } catch (e: any) {
        setError(e.message || "Failed to transcribe audio. Please try again.");
    } finally {
        setIsTranscribing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, []);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Clear previous state before processing new file
      setAttachedFile(null); 
      setFileType(null);
      setError(null);

      if (file.type.startsWith('image/')) {
        setAttachedFile(file);
        setFileType('image');
      } else if (file.type.startsWith('audio/')) {
        transcribeAudio(file);
      } else {
        setError("Unsupported file type. Please select an image or audio file.");
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the invalid file from input
        }
      }
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-lg p-3 rounded-2xl ${isUser ? 'bg-indigo-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
          {message.parts.map((part, index) => (
            <div key={index}>
              {part.inlineData && part.inlineData.mimeType.startsWith('image/') && (
                <img 
                  src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                  alt="User upload" 
                  className="rounded-lg mb-2 max-w-xs"
                />
              )}
               {part.inlineData && part.inlineData.mimeType.startsWith('audio/') && (
                <audio 
                  controls 
                  src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                  className="rounded-lg mb-2 w-full max-w-xs"
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
      {isModalOpen && <PersonaCreatorModal 
        onClose={() => { setIsModalOpen(false); setEditingPersona(null); }} 
        onSave={handleSaveOrUpdatePersona} 
        personaToEdit={editingPersona} 
      />}
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
               <button onClick={toggleTts} className="p-1.5 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-colors" title={isTtsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}>
                <Icon name={isTtsEnabled ? "speaker-on" : "speaker-off"} className="w-5 h-5" />
              </button>
              <button onClick={handleOpenCreateModal} className="p-1.5 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-colors" title="Create new persona">
                <Icon name="sparkles" className="w-5 h-5" />
              </button>
              {isCustomPersona && (
                <>
                  <button onClick={handleOpenEditModal} className="p-1.5 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-colors" title="Edit current persona">
                      <Icon name="edit" className="w-5 h-5" />
                  </button>
                  <button onClick={handleDeletePersona} className="p-1.5 rounded-md text-sm font-medium bg-red-900/50 hover:bg-red-900/80 text-red-300 transition-colors" title="Delete current persona">
                      <Icon name="trash" className="w-5 h-5" />
                  </button>
                </>
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
              <div className="flex items-center gap-2 text-sm truncate">
                {fileType === 'image' && <Icon name="image" className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                {fileType === 'audio' && <Icon name="audio" className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                <span className="truncate">{attachedFile.name}</span>
              </div>
              <button onClick={removeAttachment} className="p-1 rounded-full hover:bg-slate-600 flex-shrink-0" aria-label="Remove attached file">
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*,audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed" 
                aria-label="Attach a file"
                disabled={loading || isTranscribing}
            >
                {isTranscribing ? <Spinner size="md" /> : <Icon name="attach" className="w-6 h-6" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isTranscribing ? "Transcribing audio..." : "Type your message or attach a file..."}
              className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-800"
              disabled={loading || isTranscribing}
            />
            <button 
                onClick={handleSend} 
                disabled={loading || isTranscribing || (!input.trim() && !attachedFile)} 
                className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors" 
                aria-label="Send message"
            >
              <Icon name="send" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chatbot;