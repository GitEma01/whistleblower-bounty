// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BountyFactory} from "../src/BountyFactory.sol";
import {BountyEscrow} from "../src/BountyEscrow.sol";
import {ProofVerifier} from "../src/ProofVerifier.sol";
import {BountyLib} from "../src/libraries/BountyLib.sol";

contract BountyFactoryTest is Test {
    BountyFactory public factory;
    ProofVerifier public verifier;

    address public owner = address(this);
    address public creator = address(0x1);
    address public whistleblower = address(0x2);

    string constant DOMAIN = "testcompany.com";
    string constant DESCRIPTION = "Looking for evidence of fraud";
    uint256 constant REWARD = 1 ether;
    address mockGroth16Verifier = address(0x999);
    string[] keywords;

    function setUp() public {
        // Deploy ProofVerifier in TEST MODE (true)
        verifier = new ProofVerifier(true);
        factory = new BountyFactory(address(verifier));

        vm.deal(creator, 100 ether);
        vm.deal(whistleblower, 10 ether);

        keywords = new string[](2);
        keywords[0] = "fraud";
        keywords[1] = "confidential";
    }

    function test_CreateBounty_WithKeywords() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        (uint256 bountyId, address escrowAddress) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline,
            keywords,
            mockGroth16Verifier
        );

        assertEq(bountyId, 0);
        assertTrue(escrowAddress != address(0));
        assertEq(factory.getBountyCount(), 1);

        // Verifica keywords in chiaro
        string[] memory storedKeywords = factory.getBountyKeywords(bountyId);
        assertEq(storedKeywords.length, 2);
        assertEq(storedKeywords[0], "fraud");
        assertEq(storedKeywords[1], "confidential");

        // Verifica hash keywords
        bytes32[] memory storedHashes = factory.getBountyKeywordHashes(bountyId);
        assertEq(storedHashes.length, 2);
        assertEq(storedHashes[0], BountyLib.hashKeyword("fraud"));
        assertEq(storedHashes[1], BountyLib.hashKeyword("confidential"));
    }

    function test_CreateBounty_WithoutKeywords() public {
        uint256 deadline = block.timestamp + 30 days;
        string[] memory noKeywords = new string[](0);

        vm.prank(creator);
        (uint256 bountyId, ) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline,
            noKeywords,
            mockGroth16Verifier
        );

        string[] memory storedKeywords = factory.getBountyKeywords(bountyId);
        assertEq(storedKeywords.length, 0);
    }

    function test_CreateBounty_TooManyKeywords_Reverts() public {
        uint256 deadline = block.timestamp + 30 days;
        string[] memory tooMany = new string[](6);
        for (uint i = 0; i < 6; i++) {
            tooMany[i] = "keyword";
        }

        vm.prank(creator);
        vm.expectRevert(BountyFactory.TooManyKeywords.selector);
        factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline, tooMany, mockGroth16Verifier);
    }

    function test_GetBountyDetails_IncludesKeywords() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        (uint256 bountyId, ) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline,
            keywords,
	    mockGroth16Verifier
        );

        BountyLib.BountyDetails memory details = factory.getBounty(bountyId);
        
        assertEq(details.domain, DOMAIN);
        assertEq(details.keywords.length, 2);
        assertEq(details.hashedKeywords.length, 2);
    }

    function test_GetActiveBounties() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline, keywords, mockGroth16Verifier);

        vm.prank(creator);
        factory.createBounty{value: REWARD}("other.com", DESCRIPTION, deadline, keywords, mockGroth16Verifier);

        uint256[] memory activeBounties = factory.getActiveBounties();
        assertEq(activeBounties.length, 2);
    }

    function test_GetBountiesByCreator() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline, keywords, mockGroth16Verifier);

        vm.prank(creator);
        factory.createBounty{value: REWARD}("other.com", DESCRIPTION, deadline, keywords, mockGroth16Verifier);

        vm.prank(whistleblower);
        vm.deal(whistleblower, 10 ether);
        factory.createBounty{value: REWARD}("third.com", DESCRIPTION, deadline, keywords, mockGroth16Verifier);

        uint256[] memory creatorBounties = factory.getBountiesByCreator(creator);
        assertEq(creatorBounties.length, 2);

        uint256[] memory whistleblowerBounties = factory.getBountiesByCreator(whistleblower);
        assertEq(whistleblowerBounties.length, 1);
    }

    function test_GetStats() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        factory.createBounty{value: REWARD}(DOMAIN, DESCRIPTION, deadline, keywords, mockGroth16Verifier);

        vm.prank(creator);
        factory.createBounty{value: 2 ether}("other.com", DESCRIPTION, deadline, keywords, mockGroth16Verifier);

        (uint256 totalBounties, uint256 activeBounties, uint256 totalValueLocked) = factory.getStats();
        
        assertEq(totalBounties, 2);
        assertEq(activeBounties, 2);
        assertEq(totalValueLocked, 3 ether);
    }

    function test_IsValidEscrow() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(creator);
        (, address escrowAddress) = factory.createBounty{value: REWARD}(
            DOMAIN,
            DESCRIPTION,
            deadline,
            keywords,
            mockGroth16Verifier
        );

        assertTrue(factory.isValidEscrow(escrowAddress));
        assertFalse(factory.isValidEscrow(address(0x1234)));
    }
}
