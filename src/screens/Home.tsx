import { useEffect, useState } from 'react';
import { computeAdaptations, supportSummary } from '../adaptations';
import { Mascot } from '../components';
import { LEAGUE_RIVALS, LEAGUES, getDailyQuests } from '../duoData';
import type { DuoStory } from '../duoData';
import { GuidebookModal, LeaderboardView, LettersView, PracticeHubView, ProfileView, QuestsView, ShopView, StoriesView, StoryPlayerModal } from '../DuoViews';
import { DuoFlagSvg, DuoFlameSvg, DuoGemSvg, DuoHeartSvg, DuoNavIcon, IconAccessibility, IconCheck, IconMusic } from '../icons';
import { t, tf } from '../i18n';
import { getRecentWeekStats, isXpBoostActive, todayString, xpBoostMinutesLeft } from '../progress';
import { sfx } from '../sound';
import type { DifficultyLevel, LearnLang, NavTab, Progress, Route, SchoolStage, SessionMode } from '../types';
import { syncMusic, Segmented, DuoWordmark, RouteIcon } from './shared';
import { LearnPathView } from './LearnPathView';

/* ================================================================== */
/* Shell Principal de 3 Columnas estilo Duolingo Web                   */
/* ================================================================== */

interface HomeProps {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onStart: (levelId: number | null, mode?: SessionMode, nodeKey?: string) => void;
  onToast: (text: string) => void;
  onSettings: () => void;
}

type PopoverKind = 'course' | 'streak' | 'gems' | 'hearts' | null;

export function Home({ progress, setProgress, onStart, onToast, onSettings }: HomeProps) {
  const ui = progress.uiLang;
  const [activeTab, setActiveTab] = useState<NavTab>('learn');
  const [openPop, setOpenPop] = useState<PopoverKind>(null);
  const [guidebookUnit, setGuidebookUnit] = useState<number | null>(null);
  const [activeStory, setActiveStory] = useState<DuoStory | null>(null);
  const [childMode, setChildMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hitzbidaia.childMode.v1') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hitzbidaia.childMode.v1', String(childMode));
    } catch {
      // El modo elegido solo afecta a la presentación; si no se puede guardar, la app sigue funcionando.
    }
  }, [childMode]);

  const ad = computeAdaptations(progress);
  const effectiveUnlimited = progress.unlimitedHearts || ad.gentle;
  const quests = getDailyQuests(progress, ui);
  const weekStats = getRecentWeekStats(progress);
  const league = LEAGUES[Math.min(LEAGUES.length - 1, progress.leagueId ?? 2)]!;
  const myLeagueRank = useMemoRank(progress.xp);
  const boostActive = isXpBoostActive(progress);
  const boostMins = xpBoostMinutesLeft(progress);

  const navItems: { id: NavTab; label: string; badge?: number }[] = [
    { id: 'learn', label: t('navLearn', ui) },
    { id: 'letters', label: t('navLetters', ui) },
    { id: 'stories', label: t('navStories', ui) },
    { id: 'practice', label: t('navPractice', ui), badge: progress.mistakes.length || undefined },
    { id: 'leaderboard', label: t('navLeagues', ui) },
    { id: 'quests', label: t('navQuests', ui), badge: quests.filter((q) => q.done && !q.claimed).length || undefined },
    { id: 'shop', label: t('navShop', ui) },
    { id: 'profile', label: t('navProfile', ui) },
  ];

  const toggleMusic = () => {
    const next = !progress.music;
    syncMusic(next);
    setProgress({ music: next });
    onToast(t(next ? 'musicOn' : 'musicOff', ui));
  };

  function handleStoryComplete(storyId: string, xpReward: number) {
    const today = todayString();
    const yesterday = todayString(-1);
    const alreadyRead = progress.storiesRead.includes(storyId);
    const earnedXp = alreadyRead ? 10 : xpReward;
    setProgress((prev) => {
      let streak = prev.streak;
      if (prev.lastPlayed !== today) {
        streak = prev.lastPlayed === yesterday ? prev.streak + 1 : Math.max(1, prev.streak);
      }
      return {
        xp: prev.xp + earnedXp,
        gems: prev.gems + 10,
        dailyXp: prev.dailyXp + earnedXp,
        dailyLessons: prev.dailyLessons + 1,
        xpHistory: { ...prev.xpHistory, [today]: (prev.xpHistory[today] ?? 0) + earnedXp },
        storiesRead: alreadyRead ? prev.storiesRead : [...prev.storiesRead, storyId],
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        lastPlayed: today,
        sessions: prev.sessions + 1,
      };
    });
    setActiveStory(null);
    onToast(`📖 +${earnedXp} XP · +10 💎`);
  }

  const statsBar = (
    <div className="duo-top-stats" onClick={(e) => e.stopPropagation()}>
      {/* Bandera de Curso / Idioma */}
      <div className="duo-stat-trigger-wrap">
        <button
          className={`duo-stat-pill flag ${openPop === 'course' ? 'active' : ''}`}
          onClick={() => setOpenPop(openPop === 'course' ? null : 'course')}
          aria-label={t('learningLabel', ui)}
        >
          <DuoFlagSvg code={progress.learnLang} size={28} />
        </button>
        {openPop === 'course' && (
          <div className="duo-top-popover">
            <h4>{t('learningLabel', ui)}</h4>
            <div className="duo-pop-course-list">
              {(['es', 'eu', 'en', 'both'] as LearnLang[]).map((code) => (
                <button
                  key={code}
                  className={`duo-pop-course-item ${progress.learnLang === code ? 'selected' : ''}`}
                  onClick={() => {
                    sfx('click', progress.sound);
                    setProgress({ learnLang: code });
                    setOpenPop(null);
                  }}
                >
                  <DuoFlagSvg code={code} size={26} />
                  <strong>
                    {code === 'es'
                      ? t('langEs', ui)
                      : code === 'eu'
                        ? t('langEu', ui)
                        : code === 'en'
                          ? t('langEn', ui)
                          : t('langBoth', ui)}
                  </strong>
                  {progress.learnLang === code && <IconCheck size={15} />}
                </button>
              ))}
            </div>
            <div className="duo-pop-sep" />
            <h4>{t('diffLevelLabel', ui)}</h4>
            <Segmented<DifficultyLevel>
              value={progress.difficultyLevel}
              options={[
                { value: 'bajo', label: t('diffLow', ui) },
                { value: 'medio', label: t('diffMed', ui) },
                { value: 'alto', label: t('diffHigh', ui) },
              ]}
              onChange={(difficultyLevel) => {
                setProgress({ difficultyLevel });
                onToast(t('diffChanged', ui));
              }}
            />
            <div className="duo-pop-sep" />
            <h4>{t('stageLabel', ui)}</h4>
            <Segmented<SchoolStage>
              value={progress.schoolStage}
              options={[
                { value: 'general', label: t('stageGeneral', ui) },
                { value: 'infantil', label: t('stageInfantil', ui) },
                { value: 'prim12', label: t('stagePrim12', ui) },
                { value: 'prim34', label: t('stagePrim34', ui) },
                { value: 'prim56', label: t('stagePrim56', ui) },
              ]}
              onChange={(schoolStage) => {
                setProgress({ schoolStage });
                onToast(t('stageChanged', ui));
              }}
            />
            <div className="duo-pop-sep" />
            <h4>{t('routeLabel', ui)}</h4>
            <Segmented<Route>
              value={progress.route}
              options={[
                { value: 'visual', label: t('routeVisual', ui) },
                { value: 'auditivo', label: t('routeAuditivo', ui) },
                { value: 'mixta', label: t('routeMixta', ui) },
              ]}
              onChange={(route) => {
                setProgress({ route });
                onToast(t('routeChanged', ui));
              }}
            />
            <div className="duo-pop-sep" />
            <div className="duo-pop-ui-row">
              <span>{t('appLangLabel', ui)}:</span>
              <div className="lang-switch">
                <button className={ui === 'es' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'es' })}>ES</button>
                <button className={ui === 'eu' ? 'on' : ''} onClick={() => setProgress({ uiLang: 'eu' })}>EU</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Racha Diaria 🔥 */}
      <div className="duo-stat-trigger-wrap">
        <button
          className={`duo-stat-pill streak ${progress.streak > 0 ? 'lit' : ''}`}
          onClick={() => setOpenPop(openPop === 'streak' ? null : 'streak')}
        >
          <DuoFlameSvg size={24} active={progress.streak > 0} />
          <strong>{progress.streak}</strong>
        </button>
        {openPop === 'streak' && (
          <div className="duo-top-popover">
            <div className="duo-pop-streak-head">
              <DuoFlameSvg size={38} active={progress.streak > 0} />
              <div>
                <strong>{tf('streakCardTitle', ui, { n: String(progress.streak) })}</strong>
                <p>{t('streakCardSub', ui)}</p>
              </div>
            </div>
            <div className="duo-week-row">
              {weekStats.map((d) => (
                <div key={d.date} className={`duo-week-dot ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}`}>
                  <span>{ui === 'eu' ? d.labelEu : d.labelEs}</span>
                  <i>{d.done ? '✓' : d.frozen ? '🧊' : ''}</i>
                </div>
              ))}
            </div>
            <div className="duo-pop-freeze-note">
              🧊 {ui === 'eu' ? 'Bolada babesleak:' : 'Protectores de racha:'} <strong>{progress.streakFreezes}/2</strong>
            </div>
          </div>
        )}
      </div>

      {/* Gemas 💎 */}
      <div className="duo-stat-trigger-wrap">
        <button
          className="duo-stat-pill gems"
          onClick={() => setOpenPop(openPop === 'gems' ? null : 'gems')}
        >
          <DuoGemSvg size={23} />
          <strong>{progress.gems}</strong>
        </button>
        {openPop === 'gems' && (
          <div className="duo-top-popover">
            <div className="duo-pop-streak-head">
              <DuoGemSvg size={36} />
              <div>
                <strong>{progress.gems} {ui === 'eu' ? 'Harribitxi' : 'Gemas'}</strong>
                <p>{t('shopSub', ui)}</p>
              </div>
            </div>
            <button
              className="duo-btn duo-btn-blue duo-btn-full"
              onClick={() => {
                setActiveTab('shop');
                setOpenPop(null);
              }}
            >
              {t('navShop', ui).toUpperCase()}
            </button>
          </div>
        )}
      </div>

      {/* Vidas ❤️ / ♾️ */}
      <div className="duo-stat-trigger-wrap">
        <button
          className="duo-stat-pill hearts"
          onClick={() => setOpenPop(openPop === 'hearts' ? null : 'hearts')}
        >
          <DuoHeartSvg size={24} unlimited={effectiveUnlimited} />
          <strong>{effectiveUnlimited ? '∞' : progress.hearts}</strong>
        </button>
        {openPop === 'hearts' && (
          <div className="duo-top-popover">
            <h4>{t('shopHeartsSection', ui)}</h4>
            {effectiveUnlimited ? (
              <p className="duo-pop-unlimited-msg">✨ {t('superActive', ui)}</p>
            ) : (
              <div className="duo-hearts-row-pop">
                {[1, 2, 3, 4, 5].map((n) => (
                  <DuoHeartSvg key={n} size={26} broken={n > progress.hearts} />
                ))}
              </div>
            )}
            <div className="duo-pop-btn-col">
              {!effectiveUnlimited && progress.hearts < 5 && (
                <>
                  <button
                    className="duo-btn duo-btn-blue duo-btn-full"
                    onClick={() => {
                      setOpenPop(null);
                      onStart(null, 'practice');
                    }}
                  >
                    {t('practiceHeartBtn', ui)}
                  </button>
                  <button
                    className="duo-btn duo-btn-outline duo-btn-full"
                    disabled={progress.gems < 100}
                    onClick={() => {
                      if (progress.gems >= 100) {
                        sfx('star', progress.sound);
                        setProgress({ gems: progress.gems - 100, hearts: 5 });
                        setOpenPop(null);
                      }
                    }}
                  >
                    {t('refillGemsBtn', ui)}
                  </button>
                </>
              )}
              <button
                className="duo-btn duo-btn-purple duo-btn-full"
                onClick={() => {
                  sfx('star', progress.sound);
                  setProgress({ unlimitedHearts: !progress.unlimitedHearts, hearts: 5 });
                  setOpenPop(null);
                }}
              >
                {progress.unlimitedHearts ? t('superDeactivate', ui) : t('enableUnlimitedBtn', ui)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botones rápidos de Modo Oscuro y Música */}
      <button
        className="duo-icon-round"
        onClick={() => setProgress({ darkMode: !progress.darkMode })}
        title={t('darkModeLabel', ui)}
        aria-label={t('darkModeLabel', ui)}
      >
        {progress.darkMode ? '☀️' : '🌙'}
      </button>
      <button
        className={`duo-icon-round ${progress.music ? 'active' : ''}`}
        onClick={toggleMusic}
        title={t('music', ui)}
        aria-label={t('music', ui)}
      >
        <IconMusic size={17} />
      </button>
    </div>
  );

  return (
    <div className={`duo-app-shell ${childMode ? 'duo-child-mode' : ''}`} onClick={() => setOpenPop(null)}>
      {/* Barra lateral izquierda estilo Duolingo (256px en escritorio, barra inferior en móvil) */}
      <aside className="duo-left-sidebar">
        <button className="duo-logo-btn" onClick={() => setActiveTab('learn')}>
          <DuoWordmark ui={ui} />
        </button>

        <nav className="duo-nav-list" aria-label={t('mainNavigation', ui)}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`duo-nav-item ${activeTab === item.id ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={activeTab === item.id ? 'page' : undefined}
              title={item.label}
              onClick={() => {
                sfx('click', progress.sound);
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span className="duo-nav-icon-wrap">
                <DuoNavIcon tab={item.id} size={28} />
                {item.badge && <span className="duo-nav-badge">{item.badge}</span>}
              </span>
              <span className="duo-nav-label">{item.label}</span>
            </button>
          ))}

          <button
            className={`duo-nav-item duo-mode-toggle ${childMode ? 'active' : ''}`}
            onClick={() => setChildMode((value) => !value)}
            aria-pressed={childMode}
            aria-label={childMode ? (ui === 'eu' ? 'Ikuspegi osoa' : 'Vista completa') : (ui === 'eu' ? 'Haurrentzako ikuspegia' : 'Modo infantil')}
            title={childMode ? (ui === 'eu' ? 'Ikuspegi osoa' : 'Vista completa') : (ui === 'eu' ? 'Haurrentzako ikuspegia' : 'Modo infantil')}
          >
            <span className="duo-nav-icon-wrap" aria-hidden="true">🧸</span>
            <span className="duo-nav-label">{childMode ? (ui === 'eu' ? 'Ikuspegi osoa' : 'Vista completa') : (ui === 'eu' ? 'Haurrentzako modua' : 'Modo infantil')}</span>
          </button>

          <button className="duo-nav-item desktop-only-nav" onClick={onSettings} aria-label={t('navMore', ui)} title={t('navMore', ui)}>
            <span className="duo-nav-icon-wrap">
              <DuoNavIcon tab="more" size={28} />
            </span>
            <span className="duo-nav-label">{t('navMore', ui)}</span>
          </button>
        </nav>
      </aside>

      {/* Barra superior compacta en móvil / tablet */}
      <header className="duo-mobile-topbar">
        {statsBar}
      </header>

      {/* Columna central principal */}
      <main className="duo-center-main">
        {activeTab === 'learn' && (
          <LearnPathView
            progress={progress}
            setProgress={setProgress}
            onStartLesson={(mode, lvlId, nodeKey) => onStart(lvlId, mode, nodeKey)}
            onOpenStory={(st) => setActiveStory(st)}
            onOpenGuidebook={(uId) => setGuidebookUnit(uId)}
            onToast={onToast}
          />
        )}
        {activeTab === 'letters' && (
          <LettersView
            progress={progress}
            setProgress={setProgress}
            onStartLettersLesson={() => onStart(1, 'letters')}
            onStartSyllableStage={(stage) => {
              if (stage === 1) onStart(2, 'level', 'u2-n0');
              else if (stage === 2) onStart(2, 'level', 'u2-n1');
              else if (stage === 3) onStart(2, 'level', 'u2-n3');
              else onStart(2, 'level', 'u2-n5');
            }}
          />
        )}
        {activeTab === 'stories' && (
          <StoriesView progress={progress} setProgress={setProgress} onOpenStory={(st) => setActiveStory(st)} />
        )}
        {activeTab === 'practice' && (
          <PracticeHubView
            progress={progress}
            onStartMode={(mode, lvlId) => onStart(lvlId, mode)}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView progress={progress} setProgress={setProgress} onToast={onToast} />
        )}
        {activeTab === 'quests' && (
          <QuestsView progress={progress} setProgress={setProgress} onToast={onToast} />
        )}
        {activeTab === 'shop' && (
          <ShopView progress={progress} setProgress={setProgress} onToast={onToast} />
        )}
        {activeTab === 'profile' && (
          <ProfileView progress={progress} setProgress={setProgress} onOpenSettings={onSettings} />
        )}
      </main>

      {/* Columna derecha de Widgets estilo Duolingo (368px en escritorio) */}
      <aside className="duo-right-rail">
        {statsBar}

        {boostActive && (
          <div className="duo-rail-boost">
            <span>⚡</span>
            <strong>2X XP ACTIVO ({boostMins} min)</strong>
          </div>
        )}

        {/* Tarjeta Super / Vidas Ilimitadas */}
        {!effectiveUnlimited && (
          <div className="duo-rail-card super-promo">
            <div className="duo-rail-super-top">
              <div>
                <span className="duo-super-pill">{t('superBadge', ui)}</span>
                <h3>{t('superTitle', ui)}</h3>
                <p>{t('superDesc', ui)}</p>
              </div>
              <Mascot mood="excited" size={74} outfit={progress.equippedOutfit} />
            </div>
            <button
              className="duo-btn duo-btn-blue duo-btn-full"
              onClick={() => {
                sfx('star', progress.sound);
                setProgress({ unlimitedHearts: true, hearts: 5 });
                onToast(t('superActive', ui));
              }}
            >
              {t('superActivate', ui)}
            </button>
          </div>
        )}

        {/* Widget de Liga Semanal */}
        <div className="duo-rail-card">
          <div className="duo-rail-head">
            <h3>{tf('leagueTitle', ui, { name: league[ui] })}</h3>
            <button className="duo-link-btn" onClick={() => setActiveTab('leaderboard')}>
              {t('viewAll', ui)}
            </button>
          </div>
          <div className="duo-rail-league-body">
            <span className="duo-rail-shield">{league.badge}</span>
            <div>
              <strong>
                #{myLeagueRank} · {progress.xp} XP
              </strong>
              <p>
                {myLeagueRank <= 5
                  ? `▲ ${t('promotionZone', ui)}`
                  : t('leagueSubtitle', ui)}
              </p>
            </div>
          </div>
        </div>

        {/* Widget de Misiones del Día */}
        <div className="duo-rail-card">
          <div className="duo-rail-head">
            <h3>{t('dailyQuestsTitle', ui)}</h3>
            <button className="duo-link-btn" onClick={() => setActiveTab('quests')}>
              {t('viewAll', ui)}
            </button>
          </div>
          <div className="duo-rail-quests">
            {quests.map((q) => {
              const pct = Math.min(100, Math.round((q.current / q.target) * 100));
              return (
                <div key={q.id} className="duo-rail-quest-row">
                  <span className="duo-rq-icon">{q.emoji}</span>
                  <div className="duo-rq-main">
                    <div className="duo-rq-top">
                      <strong>{q.title}</strong>
                      <small>{q.current}/{q.target}</small>
                    </div>
                    <div className="duo-quest-bar">
                      <div className="duo-quest-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget de Nivel (Bajo/Medio/Alto), Ruta Pedagógica y Accesibilidad */}
        <div className="duo-rail-card">
          <div className="duo-rail-head">
            <h3>
              <IconAccessibility size={16} /> {t('diffLevelLabel', ui)}
            </h3>
            <button className="duo-link-btn" onClick={onSettings}>
              {t('configureSupports', ui).toUpperCase()}
            </button>
          </div>
          <div className="duo-rail-route-pills" style={{ marginBottom: 8 }}>
            {(['bajo', 'medio', 'alto'] as DifficultyLevel[]).map((dl) => (
              <button
                key={dl}
                className={`duo-route-mini ${progress.difficultyLevel === dl ? 'active' : ''}`}
                onClick={() => {
                  setProgress({ difficultyLevel: dl });
                  onToast(t('diffChanged', ui));
                }}
              >
                <span>
                  {dl === 'bajo' ? `🌱 ${t('diffLow', ui)}` : dl === 'medio' ? `⭐ ${t('diffMed', ui)}` : `🚀 ${t('diffHigh', ui)}`}
                </span>
              </button>
            ))}
          </div>
          <div className="duo-rail-route-pills">
            {(['visual', 'auditivo', 'mixta'] as Route[]).map((r) => (
              <button
                key={r}
                className={`duo-route-mini ${progress.route === r ? 'active' : ''}`}
                onClick={() => {
                  setProgress({ route: r });
                  onToast(t('routeChanged', ui));
                }}
              >
                <RouteIcon route={r} size={14} />
                <span>
                  {r === 'visual' ? t('routeVisual', ui) : r === 'auditivo' ? t('routeAuditivo', ui) : t('routeMixta', ui)}
                </span>
              </button>
            ))}
          </div>
          {supportSummary(ad, ui).length > 0 && (
            <div className="support-summary" style={{ marginTop: 10 }}>
              {supportSummary(ad, ui).map((lbl) => (
                <span key={lbl}>{lbl}</span>
              ))}
            </div>
          )}
        </div>

        <footer className="duo-rail-footer">
          <span>{t('tagline', ui)}</span>
          <strong>{t('credits', ui)}</strong>
        </footer>
      </aside>

      {/* Modales de Guía de Unidad y Lector de Cuentos */}
      {guidebookUnit !== null && (
        <GuidebookModal
          unitId={guidebookUnit}
          ui={ui}
          sound={progress.sound}
          outfit={progress.equippedOutfit}
          onClose={() => setGuidebookUnit(null)}
        />
      )}

      {activeStory !== null && (
        <StoryPlayerModal
          story={activeStory}
          progress={progress}
          onComplete={handleStoryComplete}
          onClose={() => setActiveStory(null)}
        />
      )}
    </div>
  );
}

function useMemoRank(myXp: number): number {
  let rank = 1;
  for (const r of LEAGUE_RIVALS) {
    if (r.baseXp > myXp) rank += 1;
  }
  return rank;
}
