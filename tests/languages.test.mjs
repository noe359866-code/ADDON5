import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { build } from 'esbuild';

const source = readFileSync('src/i18n.ts', 'utf8');
const tree = ts.createSourceFile('i18n.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
function dictionary(name) {
  const declaration = tree.statements.flatMap((s) => ts.isVariableStatement(s) ? [...s.declarationList.declarations] : []).find((d) => d.name.getText(tree) === name);
  assert.ok(declaration && ts.isObjectLiteralExpression(declaration.initializer), `Falta el diccionario ${name}`);
  const entries = new Map();
  for (const prop of declaration.initializer.properties) {
    assert.ok(ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.initializer));
    const key = prop.name.getText(tree).replace(/^['"]|['"]$/g, '');
    assert.ok(!entries.has(key), `Clave duplicada: ${name}.${key}`);
    entries.set(key, prop.initializer.text);
  }
  return entries;
}
const es = dictionary('es');
const eu = dictionary('eu');
const en = dictionary('enSpeechPrompts');
const placeholders = (value) => [...new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

test('los textos de interfaz tienen claves y variables equivalentes en castellano y euskera', () => {
  assert.deepEqual([...eu.keys()].sort(), [...es.keys()].sort());
  for (const [key, value] of es) {
    assert.ok(value.trim() && eu.get(key).trim(), `Texto vacío: ${key}`);
    assert.deepEqual(placeholders(eu.get(key)), placeholders(value), `Variables distintas: ${key}`);
  }
});

test('las instrucciones de audio en inglés no caen al castellano', () => {
  const exercises = readFileSync('src/exercises.ts', 'utf8');
  for (const match of exercises.matchAll(/\b(?:t|tf)\(\s*'([^']+)'\s*,\s*c\.lang/g)) {
    const key = match[1];
    assert.ok(en.has(key), `Falta la instrucción inglesa ${key}`);
    assert.deepEqual(placeholders(en.get(key)), placeholders(es.get(key)), `Variables distintas: ${key}`);
  }
});

test('las claves literales de traducción usadas en la app existen', () => {
  for (const filename of readdirSync('src').filter((f) => /\.(ts|tsx)$/.test(f))) {
    const text = readFileSync(`src/${filename}`, 'utf8');
    const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, filename.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', 'tf'].includes(node.expression.text) && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        assert.ok(es.has(key), `${filename}: falta la clave ${key}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
});

const bundle = await build({ entryPoints: ['src/data.ts', 'src/sound.ts'], bundle: true, platform: 'node', format: 'esm', write: false, outdir: 'unused' });
const modules = await Promise.all(bundle.outputFiles.map((f) => import(`data:text/javascript;base64,${Buffer.from(f.text).toString('base64')}`)));
const { words } = modules.find((m) => m.words);
const sound = modules.find((m) => m.speak);

test('el vocabulario corregido conserva el mismo significado y sus sílabas', () => {
  const expected = { bonito: 'pretty', seta: 'mushroom', pelota: 'ball', cama: 'bed', arco: 'bow' };
  for (const [id, translation] of Object.entries(expected)) {
    const word = words.find((w) => w.id === id);
    assert.equal(word?.en, translation);
    assert.equal(word.sylEn.join(''), translation);
  }
  assert.equal(words.find((w) => w.id === 'asustado').sylEn.length, 1);
  assert.equal(words.find((w) => w.id === 'miercoles').sylEn.length, 2);
});

test('cancelar o sustituir la voz impide que se reproduzca un audio antiguo', async () => {
  const spoken = [];
  globalThis.window = { speechSynthesis: { getVoices: () => [], cancel() {}, speak: (utterance) => spoken.push(utterance.text) } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  try {
    sound.speak('primero', 'es');
    sound.stopSpeaking();
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(spoken, []);
    sound.speak('antiguo', 'es');
    sound.speak('nuevo', 'es');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(spoken, ['nuevo']);
  } finally {
    sound.stopSpeaking();
    delete globalThis.window;
    delete globalThis.SpeechSynthesisUtterance;
  }
});
