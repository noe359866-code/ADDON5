import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Module, createRequire } from 'node:module';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const result = await build({ entryPoints: ['src/PatoPlay.tsx'], bundle: true, platform: 'node', format: 'cjs', external: ['react'], write: false, logLevel: 'silent' });
const require = createRequire(import.meta.url);
const bundle = new Module(require.resolve('react'));
bundle.filename = require.resolve('react');
bundle.paths = Module._nodeModulePaths(process.cwd());
bundle._compile(result.outputFiles[0].text, bundle.filename);
const { PatoPlay } = bundle.exports;

test('Pato reacciona a las acciones y se puede usar sin sonido', () => {
  const view = TestRenderer.create(React.createElement(PatoPlay, { ui: 'es', sound: false, calm: false, outfit: 'classic' }));
  const root = view.root;
  const status = () => root.findByProps({ role: 'status' }).children.join('');
  assert.equal(status(), '¡Cuac! ¿Jugamos?');
  const buttons = root.findAllByType('button');
  act(() => buttons[0].props.onClick());
  assert.equal(status(), '¡Cuac, cuac! ¡Hola!');
  act(() => buttons[1].props.onClick());
  assert.equal(status(), '¡Ji, ji! ¡Qué cosquillas!');
  act(() => buttons[2].props.onClick());
  assert.equal(status(), '¡Un abrazo de pato para ti!');
  act(() => buttons[3].props.onClick());
  assert.equal(status(), '¡A bailar! Cuac, cuac.');
  view.unmount();
});

test('la zona y las respuestas se traducen al cambiar a euskera', () => {
  const view = TestRenderer.create(React.createElement(PatoPlay, { ui: 'eu', sound: false, calm: true, outfit: 'classic' }));
  assert.equal(view.root.findByType('summary').findByType('strong').children.join(''), 'Jolastu Pato Venturarekin');
  const buttons = view.root.findAllByType('button');
  act(() => buttons[3].props.onClick());
  assert.equal(view.root.findByProps({ role: 'status' }).children.join(''), 'Dantzara! Kuak, kuak.');
  view.unmount();
});
