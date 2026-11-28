import { useMemo, useState } from 'react';
import { Mascot } from './components';
import { wordSyllables, wordText } from './data';
import type { Word } from './data';
import {
  DICTIONARY_CATEGORIES,
  DICTIONARY_CATEGORY_LABEL,
  searchDictionary,
  searchLangs,
  stageWords,
} from './dictionary';
import type { CategoryFilter } from './dictionary';
import { t, tf } from './i18n';
import { sfx, speak } from './sound';
import { stageColor } from './stages';
import type { Lang, Progress, UiLang } from './types';

/* ================================================================== */
/* Barra de búsqueda tipo diccionario                                  */
/* ================================================================== */

export function DictionarySearchBar({
  value,
  onChange,
  onSubmit,
  ui,
  big = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  ui: UiLang;
  big?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <form
      className={`duo-dict-search ${big ? 'is-big' : ''}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <span className="duo-dict-search-icon" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('dictPlaceholder', ui)}
        aria-label={t('dictSearchLabel', ui)}
        autoFocus={autoFocus}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          className="duo-dict-clear"
          onClick={() => onChange('')}
          aria-label={t('dictClear', ui)}
        >
          ✕
        </button>
      )}
      {onSubmit && (
        <button type="submit" className="duo-btn duo-btn-blue duo-btn-sm">
          {t('dictSearch', ui)}
        </button>
      )}
    </form>
  );
}

/* ================================================================== */
/* Diccionario ilustrado (es / eu / en)                                */
/* ================================================================== */

const LANGS: Lang[] = ['es', 'eu', 'en'];

function langLabel(lang: Lang): string {
  return lang === 'es' ? 'ES' : lang === 'eu' ? 'EU' : 'EN';
}

export function DictionaryView({
  progress,
  query,
  setQuery,
}: {
  progress: Progress;
  query: string;
  setQuery: (value: string) => void;
}) {
  const ui = progress.uiLang;
  const level = stageColor(progress.schoolStage);
  const preferred = searchLangs(progress.learnLang);
  const [category, setCategory] = useState<CategoryFilter>('todas');
  const [speakLang, setSpeakLang] = useState<Lang>(preferred[0] ?? 'es');

  const hits = useMemo(
    () =>
      searchDictionary(query, {
        learnLang: progress.learnLang,
        stage: progress.schoolStage,
        category,
      }),
    [query, progress.learnLang, progress.schoolStage, category],
  );

  const suggestions = useMemo(
    () => stageWords(progress.schoolStage).slice(0, 6),
    [progress.schoolStage],
  );

  const trimmed = query.trim();

  function playWord(word: Word, lang: Lang) {
    setSpeakLang(lang);
    sfx('pop', progress.sound);
    speak(wordText(word, lang), lang, progress.sound, progress.speechRate, wordSyllables(word, lang));
  }

  return (
    <div className="duo-tab-page duo-dict-page">
      <div className="duo-letters-hero duo-dict-hero">
        <div>
          <h1>📖 {t('dictTitle', ui)}</h1>
          <p>{t('dictSub', ui)}</p>
          <span className="duo-dict-level-chip" style={{ background: level.soft, color: level.ink, borderColor: level.color }}>
            <span aria-hidden="true">{level.emoji}</span> {level.name[ui]}
          </span>
        </div>
        <Mascot mood="think" size={104} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
      </div>

      <div className="duo-dict-toolbar">
        <DictionarySearchBar value={query} onChange={setQuery} ui={ui} big />
        <div className="duo-dict-filters" role="group" aria-label={t('dictCategories', ui)}>
          <button
            className={`duo-dict-filter ${category === 'todas' ? 'active' : ''}`}
            onClick={() => setCategory('todas')}
            aria-pressed={category === 'todas'}
          >
            ✨ {t('dictAll', ui)}
          </button>
          {DICTIONARY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`duo-dict-filter ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
            >
              {DICTIONARY_CATEGORY_LABEL[cat][ui]}
            </button>
          ))}
        </div>
      </div>

      {trimmed && (
        <div className="duo-dict-status" role="status" aria-live="polite">
          {hits.length > 0
            ? tf('dictResults', ui, { n: String(hits.length) })
            : tf('dictEmptyTitle', ui, { q: trimmed })}
        </div>
      )}

      {!trimmed && (
        <section className="duo-dict-suggest">
          <h2 className="duo-dict-subtitle">
            <span aria-hidden="true">{level.emoji}</span> {t('dictSuggestions', ui)}
          </h2>
          <div className="duo-dict-chips">
            {suggestions.map((w) => (
              <button key={w.id} className="duo-dict-chip" onClick={() => setQuery(w.es)}>
                <span aria-hidden="true">{w.emoji}</span> {w.es}
              </button>
            ))}
          </div>
        </section>
      )}

      {trimmed && hits.length === 0 && (
        <div className="duo-dict-empty">
          <span aria-hidden="true">🦆🔎</span>
          <p>{t('dictEmptyHint', ui)}</p>
          <div className="duo-dict-chips">
            {suggestions.slice(0, 4).map((w) => (
              <button key={w.id} className="duo-dict-chip" onClick={() => setQuery(w.es)}>
                <span aria-hidden="true">{w.emoji}</span> {w.es}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="duo-dict-results">
        {hits.map((hit) => (
          <li key={hit.word.id} className="duo-dict-card">
            <div className="duo-dict-card-head">
              <span className="duo-dict-emoji" aria-hidden="true">
                {hit.word.emoji}
              </span>
              <div className="duo-dict-card-title">
                <strong>{wordText(hit.word, speakLang)}</strong>
                <span className="duo-dict-cat">{DICTIONARY_CATEGORY_LABEL[hit.word.cat][ui]}</span>
              </div>
              {hit.exact && <span className="duo-dict-found">✓ {t('dictFound', ui)}</span>}
            </div>

            <ul className="duo-dict-translations">
              {LANGS.map((lang) => (
                <li key={lang} className={speakLang === lang ? 'is-active' : ''}>
                  <span className="duo-dict-lang">{langLabel(lang)}</span>
                  <span className="duo-dict-word">{wordText(hit.word, lang)}</span>
                  <span className="duo-dict-syls" aria-hidden="true">
                    {wordSyllables(hit.word, lang).join(' · ')}
                  </span>
                  <button
                    className="duo-dict-speak"
                    onClick={() => playWord(hit.word, lang)}
                    aria-label={`${t('dictListen', ui)} · ${wordText(hit.word, lang)}`}
                  >
                    🔊
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
