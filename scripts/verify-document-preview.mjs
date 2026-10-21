#!/usr/bin/env node
/**
 * Document preview gate — checks src/lib/documentPreview.ts.
 *
 *   node scripts/verify-document-preview.mjs
 *
 * Runs the REAL TypeScript source (transpiled in memory with the project's own
 * `typescript`, same approach as verify-time-format.mjs). No new dependencies.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(ROOT, 'src', 'lib', 'documentPreview.ts')
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const mod = new Module(file)
mod.filename = file
mod.paths = Module._nodeModulePaths(path.dirname(file))
mod.require = createRequire(file)
mod._compile(outputText, file)
const { isPreviewable, sniffPreviewType } = mod.exports

const bytes = (...b) => Uint8Array.from(b)
const ascii = (s) => Uint8Array.from(Buffer.from(s, 'latin1'))

const sniffCases = [
  ['PDF', ascii('%PDF-1.7\n'), 'application/pdf'],
  ['JPEG', bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10), 'image/jpeg'],
  ['PNG', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image/png'],
  ['HTML', ascii('<!doctype html><script>'), null],
  ['SVG', ascii('<svg xmlns="http://www.w3.org/2000/svg">'), null],
  ['DOCX (zip)', bytes(0x50, 0x4b, 0x03, 0x04), null],
  ['DOC (OLE)', bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), null],
  ['GIF', ascii('GIF89a'), null],
  ['truncated PNG', bytes(0x89, 0x50, 0x4e, 0x47), null],
  ['truncated PDF', ascii('%PDF'), null],
  ['empty', new Uint8Array(0), null],
]

const previewCases = [
  [{ mimeType: 'application/pdf', fileName: 'a.pdf' }, true],
  [{ mimeType: 'image/jpeg', fileName: 'a.jpg' }, true],
  [{ mimeType: 'image/jpg', fileName: 'a' }, true],
  [{ mimeType: 'image/png', fileName: 'a.PNG' }, true],
  [{ mimeType: '', fileName: 'scan.PDF' }, true],
  [{ mimeType: 'application/octet-stream', fileName: 'cert.jpeg' }, true],
  [{ mimeType: 'application/msword', fileName: 'a.doc' }, false],
  [{ mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName: 'a.docx' }, false],
  [{ mimeType: 'image/svg+xml', fileName: 'a.svg' }, false],
  [{ mimeType: 'text/html', fileName: 'a.html' }, false],
  [{ mimeType: 'image/gif', fileName: 'a.gif' }, false],
  [{}, false],
]

let failures = 0
const check = (label, got, want) => {
  if (got !== want) {
    failures++
    console.error(`FAIL  ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)
  }
}

for (const [label, head, want] of sniffCases) check(`sniff ${label}`, sniffPreviewType(head), want)
for (const [doc, want] of previewCases) check(`isPreviewable ${JSON.stringify(doc)}`, isPreviewable(doc), want)

if (failures) {
  console.error(`\n${failures} failure(s)`)
  process.exit(1)
}
console.log(`OK  ${sniffCases.length + previewCases.length} cases`)
