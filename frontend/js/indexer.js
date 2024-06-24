const ens_name = 'nich.eth'//getENSFromURL(location.hostname)
var url_path = getPathFromURL(location)//window.location.pathname;

/**
 * Initialize details for blockchain interaction, like web3 instance and contracts. 
 */
async function initialize() {
  $('#ens-name').text(ens_name)
  document.title = ens_name + constants.web2_domain_tld;
  let redirect_url;

  const graph_key = '7c95a8f89dfd52c1e6bcafadd4426468'
  const ens_subgraph_id = '5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH'
  let graph_url = `https://gateway-arbitrum.network.thegraph.com/api/${graph_key}/subgraphs/id/${ens_subgraph_id}`
  
  try {
    await initializeWeb3(false, true)

    const ens_name_hash = namehash(ens_name)
    
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

    let response = await makePOSTRequest(graph_url, params)
    let ensname_data = await response.json()
    ensname_data = ensname_data.data.domain
    
    let ar_texts = ensname_data.resolver.texts
    let resolver_address = ensname_data.resolver.address
    let encoded_content_hash = ensname_data.resolver.contentHash

    console.log(ensname_data);


    // 1. if index field present then redirect to index field url
    if (ar_texts && ar_texts.includes('index')) {
      let index_field_url = await getIndexRecordForENSName2(ens_name_hash, resolver_address, encoded_content_hash)
      console.log('index_field_url', index_field_url);
      
      if (index_field_url && index_field_url != '') {
        redirect_url = index_field_url //+ url_path
      }
    }
    

    // 2. if index field is not set, redirect to contenthash
    if(!redirect_url && encoded_content_hash && encoded_content_hash != '') {
      let content_hash = getContentHashForENSName2(encoded_content_hash)
      console.log('content_hash', content_hash);
      
      if (content_hash && content_hash != '') {
        redirect_url = content_hash //+ url_path
      }
    }


    // 3. if index & contenthash fields are not set, redirect to url field
    // if(!redirect_url && ar_texts && ar_texts.includes('url')) {
    //   let url = await getURLRecordForENSName(ens_name)
    //   console.log('url', url);

    //   if (url && url != '') {
    //     redirect_url = url //+ url_path
    //   }
    // }

    // 4. if index, contenthash & url fields are not set, redirect to ens info page
    if(!redirect_url) {
      redirect_url = constants.ens_app_url + ens_name
    }
    

    console.log('redirect_url', redirect_url);
    $('#lbl-redirecting').show();

    window.location.replace(redirect_url)
    console.log('redirected');
  } 
  catch (error) {
    console.log('error in initialize()');      
    console.log(error);      
  }
}


function getContentHashForENSName2(encoded_content_hash) {
  let objContentHash = decodeContentHash(encoded_content_hash)

  if(!objContentHash.decoded || objContentHash.decoded == '0x0000000000000000000000000000000000000000') return false

  let content = getContentHashLink(objContentHash)
  return content
}


async function getIndexRecordForENSName2(ens_name_hash, resolver_address, encoded_content_hash) {
  try {
    let supported_fields = ['url', 'contenthash', 'com.twitter', 'com.github', 'com.telegram', 'com.linkedin', 'com.opensea', 'com.reddit', 'com.etherscan']

    if (!resolver_address || resolver_address == constants.zero_address) return ''
    
    // use contract interaction for text fields, bcz web3.js library doesnt contain method for it, and ethers doesnt support ipns url
    const resolverContract = new web3.eth.Contract(constants.resolverABI, resolver_address);

    // get index text field
    let index_field = await resolverContract.methods.text(ens_name_hash, 'index').call();
    console.log('index_field', index_field);


    // check if field supported, and generate url
    if (supported_fields.includes(index_field)) {
      let index_url = ''

      // if contenthash then get and generate ipfs url
      if (index_field == 'contenthash') {
        index_url = getContentHashForENSName2(encoded_content_hash)
      }

      // if text fields then get value and generate respective URL (like twitter etc)
      else {
        let txt_value = await resolverContract.methods.text(ens_name_hash, index_field).call();
        
        if (index_field == 'url') {
          index_url = ensureHttpProtocol(txt_value)
        }
        else {
          // generate social media URLs with username etc
          index_url = generateIndexValueURL(index_field, txt_value)
        }
      }

      return index_url
    }

    return ''
  } 
  catch (error) {
    console.log(error);  
    return ''
  }
}