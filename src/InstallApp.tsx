import { useEffect, useState } from 'react';
import { t } from './i18n';
import { canInstall, installApp, showIosInstructions, subscribeInstall } from './pwa';
import type { UiLang } from './types';

export function InstallApp({ ui }: { ui: UiLang }) {
  const [available, setAvailable] = useState(canInstall);
  useEffect(() => subscribeInstall(() => setAvailable(canInstall())), []);
  const ios = showIosInstructions();
  if (!available && !ios) return null;
  return (
    <section className="install-app" aria-label={t('installTitle', ui)}>
      <span aria-hidden="true">📱</span>
      <div><strong>{t('installTitle', ui)}</strong><p>{t(ios && !available ? 'installIos' : 'installSub', ui)}</p></div>
      {available && <button className="duo-btn duo-btn-outline duo-btn-sm" onClick={() => void installApp()}>{t('installButton', ui)}</button>}
    </section>
  );
}
