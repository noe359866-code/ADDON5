import { useRef, useState } from 'react';
import { Mascot } from './components';
import { t } from './i18n';
import { sfx } from './sound';
import type { OutfitId, UiLang } from './types';

type PatoAction = 'hello' | 'tickle' | 'hug' | 'dance';

const actions: { id: PatoAction; emoji: string; label: string; message: string }[] = [
  { id: 'tickle', emoji: '✨', label: 'patoTickle', message: 'patoTickleReply' },
  { id: 'hug', emoji: '💛', label: 'patoHug', message: 'patoHugReply' },
  { id: 'dance', emoji: '🎵', label: 'patoDance', message: 'patoDanceReply' },
];

/** Un rincón de juego local: no graba voz, no mide golpes y no tiene recompensas. */
export function PatoPlay({ ui, sound, calm, outfit }: { ui: UiLang; sound: boolean; calm: boolean; outfit: OutfitId }) {
  const [action, setAction] = useState<PatoAction | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const lastSound = useRef(0);

  function interact(next: PatoAction) {
    setAction(next);
    setAnimationKey((value) => value + 1);
    // Evita sonidos encadenados al pulsar rápidamente; el modo tranquilo es silencioso.
    const now = Date.now();
    if (sound && !calm && now - lastSound.current > 400) {
      sfx(next === 'dance' ? 'pop' : 'quack', true);
      lastSound.current = now;
    }
  }

  const reply = action === 'hello' ? 'patoHelloReply' : actions.find((item) => item.id === action)?.message;

  return (
    <details className="pato-play">
      <summary className="pato-play-summary">
        <span aria-hidden="true">🦆</span>
        <span><strong>{t('patoPlayTitle', ui)}</strong><small>{t('patoPlaySub', ui)}</small></span>
        <span className="pato-play-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="pato-play-content">
        <p className="pato-play-intro">{t('patoPlayIntro', ui)}</p>
        <div className="pato-play-stage">
          <button type="button" className="pato-play-duck" onClick={() => interact('hello')} aria-label={t('patoTouch', ui)}>
            <span key={animationKey} className={`pato-play-figure ${action ? `pato-react-${action}` : ''}`} aria-hidden="true">
              <Mascot mood={action === 'dance' ? 'excited' : action === 'hug' ? 'cheer' : 'happy'} size={152} outfit={outfit} />
            </span>
          </button>
          <p className="pato-play-bubble" role="status" aria-live="polite" aria-atomic="true">
            {reply ? t(reply, ui) : t('patoPlayWelcome', ui)}
          </p>
        </div>
        <div className="pato-play-actions" aria-label={t('patoPlayActions', ui)}>
          {actions.map((item) => (
            <button key={item.id} type="button" className="pato-play-action" onClick={() => interact(item.id)}>
              <span aria-hidden="true">{item.emoji}</span> {t(item.label, ui)}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
