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

    function setUp() public {
        registry = new ENSRegistry(); // deployer owns the root node
        mockResolver = new MockResolver();
        nft = new MockERC721();
        bulkens = new BulkENS(IBulkRegistry(address(registry)));
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

    // --- helpers ---------------------------------------------------------

    function _addCollection(string memory symbol, address collection) internal {
        string[] memory symbols = new string[](1);
        address[] memory addrs = new address[](1);
        symbols[0] = symbol;
        addrs[0] = collection;
        bulkens.addSupportedCollection(symbols, addrs);
    }

}
