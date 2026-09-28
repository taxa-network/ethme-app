// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// For supported collections.
///
/// Built on the real OpenZeppelin ERC721 rather than a hand-rolled stub so
/// that ownerOf reverts on a nonexistent token the way mainnet collections do.
contract MockERC721 is ERC721 {
    constructor() ERC721("Mock", "MOCK") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}