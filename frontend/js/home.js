const app = require('./app.js')

const ens_name = app.getENSFromURL(location.hostname)
var url_path = app.getPathFromURL(location)
url_path = (url_path == '/') ? '' : url_path
console.log(ens_name);


initialize()


/**
 * Initialize details for blockchain interaction, like web3 instance and contracts. 
 */
export async function initialize() {
  document.title = ens_name + app.constants.web2_domain_tld;
  let redirect_url;

  try {
    const ens_name_hash = app.namehash(ens_name)
    let ens_data = await app.getENSDataFromGraph(ens_name_hash)
    
    // if no data found it means name not exists or resolver not set or offchain ens name/data
    if (!ens_data || !ens_data.resolver) {
      const ens_name_decoded = await app.getUnicodeENSName(ens_name)
      window.location.replace(app.constants.ens_app_url + ens_name_decoded)
      return
    }

    ens_data = ens_data.resolver
    let ar_texts = ens_data.texts
    let resolver_address = ens_data.address
    let encoded_content_hash = ens_data.contentHash


    // 1. if index field present then redirect to index field url
    if (ar_texts && ar_texts.includes('index')) {
      await app.initializeWeb3(false, true)

      let index_field_url = await app.getIndexRecordForENSName(ens_name_hash, resolver_address, encoded_content_hash)
      console.log('index_field_url', index_field_url);
      
      if (index_field_url && index_field_url != '') {
        redirect_url = index_field_url + url_path
      }
    }
    
    // 2. if index field is not set, redirect to contenthash
    if(!redirect_url && encoded_content_hash && encoded_content_hash != '' && encoded_content_hash != '0x') {
      let content_hash = app.decodeContentHashWithLink(encoded_content_hash)
      console.log('content_hash', content_hash);
      
      if (content_hash && content_hash != '') {
        redirect_url = content_hash + url_path
      }
    }
    
    // 3. if index & contenthash fields are not set, redirect to url field
    if(!redirect_url && ar_texts && ar_texts.includes('url')) {
      await app.initializeWeb3(false, true)

      let url = await app.getURLRecordForENSName(ens_name_hash, resolver_address)
      console.log('url', url);

      if (url && url != '') {
        redirect_url = url + url_path
      }
    }

    // 4. if index, contenthash & url fields are not set, redirect to ens info page
    if(!redirect_url) {
      const ens_name_decoded = await app.getUnicodeENSName(ens_name)
      redirect_url = app.constants.ens_app_url + ens_name_decoded 
    }
    
    console.log('redirect_url', redirect_url);
    window.location.replace(redirect_url)
  } 
  catch (error) {
    captureErrorSentry(error, {
      method: "initialize",
    })
  }




  // TO SHOW LINKS ON PAGE
  // // get text records
  // let text_records = await getTextRecordsForENSName(ens_name)
  
  // // update details on frontend
  // if (content_hash || text_records) {
  //   renderENSInfo(ens_name, content_hash, text_records)
  // }
  // else {
  //   // if content_hash & text_records both are not found then probably resolver is not set 
  //   // and/or ens name does not exist
  //   $('#loader').addClass('d-none')  
  // }
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
