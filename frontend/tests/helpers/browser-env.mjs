// Minimal browser globals so js/app.js and js/home.js can load in Node.
import { createRequire, registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

export const JS_DIR = new URL('../../js/', import.meta.url)
const js_require = createRequire(new URL('app.js', JS_DIR))

// app.js does import('punycode/'), Node can't import a directory, so point it to the
// package's ES module build (same file webpack picks via the "module" field)
const punycode_url = pathToFileURL(js_require.resolve('punycode/punycode.es6.js')).href
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'punycode/') return { url: punycode_url, shortCircuit: true }
    return next(specifier, context)
  },
})

/*
 * Sets window, location, document, localStorage and Sentry for a page at `href`.
 * Returns page state: redirect (url passed to location.replace), storage, errors (Sentry).
 */
export function setupBrowser({ href = 'https://test.eth.me/', storage = {} } = {}) {
  const page = { redirect: null, storage: { ...storage }, errors: [] }
  page.redirected = new Promise((resolve) => (page.onRedirect = resolve))

  const location = new URL(href)
  location.replace = (url) => {
    page.redirect = url
    page.onRedirect(url)
  }

  Object.assign(globalThis, {
    window: { location }, // own object, so app.js `window.Buffer = ...` doesn't replace Node's Buffer
    location,
    document: { title: '', domain: location.hostname },
    localStorage: {
      getItem: (key) => page.storage[key] ?? null,
      setItem: (key, value) => (page.storage[key] = String(value)),
      removeItem: (key) => delete page.storage[key],
    },
    Sentry: { captureException: (error) => page.errors.push(String(error?.shortMessage || error?.message || error)) },
    require: js_require, // js files use require() next to import, webpack allows it, Node needs a global
  })

  return page
}
