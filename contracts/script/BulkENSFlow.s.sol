// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {BulkENS, IENS as IBulkRegistry, IResolver as IBulkResolver} from "../src/BulkENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";

/// Minimal mock for resolver BulkENS points subnames at.
contract MockResolver is IBulkResolver {
    function setText(bytes32, string calldata, string calldata) external {}

    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        return new bytes[](data.length);
    }
}

/// For supported collections
contract MockERC721 {
    mapping(uint256 => address) private _owners;

    function mint(address to, uint256 tokenId) external {
        _owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }
}


/**
 * For end to end testing of BulkENS.sol contract.
 * Runs all functions against own/local test registry.
 */
contract BulkENSFlow is Script {
    BulkENS bulkens;
    ENSRegistry registry;
    MockResolver mockResolver;
    MockERC721 nft;

    bytes32 ethNode;
    bytes32 youNode;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        _deploy(deployer);
        _readInitialState();
        _grantParentNode(deployer);
        _setResolver();
        _addSupportedCollection();
        _createBulkSubdomains();
        _createSubdomain(deployer);
        _transferOwnership();

        vm.stopBroadcast();
    }

    // --- setup -------------------------------------------------------------

    function _deploy(address deployer) internal {
        registry = new ENSRegistry(); // deployer owns the root node
        mockResolver = new MockResolver();
        nft = new MockERC721();
        bulkens = new BulkENS(IBulkRegistry(address(registry)));

        console2.log("== deployed ==");
        console2.log("deployer    ", deployer);
        console2.log("ENSRegistry ", address(registry));
        console2.log("BulkENS     ", address(bulkens));
        console2.log("MockResolver", address(mockResolver));
        console2.log("MockERC721  ", address(nft));
    }

    /// BulkENS must own the parent node before it can write subrecords.
    function _grantParentNode(address deployer) internal {
        ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        youNode = keccak256(abi.encodePacked(ethNode, keccak256("you")));

        registry.setSubnodeOwner(bytes32(0), keccak256("eth"), deployer);
        registry.setSubnodeOwner(ethNode, keccak256("you"), address(bulkens));

        console2.log("\n== parent node ==");
        console2.log("you.eth owner", registry.owner(youNode));
    }

    // --- reads -------------------------------------------------------------

    function _readInitialState() internal view {
        console2.log("\n== initial state ==");
        console2.log("owner()                       ", bulkens.owner());
        console2.log("registry()                    ", address(bulkens.registry()));
        console2.log("resolver()                    ", address(bulkens.resolver()));
        console2.log("mainDomain()                  ", bulkens.mainDomain());
        console2.log("supportedCollections('MOCK')  ", bulkens.supportedCollections("MOCK"));
    }

    // --- writes ------------------------------------------------------------

    function _setResolver() internal {
        bulkens.setResolver(mockResolver);
        console2.log("\n== setResolver ==");
        console2.log("resolver()", address(bulkens.resolver()));
    }

    function _addSupportedCollection() internal {
        string[] memory symbols = new string[](1);
        address[] memory addrs = new address[](1);
        symbols[0] = "MOCK";
        addrs[0] = address(nft);

        bulkens.addSupportedCollection(symbols, addrs);

        console2.log("\n== addSupportedCollection ==");
        console2.log("supportedCollections('MOCK')", bulkens.supportedCollections("MOCK"));
    }

    function _createBulkSubdomains() internal {
        bytes32[] memory subHashes = new bytes32[](2);
        address[] memory owners = new address[](2);
        subHashes[0] = keccak256(abi.encodePacked("alice"));
        subHashes[1] = keccak256(abi.encodePacked("bob"));
        owners[0] = address(0xA11CE);
        owners[1] = address(0xB0B);

        bulkens.createBulkSubdomains(youNode, subHashes, owners);

        console2.log("\n== createBulkSubdomains ==");
        console2.log("alice.you.eth owner", registry.owner(_namehash(youNode, subHashes[0])));
        console2.log("bob.you.eth owner", registry.owner(_namehash(youNode, subHashes[1])));
        console2.log("alice resolver", registry.resolver(_namehash(youNode, subHashes[0])));
        console2.log("bob resolver", registry.resolver(_namehash(youNode, subHashes[1])));
    }

    function _createSubdomain(address deployer) internal {
        nft.mint(deployer, 1);
        bulkens.createSubdomain(youNode, "MOCK", "1");

        // getSubnodeHash is private, so mirror its logic here
        bytes32 subHash = keccak256(abi.encodePacked(string.concat("MOCK", "-", "1")));

        console2.log("\n== createSubdomain ==");
        console2.log("MOCK-1.you.eth owner", registry.owner(_namehash(youNode, subHash)));
        console2.log("MOCK-1.you.eth resolver", registry.resolver(_namehash(youNode, subHash)));
    }

    /// Runs last — it revokes the deployer's onlyOwner access.
    function _transferOwnership() internal {
        bulkens.transferOwnership(address(0xBEEF));
        console2.log("\n== transferOwnership ==");
        console2.log("owner()", bulkens.owner());
    }

    function _namehash(bytes32 node, bytes32 label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, label));
    }
}
