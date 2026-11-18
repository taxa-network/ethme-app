// Pure helpers in js/app.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupBrowser, JS_DIR } from './helpers/browser-env.mjs'
import { CONTENTHASH, IPFS_URL } from './fixtures.mjs'

setupBrowser({ href: 'https://swarm.eth.me/' })
const app = await import(new URL('app.js', JS_DIR).href)

test('getENSFromURL', () => {
  assert.equal(app.getENSFromURL('vitalik.eth.me'), 'vitalik.eth')
})

test('getUnicodeENSName decodes punycode', async () => {
  assert.equal(await app.getUnicodeENSName('xn--marta-vq2c.eth'), 'marta✨.eth')
  assert.equal(await app.getUnicodeENSName('vitalik.eth'), 'vitalik.eth')
})

test('namehash', () => {
  assert.equal(app.namehash('vitalik.eth'), '0xee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a53475835')
})

test('getPathFromURL', () => {
  assert.equal(app.getPathFromURL(new URL('https://a.eth.me/blog/post')), '/blog/post')
})

test('getPathFromURL keeps query before hash', () => {
  assert.equal(app.getPathFromURL(new URL('https://a.eth.me/p?x=1#h')), '/p?x=1#h')
})

test('ensureHttpProtocol', () => {
  assert.equal(app.ensureHttpProtocol('example.com'), 'https://example.com')
  assert.equal(app.ensureHttpProtocol('http://example.com'), 'http://example.com')
  assert.equal(app.ensureHttpProtocol('https://example.com'), 'https://example.com')
})

test('generateIndexValueURL unknown field', () => {
  assert.equal(app.generateIndexValueURL('com.discord', 'nick'), '')
})

test('decodeContentHashWithLink', () => {
  assert.equal(app.decodeContentHashWithLink(CONTENTHASH.ipfs), IPFS_URL)
  assert.equal(app.decodeContentHashWithLink(CONTENTHASH.swarm), 'https://swarm.bzz.link')
  assert.equal(app.decodeContentHashWithLink('0x1234'), false)
})

test('resolveIPFSURL', () => {
  assert.equal(app.resolveIPFSURL('ipfs://bafyabc'), 'https://bafyabc.ipfs.eth2.me')
  assert.equal(app.resolveIPFSURL('ipfs://bafyabc/meta/1.json'), 'https://bafyabc.ipfs.eth2.me/meta/1.json')
})
