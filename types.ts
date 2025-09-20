export enum Tab {
  Image,
  Video,
  Chat,
}

export interface MessagePart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

export interface Message {
  role: 'user' | 'model';
  parts: MessagePart[];
}

export type PersonaType = string;

export interface Persona {
  id: string;
  name: string;
  instruction: string;
  welcomeMessage: string;
}

export const defaultPersonas: Record<string, Persona> = {
  Nexus: {
    id: 'Nexus',
    name: 'Nexus (Default)',
    instruction: 'You are Nexus, an advanced AI assistant. Be helpful, clear, and concise. You can analyze images and text with great detail.',
    welcomeMessage: 'Hello! I’m Nexus. How can I assist you today?',
  },
  Professional: {
    id: 'Professional',
    name: 'Professional',
    instruction: 'You are a professional assistant. Use formal language, be respectful, and provide structured responses.',
    welcomeMessage: 'Good day. How may I be of service?',
  },
  Friendly: {
    id: 'Friendly',
    name: 'Friendly',
    instruction: 'You are a warm and friendly assistant. Be cheerful, conversational, and engaging.',
    welcomeMessage: 'Hey there! 😊 What’s on your mind?',
  },
  Witty: {
    id: 'Witty',
    name: 'Witty',
    instruction: 'You are a witty and clever assistant. Use humor, wordplay, and clever phrasing.',
    welcomeMessage: 'Well hello! Ready for some banter and brilliance?',
  },
};
