import { build } from 'esbuild'
import { readFileSync, writeFileSync } from 'node:fs'

const js = (await build({
  entryPoints: ['src/main.js'], bundle: true, minify: true,
  format: 'iife', write: false, target: 'es2022',
})).outputFiles[0].text

const css = readFileSync('src/style.css', 'utf8')
const html = readFileSync('src/template.html', 'utf8')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js.replace(/<\/script/g, '<\\/script'))

writeFileSync('index.html', html)
console.log('index.html', (html.length / 1024).toFixed(0) + ' KB')
