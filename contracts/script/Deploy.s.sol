// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BountyFactory} from "../src/BountyFactory.sol";
import {ProofVerifier} from "../src/ProofVerifier.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        // Legge la private key dall'ambiente
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Deploying contracts...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ProofVerifier (in test mode, senza Groth16 verifier)
        ProofVerifier proofVerifier = new ProofVerifier(address(0));
        console.log("ProofVerifier deployed at:", address(proofVerifier));

        // 2. Deploy BountyFactory
        BountyFactory bountyFactory = new BountyFactory(address(proofVerifier));
        console.log("BountyFactory deployed at:", address(bountyFactory));

        vm.stopBroadcast();

        // Stampa riepilogo
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("ProofVerifier:", address(proofVerifier));
        console.log("BountyFactory:", address(bountyFactory));
        console.log("============================\n");
    }
}
