// Child process: opens js/home.js like a browser visiting https://<host><path>, prints the result as JSON.
// Each visit runs in its own process because home.js starts on import and app.js keeps module state.
import { setupBrowser, JS_DIR } from './browser-env.mjs'
import { installFakeRpc } from './fake-rpc.mjs'

const input = JSON.parse(process.env.PAGE)
const page = setupBrowser({ href: 'https://' + input.host + (input.path ?? '/'), storage: input.storage })
const requests = installFakeRpc(input.fixtures, input.down)
console.log = () => {} // app logs a lot, stdout is kept for the result

await import(new URL('home.js', JS_DIR).href)
await Promise.race([page.redirected, new Promise((resolve) => setTimeout(resolve, input.wait ?? 3000))])

process.stdout.write(JSON.stringify({ redirect: page.redirect, requests, errors: page.errors, storage: page.storage }) + '\n')
process.exit(0)
