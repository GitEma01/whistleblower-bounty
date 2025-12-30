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

    function test_VerifyDomain() public view {
        // In test mode, dovrebbe sempre restituire true per domini non vuoti
        bool result = verifier.verifyDomain(12345, "gmail.com");
        assertTrue(result);
    }

    function test_VerifyDomain_EmptyDomain() public view {
        bool result = verifier.verifyDomain(12345, "");
        assertFalse(result);
    }

    function test_VerifyProof_TestMode_RealZkEmailProof() public view {
        // Simula una prova reale con 8 public signals (come ZK Email)
        uint256[] memory signals = new uint256[](8);
        signals[0] = 17065011482015124977282970298439631182550457267344513671014250909064553612521;
        signals[1] = 52352752354244467950513147857578709131;
        signals[2] = 274064983910760223810904298937823921978;
        signals[3] = 2334392307038315863;
        signals[4] = 0;
        signals[5] = 902461930945294469469049061864238462133168371753019686485682756284276;
        signals[6] = 0;
        signals[7] = 0;

        BountyLib.ProofData memory proof = BountyLib.ProofData({
            pi_a: [
                uint256(14916079991776342201899674931232934415495724139882818819230159627800747431829),
                uint256(11257789964614083959671383197648530154954556430084048945119176966146937392300)
            ],
            pi_b: [
                [
                    uint256(18564540719021881727936237954817807018180452792251788944542920453460056782563),
                    uint256(9831694138768169639975554572983492952369492205881989964429367187441943328801)
                ],
                [
                    uint256(3841163460112717194209295801042398376758978009035516475436502745093784281376),
                    uint256(11825019136187687624903955036892556571353216692921743802649997711567566289760)
                ]
            ],
            pi_c: [
                uint256(20478624148861993040029601760700853954690223282076268502837761758833672923249),
                uint256(14351020537829825831305330828835455924529606786148467626351291954568970483214)
            ],
            publicSignals: signals
        });

        bool result = verifier.verifyProof(proof);
        assertTrue(result);
    }
}
