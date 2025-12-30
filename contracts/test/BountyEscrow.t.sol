// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BountyFactory} from "../src/BountyFactory.sol";
import {BountyEscrow} from "../src/BountyEscrow.sol";
import {ProofVerifier} from "../src/ProofVerifier.sol";
import {BountyLib} from "../src/libraries/BountyLib.sol";
import {IBountyEscrow} from "../src/interfaces/IBountyEscrow.sol";

contract BountyEscrowTest is Test {
    BountyFactory public factory;
    ProofVerifier public verifier;
    BountyEscrow public escrow;

    address public owner = address(this);
    address public creator = address(0x1);
    address public whistleblower = address(0x2);
    address public contributor = address(0x3);

    string constant DOMAIN = "enron.com";
    string constant DESCRIPTION = "Cerco prove di frode aziendale";
    uint256 constant REWARD = 1 ether;
    uint256 deadline;

    function setUp() public {
        verifier = new ProofVerifier(address(0));
        factory = new BountyFactory(address(verifier));

        vm.deal(creator, 100 ether);
        vm.deal(whistleblower, 10 ether);
        vm.deal(contributor, 50 ether);

        deadline = block.timestamp + 30 days;
        
        vm.prank(creator);
        (, address escrowAddress) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline
        );
        
        escrow = BountyEscrow(payable(escrowAddress));
    }

    function test_EscrowInitializedCorrectly() public view {
        BountyLib.BountyDetails memory details = escrow.getBountyDetails();
        assertEq(details.domain, DOMAIN);
        assertEq(details.totalReward, REWARD);
        assertEq(details.creator, creator);
        assertEq(uint256(details.status), uint256(BountyLib.BountyStatus.OPEN));
    }

    function test_Contribute_Success() public {
        uint256 contributionAmount = 0.5 ether;
        vm.prank(contributor);
        escrow.contribute{value: contributionAmount}();
        assertEq(escrow.getContribution(contributor), contributionAmount);
    }

    function test_Contribute_RevertIf_ZeroAmount() public {
        vm.prank(contributor);
        vm.expectRevert(BountyEscrow.InvalidAmount.selector);
        escrow.contribute{value: 0}();
    }

    function test_Contribute_RevertIf_BountyExpired() public {
        vm.warp(deadline + 1);
        vm.prank(contributor);
        vm.expectRevert(BountyEscrow.BountyExpired.selector);
        escrow.contribute{value: 0.5 ether}();
    }

    function test_SubmitProof_Success() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        vm.prank(whistleblower);
        escrow.submitProof(proofData);

        BountyLib.BountyDetails memory details = escrow.getBountyDetails();
        assertEq(uint256(details.status), uint256(BountyLib.BountyStatus.PENDING_CLAIM));
    }

    function test_SubmitProof_RevertIf_BountyAlreadyHasClaim() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        vm.prank(whistleblower);
        escrow.submitProof(proofData);

        // Dopo una prova valida, il bounty non è più OPEN
        // Quindi nuove sottomissioni falliscono con BountyNotOpen
        vm.prank(address(0x999));
        vm.expectRevert(BountyEscrow.BountyNotOpen.selector);
        escrow.submitProof(proofData);
    }

    function test_ClaimReward_Success() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        vm.prank(whistleblower);
        escrow.submitProof(proofData);

        vm.warp(block.timestamp + 25 hours);

        uint256 balanceBefore = whistleblower.balance;
        vm.prank(whistleblower);
        escrow.claimReward();
        uint256 balanceAfter = whistleblower.balance;

        assertEq(balanceAfter - balanceBefore, REWARD);
    }

    function test_ClaimReward_RevertIf_DisputePeriodNotOver() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        vm.prank(whistleblower);
        escrow.submitProof(proofData);

        vm.prank(whistleblower);
        vm.expectRevert(BountyEscrow.DisputePeriodNotOver.selector);
        escrow.claimReward();
    }

    function test_ClaimReward_RevertIf_NotClaimant() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        vm.prank(whistleblower);
        escrow.submitProof(proofData);

        vm.warp(block.timestamp + 25 hours);

        vm.prank(contributor);
        vm.expectRevert(BountyEscrow.NotClaimant.selector);
        escrow.claimReward();
    }

    function test_Refund_Success() public {
        vm.warp(deadline + 1);
        uint256 balanceBefore = creator.balance;
        vm.prank(creator);
        escrow.refund();
        uint256 balanceAfter = creator.balance;
        assertEq(balanceAfter - balanceBefore, REWARD);
    }

    function test_Refund_RevertIf_BountyNotExpired() public {
        vm.prank(creator);
        vm.expectRevert(BountyEscrow.BountyNotExpired.selector);
        escrow.refund();
    }

    function test_OpenDispute_Success() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        vm.prank(whistleblower);
        escrow.submitProof(proofData);

        vm.prank(creator);
        escrow.openDispute("Prova non valida");

        BountyLib.BountyDetails memory details = escrow.getBountyDetails();
        assertEq(uint256(details.status), uint256(BountyLib.BountyStatus.DISPUTED));
    }

    function test_OpenDispute_RevertIf_NotContributor() public {
        BountyLib.ProofData memory proofData = _createValidProofData();
        vm.prank(whistleblower);
        escrow.submitProof(proofData);

        vm.prank(address(0x999));
        vm.expectRevert(BountyEscrow.NoContribution.selector);
        escrow.openDispute("Prova non valida");
    }

    function _createValidProofData() internal pure returns (BountyLib.ProofData memory) {
        uint256[] memory publicSignals = new uint256[](2);
        publicSignals[0] = uint256(keccak256(abi.encodePacked("enron.com")));
        publicSignals[1] = 123456789;

        return BountyLib.ProofData({
            pi_a: [uint256(1), uint256(2)],
            pi_b: [[uint256(3), uint256(4)], [uint256(5), uint256(6)]],
            pi_c: [uint256(7), uint256(8)],
            publicSignals: publicSignals
        });
    }
}

