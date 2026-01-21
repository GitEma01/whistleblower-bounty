// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ProofVerifier.sol";
import "../src/libraries/BountyLib.sol";

/// @notice Mock Groth16 Verifier che accetta sempre le prove
contract MockGroth16VerifierValid is IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external pure override returns (bool) {
        return true;
    }
}

/// @notice Mock Groth16 Verifier che rifiuta sempre le prove
contract MockGroth16VerifierInvalid is IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external pure override returns (bool) {
        return false;
    }
}

/// @notice Mock Groth16 Verifier che reverte
contract MockGroth16VerifierReverting is IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external pure override returns (bool) {
        revert("Verifier error");
    }
}

contract ProofVerifierTest is Test {
    ProofVerifier public verifier;
    MockGroth16VerifierValid public mockValidVerifier;
    MockGroth16VerifierInvalid public mockInvalidVerifier;
    MockGroth16VerifierReverting public mockRevertingVerifier;
    
    address public owner = address(this);
    address public prover = address(0x1234);
    address mockVerifier = address(1);
    event VerifierRegistered(
        string indexed domainIndexed,
        string domain,
        address verifierAddress,
        uint256 timestamp
    );

    event ProofVerified(
        string indexed domainIndexed,
        string domain,
        address indexed prover,
        bytes32 nullifier,
        uint256 timestamp,
        string message
    );

    event ProofVerificationFailed(
        string indexed domainIndexed,
        string domain,
        address indexed prover,
        string reason,
        uint256 timestamp
    );

    function setUp() public {
        // Deploy verifier in production mode (testMode = false)
        verifier = new ProofVerifier(false);
        
        // Deploy mock verifiers
        mockValidVerifier = new MockGroth16VerifierValid();
        mockInvalidVerifier = new MockGroth16VerifierInvalid();
        mockRevertingVerifier = new MockGroth16VerifierReverting();
    }

    // ============ CONSTRUCTOR TESTS ============

    function test_Constructor_ProductionMode() public view {
        assertFalse(verifier.testMode());
        assertEq(verifier.owner(), owner);
    }

    function test_Constructor_TestMode() public {
        ProofVerifier testVerifier = new ProofVerifier(true);
        assertTrue(testVerifier.testMode());
    }

    // ============ REGISTER VERIFIER TESTS ============

    function test_RegisterVerifier_Success() public {
        vm.expectEmit(false, false, false, true);
        emit VerifierRegistered("gmail.com", "gmail.com", address(mockValidVerifier), block.timestamp);
        
        verifier.registerVerifier("gmail.com", address(mockValidVerifier));
        
        assertEq(verifier.getVerifier("gmail.com"), address(mockValidVerifier));
        assertTrue(verifier.isDomainSupported("gmail.com"));
    }

    function test_RegisterVerifier_CaseInsensitive() public {
        verifier.registerVerifier("GMAIL.COM", address(mockValidVerifier));
        
        assertEq(verifier.getVerifier("gmail.com"), address(mockValidVerifier));
        assertEq(verifier.getVerifier("Gmail.Com"), address(mockValidVerifier));
        assertEq(verifier.getVerifier("GMAIL.COM"), address(mockValidVerifier));
    }

    function test_RegisterVerifier_OnlyOwner() public {
        vm.prank(prover);
        vm.expectRevert();
        verifier.registerVerifier("gmail.com", address(mockValidVerifier));
    }

    function test_RegisterVerifier_InvalidAddress() public {
        vm.expectRevert(ProofVerifier.InvalidVerifierAddress.selector);
        verifier.registerVerifier("gmail.com", address(0));
    }

    function test_RegisterVerifier_UpdateExisting() public {
        verifier.registerVerifier("gmail.com", address(mockValidVerifier));
        verifier.registerVerifier("gmail.com", address(mockInvalidVerifier));
        
        assertEq(verifier.getVerifier("gmail.com"), address(mockInvalidVerifier));
    }

    // ============ REMOVE VERIFIER TESTS ============

    function test_RemoveVerifier_Success() public {
        verifier.registerVerifier("gmail.com", address(mockValidVerifier));
        verifier.removeVerifier("gmail.com");
        
        assertEq(verifier.getVerifier("gmail.com"), address(0));
        assertFalse(verifier.isDomainSupported("gmail.com"));
    }

    function test_RemoveVerifier_NotFound() public {
        vm.expectRevert(abi.encodeWithSelector(ProofVerifier.VerifierNotFound.selector, "gmail.com"));
        verifier.removeVerifier("gmail.com");
    }

    // ============ VERIFY PROOF FOR DOMAIN TESTS ============

    function test_VerifyProofForDomain_ValidProof() public {
        verifier.registerVerifier("gmail.com", address(mockValidVerifier));
        
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        vm.expectEmit(false, true, false, false);
        emit ProofVerified("gmail.com", "gmail.com", prover, bytes32(0), block.timestamp, "");
        
        bool result = verifier.verifyProofForDomain(proofData, "gmail.com", prover,mockVerifier);
        
        assertTrue(result);
        
        (,uint256 verified,,) = verifier.getStats();
        assertEq(verified, 1);
    }

    function test_VerifyProofForDomain_InvalidProof() public {
        verifier.registerVerifier("gmail.com", address(mockInvalidVerifier));
        
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        vm.expectEmit(false, true, false, false);
        emit ProofVerificationFailed("gmail.com", "gmail.com", prover, "", block.timestamp);
        
        bool result = verifier.verifyProofForDomain(proofData, "gmail.com", prover,mockVerifier);
        
        assertFalse(result);
        
        (,,uint256 failed,) = verifier.getStats();
        assertEq(failed, 1);
    }

    function test_VerifyProofForDomain_VerifierNotFound() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        vm.expectRevert(abi.encodeWithSelector(ProofVerifier.VerifierNotFound.selector, "gmail.com"));
        verifier.verifyProofForDomain(proofData, "gmail.com", prover,mockVerifier);
    }

    function test_VerifyProofForDomain_VerifierReverts() public {
        verifier.registerVerifier("gmail.com", address(mockRevertingVerifier));
        
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        // Verifier reverts, but verifyProofForDomain should catch it and return false
        bool result = verifier.verifyProofForDomain(proofData, "gmail.com", prover,mockVerifier);
        
        assertFalse(result);
    }

    // ============ TEST MODE TESTS ============

    function test_TestMode_AcceptsValidStructure() public {
        ProofVerifier testVerifier = new ProofVerifier(true);
        
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        bool result = testVerifier.verifyProofForDomain(proofData, "unregistered.com", prover,mockVerifier);
        
        assertTrue(result);
    }

    function test_TestMode_RejectsInvalidStructure() public {
        ProofVerifier testVerifier = new ProofVerifier(true);
        
        BountyLib.ProofData memory proofData = _createInvalidProofData();
        
        bool result = testVerifier.verifyProofForDomain(proofData, "unregistered.com", prover,mockVerifier);
        
        assertFalse(result);
    }

    function test_SetTestMode() public {
        assertFalse(verifier.testMode());
        
        verifier.setTestMode(true);
        assertTrue(verifier.testMode());
        
        verifier.setTestMode(false);
        assertFalse(verifier.testMode());
    }

    // ============ LEGACY VERIFY PROOF TESTS ============

    function test_VerifyProof_TestMode() public {
        ProofVerifier testVerifier = new ProofVerifier(true);
        
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        bool result = testVerifier.verifyProof(proofData);
        assertTrue(result);
    }

    function test_VerifyProof_ProductionMode_Reverts() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        vm.expectRevert(ProofVerifier.UseVerifyProofForDomain.selector);
        verifier.verifyProof(proofData);
    }

    // ============ VIEW FUNCTIONS TESTS ============

    function test_GetRegisteredDomains() public {
        verifier.registerVerifier("gmail.com", address(mockValidVerifier));
        verifier.registerVerifier("succinct.xyz", address(mockValidVerifier));
        
        string[] memory domains = verifier.getRegisteredDomains();
        
        assertEq(domains.length, 2);
        assertEq(domains[0], "gmail.com");
        assertEq(domains[1], "succinct.xyz");
    }

    function test_GetStats() public {
        verifier.registerVerifier("gmail.com", address(mockValidVerifier));
        verifier.registerVerifier("succinct.xyz", address(mockValidVerifier));
        
        BountyLib.ProofData memory proofData = _createValidProofData();
        verifier.verifyProofForDomain(proofData, "gmail.com", prover,mockVerifier);
        
        (uint256 domains, uint256 verified, uint256 failed, bool testMode) = verifier.getStats();
        
        assertEq(domains, 2);
        assertEq(verified, 1);
        assertEq(failed, 0);
        assertFalse(testMode);
    }

    // ============ HELPER FUNCTION TESTS ============

    function test_VerifyDomainMatch_Exact() public view {
        assertTrue(verifier.verifyDomainMatch("gmail.com", "gmail.com"));
    }

    function test_VerifyDomainMatch_CaseInsensitive() public view {
        assertTrue(verifier.verifyDomainMatch("GMAIL.COM", "gmail.com"));
        assertTrue(verifier.verifyDomainMatch("Gmail.Com", "gmail.com"));
    }

    function test_VerifyDomainMatch_Mismatch() public view {
        assertFalse(verifier.verifyDomainMatch("gmail.com", "yahoo.com"));
    }

    function test_VerifyKeywords_AllPresent() public view {
        bytes32[] memory provided = new bytes32[](2);
        provided[0] = BountyLib.hashKeyword("fraud");
        provided[1] = BountyLib.hashKeyword("confidential");

        bytes32[] memory required = new bytes32[](2);
        required[0] = BountyLib.hashKeyword("fraud");
        required[1] = BountyLib.hashKeyword("confidential");

        assertTrue(verifier.verifyKeywords(provided, required));
    }

    function test_VerifyKeywords_MissingRequired() public view {
        bytes32[] memory provided = new bytes32[](1);
        provided[0] = BountyLib.hashKeyword("fraud");

        bytes32[] memory required = new bytes32[](2);
        required[0] = BountyLib.hashKeyword("fraud");
        required[1] = BountyLib.hashKeyword("confidential");

        assertFalse(verifier.verifyKeywords(provided, required));
    }

    function test_VerifyKeywords_EmptyRequired() public view {
        bytes32[] memory provided = new bytes32[](1);
        provided[0] = BountyLib.hashKeyword("fraud");

        bytes32[] memory required = new bytes32[](0);

        assertTrue(verifier.verifyKeywords(provided, required));
    }

    function test_ExtractNullifier() public view {
        uint256[] memory signals = new uint256[](2);
        signals[0] = 123;
        signals[1] = 456;

        bytes32 nullifier = verifier.extractNullifier(signals);
        bytes32 expected = keccak256(abi.encodePacked(uint256(123), uint256(456)));
        
        assertEq(nullifier, expected);
    }

    function test_HashKeyword() public view {
        bytes32 hash = verifier.hashKeyword("fraud");
        bytes32 expected = BountyLib.hashKeyword("fraud");
        
        assertEq(hash, expected);
    }

    // ============ HELPER FUNCTIONS ============

    function _createValidProofData() internal pure returns (BountyLib.ProofData memory) {
        uint256[] memory publicSignals = new uint256[](2);
        publicSignals[0] = uint256(keccak256(abi.encodePacked("gmail.com")));
        publicSignals[1] = 123456789;

        return BountyLib.ProofData({
            pi_a: [uint256(1), uint256(2)],
            pi_b: [[uint256(3), uint256(4)], [uint256(5), uint256(6)]],
            pi_c: [uint256(7), uint256(8)],
            publicSignals: publicSignals
        });
    }

    function _createInvalidProofData() internal pure returns (BountyLib.ProofData memory) {
        uint256[] memory publicSignals = new uint256[](0);

        return BountyLib.ProofData({
            pi_a: [uint256(0), uint256(0)], // Invalid: zero values
            pi_b: [[uint256(3), uint256(4)], [uint256(5), uint256(6)]],
            pi_c: [uint256(7), uint256(8)],
            publicSignals: publicSignals // Invalid: empty
        });
    }
}
