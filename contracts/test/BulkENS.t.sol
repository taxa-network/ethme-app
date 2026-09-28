// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BulkENS, IENS as IBulkRegistry} from "../src/BulkENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {MockResolver} from "./mocks/MockResolver.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {IResolver} from "../src/BulkENS.sol";

contract BulkENSTest is Test {
    BulkENS bulkens;
    ENSRegistry registry;
    MockResolver mockResolver;
    MockERC721 nft;

    address stranger = makeAddr("stranger");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    bytes32 ethNode;
    bytes32 youNode;

    function setUp() public {
        registry = new ENSRegistry(); // deployer owns the root node
        mockResolver = new MockResolver();
        nft = new MockERC721();
        bulkens = new BulkENS(IBulkRegistry(address(registry)));

        // BulkENS must own the parent node before it can write subrecords.
        ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        youNode = keccak256(abi.encodePacked(ethNode, keccak256("you")));
        registry.setSubnodeOwner(bytes32(0), keccak256("eth"), address(this));
        registry.setSubnodeOwner(ethNode, keccak256("you"), address(bulkens));
    }

    // --- setResolver ---------------------------------------------------

    function test_setResolver() public {
        bulkens.setResolver(mockResolver);

        assertEq(address(bulkens.resolver()), address(mockResolver));
    }

    function test_setResolver_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert("Ownable: caller is not the owner");
        bulkens.setResolver(mockResolver);
    }

    function test_setResolver_canBeUpdated() public {
        bulkens.setResolver(mockResolver);

        MockResolver replacement = new MockResolver();
        bulkens.setResolver(replacement);

        assertEq(address(bulkens.resolver()), address(replacement));
    }

    function test_setResolver_rejectsZeroAddress() public {
        bulkens.setResolver(mockResolver);

        vm.expectRevert("Resolver cant be zero.");
        bulkens.setResolver(IResolver(address(0)));

        // verify the previous resolver is intact and not set to 0 after rejection.
        assertEq(address(bulkens.resolver()), address(mockResolver));
    }

    function test_setResolver_followsOwnershipTransfer() public {
        bulkens.transferOwnership(stranger);

        vm.expectRevert("Ownable: caller is not the owner");
        bulkens.setResolver(mockResolver);

        vm.prank(stranger);
        bulkens.setResolver(mockResolver);
        assertEq(address(bulkens.resolver()), address(mockResolver));
    }

    // --- addSupportedCollection -----------------------------------------

    function test_addSupportedCollection_addsSingle() public {
        _addCollection("MOCK", address(nft));

        assertEq(bulkens.supportedCollections("MOCK"), address(nft));
    }

    function test_addSupportedCollection_addsMultiple() public {
        MockERC721 nft2 = new MockERC721();

        string[] memory symbols = new string[](2);
        address[] memory addrs = new address[](2);
        symbols[0] = "MOCK1";
        symbols[1] = "MOCK2";
        addrs[0] = address(nft);
        addrs[1] = address(nft2);

        bulkens.addSupportedCollection(symbols, addrs);

        assertEq(bulkens.supportedCollections("MOCK1"), address(nft));
        assertEq(bulkens.supportedCollections("MOCK2"), address(nft2));
    }

    function test_addSupportedCollection_revertsForNonOwner() public {
        string[] memory symbols = new string[](1);
        address[] memory addrs = new address[](1);
        symbols[0] = "MOCK";
        addrs[0] = address(nft);

        vm.prank(stranger);
        vm.expectRevert("Ownable: caller is not the owner");
        bulkens.addSupportedCollection(symbols, addrs);
    }

    function test_addSupportedCollection_overwritesExisting() public {
        _addCollection("MOCK", address(nft));

        MockERC721 replacement = new MockERC721();
        _addCollection("MOCK", address(replacement));

        assertEq(bulkens.supportedCollections("MOCK"), address(replacement));
    }

    function test_addSupportedCollection_unknownSymbolIsZero() public view {
        assertEq(bulkens.supportedCollections("NONE"), address(0));
    }

    function test_addSupportedCollection_revertsWhenSymbolsExceedAddresses() public {
        string[] memory symbols = new string[](2);
        address[] memory addrs = new address[](1);
        symbols[0] = "MOCK";
        symbols[1] = "OTHER";
        addrs[0] = address(nft);

        vm.expectRevert("Provided symbols and addresses are not equal.");
        bulkens.addSupportedCollection(symbols, addrs);

        // check no passed collection was set after revert
        assertEq(bulkens.supportedCollections("MOCK"), address(0));
    }

    function test_addSupportedCollection_revertsWhenAddressesExceedSymbols() public {
        string[] memory symbols = new string[](1);
        address[] memory addrs = new address[](2);
        symbols[0] = "MOCK";
        addrs[0] = address(nft);
        addrs[1] = address(0xDEAD);

        vm.expectRevert("Provided symbols and addresses are not equal.");
        bulkens.addSupportedCollection(symbols, addrs);

        assertEq(bulkens.supportedCollections("MOCK"), address(0));
    }

    /// Writing the zero address is how a collection gets de-listed, since
    /// createSubdomain rejects collection symbols that map to address(0).
    function test_addSupportedCollection_zeroAddressDelists() public {
        _addCollection("MOCK", address(nft));
        _addCollection("MOCK", address(0));

        assertEq(bulkens.supportedCollections("MOCK"), address(0));
    }


    // --- createBulkSubdomains ---------------------------------------------

    function test_createBulkSubdomains_createsRecords() public {
        bulkens.setResolver(mockResolver);

        bytes32[] memory hashes = new bytes32[](2);
        address[] memory owners = new address[](2);
        hashes[0] = keccak256(abi.encodePacked("nft-0001"));
        hashes[1] = keccak256(abi.encodePacked("nft-0002"));
        owners[0] = alice;
        owners[1] = bob;

        bulkens.createBulkSubdomains(youNode, hashes, owners);

        assertEq(registry.owner(_namehash(youNode, hashes[0])), alice);
        assertEq(registry.owner(_namehash(youNode, hashes[1])), bob);
        assertEq(registry.resolver(_namehash(youNode, hashes[0])), address(mockResolver));
        assertEq(registry.resolver(_namehash(youNode, hashes[1])), address(mockResolver));
    }

    function test_createBulkSubdomains_revertsForNonOwner() public {
        bulkens.setResolver(mockResolver);

        vm.prank(stranger);
        vm.expectRevert("Ownable: caller is not the owner");
        bulkens.createBulkSubdomains(youNode, new bytes32[](0), new address[](0));
    }

    function test_createBulkSubdomains_revertsWithoutResolver() public {
        bytes32[] memory hashes = new bytes32[](1);
        address[] memory owners = new address[](1);
        hashes[0] = keccak256(abi.encodePacked("nft-0001"));
        owners[0] = alice;

        vm.expectRevert("Resolver not set in contract.");
        bulkens.createBulkSubdomains(youNode, hashes, owners);
    }

    function test_createBulkSubdomains_revertsOnLengthMismatch() public {
        bulkens.setResolver(mockResolver);

        bytes32[] memory hashes = new bytes32[](2);
        address[] memory owners = new address[](1);

        vm.expectRevert("Provided names and addresses should be equal.");
        bulkens.createBulkSubdomains(youNode, hashes, owners);
    }

    // --- createSubdomain ---------------------------------------------------

    function test_createSubdomain_createsRecordForNftOwner() public {
        bulkens.setResolver(mockResolver);
        _addCollection("MOCK", address(nft));
        nft.mint(alice, 1);

        vm.prank(alice);
        bulkens.createSubdomain(youNode, "MOCK", "0001");

        bytes32 label = _subnameLabel("MOCK", "0001");
        assertEq(registry.owner(_namehash(youNode, label)), alice);
        assertEq(registry.resolver(_namehash(youNode, label)), address(mockResolver));
    }

    function test_createSubdomain_revertsWithoutResolver() public {
        _addCollection("MOCK", address(nft));
        nft.mint(alice, 1);

        vm.prank(alice);
        vm.expectRevert("Resolver not set in contract.");
        bulkens.createSubdomain(youNode, "MOCK", "0001");
    }

    function test_createSubdomain_revertsForUnsupportedCollection() public {
        bulkens.setResolver(mockResolver);
        nft.mint(alice, 1);

        vm.prank(alice);
        vm.expectRevert("Collection not supported.");
        bulkens.createSubdomain(youNode, "NOPE", "0001");
    }

    function test_createSubdomain_revertsForNonNftOwner() public {
        bulkens.setResolver(mockResolver);
        _addCollection("MOCK", address(nft));
        nft.mint(alice, 1);

        vm.prank(bob);
        vm.expectRevert("You must own this nft in order to create sub-domain.");
        bulkens.createSubdomain(youNode, "MOCK", "0001");
    }

    /// Real ERC721 reverts on an unminted id, so this surfaces as the
    /// collection's own error rather than BulkENS's ownership message.
    function test_createSubdomain_revertsForNonexistentToken() public {
        bulkens.setResolver(mockResolver);
        _addCollection("MOCK", address(nft));

        vm.prank(alice);
        vm.expectRevert("ERC721: invalid token ID");
        bulkens.createSubdomain(youNode, "MOCK", "0099");
    }

    // --- helpers ---------------------------------------------------------

    function _namehash(bytes32 node, bytes32 label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, label));
    }

    function _subnameLabel(string memory symbol, string memory nftId)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(string.concat(symbol, "-", nftId)));
    }

    function _addCollection(string memory symbol, address collection) internal {
        string[] memory symbols = new string[](1);
        address[] memory addrs = new address[](1);
        symbols[0] = symbol;
        addrs[0] = collection;
        bulkens.addSupportedCollection(symbols, addrs);
    }

}
