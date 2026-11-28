import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Module, createRequire } from 'node:module';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const result = await build({
  stdin: {
    contents:
      "export { DictionaryView } from './src/DictionaryView';\n" +
      "export { ReadingCoachView } from './src/ReadingCoachView';\n",
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['react'],
  write: false,
  logLevel: 'silent',
});
const require = createRequire(import.meta.url);
const mod = new Module(require.resolve('react'));
mod.filename = require.resolve('react');
mod.paths = Module._nodeModulePaths(process.cwd());
mod._compile(result.outputFiles[0].text, mod.filename);
const { DictionaryView, ReadingCoachView } = mod.exports;

const baseProgress = {
  uiLang: 'es',
  learnLang: 'both',
  schoolStage: 'prim12',
  difficultyLevel: 'medio',
  route: 'mixta',
  equippedOutfit: 'classic',
  sound: false,
  speechRate: 0.85,
  calmMode: true,
  xp: 0,
  gems: 0,
  dailyXp: 0,
  dailyLessons: 0,
  xpHistory: {},
  streak: 0,
  bestStreak: 0,
  lastPlayed: '',
};

function textOf(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  return node?.children ? textOf(node.children) : '';
}

test('el diccionario busca palabras y muestra sus traducciones', () => {
  let query = '';
  const view = TestRenderer.create(
    React.createElement(DictionaryView, {
      progress: baseProgress,
      query,
      setQuery: (value) => {
        query = value;
        view.update(React.createElement(DictionaryView, { progress: baseProgress, query, setQuery: (v) => (query = v) }));
      },
    }),
  );
  const input = view.root.findByType('input');
  assert.match(input.props.placeholder, /Escribe una palabra/);
  act(() => input.props.onChange({ target: { value: 'katu' } }));
  assert.equal(query, 'katu');
  const rendered = textOf(view.toJSON());
  assert.match(rendered, /gato/);
  assert.match(rendered, /katu/);
  assert.match(rendered, /cat/);
  assert.doesNotMatch(rendered, /No encontramos/);
  view.unmount();
});

test('el diccionario avisa cuando no encuentra una palabra', () => {
  const view = TestRenderer.create(
    React.createElement(DictionaryView, { progress: baseProgress, query: 'zxqwv', setQuery: () => {} }),
  );
  assert.match(textOf(view.toJSON()), /No encontramos «zxqwv»/);
  view.unmount();
});

test('el micrófono de lectura marca las palabras al tocarlas y premia la lectura', () => {
  let lastPatch = null;
  const setProgress = (patch) => {
    lastPatch = typeof patch === 'function' ? patch(baseProgress) : patch;
  };
  const view = TestRenderer.create(
    React.createElement(ReadingCoachView, {
      progress: baseProgress,
      setProgress,
      onToast: () => {},
    }),
  );
  assert.match(textOf(view.toJSON()), /Micrófono de lectura/);
  assert.match(textOf(view.toJSON()), /Toca cada palabra/);

  const words = view.root.findAll((node) => node.type === 'button' && node.props.className?.includes('duo-read-word'));
  assert.ok(words.length >= 3, 'las palabras del texto deben poder tocarse sin micrófono');
  act(() => words[0].props.onClick());
  assert.match(words[0] ? words[0].props.className : '', /is-read/);
  const refreshed = view.root.findAll((node) => node.type === 'button' && node.props.className?.includes('duo-read-word'));
  assert.match(refreshed[0].props.className, /is-read/);

  const finish = view.root.findAll((node) => node.type === 'button' && textOf(node.children).includes('He terminado'));
  act(() => finish[0].props.onClick());
  const claim = view.root.findAll((node) => node.type === 'button' && textOf(node.children).includes('XP'));
  assert.ok(claim.length > 0, 'debe aparecer el botón para recoger XP');
  act(() => claim[0].props.onClick());
  assert.ok(lastPatch && lastPatch.xp > 0, 'la lectura debe sumar XP');
  view.unmount();
});
