import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PAGE = fileURLToPath(new URL('./page.mjs', import.meta.url))

/*
 * Visits a name page with fake chain data, see page.mjs.
 * input: { host, path, fixtures, storage, down }
 * returns { redirect, requests, errors, storage }
 */
export function visit(input) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ['--no-warnings', PAGE], { env: { ...process.env, PAGE: JSON.stringify(input) } }, (error, stdout, stderr) => {
      try {
        resolve(JSON.parse(stdout.trim().split('\n').pop()))
      }
      catch {
        reject(new Error('page crashed\n' + stderr + stdout))
      }
    })
  })
}
