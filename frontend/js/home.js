const ens_name = getENSFromURL(location.hostname)
var url_path = getPathFromURL(location)//window.location.pathname;
console.log(url_path);

/**
 * Initialize details for blockchain interaction, like web3 instance and contracts. 
 */
async function initialize() {
  $('#ens-name').text(ens_name)
  document.title = ens_name + constants.web2_domain_tld;
  let redirect_url;

  try {
    await initializeWeb3(false, true)

    // 1. if index field present then redirect to index field url
    let index_field_url = await getIndexRecordForENSName(ens_name)
    console.log(index_field_url);
    
    if (index_field_url && index_field_url != '') {
      redirect_url = index_field_url + url_path
    }
    
    // 2. if index field is not set, redirect to contenthash
    if(!redirect_url) {
      let content_hash = await getContentHashForENSName(ens_name)
      console.log('content_hash', content_hash);

      if (content_hash && content_hash != '') {
        redirect_url = content_hash + url_path
      }
    }
    
    // 3. if index & contenthash fields are not set, redirect to url field
    if(!redirect_url) {
      let url = await getURLRecordForENSName(ens_name)
      console.log('url', url);

      if (url && url != '') {
        redirect_url = url + url_path
      }
    }

    // 4. if index, contenthash & url fields are not set, redirect to ens info page
    if(!redirect_url) {
      redirect_url = constants.ens_app_url + ens_name
    }
    
    console.log('redirect_url', redirect_url);
    // $('#lbl-redirecting').show();

    window.location.replace(redirect_url)
    console.log('redirected');
  } 
  catch (error) {
    console.log('error in initialize()');      
    console.log(error);      
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
async function renderENSInfo(ens_name, content_hash, text_records) {
  // show address details
  let address_obj = await getAddress(ens_name)
  $('#ens-addr').attr('href', address_obj.address_link)
  $('#ens-addr').text(address_obj.short_address)

  // show description
  $('#ens-desc').text(text_records.description)

  
  // show web3 website
  if (content_hash && content_hash != '') {
    const web3_url = constants.ipfs_gateway + content_hash
    $('#ens-web3-site').attr('href', web3_url) 
  }
  else 
    $('#ens-web3-site').parent().addClass('d-none')


  // check if text records found 
  if (text_records) {
    // check twitter
    if (text_records.twitter && text_records.twitter != '')
      $('#ens-twitter').attr('href', generateTwitterURL(text_records.twitter))
    else 
      $('#ens-twitter').parent().addClass('d-none')

    // check github
    if (text_records.github && text_records.github != '')
      $('#ens-github').attr('href', generateGithubURL(text_records.github))
    else 
      $('#ens-github').parent().addClass('d-none')

    // check telegram
    if (text_records.telegram && text_records.telegram != '')
      $('#ens-telegram').attr('href', generateTelegramURL(text_records.telegram))
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
async function renderAvatar(avatar) {
  if (!avatar || avatar == '') return

  // resolve http url
  if (avatar.startsWith('https://') || avatar.startsWith('http://')) {
    $('#ens-avatar').attr('src', avatar)
  }

  // resolve ipfs:// url
  else if (avatar.startsWith('ipfs://')) {
    const ipfs_url = resolveIPFSURL(avatar)
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
    
    const img_url = await fetchImgFromNFT(token_standard, token_contract, token_id)
    console.log(img_url);

    $('#ens-avatar').attr('src', img_url)
  }
}
