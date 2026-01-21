// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BountyFactory} from "../src/BountyFactory.sol";
import {ProofVerifier} from "../src/ProofVerifier.sol";

/// @title DeployScript
/// @notice Script di deployment per Whistleblower Bounty su Base Sepolia
/// @dev Deploya ProofVerifier e BountyFactory, poi registra i verifier per ogni dominio
contract DeployScript is Script {
    
    // ============ VERIFIER ADDRESSES (da ZK Email Registry) ============
    
    /// @notice Verifier Groth16 per Gmail (GitEma01/GmailDebugBlueprint@v2)
    /// @dev Deployato su Base Sepolia (Chain ID: 84532)
    address constant GMAIL_VERIFIER = 0x00E251c683212d803FE2caf753B059991e6C4D5d;
    
    /// @notice Verifier Groth16 per Succinct (Bisht13/SuccinctZKResidencyInvite@v3)
    /// @dev TODO: Sostituire con l'indirizzo reale dal ZK Email Registry
    /// @dev Per trovarlo: vai su registry.zk.email -> cerca il blueprint -> copia verifier_contract_address
    address constant SUCCINCT_VERIFIER = 0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848; // <-- PLACEHOLDER: INSERISCI INDIRIZZO REALE
    
    // ============ DEPLOYMENT FLAGS ============

    /// @notice Se true, deploya in test mode (non verifica le prove crittograficamente)
    /// @dev Imposta a false per produzione
    bool constant DEPLOY_IN_TEST_MODE = false;
    
    function setUp() public {}

    function run() public {
        // Legge la private key dall'ambiente
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("");
        console.log("============================================================");
        console.log("   WHISTLEBLOWER BOUNTY - DEPLOYMENT SCRIPT");
        console.log("============================================================");
        console.log("");
        console.log("Deployer address:", deployer);
        console.log("Deploying to chain ID:", block.chainid);
        console.log("Test mode:", DEPLOY_IN_TEST_MODE);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ========================================
        // 1. Deploy ProofVerifier (Router)
        // ========================================
        console.log("Step 1: Deploying ProofVerifier...");
        
        ProofVerifier proofVerifier = new ProofVerifier(DEPLOY_IN_TEST_MODE);
        
        console.log("   ProofVerifier deployed at:", address(proofVerifier));
        console.log("   Test mode enabled:", proofVerifier.testMode());
        console.log("");

        // ========================================
        // 2. Registra i Verifier per ogni dominio
        // ========================================
        console.log("Step 2: Registering domain verifiers...");
        
        // Gmail
        if (GMAIL_VERIFIER != address(0)) {
            proofVerifier.registerVerifier("gmail.com", GMAIL_VERIFIER);
            console.log("   Registered gmail.com verifier:", GMAIL_VERIFIER);
        } else {
            console.log("   WARNING: Gmail verifier not set!");
        }
        
        // Succinct
        if (SUCCINCT_VERIFIER != address(0)) {
            proofVerifier.registerVerifier("succinct.xyz", SUCCINCT_VERIFIER);
            console.log("   Registered succinct.xyz verifier:", SUCCINCT_VERIFIER);
        } else {
            console.log("   WARNING: Succinct verifier is PLACEHOLDER (address(0))");
            console.log("   To add it later, call: proofVerifier.registerVerifier('succinct.xyz', <address>)");
        }
        
        console.log("");

        // ========================================
        // 3. Deploy BountyFactory
        // ========================================
        console.log("Step 3: Deploying BountyFactory...");
        
        BountyFactory bountyFactory = new BountyFactory(address(proofVerifier));
        
        console.log("   BountyFactory deployed at:", address(bountyFactory));
        console.log("   Owner:", bountyFactory.owner());
        console.log("");

        vm.stopBroadcast();

        // ========================================
        // Stampa riepilogo finale
        // ========================================
        console.log("============================================================");
        console.log("   DEPLOYMENT COMPLETE!");
        console.log("============================================================");
        console.log("");
        console.log("Contract Addresses:");
        console.log("   NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS=");
        console.log("   ", address(proofVerifier));
        console.log("   NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS=");
        console.log("   ", address(bountyFactory));
        console.log("");
        console.log("Registered Domains:");
        console.log("   gmail.com     -> ");
        console.log("   ", GMAIL_VERIFIER);
        if (SUCCINCT_VERIFIER == address(0)) {
            console.log("   succinct.xyz  -> NOT SET (placeholder)");
        } else {
            console.log("   succinct.xyz  -> SET");
        }
        console.log("");
        console.log("============================================================");
        console.log("   NEXT STEPS");
        console.log("============================================================");
        console.log("");
        console.log("1. Update your frontend/.env.local with the addresses above");
        console.log("");
        console.log("2. Verify contracts on BaseScan:");
        console.log("   forge verify-contract <PROOF_VERIFIER_ADDRESS> src/ProofVerifier.sol:ProofVerifier --chain base-sepolia");
        console.log("   forge verify-contract <BOUNTY_FACTORY_ADDRESS> src/BountyFactory.sol:BountyFactory --chain base-sepolia");
        console.log("");
        console.log("3. To register Succinct verifier later, run:");
        console.log("   cast send <PROOF_VERIFIER_ADDRESS> 'registerVerifier(string,address)' 'succinct.xyz' <VERIFIER_ADDRESS>");
        console.log("");
    }
}

/// @notice Script per registrare un nuovo verifier per un dominio
contract RegisterVerifierScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proofVerifierAddress = vm.envAddress("NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS");
        
        // Parametri da environment o hardcoded
        string memory domain = vm.envOr("DOMAIN", string("succinct.xyz"));
        address verifierAddress = vm.envOr("VERIFIER_ADDRESS", address(0));
        
        require(verifierAddress != address(0), "VERIFIER_ADDRESS not set");
        
        console.log("Registering verifier for domain:", domain);
        console.log("Verifier address:", verifierAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        ProofVerifier proofVerifier = ProofVerifier(proofVerifierAddress);
        proofVerifier.registerVerifier(domain, verifierAddress);
        
        vm.stopBroadcast();
        
        console.log("Verifier registered successfully!");
    }
}

/// @notice Script per creare un bounty di test
contract CreateTestBountyScript is Script {
      
      function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS");
        address mockVerifier = 0x00E251c683212d803FE2caf753B059991e6C4D5d;
        console.log("Creating test bounty...");
        
        vm.startBroadcast(deployerPrivateKey);

        BountyFactory factory = BountyFactory(factoryAddress);

        // Crea un bounty di test con keywords
        string[] memory keywords = new string[](2);
        keywords[0] = "fraud";
        keywords[1] = "confidential";

        (uint256 bountyId, address escrowAddress) = factory.createBounty{value: 0.01 ether}(
            "gmail.com",
            "Test bounty: Looking for evidence of corporate fraud from Gmail users. Required keywords: fraud, confidential",
            block.timestamp + 30 days,
            keywords,
            mockVerifier
        );

        vm.stopBroadcast();

        console.log("");
        console.log("Test bounty created!");
        console.log("   Bounty ID:", bountyId);
        console.log("   Escrow address:", escrowAddress);
        console.log("   Domain: gmail.com");
        console.log("   Required keywords: fraud, confidential");
        console.log("   Reward: 0.01 ETH");
        console.log("");
    }
}

/// @notice Script per visualizzare lo stato del ProofVerifier
contract ViewVerifierStatusScript is Script {
    function run() public view {
        address proofVerifierAddress = vm.envAddress("NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS");
        
        ProofVerifier proofVerifier = ProofVerifier(proofVerifierAddress);
        
        console.log("");
        console.log("============================================================");
        console.log("   PROOF VERIFIER STATUS");
        console.log("============================================================");
        console.log("");
        console.log("Address:", proofVerifierAddress);
        console.log("Test mode:", proofVerifier.testMode());
        console.log("Owner:", proofVerifier.owner());
        console.log("");
        
        (uint256 domains, uint256 verified, uint256 failed, bool testMode) = proofVerifier.getStats();
        console.log("Statistics:");
        console.log("   Registered domains:", domains);
        console.log("   Proofs verified:", verified);
        console.log("   Proofs failed:", failed);
        console.log("   Test mode:", testMode);
        console.log("");
        
        // Check specific domains
        console.log("Domain Support:");
        
        address gmailVerifier = proofVerifier.getVerifier("gmail.com");
        console.log("   gmail.com:", gmailVerifier == address(0) ? "NOT REGISTERED" : "REGISTERED");
        if (gmailVerifier != address(0)) {
            console.log("      Verifier:", gmailVerifier);
        }
        
        address succinctVerifier = proofVerifier.getVerifier("succinct.xyz");
        console.log("   succinct.xyz:", succinctVerifier == address(0) ? "NOT REGISTERED" : "REGISTERED");
        if (succinctVerifier != address(0)) {
            console.log("      Verifier:", succinctVerifier);
        }
        
        console.log("");
    }
}
