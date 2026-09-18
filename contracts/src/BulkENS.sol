// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./Parse.sol";


interface IENS {
    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address owner,
        address resolver,
        uint64 ttl
    ) external;
}

interface IResolver {
    function setText(
        bytes32 node,
        string calldata key,
        string calldata value
    ) external;

    function multicall(
        bytes[] calldata data
    ) external returns (bytes[] memory results);
}

/**
 * Defines operations related to Bulk ENS registration.
 */
contract BulkENS is Ownable {
    using Parse for string;

    IENS public registry; // ENS registry address
    IResolver public resolver; // Custom resolver address
    string rootDomain = "eth";
    string public mainDomain = "you";
    mapping(string => address) public supportedCollections;
    
    
    constructor(IENS _registry){
        registry =  _registry;
    }

    /**
     * @dev Takes array of subdomains with owner addresses and create bulk subdomains interacting
     * with ENS registry contract.
     * 
     * @param node - parent name hash - parentname.eth
     * @param subNodeHashes - keccak hash of just subnames - keccak256(abi.encodePacked(subName));
     * @param addresses - respective owner addresses 
     */
    function createBulkSubdomains(
        bytes32 node,
        bytes32[] calldata subNodeHashes,
        address[] calldata addresses
    )
    external onlyOwner
    {
        require(address(resolver) != address(0), "Resolver not set in contract.");
        require(subNodeHashes.length == addresses.length, "Provided names and addresses should be equal.");
        
        for (uint256 i = 0; i < subNodeHashes.length; i++) {
            // NFT ownership check is done offchain with msg signing.
            // call ENS registry.
    		registry.setSubnodeRecord(node, subNodeHashes[i], addresses[i], address(resolver), 0);
        }
    }


    /**
     * @dev Creates single subname for provided node. Called by user (NFT owner).
     * 
     * @param node - parent name hash - parentname.eth
     * @param symbol - collection symbol as defined in supportedCollections mapping
     * @param nftId - NFT ID that owner wants to create subname of.
     */
    function createSubdomain(
        bytes32 node,
        string calldata symbol,
        string calldata nftId
    )
    external
    {
        require(address(resolver) != address(0), "Resolver not set in contract.");

        address collectionAddress = supportedCollections[symbol];
        require(collectionAddress != address(0), "Collection not supported.");

        IERC721 nftContract = IERC721(collectionAddress);
        require(msg.sender == nftContract.ownerOf(nftId.parseInt()), "You must own this nft in order to create sub-domain.");

        bytes32 subNodeHash = getSubnodeHash(symbol, nftId);

        registry.setSubnodeRecord(node, subNodeHash, msg.sender, address(resolver), 0);
    }

    /**
     * must set resolver before creating any subdomain
     */
    function setResolver(IResolver _resolver) external onlyOwner {
        resolver = _resolver;
    }


    /**
     * @dev Takes array of symbols and contract addresses and add to supported collections.
     * 
     * @param symbols - collection symbols to add.
     * @param collectionAddresses - contract address for provided collection symbols.
     */
     function addSupportedCollection(
        string[] calldata symbols,
        address[] calldata collectionAddresses
    )
    external onlyOwner
    {
        for (uint256 i = 0; i < symbols.length; i++) {
            supportedCollections[symbols[i]] = collectionAddresses[i];
        }
    }
    
    
    /**
     * @dev Format provided symbol and nftid to create subname according to Eth.Me standard.
     * returns keccak hash for subname.
     */
    function getSubnodeHash(
        string calldata symbol, 
        string calldata nftId
    ) 
    private 
    pure 
    returns(bytes32) 
    {
        string memory subNode = string.concat(symbol, '-', nftId);
        return keccak256(abi.encodePacked(subNode));
    }
}
