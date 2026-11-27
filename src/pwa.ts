interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let promptEvent: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => { promptEvent = null; notify(); });
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Si el registro falla, la aplicación sigue disponible en línea.
      });
    });
  }
}

export function canInstall(): boolean { return promptEvent !== null; }
export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export async function installApp(): Promise<void> {
  const event = promptEvent;
  if (!event) return;
  promptEvent = null;
  notify();
  try { await event.prompt(); await event.userChoice; } catch { /* el navegador puede cancelar la solicitud */ }
}
export function showIosInstructions(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  return ios && !standalone;
}
