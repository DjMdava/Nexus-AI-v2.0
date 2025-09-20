import { useState, useEffect } from 'react';
import { defaultPersonas, Persona } from '../types';

const STORAGE_KEY = 'nexus-custom-personas';

export const usePersonas = () => {
  const [personas, setPersonas] = useState<Record<string, Persona>>(defaultPersonas);

  useEffect(() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const customPersonas = JSON.parse(stored);
          setPersonas({ ...defaultPersonas, ...customPersonas });
        }
    } catch (error) {
        console.error("Could not load custom personas from localStorage", error);
    }
  }, []);

  const savePersona = (persona: Persona) => {
    const updated = { ...personas, [persona.id]: persona };
    setPersonas(updated);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(
          Object.fromEntries(Object.entries(updated).filter(([key]) => !defaultPersonas[key]))
        ));
    } catch (error) {
        console.error("Could not save custom persona to localStorage", error);
    }
  };

  const deletePersona = (id: string) => {
    if (defaultPersonas[id]) return; // Cannot delete default personas
    const updated = { ...personas };
    delete updated[id];
    setPersonas(updated);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(
          Object.fromEntries(Object.entries(updated).filter(([key]) => !defaultPersonas[key]))
        ));
    } catch (error) {
        console.error("Could not update localStorage after deleting persona", error);
    }
  };

  return { personas, savePersona, deletePersona };
};
