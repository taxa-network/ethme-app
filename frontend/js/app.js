import { createClient, http, custom, fallback, encodeFunctionData, decodeFunctionResult, toHex } from 'viem'
// actions imported individually (instead of createPublicClient / createWalletClient) so webpack only bundles what we use
import { readContract, getEnsText, getEnsResolver, getEnsAddress, getChainId, getAddresses, requestAddresses } from 'viem/actions'
import { mainnet, sepolia } from 'viem/chains'
import { normalize, packetToBytes } from 'viem/ens'
window.Buffer = require('buffer').Buffer;
const contentHash = require('@ensdomains/content-hash')
const ethens_namehash = require('@ensdomains/eth-ens-namehash')


/*
* CONFIG
*/
const is_localhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const infura_key = '69239fa82795403c85acad5ef889505c' // whitelist origins added to infura key
const alchemy_key = 'yOKZQOEt5sXUTVm_WOR56-21h0itKD9n' // whitelist origins
const graph_key = '7c95a8f89dfd52c1e6bcafadd4426468' // whitelist origins
const ens_subgraph_id = '5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH'

export const constants = {
  backend_url: !is_localhost ? 'https://eth.me/api/' : 'http://localhost:1337/api/',
  top_domain: 'you2.eth', //you2 on sepolia
  web2_domain_tld: '.me',
  zero_address: '0x0000000000000000000000000000000000000000',
 
  graph_url: `https://gateway-arbitrum.network.thegraph.com/api/${graph_key}/subgraphs/id/${ens_subgraph_id}`,
  alchemy_url: 'https://eth-mainnet.g.alchemy.com/v2/' + alchemy_key,
  infura_url: 'https://mainnet.infura.io/v3/' + infura_key,
  infura_url_testnet: 'https://sepolia.infura.io/v3/' + infura_key, 
  testnet: 'testnet',

  ipfs_gateway: 'eth2.me',
  bzz_gateway: 'bzz.link',
  sia_gateway: 'https://siasky.net',
  arweave_gateway: 'https://arweave.net',
  ens_app_url: 'https://app.ens.domains/',

  supported_index_fields: ['url', 'contenthash', 'com.twitter', 'com.github', 'org.telegram', 'com.linkedin', 'com.opensea', 'com.reddit', 'com.etherscan'],
  cache_ttl_ms: 10 * 60 * 1000, // 10 minutes
  version: '0.0.8',

  addresses: {
    1: { // mainnet
      ensRegistryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      customResolverAddress: '0x6c8e046d242e73bc8f5ee9148390aa2de1868aca',
      bulkENSAddress: '0xF674DfcBc1C36FeF2EA3682A6E653E9e1c103BaC',
    },
    11155111: { // sepolia
      ensRegistryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      customResolverAddress: '0xB39a425cC05862adDc490A42e849406960210911',
      bulkENSAddress: '0xB5638e686fe7c97d4Ed61Bb7a656b8a6A878B228',
    }
  },
  
  
  resolverABI: [
    {
      "constant": true,
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "node",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        }
      ],
      "name": "text",
      "outputs": [
        {
          "internalType": "string",
          "name": "", "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes[]",
          "name": "data",
          "type": "bytes[]"
        }
      ],
      "name": "multicall",
      "outputs": [
        {
          "internalType": "bytes[]",
          "name": "results",
          "type": "bytes[]"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "node",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "value",
          "type": "string"
        }
      ],
      "name": "setText",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    { "inputs": [{ "internalType": "bytes32", "name": "node", "type": "bytes32" }], "name": "contenthash", "outputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }], "stateMutability": "view", "type": "function" }
  ],

  erc721ABI: [
    {
      "constant": true,
      "inputs": [
        {
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "tokenURI",
      "outputs": [
        {
          "name": "",
          "type": "string"
        }
      ],
      "type": "function"
    },
  ],

  erc1155ABI: [
    {
      "constant": true,
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "uri",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ],

  ensRegistryABI: [
    { "constant": false, "inputs": [{ "internalType": "bytes32", "name": "node", "type": "bytes32" }, { "internalType": "bytes32", "name": "label", "type": "bytes32" }, { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "resolver", "type": "address" }, { "internalType": "uint64", "name": "ttl", "type": "uint64" }], "name": "setSubnodeRecord", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "bytes32", "name": "node", "type": "bytes32" }], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
  ],

  // ENS Universal Resolver (ENSv2 entry point), address comes from viem chain config
  universalResolverABI: [
    { "inputs": [{ "name": "name", "type": "bytes" }, { "name": "data", "type": "bytes" }, { "name": "gateways", "type": "string[]" }], "name": "resolveWithGateways", "outputs": [{ "name": "", "type": "bytes" }, { "name": "address", "type": "address" }], "stateMutability": "view", "type": "function" }
  ],
  local_batch_gateway: 'x-batch-gateway:true', // viem handles CCIP-Read (offchain names) locally with this gateway value

  bulkENSABI: [
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "node",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32[]",
          "name": "subNodeHashes",
          "type": "bytes32[]"
        },
        {
          "internalType": "address[]",
          "name": "addresses",
          "type": "address[]"
        }
      ],
      "name": "createBulkSubdomains",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "node",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "symbol",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "nftId",
          "type": "string"
        }
      ],
      "name": "createSubdomain",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "supportedCollections",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
  ],
}
/*
* CONFIG END
*/


var g_resolver, g_network_id, g_registry_address, public_client, wallet_client

getAppVersion()


/*
 * Gets content hash field for provided ENS name and returns encoded hash value.
 * Reads through the Universal Resolver, so ENSv2, migrated and offchain names resolve too.
 */
export async function getContentHashFromContract(_ensName) {
  try {
    const resolver_address = await getResolverAddressForENSName(_ensName)
    if (!resolver_address || resolver_address == constants.zero_address) return false

    let encoded_content_hash = await resolveRecord(_ensName, 'contenthash', [namehash(_ensName)])
    return encoded_content_hash
  }
  catch (error) {
    captureErrorSentry(error, {
      method: "getContentHashFromContract",
    })
    return false
  }
}


/*
 * Decodes provided encoded content hash and returns decoded hash with protocol type.
 */
export function decodeContentHash(encoded_content_hash) {
  try {
    let decoded_content_hash = contentHash.decode(encoded_content_hash)
    const codec = contentHash.getCodec(encoded_content_hash)
    let protocolType

    if (codec === 'ipfs-ns') {
      protocolType = 'ipfs'
    } else if (codec === 'ipns-ns') {
      protocolType = 'ipns'
    } else if (codec === 'swarm-ns') {
      protocolType = 'bzz'
    } else if (codec === 'onion') {
      protocolType = 'onion'
    } else if (codec === 'onion3') {
      protocolType = 'onion3'
    } else if (codec === 'skynet-ns') {
      protocolType = 'sia'
    } else if (codec === 'arweave-ns') {
      protocolType = 'arweave'
    } else {
      return false // codec type not supported
    }

    return { protocolType, decoded: decoded_content_hash }
  }
  catch (error) {
    captureErrorSentry(error, {
      method: "decodeContentHash",
    })
    return false
  }
}


/*
 * Generates web2 content hash link w.r.t. provided protocol.
 */
export function getContentHashLink(objContentHash) {
  try {
    const protocol = objContentHash.protocolType
    const hash = objContentHash.decoded

    if (protocol === 'ipfs') {
      return generateIpfsIpnsUrl(protocol, hash)
    }
    if (protocol === 'ipns') {
      return generateIpfsIpnsUrl(protocol, hash)
    }
    if (protocol === 'bzz') {
      return generateSwarmUrl(hash)
    }
    if (protocol === 'onion' || protocol === 'onion3') {
      return `http://${hash}.onion`
    }
    if (protocol === 'sia') {
      return `${constants.sia_gateway}/${hash}`
    }
    if (protocol === 'arweave' || protocol === 'ar') {
      return `${constants.arweave_gateway}/${hash}`
    }
    return false
  }
  catch (error) {
    captureErrorSentry(error, {
      method: "getContentHashLink",
    })
    return false
  }
}


/*
 * Gets content hash field for provided ENS name and returns hash wit respective protocol.
 */
export async function getContentHashForENSName(_ensName) {
  try {
    let encoded_content_hash = await getContentHashFromContract(_ensName)
    if(!encoded_content_hash || encoded_content_hash == '') return false

    let objContentHash = decodeContentHash(encoded_content_hash)

    if(!objContentHash.decoded || objContentHash.decoded == '0x0000000000000000000000000000000000000000') return false
    
    let content = getContentHashLink(objContentHash)
    return content
  }
  catch (error) {
    captureErrorSentry(error, {
      method: "getContentHashForENSName",
    })
    return false
  }
}


/*
 * Decodes provided encoded content hash and returns hash with respective protocol.
 */
export function decodeContentHashWithLink(encoded_content_hash) {
  let objContentHash = decodeContentHash(encoded_content_hash)

  if(!objContentHash.decoded || objContentHash.decoded == '0x0000000000000000000000000000000000000000') return false

  let content = getContentHashLink(objContentHash)
  return content
}

/*
 * Get ENS data from Graph Indexer for given ENS name.
 */
export async function getENSDataFromGraph(ens_name_hash, ens_name){
  let ensname_data;
  try {
    let query = `query getSubgraphRecords($id: String!) {
        domain(id: $id) {
          name
          resolver {
            address
            contentHash
            texts
          }
        }
      }
    `
    let params = {
      "query": query,
      "variables":{ "id": ens_name_hash },
      "operationName": "getSubgraphRecords"
    }

    let response = await makePOSTRequest(constants.graph_url, params)
    ensname_data = await response.json()
    console.log(ensname_data);
    ensname_data = ensname_data.data.domain
    return ensname_data
  }
  catch (error) {
    // if error from graph then capture error message from graph response, in additional data
    let errors = ensname_data && ensname_data.errors ? { ...ensname_data.errors } : 'no error message found'

    captureErrorSentry(error, {
      method: "getENSDataFromGraph",
      "window.location.href": window?.location?.href,
      "location.hostname": location?.hostname,
      "document.domain": document?.domain,
      "ens_name": ens_name,
    }, 
    { // extra
      "ensdata_error": errors
    })
    return false
  }
}


/*
 * Gets index field from text records of the passed ENS name.
 * Also chekcs if the field is supported, and converts it in redirect URL.
 * Index field is a custom field defined for eth.me redirection page.
 * 
 * Returns redirect URL on success. In case if field not supported or any 
 * issue found then returns blank string ''.
 */
export async function getIndexRecordForENSName(ens_name_hash, resolver_address, encoded_content_hash, ens_name) {
  try {
    // get resolver for ENS name
    if (!resolver_address || resolver_address == constants.zero_address) 
      return { index_url: false, index_field: false, txt_value: false }
    
    // get index text field
    let index_field = await getTextRecord(ens_name, 'index');
    console.log('index_field', index_field);


    // check if field supported, and generate url
    if (constants.supported_index_fields.includes(index_field)) {
      let index_url = '', txt_value

      // if contenthash then get and generate ipfs url
      if (index_field == 'contenthash') {
        index_url = decodeContentHashWithLink(encoded_content_hash) //await getContentHashForENSName(ens_name)
      }

      // if text fields then get value and generate respective URL (like twitter etc)
      else {
        txt_value = await getTextRecord(ens_name, index_field);

        // index points to an empty record, return '' so caller falls through to contenthash/url
        if (!txt_value) {
          index_url = ''
        }
        else if (index_field == 'url') {
          index_url = ensureHttpProtocol(txt_value)
        }
        else {
          // generate social media URLs with username etc
          index_url = generateIndexValueURL(index_field, txt_value)
        }
      }

      return { index_url, index_field, txt_value }
    }

    return { index_url: false, index_field: index_field, txt_value: false }
  } 
  catch (error) {
    captureErrorSentry(error, {
      method: "getIndexRecordForENSName",
    })
    return { index_url: false, index_field: false, txt_value: false }
  }
}


/*
 * Gets URL field from text records of the passed ENS name.
 * 
 * Returns redirect URL on success, otherwise returns false.
 */
export async function getURLRecordForENSName(ens_name_hash, resolver_address, ens_name) {
  try {
    // get resolver for ENS name
    if (!resolver_address || resolver_address == constants.zero_address) return false
    
    // get url text field
    let url_field = await getTextRecord(ens_name, 'url');
    console.log('url_field', url_field);

    if (url_field && url_field != '') {
      url_field = ensureHttpProtocol(url_field)
      return url_field
    }

    return false
  } 
  catch (error) {
    captureErrorSentry(error, {
      method: "getURLRecordForENSName",
    })
    return false
  }
}


/*
 * Reads a resolver record (text, contenthash) through the ENS Universal Resolver.
 * Works for ENSv1, ENSv2 (incl. migrated) and offchain (CCIP-Read) names.
 * Returns ABI decoded record, or '0x' if no resolver / record (same as an empty web3 result).
 */
export async function resolveRecord(ens_name, function_name, args) {
  const [result] = await readContract(public_client, {
    address: public_client.chain.contracts.ensUniversalResolver.address,
    abi: constants.universalResolverABI,
    functionName: 'resolveWithGateways',
    args: [
      toHex(packetToBytes(ens_name)),
      encodeFunctionData({ abi: constants.resolverABI, functionName: function_name, args }),
      [constants.local_batch_gateway],
    ],
  })
  if (result === '0x') return '0x'
  return decodeFunctionResult({ abi: constants.resolverABI, functionName: function_name, data: result })
}


/*
 * Gets text record value, returns '' when not set (same as web3 contract call).
 * Requests are kept per name/key, so records prefetched in getENSDataOnchain are not fetched again.
 */
const g_text_records = {}
export async function getTextRecord(ens_name, key) {
  const name = normalize(ens_name)
  const cache_key = name + '|' + key

  if (!g_text_records[cache_key]) {
    g_text_records[cache_key] = getEnsText(public_client, { name, key }).then((value) => value ?? '')
    g_text_records[cache_key].catch(() => delete g_text_records[cache_key]) // don't keep failed requests
  }
  return g_text_records[cache_key]
}


/*
 * Gets ENS data onchain via Universal Resolver (ENSv1, ENSv2 and offchain names).
 * Resolver, contenthash, index and url are fetched in one RPC batch request.
 * Returns same shape as getENSDataFromGraph: { name, resolver: { address, contentHash, texts } }
 */
export async function getENSDataOnchain(ens_name) {
  try {
    await initializeWeb3(false, true)
    ens_name = normalize(ens_name)

    const [resolver_address, content_hash, index_field, url_field] = await Promise.all([
      getResolverAddressForENSName(ens_name),
      resolveRecord(ens_name, 'contenthash', [namehash(ens_name)]).catch(() => '0x'),
      getTextRecord(ens_name, 'index').catch(() => ''),
      getTextRecord(ens_name, 'url').catch(() => ''),
    ])
    if (!resolver_address || resolver_address == constants.zero_address) return false

    let texts = []
    if (index_field) texts.push('index')
    if (url_field) texts.push('url')

    return { name: ens_name, resolver: { address: resolver_address, contentHash: content_hash, texts } }
  }
  catch (error) {
    captureErrorSentry(error, {
      method: "getENSDataOnchain",
    })
    return false
  }
}


export function generateIndexValueURL(index_field, txt_value) {
  switch (index_field) {
    case 'com.twitter':
      return generateTwitterURL(txt_value)

    case 'com.github':
      return generateGithubURL(txt_value)

    case 'org.telegram':
      return generateTelegramURL(txt_value)

    case 'com.linkedin':
      return generateLinkedinURL(txt_value)

    case 'com.opensea':
      return generateOpenseaURL(txt_value)

    case 'com.reddit':
      return generateRedditURL(txt_value)

    case 'com.etherscan':
      return generateEtherscanURL(txt_value)

    default:
      return '';
  }
}


/**
* ENS avatar field also supports adding images directly from NFT contract.
* This function fetches metadata from given NFT contract & extracts image.
*/
export async function fetchImgFromNFT(token_standard, token_contract, token_id) {
  let token_uri

  // call ERC721 contract with respective ABI
  if (token_standard == 'erc721') {
    token_uri = await readContract(public_client, { address: token_contract, abi: constants.erc721ABI, functionName: 'tokenURI', args: [BigInt(token_id)] });
  }

  // call ERC1155 contract with respective ABI
  else if (token_standard == 'erc1155') {
    token_uri = await readContract(public_client, { address: token_contract, abi: constants.erc1155ABI, functionName: 'uri', args: [BigInt(token_id)] });
  }
  console.log(token_uri);

  token_uri = token_uri.startsWith('ipfs://') ? resolveIPFSURL(token_uri) : token_uri

  const response = await fetch(token_uri);
  const metadata = await response.json();
  let nft_img = metadata.image
  console.log(metadata);

  nft_img = nft_img.startsWith('ipfs://') ? resolveIPFSURL(nft_img) : nft_img
  return nft_img
}


/**
* Get address of provided ENS name.
* Returns { full address, short_address, address_link }. 
*/
export async function getAddress(ens_name) {
  let address = await getEnsAddress(public_client, { name: normalize(ens_name) })
  return formatAddress(address)
}


/**
* Formats provided address and also add short address and block scanner link.
*/
export function formatAddress(address) {
  let address_text = address.substring(0, 6) + '...' +  address.substring(address.length-4, address.length)

  return {
    address: address,
    short_address: address_text,
    address_link: 'https://etherscan.io/address/' + address
  }
}


/**
* Normalise and hash ENS name 
* https://docs.ens.domains/contract-api-reference/name-processing
*/
export function namehash(_ensName) {
  try {
    let hash = ethens_namehash.hash(_ensName)
    return hash 
  } 
  catch (error) {
    captureErrorSentry(error, {
      method: "namehash",
    })
  }
}


/**
* Extract ens name from URL hostname.
*/
export function getENSFromURL(hostname) {
  return hostname.split('.')[0] + '.eth';
}


/**
* Extract path from URL.
*/
export function getPathFromURL(location) {
  let url = (new URL(location));
  const path_without_domain = url.pathname + url.search + url.hash ;
  return path_without_domain
}


/**
* Initialize viem client, if metamask is present then connect to window.ethereum 
* else connect to alchemy/infura.
* param network - will connect to mainnet by default if not found, otherwise if testnet then connect to testnet 
* param is_infura - if true it will connect to infura even if metamask/provider found
*/
export async function initializeWeb3(network, is_infura) {
  try {
    if(public_client) return; // if client already initialized then return

    const chain = (network && network == constants.testnet) ? sepolia : mainnet

    if (window.ethereum && !is_infura) {
      public_client = createClient({ chain, transport: custom(window.ethereum) })
      wallet_client = createClient({ chain, transport: custom(window.ethereum) })
      console.log('connected to window.ethereum', window.ethereum.isConnected());
    }
    else {
      // batch: calls made in the same tick go in one JSON-RPC batch request
      // mainnet: alchemy, failover to infura if alchemy fails
      const transport = (network && network == constants.testnet)
        ? http(constants.infura_url_testnet, { batch: true })
        : fallback([http(constants.alchemy_url, { batch: true }), http(constants.infura_url, { batch: true })])

      public_client = createClient({ chain, transport })
      g_network_id = chain.id // chain is known, saves an eth_chainId request
      console.log('connected to provider', chain.name);
    }
    
    await setRegistryAddress()
  } 
  catch (error) {
    captureErrorSentry(error, {
      method: "initializeWeb3",
    })
    return false
  }
}


/**
* Extract NFT info from URL, including Collection and NFT ID.
* else connect to infura.
*/
export function extractNFTInfoFromURL(location){
  let params = (new URL(location)).searchParams;
  let nft_data = params.get("q");

  if(!nft_data) return false

  let ar = nft_data.split('-')

  if (ar[0] && ar[1])
    return { collection_name: ar[0], nft_id: ar[1] } 
  else 
    return false
}


/* 
 * Checks if given subname exists or not in defined top domain.
 * Returns bool true/false.
 */
export async function checkIfSubdomainExists(collection_name, nft_id){
  let sub_domain = formatSubdomain(collection_name, nft_id)
  let full_sub_domain = sub_domain + '.' + constants.top_domain

  // get owner of provided subname
  // stays on ENS v1 registry, BulkENS contract creates subnames there
  let owner = await readContract(public_client, { address: g_registry_address, abi: constants.ensRegistryABI, functionName: 'owner', args: [namehash(full_sub_domain)] });

  let subdomain_exists = owner == '0x0000000000000000000000000000000000000000' ? false : true
  return subdomain_exists
}


/* 
 * Provides a single point to create subname with standard format from provided collection and nft id.
 * Use this function to format subname in application.
 */
export function formatSubdomain(collection_name, nft_id){
  return collection_name + '-' + nft_id
}


/* 
 * Connects wallet (metamask) to application if its not connected. 
 */
export async function connectWallet() {
  try {
    if (window.ethereum) {
      await window.ethereum.enable()
      return true
    }
    return false
  } 
  catch (error) {
    captureErrorSentry(error, {
      method: "connectWallet",
    })
    return false
  }
}


/* 
 * Creates single subname via BulkENS contract from connected wallet.
 * Returns transaction receipt after confirmation.
 */
export async function createSubdomainTx(collection_name, nft_id) {
  // write actions loaded on demand, keeps them out of the redirect bundle
  const { writeContract, waitForTransactionReceipt } = await import('viem/actions')
  const [account] = await requestAddresses(wallet_client)

  const hash = await writeContract(wallet_client, {
    account,
    address: await getBulkENSAddress(),
    abi: constants.bulkENSABI,
    functionName: 'createSubdomain',
    args: [namehash(constants.top_domain), collection_name, nft_id],
  })
  console.log(hash);

  return await waitForTransactionReceipt(public_client, { hash })
}


export async function checkIfWalletConnected() {
  const accounts = wallet_client ? await getAddresses(wallet_client) : [] // returns all connected accounts to this site
  return accounts.length > 0 ? true : false 
}


/**
* Sets ENS Registry address according to the selected network
*/
export async function setRegistryAddress() {
  const network_id = await getNetworkId()
  
  if (!constants.addresses[network_id]) {
    console.log(`Selected network ${network_id} not supported`);
    return
  }

  g_registry_address = constants.addresses[network_id].ensRegistryAddress
}


export function getRegistryAddress() {
  return g_registry_address // registry address is set by our config in initializeWeb3
}


export async function getCustomResolverAddress() {
  const network_id = await getNetworkId()

  if (!constants.addresses[network_id]) {
    console.log(`Selected network ${network_id} not supported`);
    return false
  }

  return constants.addresses[network_id].customResolverAddress;
}


export async function getBulkENSAddress() {
  const network_id = await getNetworkId()

  if (!constants.addresses[network_id]) {
    console.log(`Selected network ${network_id} not supported`);
    return false
  }

  return constants.addresses[network_id].bulkENSAddress;
}


export async function getNetworkId() {
  if (g_network_id) return g_network_id // return g_network_id (global variable) if already set (fetched in this cycle)

  const network_id = await getChainId(public_client)
  g_network_id = network_id;
  return network_id
}


/* 
 * Gets resolver address for ENS name
 */
export async function getResolverAddressForENSName(ens_name) {
  if (g_resolver) return g_resolver // return resolver (global variable) if already set (fetched in this cycle)

  // Universal Resolver lookup, works for ENSv1, ENSv2 and offchain names
  g_resolver = await getEnsResolver(public_client, { name: normalize(ens_name) });
  console.log(g_resolver);
  return g_resolver
}


export async function makePOSTRequest(url, params_obj, keep_alive) {
  let response
  
  if (!keep_alive) {
    response = await fetch(url, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params_obj)
    });
  }
  else {
    response = await fetch(url, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params_obj),
      keepalive: true, // Ensures the request continues after page unload
    });
  }
  
  return response
}


/**
* Resolves IPFS url format to HTTPS url. 
*/
export function resolveIPFSURL(ipfs_url) {
  // ipfs://<cid>/<path> -> https://<cid>.ipfs.<gateway>/<path>
  const [cid, ...path] = ipfs_url.replace('ipfs://', '').split('/')
  return generateIpfsIpnsUrl('ipfs', cid) + (path.length ? '/' + path.join('/') : '')
}

/**
* Generate IPFS/IPNS url from hash 
*/
export function generateIpfsIpnsUrl(protocol, hash) {
  return `https://${hash}.${protocol}.${constants.ipfs_gateway}`
}

/**
* Generate Swarm url from hash 
*/
export function generateSwarmUrl(hash) {
  try {
    let swarm_ens = getENSFromURL(location.hostname)
    swarm_ens = swarm_ens.replace('.eth','')
    return `https://${swarm_ens}.${constants.bzz_gateway}`
  }
  catch (error) {
    captureErrorSentry(error, {
      method: "generateSwarmUrl",
    })
    return `https://${constants.bzz_gateway}/bzz/${hash}`
  }
}


export function generateTwitterURL(value) {
  return 'https://twitter.com/' + value;
}

export function generateGithubURL(value) {
  return 'https://github.com/' + value;
}

export function generateTelegramURL(value) {
  return 'https://t.me/' + value;
}

export function generateLinkedinURL(value) {
  return 'https://linkedin.com/in/' + value;
}

export function generateOpenseaURL(value) {
  // user can use profile name like, "XED_Arts" (for https://opensea.io/XED_Arts)
  // or collection link like, "collection/mutant-ape-yacht-club" (for https://opensea.io/collection/mutant-ape-yacht-club)
  return 'https://opensea.io/' + value;
}

export function generateRedditURL(value) {
  return 'https://www.reddit.com/user/' + value;
}

export function generateEtherscanURL(value) {
  return 'https://etherscan.io/address/' + value;
}

/* 
 * Checks if url has http protocol added, if not then add it
 */
export function ensureHttpProtocol(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }

  return url;
}


export function getAppVersion() {
  console.log(`Version: ${constants.version}`);
}


/**
 * To capture error in sentry with additional tags and data.
 * @param error - main error object 
 * @param tags - object containing string values to capture. E.g. {a: '1', b: '2'}
 * @param extra - additional data object, can contain object values. E.g. {obj1: {a: '1', b: '2'}}
 */
export function captureErrorSentry(error, tags, extra) {
  console.log(error);
  Sentry.captureException(error, { tags, extra: extra });
}


export async function getUnicodeENSName(_ensName) {
  try {
    const punycode = await import('punycode/');
    const ens_name_decoded = punycode.toUnicode(_ensName); // decode to special chars
    return ens_name_decoded ? ens_name_decoded : _ensName  
  } 
  catch (error) {
    captureErrorSentry(error, {
      method: "getUnicodeENSName",
    })
    return _ensName
  }
}