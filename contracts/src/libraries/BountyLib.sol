// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BountyLib
/// @notice Libreria con strutture dati condivise per il sistema di bounty
library BountyLib {
    
    /// @notice Stati possibili di un bounty
    enum BountyStatus {
        OPEN,           // In attesa di prove
        PENDING_CLAIM,  // Prova sottomessa, in periodo di disputa
        CLAIMED,        // Ricompensa pagata
        EXPIRED,        // Scaduto senza prove valide
        DISPUTED,       // In fase di arbitrato
        CANCELLED       // Cancellato dal creatore
    }

    /// @notice Dettagli completi di un bounty
    struct BountyDetails {
        uint256 id;                 // ID univoco del bounty
        string domain;              // Dominio email richiesto (es. "enron.com")
        string description;         // Descrizione leggibile del bounty
        uint256 totalReward;        // Somma totale delle ricompense
        uint256 deadline;           // Timestamp di scadenza
        BountyStatus status;        // Stato corrente
        address creator;            // Chi ha creato il bounty
        uint256 createdAt;          // Timestamp creazione
    }

    /// @notice Informazioni su un claim pendente
    struct ClaimInfo {
        address claimant;           // Chi ha sottomesso la prova
        uint256 claimTimestamp;     // Quando è stata sottomessa
        bytes32 nullifier;          // Nullifier della prova (anti-replay)
        uint256 disputeDeadline;    // Fino a quando si può disputare
    }

    /// @notice Dati della prova ZK Groth16
    struct ProofData {
        uint256[2] pi_a;            // Parte A della proof
        uint256[2][2] pi_b;         // Parte B della proof
        uint256[2] pi_c;            // Parte C della proof
        uint256[] publicSignals;    // Segnali pubblici
    }

    /// @notice Durata del periodo di disputa (24 ore)
    uint256 constant DISPUTE_PERIOD = 24 hours;

    /// @notice Durata minima di un bounty (7 giorni)
    uint256 constant MIN_BOUNTY_DURATION = 7 days;

    /// @notice Durata massima di un bounty (365 giorni)
    uint256 constant MAX_BOUNTY_DURATION = 365 days;

    /// @notice Reward minimo per un bounty
    uint256 constant MIN_REWARD = 0.01 ether;
}
