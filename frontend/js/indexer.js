const ens_name = getENSFromURL(location.hostname)
var url_path = getPathFromURL(location)//window.location.pathname;
console.time('indexer');

/**
 * Initialize details for blockchain interaction, like web3 instance and contracts. 
 */
async function initialize() {
  document.title = ens_name + constants.web2_domain_tld;
  let redirect_url;

  try {
    const ens_name_hash = namehash(ens_name)
    let ens_data = await getENSDataFromGraph(ens_name_hash)
    
    // if no data found it means name not exists or resolver not set
    if (!ens_data || !ens_data.resolver) {
      window.location.replace(constants.ens_app_url + ens_name)
      return
    }

    ens_data = ens_data.resolver
    let ar_texts = ens_data.texts
    let resolver_address = ens_data.address
    let encoded_content_hash = ens_data.contentHash


    // 1. if index field present then redirect to index field url
    if (ar_texts && ar_texts.includes('index')) {
      await initializeWeb3(false, true)

      let index_field_url = await getIndexRecordForENSName(ens_name_hash, resolver_address, encoded_content_hash)
      console.log('index_field_url', index_field_url);
      
      if (index_field_url && index_field_url != '') {
        redirect_url = index_field_url //+ url_path
      }
    }

    // 2. if index field is not set, redirect to contenthash
    if(!redirect_url && encoded_content_hash && encoded_content_hash != '' && encoded_content_hash != '0x') {
      let content_hash = decodeContentHashWithLink(encoded_content_hash)
      console.log('content_hash', content_hash);
      
      if (content_hash && content_hash != '') {
        redirect_url = content_hash //+ url_path
      }
    }

    // 3. if index & contenthash fields are not set, redirect to url field
    if(!redirect_url && ar_texts && ar_texts.includes('url')) {
      await initializeWeb3(false, true)

      let url = await getURLRecordForENSName(ens_name_hash, resolver_address)
      console.log('url', url);

      if (url && url != '') {
        redirect_url = url //+ url_path
      }
    }

    // 4. if index, contenthash & url fields are not set, redirect to ens info page
    if(!redirect_url) {
      redirect_url = constants.ens_app_url + ens_name
    }
    
    console.timeEnd('indexer'); // logs the time taken
    console.log('redirect_url', redirect_url);

    // window.location.replace(redirect_url)
  } 
  catch (error) {
    console.log('error in initialize()');      
    console.log(error);      
  }
}


// async function getIndexRecordForENSName2(ens_name_hash, resolver_address, encoded_content_hash) {
//   try {
//     let supported_fields = ['url', 'contenthash', 'com.twitter', 'com.github', 'com.telegram', 'com.linkedin', 'com.opensea', 'com.reddit', 'com.etherscan']

//     if (!resolver_address || resolver_address == constants.zero_address) return false
    
//     // use contract interaction for text fields, bcz web3.js library doesnt contain method for it, and ethers doesnt support ipns url
//     const resolverContract = new web3.eth.Contract(constants.resolverABI, resolver_address);

//     // get index text field
//     let index_field = await resolverContract.methods.text(ens_name_hash, 'index').call();
//     console.log('index_field', index_field);


//     // check if field supported, and generate url
//     if (supported_fields.includes(index_field)) {
//       let index_url = ''

//       // if contenthash then get and generate ipfs url
//       if (index_field == 'contenthash') {
//         index_url = decodeContentHashWithLink(encoded_content_hash)
//       }

//       // if text fields then get value and generate respective URL (like twitter etc)
//       else {
//         let txt_value = await resolverContract.methods.text(ens_name_hash, index_field).call();
        
//         if (index_field == 'url') {
//           index_url = ensureHttpProtocol(txt_value)
//         }
//         else {
//           // generate social media URLs with username etc
//           index_url = generateIndexValueURL(index_field, txt_value)
//         }
//       }

//       return index_url
//     }

//     return ''
//   } 
//   catch (error) {
//     console.log(error);  
//     return ''
//   }
// }