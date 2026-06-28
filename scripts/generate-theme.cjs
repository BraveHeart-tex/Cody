#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');

// eslint-disable-next-line no-undef
const rootDir = path.resolve(__dirname, '..');
const cssPath = path.join(rootDir, 'src', 'global.css');
const outputPath = path.join(rootDir, 'src', 'theme.generated.ts');
const checkMode = process.argv.includes('--check');

const css = fs.readFileSync(cssPath, 'utf8');
const root = postcss.parse(css, { from: cssPath });

function toThemeKey(customProperty) {
  return customProperty
    .replace(/^--color-/, '')
    .split('-')
    .map((part, index) => {
      if (index === 0) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

function collectColorTokens(container) {
  const tokens = new Map();

  container.walkDecls(decl => {
    if (!decl.prop.startsWith('--color-')) {
      return;
    }

    tokens.set(toThemeKey(decl.prop), decl.value);
  });

  return tokens;
}

function findLightTokens() {
  let tokens;

  root.walkAtRules('theme', rule => {
    if (tokens != null) {
      return;
    }

    tokens = collectColorTokens(rule);
  });

  if (tokens == null || tokens.size === 0) {
    throw new Error(`No --color-* tokens found in @theme in ${cssPath}`);
  }

  return tokens;
}

function findDarkTokens() {
  let tokens;

  root.walkAtRules('media', mediaRule => {
    if (
      tokens != null ||
      !mediaRule.params.includes('prefers-color-scheme: dark')
    ) {
      return;
    }

    mediaRule.walkRules(rule => {
      if (tokens != null || rule.selector !== ':root') {
        return;
      }

      tokens = collectColorTokens(rule);
    });
  });

  if (tokens == null || tokens.size === 0) {
    throw new Error(
      `No dark --color-* tokens found in @media (prefers-color-scheme: dark) :root in ${cssPath}`
    );
  }

  return tokens;
}

function validateTokenSets(lightTokens, darkTokens) {
  const lightKeys = [...lightTokens.keys()];
  const missingDarkKeys = lightKeys.filter(key => !darkTokens.has(key));
  const extraDarkKeys = [...darkTokens.keys()].filter(
    key => !lightTokens.has(key)
  );

  if (missingDarkKeys.length > 0 || extraDarkKeys.length > 0) {
    throw new Error(
      [
        'Light and dark theme token keys differ.',
        missingDarkKeys.length > 0
          ? `Missing dark keys: ${missingDarkKeys.join(', ')}`
          : null,
        extraDarkKeys.length > 0
          ? `Extra dark keys: ${extraDarkKeys.join(', ')}`
          : null
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
}

function renderThemeObject(name, tokens, keyOrder) {
  const lines = [`  ${name}: {`];

  keyOrder.forEach((key, index) => {
    const suffix = index === keyOrder.length - 1 ? '' : ',';

    lines.push(`    ${key}: '${tokens.get(key)}'${suffix}`);
  });

  lines.push('  }');

  return lines.join('\n');
}

function renderFile(lightTokens, darkTokens) {
  const keyOrder = [...lightTokens.keys()];

  return `${[
    '// Generated from src/global.css by scripts/generate-theme.cjs.',
    '// Do not edit manually; run pnpm theme:generate.',
    '',
    'export const THEME = {',
    `${renderThemeObject('light', lightTokens, keyOrder)},`,
    renderThemeObject('dark', darkTokens, keyOrder),
    '} as const;',
    ''
  ].join('\n')}`;
}

function readCurrentOutput() {
  try {
    return fs.readFileSync(outputPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }

    throw error;
  }
}

const lightTokens = findLightTokens();
const darkTokens = findDarkTokens();

validateTokenSets(lightTokens, darkTokens);

const nextOutput = renderFile(lightTokens, darkTokens);

if (checkMode) {
  const currentOutput = readCurrentOutput();

  if (currentOutput !== nextOutput) {
    console.error(
      'src/theme.generated.ts is out of date. Run pnpm theme:generate and commit the result.'
    );
    process.exit(1);
  }

  console.log('src/theme.generated.ts is up to date.');
} else {
  fs.writeFileSync(outputPath, nextOutput);
  console.log('Generated src/theme.generated.ts from src/global.css.');
}
