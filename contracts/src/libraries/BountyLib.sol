// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BountyLib
/// @notice Libreria con strutture dati e costanti condivise per il sistema di bounty
library BountyLib {

    // ============ CONSTANTS ============

    /// @notice Ricompensa minima per un bounty (0.01 ETH)
    uint256 public constant MIN_REWARD = 0.01 ether;

    /// @notice Durata minima di un bounty (7 giorni)
    uint256 public constant MIN_BOUNTY_DURATION = 7 days;

    /// @notice Durata massima di un bounty (365 giorni)
    uint256 public constant MAX_BOUNTY_DURATION = 365 days;

    /// @notice Periodo di disputa dopo la sottomissione della prova (24 ore)
    uint256 public constant DISPUTE_PERIOD = 5 minutes;

    /// @notice Numero massimo di keywords per bounty
    uint256 public constant MAX_KEYWORDS = 5;

    // ============ ENUMS ============

    /// @notice Stati possibili di un bounty
    enum BountyStatus {
        OPEN,           // 0: Bounty attivo, in attesa di prove
        PENDING_CLAIM,  // 1: Prova sottomessa, in periodo di disputa
        CLAIMED,        // 2: Ricompensa reclamata con successo
        EXPIRED,        // 3: Bounty scaduto senza prove valide
        DISPUTED,       // 4: Disputa aperta sul claim
        CANCELLED       // 5: Bounty cancellato dal creatore
    }

    // ============ STRUCTS ============

    /// @notice Dettagli completi di un bounty
    struct BountyDetails {
        uint256 id;
        string domain;
        string description;
        uint256 totalReward;
        uint256 deadline;
        BountyStatus status;
        address creator;
        uint256 createdAt;
        string[] keywords;          // Keywords in chiaro (per lettura frontend)
        bytes32[] hashedKeywords;   // Keywords hashate (per verifica on-chain)
    }

    /// @notice Informazioni sul claim di un bounty
    struct ClaimInfo {
        address claimant;
        uint256 claimTimestamp;
        bytes32 nullifier;
        uint256 disputeDeadline;
    }

    /// @notice Dati della prova ZK (formato Groth16)
    struct ProofData {
        uint256[2] pi_a;
        uint256[2][2] pi_b;
        uint256[2] pi_c;
        uint256[] publicSignals;
    }

    // ============ HELPER FUNCTIONS ============

    /// @notice Calcola l'hash di una keyword (lowercase)
    /// @param keyword La keyword in chiaro
    /// @return L'hash keccak256 della keyword in lowercase
    function hashKeyword(string memory keyword) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_toLowerCase(keyword)));
    }

    /// @notice Calcola gli hash di un array di keywords
    /// @param keywords Array di keywords in chiaro
    /// @return Array di hash
    function hashKeywords(string[] memory keywords) internal pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](keywords.length);
        for (uint256 i = 0; i < keywords.length; i++) {
            hashes[i] = hashKeyword(keywords[i]);
        }
        return hashes;
    }

    /// @notice Converte una stringa in lowercase
    /// @param str La stringa da convertire
    /// @return La stringa in lowercase
    function _toLowerCase(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
}

