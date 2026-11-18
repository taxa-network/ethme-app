// Shared test data. Contenthashes encoded with @ensdomains/content-hash.

export const RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63' // any non-zero address works with the fake rpc

export const CONTENTHASH = {
  ipfs: '0xe301017012201d261cc098861d9952e6c8954801800e56aa34aabd8a9651b04b4e2498a45c53',
  ipns: '0xe5010172002408011220066e20f72cc583d769bc8df5fedff24942b3b8941e827f023d306bdc7aecf5ac',
  swarm: '0xe40101fa011b20d1de9994b4d039f6548d191eb26786769f580809256b4685ef316805265ea162',
  arweave: '0x90b2ca05cacdf63edf2e0bb4eb5711dd38b0723aca5f3c4ab62ceeb7c1110740833d4894',
  onion3: '0xbd037035336c663537716f7679757677736336786e72707079706c79337674716d376c3670636f626b6d797173696f6679657a6e667535757164',
}

export const IPFS_URL = 'https://bafybeia5eyombgegdwmvfzwisveadaaok2vdjkv5rklfdmcljysjrjc4km.ipfs.eth2.me'

export const ensAppPage = (name) => 'https://app.ens.domains/' + name
