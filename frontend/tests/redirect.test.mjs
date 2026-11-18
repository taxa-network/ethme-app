// Redirect scenarios: runs the real js/home.js (+ app.js, viem) per name against a fake RPC.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { visit } from './helpers/visit.mjs'
import { RESOLVER, CONTENTHASH, IPFS_URL, ensAppPage } from './fixtures.mjs'

// visit <label>.eth.me with records for <label>.eth
const open = (label, records, options = {}) => visit({ host: label + '.eth.me', fixtures: { [label + '.eth']: records }, ...options })
const rpcRequests = (page) => page.requests.filter((request) => request.rpc.length)

describe('contenthash', { concurrency: 8 }, () => {
  const cases = [
    ['ipfs', IPFS_URL],
    ['ipns', 'https://k51qzi5uqu5dgccx524mfjv7znyfsa6g013o6v4yvis9dxnrjbwojc62pt0430.ipns.eth2.me'],
    ['swarm', 'https://swarm.bzz.link'], // swarm uses the ens label, not the hash
    ['arweave', 'https://arweave.net/ys32Pt8uC7TrVxHdOLByOspfPEq2LO63wREHQIM9SJQ'],
    ['onion3', 'http://p53lf57qovyuvwsc6xnrppyply3vtqm7l6pcobkmyqsiofyeznfu5uqd.onion'],
  ]
  for (const [type, expected] of cases) {
    test(type, async () => {
      const page = await open(type, { resolver: RESOLVER, contenthash: CONTENTHASH[type] })
      assert.equal(page.redirect, expected)
    })
  }

  test('unsupported / invalid contenthash falls through to url', async () => {
    const page = await open('badhash', { resolver: RESOLVER, contenthash: '0x1234', texts: { url: 'https://example.com' } })
    assert.equal(page.redirect, 'https://example.com')
  })
})

describe('url record', { concurrency: 8 }, () => {
  test('https url as is', async () => {
    assert.equal((await open('url', { resolver: RESOLVER, texts: { url: 'https://example.com/page' } })).redirect, 'https://example.com/page')
  })
  test('http url kept', async () => {
    assert.equal((await open('url', { resolver: RESOLVER, texts: { url: 'http://example.com' } })).redirect, 'http://example.com')
  })
  test('url without protocol gets https', async () => {
    assert.equal((await open('url', { resolver: RESOLVER, texts: { url: 'example.com' } })).redirect, 'https://example.com')
  })
})

describe('priority: index > contenthash > url > ENS page', { concurrency: 8 }, () => {
  test('contenthash wins over url', async () => {
    const page = await open('both', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { url: 'https://example.com' } })
    assert.equal(page.redirect, IPFS_URL)
  })
  test('index=url wins over contenthash', async () => {
    const page = await open('both', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { index: 'url', url: 'example.com' } })
    assert.equal(page.redirect, 'https://example.com')
  })
  test('index=contenthash', async () => {
    const page = await open('idx', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { index: 'contenthash', url: 'https://example.com' } })
    assert.equal(page.redirect, IPFS_URL)
  })
  test('index=contenthash without contenthash falls through to url', async () => {
    const page = await open('idx', { resolver: RESOLVER, texts: { index: 'contenthash', url: 'https://example.com' } })
    assert.equal(page.redirect, 'https://example.com')
  })
  test('unsupported index value is ignored', async () => {
    const page = await open('idx', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { index: 'com.website', 'com.website': 'nick' } })
    assert.equal(page.redirect, IPFS_URL)
  })
  test('resolver without records goes to ENS page', async () => {
    assert.equal((await open('empty', { resolver: RESOLVER })).redirect, ensAppPage('empty.eth'))
  })
})

describe('index = social text record', { concurrency: 8 }, () => {
  const cases = [
    ['com.twitter', 'nick', 'https://twitter.com/nick'],
    ['com.github', 'arachnid', 'https://github.com/arachnid'],
    ['org.telegram', 'nick', 'https://t.me/nick'],
    ['com.linkedin', 'nick', 'https://linkedin.com/in/nick'],
    ['com.opensea', 'collection/ens', 'https://opensea.io/collection/ens'],
    ['com.reddit', 'nick', 'https://www.reddit.com/user/nick'],
    ['com.etherscan', '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5', 'https://etherscan.io/address/0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5'],
  ]
  for (const [field, value, expected] of cases) {
    test(field, async () => {
      const page = await open('social', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { index: field, [field]: value } })
      assert.equal(page.redirect, expected)
    })
  }

  test('index field with empty value falls through to contenthash', async () => {
    const page = await open('social', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { index: 'com.twitter' } })
    assert.equal(page.redirect, IPFS_URL)
  })
  test('index=url with empty url falls through to contenthash', async () => {
    const page = await open('social', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { index: 'url' } })
    assert.equal(page.redirect, IPFS_URL)
  })
})

describe('name states', { concurrency: 8 }, () => {
  test('unregistered / expired name (no resolver) goes to ENS page', async () => {
    assert.equal((await open('nobody', {})).redirect, ensAppPage('nobody.eth'))
  })
  test('resolver error (e.g. offchain gateway down) goes to ENS page', async () => {
    assert.equal((await open('offchain', { resolver: RESOLVER, revert: 'ResolverError' })).redirect, ensAppPage('offchain.eth'))
  })
  test('punycode hostname resolves the unicode name', async () => {
    const page = await visit({ host: 'xn--marta-vq2c.eth.me', fixtures: { 'marta✨.eth': { resolver: RESOLVER, texts: { url: 'https://example.com' } } } })
    assert.equal(page.redirect, 'https://example.com')
  })
})

describe('path', { concurrency: 8 }, () => {
  test('path appended to redirect', async () => {
    const page = await open('path', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs }, { path: '/blog/post' })
    assert.equal(page.redirect, IPFS_URL + '/blog/post')
  })
  test('query and hash kept in order', async () => {
    const page = await open('path', { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs }, { path: '/a?x=1#top' })
    assert.equal(page.redirect, IPFS_URL + '/a?x=1#top')
  })
})

describe('local cache', { concurrency: 8 }, () => {
  const cached = (redirect_url, age_ms) => ({ 'cache.eth': JSON.stringify({ redirect_url, cached_time: Date.now() - age_ms }) })
  const records = { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs }

  test('resolved redirect is cached', async () => {
    const page = await open('cache', records)
    const entry = JSON.parse(page.storage['cache.eth'])
    assert.equal(entry.redirect_url, IPFS_URL)
    assert.ok(Math.abs(entry.cached_time - Date.now()) < 10_000)
  })
  test('fresh cache redirects without any request', async () => {
    const page = await open('cache', records, { storage: cached('https://cached.example', 60_000) })
    assert.equal(page.redirect, 'https://cached.example')
    assert.deepEqual(page.requests, [])
  })
  test('stale cache (> 10 min) is resolved again', async () => {
    const page = await open('cache', records, { storage: cached('https://cached.example', 11 * 60_000) })
    assert.equal(page.redirect, IPFS_URL)
  })
  test('corrupt cache entry is ignored', async () => {
    const page = await open('cache', records, { storage: { 'cache.eth': 'not json' } })
    assert.equal(page.redirect, IPFS_URL)
  })
})

describe('rpc', { concurrency: 8 }, () => {
  const records = { resolver: RESOLVER, contenthash: CONTENTHASH.ipfs, texts: { url: 'https://example.com' } }

  test('one batched request: resolver, contenthash, index, url', async () => {
    const page = await open('batch', records)
    assert.deepEqual(page.requests, [{ host: 'eth-mainnet.g.alchemy.com', rpc: ['eth_call', 'eth_call', 'eth_call', 'eth_call'] }])
  })
  test('index pointing to a text field adds one request', async () => {
    const page = await open('batch', { resolver: RESOLVER, texts: { index: 'com.github', 'com.github': 'arachnid' } })
    assert.equal(page.redirect, 'https://github.com/arachnid')
    assert.deepEqual(rpcRequests(page).map((request) => request.rpc.length), [4, 1])
  })
  test('alchemy down: falls back to infura', async () => {
    const page = await open('failover', records, { down: ['alchemy'], wait: 15_000 })
    assert.equal(page.redirect, IPFS_URL)
    assert.ok(page.requests.some((request) => request.host === 'mainnet.infura.io'))
  })
  test('all providers down: ENS page', async () => {
    const page = await open('down', records, { down: ['alchemy', 'infura'], wait: 30_000 })
    assert.equal(page.redirect, ensAppPage('down.eth'))
  })
})
