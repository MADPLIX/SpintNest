import { useEffect } from 'react';
import { initGdriveAutoSync } from '../lib/gdriveAutoSync';

/** Startet Google-Drive-Auto-Push (debounced, Start, Schließen). */
export function GdriveAutoSync() {
  useEffect(() => {
    return initGdriveAutoSync();
  }, []);
  return null;
}
