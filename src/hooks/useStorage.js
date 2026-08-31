import { useState, useCallback, useEffect } from 'react';
import * as storage from '../store/storage';

export function useTranscripts() {
  const [transcripts, setTranscripts] = useState([]);

  const refresh = useCallback(() => {
    setTranscripts(storage.getTranscripts());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((transcript) => {
    storage.saveTranscript(transcript);
    refresh();
  }, [refresh]);

  const remove = useCallback((id) => {
    storage.deleteTranscript(id);
    refresh();
  }, [refresh]);

  return { transcripts, save, remove, refresh };
}

export function useChunks(transcriptId) {
  const [chunks, setChunks] = useState([]);

  const refresh = useCallback(() => {
    if (transcriptId) setChunks(storage.getChunks(transcriptId));
  }, [transcriptId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((newChunks) => {
    storage.saveChunks(transcriptId, newChunks);
    refresh();
  }, [transcriptId, refresh]);

  return { chunks, save, refresh };
}

export function useSituations(chunkId) {
  const [situations, setSituations] = useState([]);

  const refresh = useCallback(() => {
    if (chunkId) setSituations(storage.getSituations(chunkId));
  }, [chunkId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback((newSituations) => {
    storage.saveSituations(chunkId, newSituations);
    refresh();
  }, [chunkId, refresh]);

  return { situations, save, refresh };
}

export function useSettings() {
  const [settings, setSettings] = useState(storage.getSettings());

  const save = useCallback((newSettings) => {
    storage.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  return { settings, save };
}

export function useProgress() {
  const [allProgress, setAllProgress] = useState({});

  const refresh = useCallback(() => {
    setAllProgress(storage.getAllProgress());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // BUG FIX: trước đây chỉ truyền 2 args, mất score và feedback
  const update = useCallback((chunkId, success, score = null, feedback = null) => {
    storage.updateProgress(chunkId, success, score, feedback);
    refresh();
  }, [refresh]);

  return { allProgress, update, refresh };
}
