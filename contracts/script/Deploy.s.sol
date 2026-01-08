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
        
        console.log("=== WHISTLEBLOWER BOUNTY DEPLOYMENT ===");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Deploying to chain ID:", block.chainid);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ProofVerifier (in test mode, senza Groth16 verifier)
        // In produzione, passare l'indirizzo del verifier Groth16 reale
        ProofVerifier proofVerifier = new ProofVerifier(address(0));
        console.log("ProofVerifier deployed at:", address(proofVerifier));
        console.log("  - Test mode:", proofVerifier.testMode());

        // 2. Deploy BountyFactory
        BountyFactory bountyFactory = new BountyFactory(address(proofVerifier));
        console.log("BountyFactory deployed at:", address(bountyFactory));
        console.log("  - Owner:", bountyFactory.owner());

        vm.stopBroadcast();

        // Stampa riepilogo per .env
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("");
        console.log("Add these to your .env file:");
        console.log("NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS=", address(proofVerifier));
        console.log("NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS=", address(bountyFactory));
        console.log("");
        console.log("=== VERIFICATION COMMANDS ===");
        console.log("forge verify-contract", address(proofVerifier), "src/ProofVerifier.sol:ProofVerifier --chain base-sepolia");
        console.log("forge verify-contract", address(bountyFactory), "src/BountyFactory.sol:BountyFactory --chain base-sepolia");
    }
}

/// @notice Script per creare un bounty di test
contract CreateTestBountyScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS");

        console.log("Creating test bounty...");
        
        vm.startBroadcast(deployerPrivateKey);

        BountyFactory factory = BountyFactory(factoryAddress);

        // Crea un bounty di test con keywords
        string[] memory keywords = new string[](2);
        keywords[0] = "fraud";
        keywords[1] = "confidential";

        (uint256 bountyId, address escrowAddress) = factory.createBounty{value: 0.01 ether}(
            "gmail.com",
            "Test bounty: Looking for evidence of corporate fraud from Gmail users",
            block.timestamp + 30 days,
            keywords
        );

        vm.stopBroadcast();

        console.log("Test bounty created!");
        console.log("  - Bounty ID:", bountyId);
        console.log("  - Escrow address:", escrowAddress);
        console.log("  - Required keywords: fraud, confidential");
    }
}
