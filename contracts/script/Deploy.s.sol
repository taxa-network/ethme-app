// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script,console2} from "forge-std/Script.sol";
import {BulkENS, IENS, IResolver} from "../src/BulkENS.sol";
import {PublicResolver} from "../src/Resolver.sol";
import {INameWrapper} from "@ensdomains/ens-contracts/contracts/wrapper/INameWrapper.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/**
 * Use this to deploy on testnet or mainnet.
 * For local anvil testing, BulkENSFlow.sol can be used to run full flow.
 */
contract Deploy is Script {
    BulkENS public bulkens;
    PublicResolver public resolver;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory cfg = helperConfig.getConfig();

        // Ensure that the addresses are valid
        require(cfg.registry != address(0), "Invalid registry address");
        require(cfg.nameWrapper != address(0), "Invalid name wrapper address");
        require(cfg.ethController != address(0), "Invalid eth controller address");
        require(cfg.reverseRegistrar != address(0), "Invalid reverse registrar address");

        bulkens = new BulkENS(IENS(cfg.registry));

        resolver = new PublicResolver(
            ENS(cfg.registry),
            INameWrapper(cfg.nameWrapper),
            cfg.ethController,
            cfg.reverseRegistrar,
            address(bulkens)
        );

        bulkens.setResolver(IResolver(address(resolver)));

        vm.stopBroadcast();

        console2.log("chainid ", block.chainid);
        console2.log("registry", cfg.registry);
        console2.log("BulkENS ", address(bulkens));
        console2.log("Resolver", address(resolver));
    }
}
