// Fake Ethereum JSON-RPC (Alchemy / Infura) that answers ENS Universal Resolver calls from fixtures.
// fixtures: { 'name.eth': { resolver, contenthash, texts: { key: value }, revert: 'ResolverError' } }
// Names missing from fixtures (or without resolver) behave as unregistered.
import { decodeFunctionData, encodeFunctionResult, encodeErrorResult, zeroAddress, zeroHash } from 'viem'

const UNIVERSAL_RESOLVER_ABI = [
  { type: 'function', name: 'findResolver', stateMutability: 'view', inputs: [{ type: 'bytes' }], outputs: [{ type: 'address' }, { type: 'bytes32' }, { type: 'uint256' }] },
  { type: 'function', name: 'resolveWithGateways', stateMutability: 'view', inputs: [{ type: 'bytes' }, { type: 'bytes' }, { type: 'string[]' }], outputs: [{ type: 'bytes' }, { type: 'address' }] },
  { type: 'error', name: 'ResolverNotFound', inputs: [{ type: 'bytes' }] },
  { type: 'error', name: 'ResolverError', inputs: [{ type: 'bytes' }] },
]
const RESOLVER_ABI = [
  { type: 'function', name: 'text', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'string' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'contenthash', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'bytes' }] },
]
const RPC_HOSTS = { 'eth-mainnet.g.alchemy.com': 'alchemy', 'mainnet.infura.io': 'infura' }

// DNS encoded name (0x07vitalik03eth00) to 'vitalik.eth'
function decodeDnsName(hex) {
  const bytes = Buffer.from(hex.slice(2), 'hex')
  const labels = []
  for (let i = 0; bytes[i]; i += bytes[i] + 1) labels.push(bytes.subarray(i + 1, i + 1 + bytes[i]).toString('utf8'))
  return labels.join('.')
}

function revert(error_name, args) {
  const error = new Error('execution reverted: ' + error_name)
  error.revert_data = encodeErrorResult({ abi: UNIVERSAL_RESOLVER_ABI, errorName: error_name, args })
  return error
}

function ethCall(fixtures, data) {
  const { functionName, args } = decodeFunctionData({ abi: UNIVERSAL_RESOLVER_ABI, data })
  const record = fixtures[decodeDnsName(args[0])]

  if (functionName === 'findResolver') {
    return encodeFunctionResult({ abi: UNIVERSAL_RESOLVER_ABI, functionName, result: [record?.resolver ?? zeroAddress, zeroHash, 0n] })
  }

  // resolveWithGateways(name, resolver call, gateways)
  if (!record?.resolver) throw revert('ResolverNotFound', [args[0]])
  if (record.revert) throw revert(record.revert, ['0x'])

  const call = decodeFunctionData({ abi: RESOLVER_ABI, data: args[1] })
  const value = call.functionName === 'text' ? (record.texts?.[call.args[1]] ?? '') : (record.contenthash ?? '0x')
  const result = encodeFunctionResult({ abi: RESOLVER_ABI, functionName: call.functionName, result: value })
  return encodeFunctionResult({ abi: UNIVERSAL_RESOLVER_ABI, functionName, result: [result, record.resolver] })
}

function reply(fixtures, request) {
  try {
    if (request.method === 'eth_chainId') return { jsonrpc: '2.0', id: request.id, result: '0x1' }
    if (request.method === 'eth_call') return { jsonrpc: '2.0', id: request.id, result: ethCall(fixtures, request.params[0].data) }
    throw new Error('fake rpc: method not supported ' + request.method)
  }
  catch (error) {
    if (!error.revert_data) throw error
    return { jsonrpc: '2.0', id: request.id, error: { code: 3, message: error.message, data: error.revert_data } }
  }
}

/*
 * Replaces fetch: RPC hosts answer from fixtures, providers listed in `down` return 503,
 * any other host (subgraph, backend, gateways) returns 404.
 * Returns the list of requests made: [{ host, rpc: [methods] }]
 */
export function installFakeRpc(fixtures = {}, down = []) {
  const requests = []

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input?.url ?? input))
    const body = init?.body ? JSON.parse(init.body) : null
    requests.push({ host: url.host, rpc: body ? [].concat(body).map((request) => request.method) : [] })

    const provider = RPC_HOSTS[url.host]
    if (!provider) return new Response('not available in tests', { status: 404 })
    if (down.includes(provider)) return new Response('provider down', { status: 503 })

    return Response.json(Array.isArray(body) ? body.map((request) => reply(fixtures, request)) : reply(fixtures, body))
  }

  return requests
}
