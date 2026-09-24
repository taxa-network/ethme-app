// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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