// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BountyFactory} from "../src/BountyFactory.sol";
import {BountyEscrow} from "../src/BountyEscrow.sol";
import {ProofVerifier} from "../src/ProofVerifier.sol";
import {BountyLib} from "../src/libraries/BountyLib.sol";
import {IBountyFactory} from "../src/interfaces/IBountyFactory.sol";

contract BountyFactoryTest is Test {
    BountyFactory public factory;
    ProofVerifier public verifier;

    address public owner = address(this);
    address public creator = address(0x1);
    address public whistleblower = address(0x2);
    address public contributor = address(0x3);

    string constant DOMAIN = "enron.com";
    string constant DESCRIPTION = "Cerco prove di frode aziendale";
    uint256 constant REWARD = 1 ether;

    function setUp() public {
        verifier = new ProofVerifier(address(0));
        factory = new BountyFactory(address(verifier));

        vm.deal(creator, 100 ether);
        vm.deal(whistleblower, 10 ether);
        vm.deal(contributor, 50 ether);
    }

    function test_DeploymentSetsOwner() public view {
        assertEq(factory.owner(), owner);
    }

    function test_DeploymentSetsProofVerifier() public view {
        assertEq(factory.proofVerifier(), address(verifier));
    }

    function test_InitialBountyCountIsZero() public view {
        assertEq(factory.getBountyCount(), 0);
    }

    function test_CreateBounty_Success() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        (uint256 bountyId, address escrowAddress) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline
        );

        assertEq(bountyId, 0);
        assertTrue(escrowAddress != address(0));
        assertEq(factory.getBountyCount(), 1);
    }

    function test_CreateBounty_StoresBountyDetails() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        (uint256 bountyId, ) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline
        );

        BountyLib.BountyDetails memory details = factory.getBounty(bountyId);

        assertEq(details.id, 0);
        assertEq(details.domain, DOMAIN);
        assertEq(details.description, DESCRIPTION);
        assertEq(details.totalReward, REWARD);
        assertEq(details.deadline, deadline);
        assertEq(uint256(details.status), uint256(BountyLib.BountyStatus.OPEN));
        assertEq(details.creator, creator);
    }

    function test_CreateBounty_RevertIf_RewardTooLow() public {
        uint256 deadline = block.timestamp + 30 days;
        uint256 lowReward = 0.001 ether;

        vm.prank(creator);
        vm.expectRevert(BountyFactory.InvalidReward.selector);
        factory.createBounty{value: lowReward}(DOMAIN, DESCRIPTION, deadline);
    }

    function test_CreateBounty_RevertIf_DeadlineTooSoon() public {
        uint256 deadline = block.timestamp + 1 days;

        vm.prank(creator);
        vm.expectRevert(BountyFactory.InvalidDeadline.selector);
        factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline);
    }

    function test_CreateBounty_RevertIf_DeadlineTooFar() public {
        uint256 deadline = block.timestamp + 400 days;

        vm.prank(creator);
        vm.expectRevert(BountyFactory.InvalidDeadline.selector);
        factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline);
    }

    function test_CreateBounty_RevertIf_EmptyDomain() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        vm.expectRevert(BountyFactory.InvalidDomain.selector);
        factory.createBounty{value: REWARD}("", DESCRIPTION, deadline);
    }

    function test_CreateMultipleBounties() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.startPrank(creator);
        
        (uint256 id1, ) = factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline);
        (uint256 id2, ) = factory.createBounty{value: REWARD}("bigpharma.com", "Cerco prove", deadline);
        (uint256 id3, ) = factory.createBounty{value: REWARD}("bank.com", "Scandalo", deadline);
        
        vm.stopPrank();

        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(id3, 2);
        assertEq(factory.getBountyCount(), 3);
    }

    function test_GetActiveBounties() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.startPrank(creator);
        factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline);
        factory.createBounty{value: REWARD}("bigpharma.com", "Cerco prove", deadline);
        vm.stopPrank();

        uint256[] memory activeBounties = factory.getActiveBounties();
        assertEq(activeBounties.length, 2);
    }

    function test_GetStats() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.startPrank(creator);
        factory.createBounty{value: 1 ether}(DOMAIN, DESCRIPTION, deadline);
        factory.createBounty{value: 2 ether}("bigpharma.com", "Cerco prove", deadline);
        vm.stopPrank();

        (uint256 totalBounties, uint256 activeBounties, uint256 totalValueLocked) = factory.getStats();

        assertEq(totalBounties, 2);
        assertEq(activeBounties, 2);
        assertEq(totalValueLocked, 3 ether);
    }

    function test_SetProofVerifier() public {
        address newVerifier = address(0x999);
        
        factory.setProofVerifier(newVerifier);
        
        assertEq(factory.proofVerifier(), newVerifier);
    }

    function test_SetProofVerifier_OnlyOwner() public {
        address newVerifier = address(0x999);
        
        vm.prank(creator);
        vm.expectRevert();
        factory.setProofVerifier(newVerifier);
    }
}
