import { useEffect } from 'react';

type ShortcutMap = Record<string, () => void>;

const isInput = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT');

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const key = [
        e.ctrlKey || e.metaKey ? 'Ctrl' : null,
        e.shiftKey ? 'Shift' : null,
        e.altKey ? 'Alt' : null,
        e.key === 'Escape' ? 'Escape' : e.key.toUpperCase(),
      ]
        .filter(Boolean)
        .join('+');

      if (key === 'Escape') {
        shortcuts['Escape']?.();
        return;
      }

      if (isInput(e.target)) return;

      shortcuts[key]?.();
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
