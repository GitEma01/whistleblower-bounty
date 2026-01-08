// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IProofVerifier.sol";
import "./libraries/BountyLib.sol";

/// @title ProofVerifier
/// @notice Verifica le prove ZK Email con supporto per domini dinamici e keyword matching
contract ProofVerifier is IProofVerifier {

    /// @notice Se true, accetta tutte le prove con struttura valida (per testing)
    bool public immutable testMode;

    /// @notice Indirizzo del verifier Groth16 (se non in test mode)
    address public immutable groth16Verifier;

    // ============ CONSTANTS ============
    
    /// @notice Indice del domain nei public signals
    uint256 public constant DOMAIN_SIGNAL_INDEX = 0;
    
    /// @notice Indice del nullifier nei public signals
    uint256 public constant NULLIFIER_SIGNAL_INDEX = 1;
    
    /// @notice Indice di inizio delle keyword hashes nei public signals
    uint256 public constant KEYWORDS_START_INDEX = 2;

    // ============ CONSTRUCTOR ============

    /// @notice Inizializza il verifier
    /// @param _groth16Verifier Indirizzo del verifier Groth16, o address(0) per test mode
    constructor(address _groth16Verifier) {
        if (_groth16Verifier == address(0)) {
            testMode = true;
        } else {
            testMode = false;
            groth16Verifier = _groth16Verifier;
        }
    }

    // ============ VERIFICATION FUNCTIONS ============

    /// @inheritdoc IProofVerifier
    function verifyProof(BountyLib.ProofData calldata proofData) external view override returns (bool) {
        if (testMode) {
            // In test mode, verifica solo che la struttura sia valida
            return _hasValidStructure(proofData);
        }

        // In produzione, chiama il verifier Groth16 reale
        // TODO: Implementare chiamata al verifier reale quando disponibile
        return false;
    }

    /// @inheritdoc IProofVerifier
    function verifyDomainMatch(
        string calldata provenDomain, 
        string calldata expectedDomain
    ) external pure override returns (bool) {
        // Confronto case-insensitive dei domini
        return _stringsEqualCaseInsensitive(provenDomain, expectedDomain);
    }

    /// @inheritdoc IProofVerifier
    function verifyKeywords(
        bytes32[] calldata providedHashes,
        bytes32[] calldata requiredHashes
    ) external pure override returns (bool) {
        // Se non ci sono keyword richieste, la verifica passa sempre
        if (requiredHashes.length == 0) {
            return true;
        }

        // Ogni keyword richiesta deve essere presente nelle keyword fornite
        for (uint256 i = 0; i < requiredHashes.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < providedHashes.length; j++) {
                if (requiredHashes[i] == providedHashes[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }

    // ============ EXTRACTION FUNCTIONS ============

    /// @inheritdoc IProofVerifier
    function extractDomainHash(uint256[] calldata publicSignals) external pure override returns (uint256) {
        if (publicSignals.length == 0) {
            return 0;
        }
        return publicSignals[DOMAIN_SIGNAL_INDEX];
    }

    /// @inheritdoc IProofVerifier
    function extractNullifier(uint256[] calldata publicSignals) external pure override returns (bytes32) {
        if (publicSignals.length < 2) {
            return bytes32(0);
        }
        // Combina i primi due signals per creare un nullifier unico
        return keccak256(abi.encodePacked(publicSignals[0], publicSignals[1]));
    }

    /// @inheritdoc IProofVerifier
    function extractKeywordHashes(uint256[] calldata publicSignals) external pure override returns (bytes32[] memory) {
        if (publicSignals.length <= KEYWORDS_START_INDEX) {
            return new bytes32[](0);
        }
        
        uint256 keywordCount = publicSignals.length - KEYWORDS_START_INDEX;
        bytes32[] memory hashes = new bytes32[](keywordCount);
        
        for (uint256 i = 0; i < keywordCount; i++) {
            hashes[i] = bytes32(publicSignals[KEYWORDS_START_INDEX + i]);
        }
        
        return hashes;
    }

    // ============ INTERNAL FUNCTIONS ============

    /// @notice Verifica che la prova abbia una struttura valida
    /// @param proofData I dati della prova
    /// @return true se la struttura è valida
    function _hasValidStructure(BountyLib.ProofData calldata proofData) internal pure returns (bool) {
        // Verifica che pi_a non sia zero
        if (proofData.pi_a[0] == 0 && proofData.pi_a[1] == 0) {
            return false;
        }

        // Verifica che ci siano public signals
        if (proofData.publicSignals.length == 0) {
            return false;
        }

        return true;
    }

    /// @notice Confronta due stringhe in modo case-insensitive
    /// @param a Prima stringa
    /// @param b Seconda stringa
    /// @return true se le stringhe sono uguali (case-insensitive)
    function _stringsEqualCaseInsensitive(
        string calldata a, 
        string calldata b
    ) internal pure returns (bool) {
        bytes memory aBytes = bytes(a);
        bytes memory bBytes = bytes(b);
        
        if (aBytes.length != bBytes.length) {
            return false;
        }
        
        for (uint256 i = 0; i < aBytes.length; i++) {
            bytes1 charA = aBytes[i];
            bytes1 charB = bBytes[i];
            
            // Converti in lowercase se uppercase
            if (charA >= 0x41 && charA <= 0x5A) {
                charA = bytes1(uint8(charA) + 32);
            }
            if (charB >= 0x41 && charB <= 0x5A) {
                charB = bytes1(uint8(charB) + 32);
            }
            
            if (charA != charB) {
                return false;
            }
        }
        
        return true;
    }

    /// @notice Calcola l'hash di una keyword (helper per testing)
    /// @param keyword La keyword in chiaro
    /// @return L'hash della keyword
    function hashKeyword(string calldata keyword) external pure returns (bytes32) {
        return BountyLib.hashKeyword(keyword);
    }
}
