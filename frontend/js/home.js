const app = require('./app.js')

let ens_name = app.getENSFromURL(location.hostname)
ens_name = await app.getUnicodeENSName(ens_name)

var url_path = app.getPathFromURL(location)
url_path = (url_path == '/') ? '' : url_path
console.log(ens_name);


initialize()


/**
 * Initialize details for blockchain interaction, like web3 instance and contracts. 
 */
export async function initialize() {
  document.title = ens_name + app.constants.web2_domain_tld;

  try {
    let cached_data = localStorage.getItem(ens_name);
    let redirect_url
    console.log('cached_data', cached_data);
    

    //-- 1. CACHE FOUND
    if(cached_data && JSON.parse(cached_data)){
      console.log('1. cache here');
      cached_data = JSON.parse(cached_data)
      let cached_time = cached_data.cached_time
      
      //-- cache found, check validity from backend
      let cache_data_BE = await checkCacheValidity(ens_name, cached_time)


      //-- 1.1 if cache valid, use cached data
      if (cache_data_BE.is_valid) {
        console.log('1.1 cache valid');

        if (cached_data.redirect_url) {
          console.log('1.1.1 cache valid, redirect_url found');
          redirect_url = cached_data.redirect_url
        }
        else {
          console.log('1.1.2 cache valid, redirect_url not found, getRedirectURLFromCache');
          redirect_url = await getRedirectURLFromCache(ens_name, cached_data)
          updateCache(ens_name, redirect_url)
        }
      }


      //-- 1.2 else use updated data from BE
      else {
        console.log('1.2 cache invalid, cached_data');
        console.log(cache_data_BE);

        if (cache_data_BE.cached_data) {
          redirect_url = await getRedirectURLFromCache(ens_name, cache_data_BE.cached_data)
          cache_data_BE.cached_data.redirect_url = redirect_url
          setCache(ens_name, cache_data_BE.cached_data) 
        }
      }


      //-- 1.3 fallback to traditional approach if BE return no response (BE unavailable)
      if(!redirect_url) {
        console.log('1.3 cache invalid, with no cached_data from BE');
        cached_data = await getENSDataToRedirect(ens_name)
        redirect_url = cached_data.redirect_url
        
        // send async req to BE to update indexer cache
        console.log('BE req sent');
        app.makePOSTRequest(app.constants.backend_url + 'cache/', { ens_name, cached_data })
        console.log('frwrd');

        // add data to cache
        setCache(ens_name, cached_data) 
      }
    }
    

    //-- 2. NO CACHE FOUND
    else {
      console.log('no cache');
      
      // check if BE has cached data
      let cache_data_BE = await checkCacheValidity(ens_name, 0)
      console.log('2.1 resp from BE', cache_data_BE);

      if (cache_data_BE && cache_data_BE.cached_data) {
        redirect_url = await getRedirectURLFromCache(ens_name, cache_data_BE.cached_data)
        cache_data_BE.cached_data.redirect_url = redirect_url
        setCache(ens_name, cache_data_BE.cached_data)
      }

      // if BE has no cached data then fetch from blockchain
      else {
        console.log('2.2 fetching from web3');
        cached_data = await getENSDataToRedirect(ens_name)
        redirect_url = cached_data.redirect_url

        // send req to BE to update indexer cache
        console.log('BE req sent to cache data');
        app.makePOSTRequest(app.constants.backend_url + 'cache/', { ens_name, cached_data })
        console.log('frwrd');

        // add data to cache
        setCache(ens_name, cached_data)
      }
    }


    console.log('redirect_url', redirect_url + url_path);
    window.location.replace(redirect_url + url_path)
  } 
  catch (error) {
    console.log(error);
    captureErrorSentry(error, {
      method: "initialize",
    })
  }
}


// Calculate redirect url from cache values
export async function getRedirectURLFromCache(ens_name, cached_data) {
  try {
    if (!cached_data) return false
    let redirect_url

    // 1. no resolver, redirect to ens app page
    if (!cached_data.resolver_address) {
      redirect_url = app.constants.ens_app_url + ens_name
    }
    
    // 2. index field
    if (!redirect_url && cached_data.texts && cached_data.texts.index) {
      let index_field = cached_data.texts.index
      let index_field_url
      console.log(index_field);

      if (app.constants.supported_index_fields.includes(index_field)) {
        if (index_field == 'contenthash' && cached_data.content_hash) {
          index_field_url = app.decodeContentHashWithLink(cached_data.content_hash)
          console.log('content_hash', index_field_url);
          
          if (index_field_url && index_field_url != '') {
            redirect_url = index_field_url
          }
        }
        else{
          let txt_value = cached_data.texts[index_field]
          if (index_field == 'url') {
            index_field_url = app.ensureHttpProtocol(txt_value)
          }
          else {
            index_field_url = app.generateIndexValueURL(index_field, txt_value)
          }
        }
      }
    }

    // 3. contenthash
    if (!redirect_url && cached_data.content_hash && cached_data.content_hash != '' && cached_data.content_hash != '0x') {
      let content_hash = app.decodeContentHashWithLink(cached_data.content_hash)
      console.log('content_hash', content_hash);
      
      if (content_hash && content_hash != '') {
        redirect_url = content_hash
      }
    }
    
    // 3. url field
    if (!redirect_url && cached_data.texts && cached_data.texts.url) {
      let url_field = cached_data.texts.url
      console.log('url_field', url_field);

      if (url_field && url_field != '') {
        redirect_url = app.ensureHttpProtocol(url_field)
      }
    }
    
    // 4. ENS app page
    if (!redirect_url) {
      redirect_url = app.constants.ens_app_url + ens_name
    }

    return redirect_url
  } 
  catch (error) {
    console.log(error);
    return false
  }
}

export async function checkCacheValidity(ens_name, cached_time) {
  try {
    let response = await fetch(app.constants.backend_url + 'cache/' + ens_name + '/' + cached_time);

    if (response.status == 200) {
      let json_response = await response.json();
      // let is_cache_valid = json_response.data.is_valid
      console.log(json_response);
      return json_response.data
    }
    else {
      // in case of error on backend api call
      return { is_valid: false }
    }
  }
  catch (error) {
    captureErrorSentry(error, {
      method: "checkCacheValidity",
    })
    return { is_valid: false }
  }
}


export async function getENSDataToRedirect(ens_name) {
  let redirect_url, obj_cache = { texts: {} };
  const ens_name_hash = app.namehash(ens_name)
  let ens_data = await app.getENSDataFromGraph(ens_name_hash)
  
  // if no data found it means name not exists or resolver not set or offchain ens name/data
  if (!ens_data || !ens_data.resolver) {
    obj_cache.redirect_url = app.constants.ens_app_url + ens_name
    return obj_cache
  }

  ens_data = ens_data.resolver
  let ar_texts = ens_data.texts
  let resolver_address = ens_data.address
  let encoded_content_hash = ens_data.contentHash
  
  obj_cache.resolver_address = resolver_address
  obj_cache.content_hash = encoded_content_hash
  obj_cache.ens_name_hash = ens_name_hash
  

  // 1. if index field present then redirect to index field url
  if (ar_texts && ar_texts.includes('index')) {
    await app.initializeWeb3(false, true)

    let { index_url, index_field, txt_value } = await app.getIndexRecordForENSName(ens_name_hash, resolver_address, encoded_content_hash)
    console.log('index_field_url', index_url);
    
    if (index_url && index_url != '') {
      obj_cache.texts.index = index_field
      obj_cache.redirect_url = index_url
      redirect_url = index_url + url_path

      if (index_field != 'contenthash' && txt_value) {
        obj_cache.texts[index_field] = txt_value
      }
    }
  }
  
  // 2. if index field is not set, redirect to contenthash
  if(!redirect_url && encoded_content_hash && encoded_content_hash != '' && encoded_content_hash != '0x') {
    let content_hash = app.decodeContentHashWithLink(encoded_content_hash)
    console.log('content_hash', content_hash);
    
    if (content_hash && content_hash != '') {
      obj_cache.redirect_url = content_hash
      redirect_url = content_hash + url_path
    }
  }
  
  // 3. if index & contenthash fields are not set, redirect to url field
  if(!redirect_url && ar_texts && ar_texts.includes('url')) {
    await app.initializeWeb3(false, true)

    let url = await app.getURLRecordForENSName(ens_name_hash, resolver_address)
    console.log('url', url);

    if (url && url != '') {
      obj_cache.texts.url = url
      obj_cache.redirect_url = url
      redirect_url = url + url_path
    }
  }

  // 4. if index, contenthash & url fields are not set, redirect to ens info page
  if(!redirect_url) {
    redirect_url = app.constants.ens_app_url + ens_name
    obj_cache.redirect_url = redirect_url
  }

  return obj_cache
}


export function setCache(ens_name, obj_cache) {
  try {
    if (obj_cache && ens_name) {
      obj_cache.cached_time = Date.now() + 1000 // add 1 sec delay in cache time, in case BE takes time to save
      localStorage.setItem(ens_name, JSON.stringify(obj_cache))
      console.log('data cached', obj_cache);
    }
  } 
  catch (error) {
    console.log(error);
  }
}


export function updateCache(ens_name, redirect_url) {
  try {
    if (redirect_url && redirect_url != '' && ens_name) {
      let cached_data = localStorage.getItem(ens_name);
      
      if(cached_data && JSON.parse(cached_data)){
        cached_data = JSON.parse(cached_data)
        cached_data.redirect_url = redirect_url
        localStorage.setItem(ens_name, JSON.stringify(cached_data))
      }
    }
  } 
  catch (error) {
    console.log(error);
  }
}


/**
 * Render ENS details on frontend.
 */
export async function renderENSInfo(ens_name, content_hash, text_records) {
  // show address details
  let address_obj = await app.getAddress(ens_name)
  $('#ens-addr').attr('href', address_obj.address_link)
  $('#ens-addr').text(address_obj.short_address)

  // show description
  $('#ens-desc').text(text_records.description)

  
  // show web3 website
  // if (content_hash && content_hash != '') {
  //   const web3_url = app.constants.ipfs_gateway + content_hash
  //   $('#ens-web3-site').attr('href', web3_url) 
  // }
  // else 
  //   $('#ens-web3-site').parent().addClass('d-none')


  // check if text records found 
  if (text_records) {
    // check twitter
    if (text_records.twitter && text_records.twitter != '')
      $('#ens-twitter').attr('href', app.generateTwitterURL(text_records.twitter))
    else 
      $('#ens-twitter').parent().addClass('d-none')

    // check github
    if (text_records.github && text_records.github != '')
      $('#ens-github').attr('href', app.generateGithubURL(text_records.github))
    else 
      $('#ens-github').parent().addClass('d-none')

    // check telegram
    if (text_records.telegram && text_records.telegram != '')
      $('#ens-telegram').attr('href', app.generateTelegramURL(text_records.telegram))
    else 
      $('#ens-telegram').parent().addClass('d-none')
  }

  // show links section & hide loader
  $('#loader').addClass('d-none')  
  $('#ens-links').removeClass('d-none')

  // render avatar on frontend
  renderAvatar(text_records.avatar)
}


/**
 * Get & render ENS Avatar image for possible formats.
 * https://docs.ens.domains/ens-improvement-proposals/ensip-12-avatar-text-records
 */
export async function renderAvatar(avatar) {
  if (!avatar || avatar == '') return

  // resolve http url
  if (avatar.startsWith('https://') || avatar.startsWith('http://')) {
    $('#ens-avatar').attr('src', avatar)
  }

  // resolve ipfs:// url
  else if (avatar.startsWith('ipfs://')) {
    const ipfs_url = app.resolveIPFSURL(avatar)
    $('#ens-avatar').attr('src', ipfs_url)
  }

  // resolve nft url
  // eip155:1/[NFT standard without hyphen]:[contract address for NFT collection]/[token ID]
  // eip155:1/erc721:0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6/2430
  else if (avatar.startsWith('eip155:1/')) {
    const ar = avatar.split('/')
    const token_standard = ar[1].split(':')[0]
    const token_contract = ar[1].split(':')[1]
    const token_id = ar[2]

    console.log(token_standard, token_contract, token_id);
    
    const img_url = await app.fetchImgFromNFT(token_standard, token_contract, token_id)
    console.log(img_url);

    $('#ens-avatar').attr('src', img_url)
  }
}
