// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BountyFactory} from "../src/BountyFactory.sol";
import {BountyEscrow} from "../src/BountyEscrow.sol";
import {ProofVerifier} from "../src/ProofVerifier.sol";
import {BountyLib} from "../src/libraries/BountyLib.sol";

contract BountyEscrowTest is Test {
    BountyFactory public factory;
    ProofVerifier public verifier;
    BountyEscrow public escrow;

    address public creator = address(0x1);
    address public whistleblower = address(0x2);
    address public contributor = address(0x3);

    string constant DOMAIN = "testcompany.com";
    string constant DESCRIPTION = "Looking for evidence";
    uint256 constant REWARD = 1 ether;
    uint256 deadline;

    string[] keywords;

    function setUp() public {
        verifier = new ProofVerifier(address(0));
        factory = new BountyFactory(address(verifier));

        vm.deal(creator, 100 ether);
        vm.deal(whistleblower, 10 ether);
        vm.deal(contributor, 50 ether);

        keywords = new string[](2);
        keywords[0] = "fraud";
        keywords[1] = "secret";

        deadline = block.timestamp + 30 days;

        vm.prank(creator);
        (, address escrowAddress) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline,
            keywords
        );

        escrow = BountyEscrow(payable(escrowAddress));
    }

    function test_SubmitProof_WithCorrectKeywords() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        // Hash delle keywords corrette
        bytes32[] memory keywordHashes = new bytes32[](2);
        keywordHashes[0] = BountyLib.hashKeyword("fraud");
        keywordHashes[1] = BountyLib.hashKeyword("secret");

        vm.prank(whistleblower);
        escrow.submitProof(proofData, DOMAIN, keywordHashes);

        BountyLib.BountyDetails memory details = escrow.getBountyDetails();
        assertEq(uint256(details.status), uint256(BountyLib.BountyStatus.PENDING_CLAIM));
    }

    function test_SubmitProof_WithWrongKeywords_Reverts() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        // Hash di keywords sbagliate
        bytes32[] memory wrongHashes = new bytes32[](2);
        wrongHashes[0] = BountyLib.hashKeyword("wrong");
        wrongHashes[1] = BountyLib.hashKeyword("keywords");

        vm.prank(whistleblower);
        vm.expectRevert(BountyEscrow.KeywordsMismatch.selector);
        escrow.submitProof(proofData, DOMAIN, wrongHashes);
    }

    function test_SubmitProof_WithMissingKeywords_Reverts() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        // Solo una keyword invece di due
        bytes32[] memory partialHashes = new bytes32[](1);
        partialHashes[0] = BountyLib.hashKeyword("fraud");

        vm.prank(whistleblower);
        vm.expectRevert(BountyEscrow.KeywordsMismatch.selector);
        escrow.submitProof(proofData, DOMAIN, partialHashes);
    }

    function test_SubmitProof_WithWrongDomain_Reverts() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        bytes32[] memory keywordHashes = new bytes32[](2);
        keywordHashes[0] = BountyLib.hashKeyword("fraud");
        keywordHashes[1] = BountyLib.hashKeyword("secret");

        vm.prank(whistleblower);
        vm.expectRevert(BountyEscrow.DomainMismatch.selector);
        escrow.submitProof(proofData, "wrongdomain.com", keywordHashes);
    }

    function test_SubmitProof_DomainCaseInsensitive() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        bytes32[] memory keywordHashes = new bytes32[](2);
        keywordHashes[0] = BountyLib.hashKeyword("fraud");
        keywordHashes[1] = BountyLib.hashKeyword("secret");

        // Dominio in uppercase dovrebbe funzionare
        vm.prank(whistleblower);
        escrow.submitProof(proofData, "TESTCOMPANY.COM", keywordHashes);

        BountyLib.BountyDetails memory details = escrow.getBountyDetails();
        assertEq(uint256(details.status), uint256(BountyLib.BountyStatus.PENDING_CLAIM));
    }

    function test_ClaimReward_AfterDisputePeriod() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        
        bytes32[] memory keywordHashes = new bytes32[](2);
        keywordHashes[0] = BountyLib.hashKeyword("fraud");
        keywordHashes[1] = BountyLib.hashKeyword("secret");

        vm.prank(whistleblower);
        escrow.submitProof(proofData, DOMAIN, keywordHashes);

        // Avanza oltre il dispute period
        vm.warp(block.timestamp + 25 hours);

        uint256 balanceBefore = whistleblower.balance;
        
        vm.prank(whistleblower);
        escrow.claimReward();

        assertEq(whistleblower.balance - balanceBefore, REWARD);
    }

    function test_GetKeywords() public view {
        string[] memory storedKeywords = escrow.getKeywords();
        assertEq(storedKeywords.length, 2);
        assertEq(storedKeywords[0], "fraud");
        assertEq(storedKeywords[1], "secret");
    }

    function _createValidProofData() internal pure returns (BountyLib.ProofData memory) {
        uint256[] memory publicSignals = new uint256[](2);
        publicSignals[0] = uint256(keccak256(abi.encodePacked("testcompany.com")));
        publicSignals[1] = 123456789;

        return BountyLib.ProofData({
            pi_a: [uint256(1), uint256(2)],
            pi_b: [[uint256(3), uint256(4)], [uint256(5), uint256(6)]],
            pi_c: [uint256(7), uint256(8)],
            publicSignals: publicSignals
        });
    }
}
