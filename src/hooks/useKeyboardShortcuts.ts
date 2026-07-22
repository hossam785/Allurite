"use client";

import { useEffect } from "react";

interface ShortcutHandler {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  preventInInputs?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);

      for (const shortcut of shortcuts) {
        if (shortcut.preventInInputs !== false && isInput) {
          continue;
        }

        const targetKey = shortcut.key.toLowerCase();
        const eventKey = event.key.toLowerCase();
        const eventCode = event.code.toLowerCase();

        const isKeyMatch =
          eventKey === targetKey ||
          eventCode === `key${targetKey}` ||
          eventCode === targetKey;

        const isCtrlCmdMatch = shortcut.ctrlOrCmd
          ? event.metaKey || event.ctrlKey
          : !event.metaKey && !event.ctrlKey;
        const isShiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const isAltMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (isKeyMatch && isCtrlCmdMatch && isShiftMatch && isAltMatch) {
          event.preventDefault();
          shortcut.handler(event);
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
