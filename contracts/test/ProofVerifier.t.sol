// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ProofVerifier.sol";
import "../src/libraries/BountyLib.sol";

contract ProofVerifierTest is Test {
    ProofVerifier public verifier;

    function setUp() public {
        // Deploy in test mode (address(0))
        verifier = new ProofVerifier(address(0));
    }

    function test_DeployInTestMode() public view {
        assertTrue(verifier.testMode());
    }

    function test_VerifyProof_TestMode_ValidStructure() public view {
        uint256[] memory signals = new uint256[](2);
        signals[0] = 123;
        signals[1] = 456;

        BountyLib.ProofData memory proof = BountyLib.ProofData({
            pi_a: [uint256(1), uint256(2)],
            pi_b: [[uint256(3), uint256(4)], [uint256(5), uint256(6)]],
            pi_c: [uint256(7), uint256(8)],
            publicSignals: signals
        });

        bool result = verifier.verifyProof(proof);
        assertTrue(result);
    }

    function test_VerifyProof_TestMode_InvalidStructure_ZeroPiA() public view {
        uint256[] memory signals = new uint256[](2);
        signals[0] = 123;
        signals[1] = 456;

        BountyLib.ProofData memory proof = BountyLib.ProofData({
            pi_a: [uint256(0), uint256(0)],
            pi_b: [[uint256(3), uint256(4)], [uint256(5), uint256(6)]],
            pi_c: [uint256(7), uint256(8)],
            publicSignals: signals
        });

        bool result = verifier.verifyProof(proof);
        assertFalse(result);
    }

    function test_VerifyProof_TestMode_InvalidStructure_NoPublicSignals() public view {
        uint256[] memory signals = new uint256[](0);

        BountyLib.ProofData memory proof = BountyLib.ProofData({
            pi_a: [uint256(1), uint256(2)],
            pi_b: [[uint256(3), uint256(4)], [uint256(5), uint256(6)]],
            pi_c: [uint256(7), uint256(8)],
            publicSignals: signals
        });

        bool result = verifier.verifyProof(proof);
        assertFalse(result);
    }

    function test_VerifyDomainMatch_ExactMatch() public view {
        bool result = verifier.verifyDomainMatch("gmail.com", "gmail.com");
        assertTrue(result);
    }

    function test_VerifyDomainMatch_CaseInsensitive() public view {
        assertTrue(verifier.verifyDomainMatch("GMAIL.COM", "gmail.com"));
        assertTrue(verifier.verifyDomainMatch("Gmail.Com", "gmail.com"));
        assertTrue(verifier.verifyDomainMatch("gmail.com", "GMAIL.COM"));
    }

    function test_VerifyDomainMatch_Mismatch() public view {
        assertFalse(verifier.verifyDomainMatch("gmail.com", "yahoo.com"));
        assertFalse(verifier.verifyDomainMatch("gmail.com", "gmail.org"));
    }

    function test_VerifyKeywords_AllPresent() public view {
        bytes32[] memory provided = new bytes32[](2);
        provided[0] = BountyLib.hashKeyword("fraud");
        provided[1] = BountyLib.hashKeyword("confidential");

        bytes32[] memory required = new bytes32[](2);
        required[0] = BountyLib.hashKeyword("fraud");
        required[1] = BountyLib.hashKeyword("confidential");

        bool result = verifier.verifyKeywords(provided, required);
        assertTrue(result);
    }

    function test_VerifyKeywords_ExtraProvided() public view {
        bytes32[] memory provided = new bytes32[](3);
        provided[0] = BountyLib.hashKeyword("fraud");
        provided[1] = BountyLib.hashKeyword("confidential");
        provided[2] = BountyLib.hashKeyword("extra");

        bytes32[] memory required = new bytes32[](2);
        required[0] = BountyLib.hashKeyword("fraud");
        required[1] = BountyLib.hashKeyword("confidential");

        bool result = verifier.verifyKeywords(provided, required);
        assertTrue(result);
    }

    function test_VerifyKeywords_MissingRequired() public view {
        bytes32[] memory provided = new bytes32[](1);
        provided[0] = BountyLib.hashKeyword("fraud");

        bytes32[] memory required = new bytes32[](2);
        required[0] = BountyLib.hashKeyword("fraud");
        required[1] = BountyLib.hashKeyword("confidential");

        bool result = verifier.verifyKeywords(provided, required);
        assertFalse(result);
    }

    function test_VerifyKeywords_EmptyRequired() public view {
        bytes32[] memory provided = new bytes32[](2);
        provided[0] = BountyLib.hashKeyword("fraud");
        provided[1] = BountyLib.hashKeyword("confidential");

        bytes32[] memory required = new bytes32[](0);

        // Se non ci sono keyword richieste, dovrebbe sempre passare
        bool result = verifier.verifyKeywords(provided, required);
        assertTrue(result);
    }

    function test_VerifyKeywords_WrongKeywords() public view {
        bytes32[] memory provided = new bytes32[](2);
        provided[0] = BountyLib.hashKeyword("wrong");
        provided[1] = BountyLib.hashKeyword("keywords");

        bytes32[] memory required = new bytes32[](2);
        required[0] = BountyLib.hashKeyword("fraud");
        required[1] = BountyLib.hashKeyword("confidential");

        bool result = verifier.verifyKeywords(provided, required);
        assertFalse(result);
    }

    function test_VerifyKeywords_DifferentOrder() public view {
        // L'ordine non dovrebbe importare
        bytes32[] memory provided = new bytes32[](2);
        provided[0] = BountyLib.hashKeyword("confidential");
        provided[1] = BountyLib.hashKeyword("fraud");

        bytes32[] memory required = new bytes32[](2);
        required[0] = BountyLib.hashKeyword("fraud");
        required[1] = BountyLib.hashKeyword("confidential");

        bool result = verifier.verifyKeywords(provided, required);
        assertTrue(result);
    }

    function test_ExtractDomainHash() public view {
        uint256[] memory signals = new uint256[](3);
        signals[0] = 12345;
        signals[1] = 67890;
        signals[2] = 11111;

        uint256 domainHash = verifier.extractDomainHash(signals);
        assertEq(domainHash, 12345);
    }

    function test_ExtractNullifier() public view {
        uint256[] memory signals = new uint256[](2);
        signals[0] = 123;
        signals[1] = 456;

        bytes32 nullifier = verifier.extractNullifier(signals);
        bytes32 expected = keccak256(abi.encodePacked(uint256(123), uint256(456)));
        assertEq(nullifier, expected);
    }

    function test_ExtractKeywordHashes() public view {
        uint256[] memory signals = new uint256[](5);
        signals[0] = 111; // domain
        signals[1] = 222; // nullifier part
        signals[2] = 333; // keyword 1
        signals[3] = 444; // keyword 2
        signals[4] = 555; // keyword 3

        bytes32[] memory hashes = verifier.extractKeywordHashes(signals);
        assertEq(hashes.length, 3);
        assertEq(hashes[0], bytes32(uint256(333)));
        assertEq(hashes[1], bytes32(uint256(444)));
        assertEq(hashes[2], bytes32(uint256(555)));
    }

    function test_HashKeyword() public view {
        bytes32 hash = verifier.hashKeyword("fraud");
        bytes32 expected = BountyLib.hashKeyword("fraud");
        assertEq(hash, expected);
    }

    function test_HashKeyword_CaseInsensitive() public view {
        bytes32 hash1 = verifier.hashKeyword("FRAUD");
        bytes32 hash2 = verifier.hashKeyword("fraud");
        bytes32 hash3 = verifier.hashKeyword("Fraud");
        
        assertEq(hash1, hash2);
        assertEq(hash2, hash3);
    }
}
