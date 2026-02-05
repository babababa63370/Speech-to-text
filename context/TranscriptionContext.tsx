import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Transcription {
  id: string;
  text: string;
  source: "recording" | "file";
  fileName?: string;
  duration?: number;
  createdAt: string;
}

interface TranscriptionContextValue {
  transcriptions: Transcription[];
  addTranscription: (transcription: Omit<Transcription, "id" | "createdAt">) => Promise<Transcription>;
  deleteTranscription: (id: string) => Promise<void>;
  getTranscription: (id: string) => Transcription | undefined;
  isLoading: boolean;
}

const TranscriptionContext = createContext<TranscriptionContextValue | null>(null);

const STORAGE_KEY = "voicescribe_transcriptions";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function TranscriptionProvider({ children }: { children: ReactNode }) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const loadTranscriptions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTranscriptions(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load transcriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTranscriptions = async (items: Transcription[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save transcriptions:", error);
    }
  };

  const addTranscription = useCallback(async (data: Omit<Transcription, "id" | "createdAt">) => {
    const newTranscription: Transcription = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    setTranscriptions((prev) => {
      const updated = [newTranscription, ...prev];
      saveTranscriptions(updated);
      return updated;
    });

    return newTranscription;
  }, []);

  const deleteTranscription = useCallback(async (id: string) => {
    setTranscriptions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTranscriptions(updated);
      return updated;
    });
  }, []);

  const getTranscription = useCallback(
    (id: string) => transcriptions.find((t) => t.id === id),
    [transcriptions]
  );

  const value = useMemo(
    () => ({
      transcriptions,
      addTranscription,
      deleteTranscription,
      getTranscription,
      isLoading,
    }),
    [transcriptions, addTranscription, deleteTranscription, getTranscription, isLoading]
  );

  return (
    <TranscriptionContext.Provider value={value}>
      {children}
    </TranscriptionContext.Provider>
  );
}

export function useTranscriptions() {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error("useTranscriptions must be used within a TranscriptionProvider");
  }
  return context;
}
