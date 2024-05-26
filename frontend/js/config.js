const is_localhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const infura_key = '69239fa82795403c85acad5ef889505c' // whitelist origins added to infura key

const constants = {
  backend_url: !is_localhost ? 'https://eth.me/api/' : 'http://localhost:1337/api/',
  top_domain: 'you2.eth', //you2 on sepolia
  web2_domain_tld: '.me',
  zero_address: '0x0000000000000000000000000000000000000000',
 
  infura_url: 'https://mainnet.infura.io/v3/' + infura_key,
  infura_url_testnet: 'https://sepolia.infura.io/v3/' + infura_key, 
  testnet: 'testnet',

  ipfs_gateway: 'https://cloudflare-ipfs.com/',
  bzz_gateway: 'https://gateway.ethswarm.org/',
  sia_gateway: 'https://siasky.net/',
  arweave_gateway: 'https://arweave.net/',
  ens_app_url: 'https://app.ens.domains/',

  version: '0.0.3',

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
    { "constant": false, "inputs": [{ "internalType": "bytes32", "name": "node", "type": "bytes32" }, { "internalType": "bytes32", "name": "label", "type": "bytes32" }, { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "resolver", "type": "address" }, { "internalType": "uint64", "name": "ttl", "type": "uint64" }], "name": "setSubnodeRecord", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }
  ],

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
