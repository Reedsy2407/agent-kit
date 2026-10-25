import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'styles.css'), 'utf8');

const luminancia = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const tokens = Object.fromEntries([...css.matchAll(/^\s+--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gim)].map((m) => [m[1], m[2]]));

test('cada contraste anotado en un token es exacto (a 0,1) y cumple AA', () => {
  let comprobados = 0;
  for (const m of css.matchAll(/^\s+--([a-z0-9-]+):\s*(#[0-9a-f]{6});\s*\/\*(.*?)\*\//gim)) {
    const [, nombre, hex, nota] = m;
    for (const c of nota.matchAll(/blanco ([\d.]+):1 sobre ella/g)) {
      assert.ok(Math.abs(contraste('#ffffff', hex) - Number(c[1])) <= 0.1, `${nombre}: blanco sobre ella`);
      assert.ok(Number(c[1]) >= 4.5);
      comprobados++;
    }
    for (const c of nota.matchAll(/([\d.]+):1 sobre ([a-z-]+)/g)) {
      if (c[2] === 'ella') continue;
      assert.ok(tokens[c[2]], `${nombre}: el token ${c[2]} no existe`);
      assert.ok(Math.abs(contraste(hex, tokens[c[2]]) - Number(c[1])) <= 0.1, `${nombre} sobre ${c[2]}: anotado ${c[1]}, real ${contraste(hex, tokens[c[2]]).toFixed(2)}`);
      assert.ok(Number(c[1]) >= 4.5, `${nombre}: debe cumplir AA de texto`);
      comprobados++;
    }
  }
  assert.ok(comprobados >= 8, `solo se comprobaron ${comprobados}`);
});

test('la escala respeta cuerpo 18 px, piso 15 px y táctil 44 px', () => {
  assert.match(css, /--t-0:\s*18px/);
  assert.match(css, /--t-note:\s*15px/);
  assert.match(css, /--touch:\s*44px/);
  assert.match(css, /--space-1:\s*4px/);
});

test('respeta prefers-reduced-motion y foco visible', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
});

test('sin fuentes sobreusadas como voz ni degradados decorativos', () => {
  assert.doesNotMatch(css, /font-family:[^;]*\b(Inter|Roboto|Arial)\b/i);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter/);
});
