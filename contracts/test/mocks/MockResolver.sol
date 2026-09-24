// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IResolver as IBulkResolver} from "../../src/BulkENS.sol";

/// Minimal mock for resolver BulkENS points subnames at.
contract MockResolver is IBulkResolver {
    function setText(bytes32, string calldata, string calldata) external {}

    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        return new bytes[](data.length);
    }
}