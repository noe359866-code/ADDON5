import { useState } from 'react';
import { computeAdaptations } from '../adaptations';
import { Confetti, DuoOwlBuddy, Mascot, StarRow } from '../components';
import { bonusModes, levels } from '../data';
import { DictionarySearchBar } from '../DictionaryView';
import { DUO_STORIES, UNIT_THEMES, nodesForUnit } from '../duoData';
import type { DuoStory, PathNodeDef } from '../duoData';
import { DuoChestSvg, DuoCrownSvg, IconBook, IconCheck, IconLock, IconStar } from '../icons';
import { t, tf } from '../i18n';
import { PatoPlay } from '../PatoPlay';
import { InstallApp } from '../InstallApp';
import { isUnlocked, nextLevel } from '../progress';
import { stageColor } from '../stages';
import { sfx } from '../sound';
import type { Progress, SessionMode } from '../types';

/* ================================================================== */
/* Camino Serpentino de Unidades (Duolingo /learn)                     */
/* ================================================================== */

interface ActiveNodePopover {
  unitId: number;
  node: PathNodeDef;
  unlocked: boolean;
  done: boolean;
  isLegendary: boolean;
}

export function LearnPathView({
  progress,
  setProgress,
  onStartLesson,
  onOpenStory,
  onOpenGuidebook,
  onToast,
  dictQuery,
  onDictQuery,
  onOpenDictionary,
}: {
  progress: Progress;
  setProgress: (patch: Partial<Progress> | ((prev: Progress) => Partial<Progress>)) => void;
  onStartLesson: (mode: SessionMode, levelId: number | null, nodeKey?: string) => void;
  onOpenStory: (story: DuoStory) => void;
  onOpenGuidebook: (unitId: number) => void;
  onToast: (msg: string) => void;
  dictQuery?: string;
  onDictQuery?: (value: string) => void;
  onOpenDictionary?: () => void;
}) {
  const ui = progress.uiLang;
  const level = stageColor(progress.schoolStage);
  const currentUnitId = nextLevel(progress);
  const [selectedPop, setSelectedPop] = useState<ActiveNodePopover | null>(null);
  const [chestBurst, setChestBurst] = useState(0);

  function openChest(chestKey: string) {
    if (progress.chestsClaimed.includes(chestKey)) return;
    sfx('badge', progress.sound);
    setChestBurst((b) => b + 1);
    setProgress((prev) => ({
      gems: prev.gems + 25,
      chestsClaimed: [...prev.chestsClaimed, chestKey],
    }));
    onToast(t('chestToast', ui));
    setSelectedPop(null);
  }

  return (
    <div className="duo-learn-column" onClick={() => setSelectedPop(null)}>
      {chestBurst > 0 && !progress.calmMode && <Confetti burstKey={chestBurst} count={36} />}
      <section className="duo-kid-hello">
        <div className="duo-kid-hello-mascot">
          <Mascot mood="wave" size={96} outfit={progress.equippedOutfit} interactive sound={progress.sound} />
        </div>
        <div className="duo-kid-hello-copy">
          <span className="duo-kid-hello-hi">
            {progress.name ? tf('kidHelloName', ui, { name: progress.name }) : t('kidHello', ui)}
          </span>
          <h1>{t('kidHelloTitle', ui)}</h1>
          <p>{t('kidHelloSub', ui)}</p>
        </div>
        <span
          className="duo-kid-hello-level"
          style={{ background: level.soft, color: level.ink, borderColor: level.color }}
        >
          <span aria-hidden="true">{level.emoji}</span> {level.name[ui]}
        </span>
      </section>

      {onDictQuery && (
        <div className="duo-home-search" onClick={(e) => e.stopPropagation()}>
          <DictionarySearchBar
            value={dictQuery ?? ''}
            onChange={onDictQuery}
            onSubmit={() => onOpenDictionary?.()}
            ui={ui}
          />
          <p className="duo-home-search-hint">📖 {t('dictHomeHint', ui)}</p>
        </div>
      )}
      <PatoPlay ui={ui} sound={progress.sound} calm={computeAdaptations(progress).calm} outfit={progress.equippedOutfit} />
      <InstallApp ui={ui} />

      {levels.map((unit) => {
        const theme = UNIT_THEMES[unit.id] ?? UNIT_THEMES[1]!;
        const unitUnlocked = isUnlocked(progress, unit.id);
        const unitCompleted = !!progress.completed[unit.id];
        const unitLegendary = !!progress.legendary[unit.id];
        const stars = progress.stars[unit.id] ?? 0;
        const nodes = nodesForUnit(unit.id);

        const chestKey = `chest-u${unit.id}`;
        const chestOpened = progress.chestsClaimed.includes(chestKey);
        const storyRead = progress.storiesRead.includes(`ds${unit.id}`);

        const nodeDone = nodes.map((nd) => {
          if (nd.kind === 'chest') return chestOpened;
          if (nd.kind === 'story') return storyRead || unitCompleted;
          if (nd.kind === 'trophy') return unitCompleted;
          const count = progress.nodeProgress[`u${unit.id}-n${nd.index}`] ?? 0;
          return count >= 1 || unitCompleted;
        });

        let activeIdx = -1;
        if (unitUnlocked && unit.id === currentUnitId && !unitCompleted) {
          activeIdx = nodeDone.findIndex((d) => !d);
          if (activeIdx === -1) activeIdx = nodes.length - 1;
        }

        const unitHasPopover = selectedPop?.unitId === unit.id;

        return (
          <section key={unit.id} className={`duo-unit-section ${unitHasPopover ? 'has-popover' : ''}`}>
            {/* Banner colorido oficial de Unidad con botón GUÍA */}
            <header
              className={`duo-unit-banner ${!unitUnlocked ? 'is-locked' : ''} ${unitLegendary ? 'is-legendary' : ''}`}
              style={
                unitLegendary
                  ? { background: 'linear-gradient(135deg, #ce82ff 0%, #8b46ff 100%)', borderBottomColor: '#6929d4' }
                  : unitUnlocked
                    ? { background: theme.bg, borderBottomColor: theme.lip }
                    : undefined
              }
            >
              <span className="duo-unit-banner-emoji" aria-hidden="true">
                {unit.emoji}
              </span>
              <div className="duo-unit-banner-text">
                <span className="duo-unit-kicker">
                  {tf('sectionUnit', ui, { n: String(unit.id) })} · {unit[ui].skill}
                </span>
                <h2>{unit[ui].title}</h2>
                <p>{unit[ui].sub}</p>
              </div>
              <button
                className="duo-guidebook-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  sfx('click', progress.sound);
                  onOpenGuidebook(unit.id);
                }}
              >
                <IconBook size={18} />
                <span>{t('guidebookBtn', ui)}</span>
              </button>
            </header>

            {/* Camino Serpentino de Nodos 3D */}
            <div className="duo-serpentine-track">
              {/* Personajes animados junto al camino */}
              <div
                className={`duo-path-character ${unit.id % 2 === 1 ? 'side-left' : 'side-right'} ${!unitUnlocked ? 'is-locked' : ''}`}
              >
                {unit.id % 2 === 1 ? (
                  <Mascot
                    mood={!unitUnlocked ? 'think' : unitCompleted ? 'cheer' : 'wave'}
                    size={102}
                    outfit={progress.equippedOutfit}
                    interactive={unitUnlocked}
                    sound={progress.sound}
                  />
                ) : (
                  <DuoOwlBuddy size={88} locked={!unitUnlocked} />
                )}
              </div>

              {nodes.map((node, idx) => {
                const nodeKey = `u${unit.id}-n${node.index}`;
                const isDone = !!nodeDone[idx];
                const isCurrent = idx === activeIdx;
                const canClickChest = unitUnlocked && (idx === 0 || nodeDone[0] || unitCompleted);
                const nodeUnlocked =
                  unitUnlocked &&
                  (idx === 0 ||
                    isDone ||
                    isCurrent ||
                    !!nodeDone[idx - 1] ||
                    (node.kind === 'chest' && canClickChest) ||
                    node.kind === 'story');
                const isJumpable = !unitUnlocked && idx === 0;
                const isSelected = selectedPop?.unitId === unit.id && selectedPop?.node.index === node.index;

                // Color del nodo circular 3D
                let bg = '#e5e5e5';
                let lip = '#b7b7b7';
                let fg = '#afafaf';
                if (unitLegendary && isDone) {
                  bg = '#ce82ff';
                  lip = '#9b51e0';
                  fg = '#ffffff';
                } else if (isDone && node.kind !== 'chest') {
                  bg = '#ffc800';
                  lip = '#e0a800';
                  fg = '#ffffff';
                } else if (nodeUnlocked) {
                  bg = theme.bg;
                  lip = theme.lip;
                  fg = '#ffffff';
                } else if (isJumpable) {
                  bg = theme.bg;
                  lip = theme.lip;
                  fg = '#ffffff';
                }

                // Progreso del anillo exterior
                const stepVal = progress.nodeProgress[nodeKey] ?? 0;
                const pctRing = isCurrent
                  ? Math.min(85, Math.max(20, Math.round((stepVal / node.totalCrownSteps) * 100) || 25))
                  : 0;
                const circumference = 2 * Math.PI * 42;

                return (
                  <div
                    key={nodeKey}
                    className={`duo-node-row ${isSelected ? 'has-popover' : ''}`}
                    style={{ transform: `translateX(${node.offsetPx}px)` }}
                  >
                    <div className="duo-node-anchor" onClick={(e) => e.stopPropagation()}>
                      {/* Etiqueta flotante animada EMPEZAR / ¿SALTAR AQUÍ? / LEGENDARIO (clicable directo) */}
                      {isCurrent && (
                        <button
                          type="button"
                          className="duo-floating-start"
                          style={{ color: theme.bg }}
                          onClick={() => {
                            if (node.kind === 'chest') {
                              openChest(chestKey);
                            } else if (node.kind === 'story') {
                              const st = DUO_STORIES.find((s) => s.id === node.storyId) ?? DUO_STORIES[0]!;
                              onOpenStory(st);
                            } else {
                              onStartLesson('level', unit.id, nodeKey);
                            }
                          }}
                        >
                          {t('startPill', ui)}
                        </button>
                      )}
                      {isJumpable && (
                        <button
                          type="button"
                          className="duo-floating-start jump"
                          style={{ color: theme.bg }}
                          onClick={() => onStartLesson('level', unit.id, nodeKey)}
                        >
                          {t('jumpHerePill', ui)}
                        </button>
                      )}
                      {unitCompleted && !unitLegendary && node.kind === 'trophy' && unit.id === currentUnitId && (
                        <button
                          type="button"
                          className="duo-floating-start legendary"
                          onClick={() => onStartLesson('legendary', unit.id, nodeKey)}
                        >
                          👑 {t('legendaryPill', ui)}
                        </button>
                      )}

                      {/* Anillo de progreso circular SVG alrededor del nodo activo */}
                      {isCurrent && (
                        <svg className="duo-node-ring" width="98" height="92" viewBox="0 0 98 98" aria-hidden="true">
                          <circle cx="49" cy="49" r="42" fill="none" stroke="var(--duo-swan)" strokeWidth="7" />
                          <circle
                            cx="49"
                            cy="49"
                            r="42"
                            fill="none"
                            stroke={theme.bg}
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - (pctRing / 100) * circumference}
                            transform="rotate(-90 49 49)"
                          />
                        </svg>
                      )}

                      {/* Nodo Cofre vs Nodo Circular 3D */}
                      {node.kind === 'chest' ? (
                        <button
                          className={`duo-chest-node ${chestOpened ? 'opened' : canClickChest ? 'ready' : 'locked'}`}
                          onClick={() => {
                            sfx('click', progress.sound);
                            setSelectedPop({
                              unitId: unit.id,
                              node,
                              unlocked: canClickChest,
                              done: chestOpened,
                              isLegendary: unitLegendary,
                            });
                          }}
                          aria-label={t('chestTitle', ui)}
                        >
                          <DuoChestSvg size={64} open={chestOpened} />
                        </button>
                      ) : (
                        <button
                          className={`duo-pebble-btn ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${!nodeUnlocked && !isJumpable ? 'is-locked' : ''}`}
                          style={{
                            background: bg,
                            borderBottomColor: lip,
                            color: fg,
                          }}
                          onClick={() => {
                            sfx('click', progress.sound);
                            setSelectedPop(
                              isSelected
                                ? null
                                : {
                                    unitId: unit.id,
                                    node,
                                    unlocked: nodeUnlocked || isJumpable,
                                    done: isDone,
                                    isLegendary: unitLegendary,
                                  },
                            );
                          }}
                          aria-label={`${unit[ui].title} · ${ui === 'eu' ? node.euLabel : node.esLabel}`}
                        >
                          <span className="duo-pebble-shine" aria-hidden="true" />
                          {!nodeUnlocked && !isJumpable ? (
                            <IconLock size={26} />
                          ) : node.kind === 'story' ? (
                            <IconBook size={28} />
                          ) : node.kind === 'trophy' ? (
                            <DuoCrownSvg size={32} purple={unitLegendary} />
                          ) : isDone ? (
                            <IconCheck size={30} />
                          ) : node.syllableStage ? (
                            <strong className="duo-node-stage-num">{node.syllableStage}</strong>
                          ) : idx === 0 ? (
                            <IconStar size={30} filled />
                          ) : (
                            <span className="duo-node-emoji">{unit.emoji}</span>
                          )}
                        </button>
                      )}

                      {/* Etiqueta de etapa progresiva debajo del nodo (ej. 1·Directas, 2·Inversas, 3·Trabadas) */}
                      {(node.shortTagEs || node.shortTagEu) && (
                        <span className={`duo-node-subtag ${isDone ? 'done' : nodeUnlocked ? 'open' : 'locked'}`}>
                          {ui === 'eu' ? node.shortTagEu : node.shortTagEs}
                        </span>
                      )}

                      {/* Mini estrellas debajo del trofeo de unidad completada */}
                      {node.kind === 'trophy' && stars > 0 && (
                        <div className="duo-node-stars">
                          <StarRow count={stars} size="sm" />
                        </div>
                      )}

                      {/* Popover interactivo estilo Duolingo al pulsar un nodo */}
                      {isSelected && (
                        <div
                          className={`duo-node-popover ${!selectedPop.unlocked ? 'locked' : ''}`}
                          style={
                            selectedPop.unlocked
                              ? {
                                  background: unitLegendary ? '#9b51e0' : isDone && node.kind !== 'chest' ? '#ffc800' : theme.bg,
                                }
                              : undefined
                          }
                        >
                          <h4>{ui === 'eu' ? node.euLabel : node.esLabel}</h4>
                          <p>
                            {!selectedPop.unlocked
                              ? t('nodeLockedMsg', ui)
                              : node.kind === 'chest'
                                ? chestOpened
                                  ? t('chestClaimed', ui)
                                  : '+25 💎'
                                : isDone
                                  ? t('nodeCompleted', ui)
                                  : unit[ui].title}
                          </p>

                          {selectedPop.unlocked && (
                            <>
                              {node.kind === 'chest' ? (
                                !chestOpened && (
                                  <button
                                    className="duo-popover-cta"
                                    style={{ color: '#9b51e0' }}
                                    onClick={() => openChest(chestKey)}
                                  >
                                    {t('chestOpenBtn', ui)}
                                  </button>
                                )
                              ) : node.kind === 'story' ? (
                                <button
                                  className="duo-popover-cta"
                                  style={{ color: isDone ? '#b58300' : theme.bg }}
                                  onClick={() => {
                                    const st = DUO_STORIES.find((s) => s.id === node.storyId) ?? DUO_STORIES[0]!;
                                    setSelectedPop(null);
                                    onOpenStory(st);
                                  }}
                                >
                                  {isDone ? t('storyReplayBtn', ui) : t('storyStartBtn', ui)}
                                </button>
                              ) : isJumpable ? (
                                <button
                                  className="duo-popover-cta"
                                  style={{ color: theme.bg }}
                                  onClick={() => {
                                    setSelectedPop(null);
                                    onStartLesson('level', unit.id, nodeKey);
                                  }}
                                >
                                  ⚡ {t('nodeJumpBtn', ui)}
                                </button>
                              ) : (
                                <div className="duo-popover-btn-stack">
                                  <button
                                    className="duo-popover-cta"
                                    style={{ color: isDone ? '#b58300' : theme.bg }}
                                    onClick={() => {
                                      setSelectedPop(null);
                                      onStartLesson('level', unit.id, nodeKey);
                                    }}
                                  >
                                    {isDone
                                      ? tf('nodePracticeXp', ui, { xp: '10' })
                                      : tf('nodeStartXp', ui, { xp: '15' })}
                                  </button>
                                  {isDone && node.kind === 'trophy' && !unitLegendary && (
                                    <button
                                      className="duo-popover-cta legendary-cta"
                                      onClick={() => {
                                        setSelectedPop(null);
                                        onStartLesson('legendary', unit.id, nodeKey);
                                      }}
                                    >
                                      👑 {t('nodeLegendaryXp', ui)}
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Sección final Patio de Juegos Abierto (Modos 7 y 8) */}
      <section className="duo-unit-section">
        <header
          className="duo-unit-banner"
          style={{ background: UNIT_THEMES[7]!.bg, borderBottomColor: UNIT_THEMES[7]!.lip, color: '#3c2d00' }}
        >
          <div className="duo-unit-banner-text">
            <span className="duo-unit-kicker dark">{t('bonusFree', ui)}</span>
            <h2 style={{ color: '#3c2d00' }}>🎠 {t('bonusTitle', ui)}</h2>
            <p style={{ color: '#5c4500' }}>{t('bonusSub', ui)}</p>
          </div>
        </header>
        <div className="duo-playground-row">
          {bonusModes.map((bm) => (
            <button
              key={bm.id}
              className="duo-playground-card"
              onClick={() => onStartLesson('level', bm.id)}
            >
              <span className="duo-pg-emoji" aria-hidden="true">{bm.emoji}</span>
              <div>
                <strong>{bm[ui].title}</strong>
                <small>{bm[ui].sub}</small>
              </div>
              <span className="duo-btn duo-btn-green duo-btn-sm">{t('playBonus', ui)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
