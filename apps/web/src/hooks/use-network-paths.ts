import { useState, useEffect } from 'react';

const STORAGE_KEY = '@cpq:recentNetworkPaths';
const MAX_PATHS = 10;

export function useNetworkPaths() {
  const [recentPaths, setRecentPaths] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentPaths));
    } catch {
      // localStorage not available (e.g. private mode quota exceeded)
    }
  }, [recentPaths]);

  const addPath = (path: string) => {
    const trimmed = path.trim();
    if (!trimmed) return;
    setRecentPaths((prev) => {
      const deduplicated = prev.filter((p) => p !== trimmed);
      return [trimmed, ...deduplicated].slice(0, MAX_PATHS);
    });
  };

  const clearPaths = () => {
    setRecentPaths([]);
  };

  return { recentPaths, addPath, clearPaths };
}
