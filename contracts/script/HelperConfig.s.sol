// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";

// CONSTANTS - Per-network deployed addresses and config.
contract HelperConfig is Script {
    struct NetworkConfig {
        address registry;
        address nameWrapper;
        address ethController;
        address reverseRegistrar;
    }

    uint256 constant MAINNET_CHAIN_ID = 1;
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;

    function getConfig() public view returns (NetworkConfig memory) {
        if (block.chainid == MAINNET_CHAIN_ID) return mainnetConfig();
        if (block.chainid == SEPOLIA_CHAIN_ID) return sepoliaConfig();
        revert("HelperConfig: unsupported chain");
    }

    function mainnetConfig() internal pure returns (NetworkConfig memory) {
        return NetworkConfig({
            registry: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e,
            nameWrapper: 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401,
            ethController: 0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547,
            reverseRegistrar: 0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb
        });
    }

    function sepoliaConfig() internal pure returns (NetworkConfig memory) {
        return NetworkConfig({
            registry: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e,
            nameWrapper: 0x0635513f179D50A207757E05759CbD106d7dFcE8,
            ethController: 0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968,
            reverseRegistrar: 0xA0a1AbcDAe1a2a4A2EF8e9113Ff0e02DD81DC0C6
        });
    }
}
