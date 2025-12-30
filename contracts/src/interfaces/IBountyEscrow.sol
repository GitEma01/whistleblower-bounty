// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/BountyLib.sol";

/// @title IBountyEscrow
/// @notice Interfaccia per il contratto escrow che gestisce un singolo bounty
interface IBountyEscrow {
    
    // ============ EVENTS ============

    /// @notice Emesso quando vengono aggiunti fondi
    event FundsAdded(address indexed contributor, uint256 amount);

    /// @notice Emesso quando viene sottomessa una prova
    event ProofSubmitted(address indexed claimant, bytes32 nullifier);

    /// @notice Emesso quando la ricompensa viene reclamata
    event RewardClaimed(address indexed claimant, uint256 amount);

    /// @notice Emesso quando viene richiesto un rimborso
    event RefundProcessed(address indexed contributor, uint256 amount);

    /// @notice Emesso quando viene aperta una disputa
    event DisputeOpened(address indexed disputer, string reason);

    // ============ FUNCTIONS ============

    /// @notice Aggiunge fondi al bounty
    function contribute() external payable;

    /// @notice Sottomette una prova ZK per reclamare il bounty
    /// @param proofData I dati della prova Groth16
    function submitProof(BountyLib.ProofData calldata proofData) external;

    /// @notice Reclama la ricompensa dopo il periodo di disputa
    function claimReward() external;

    /// @notice Richiede rimborso se il bounty è scaduto
    function refund() external;

    /// @notice Apre una disputa sul claim corrente
    /// @param reason Motivazione della disputa
    function openDispute(string calldata reason) external;

    /// @notice Restituisce i dettagli del bounty
    /// @return I dettagli del bounty
    function getBountyDetails() external view returns (BountyLib.BountyDetails memory);

    /// @notice Restituisce le informazioni sul claim corrente
    /// @return Le informazioni sul claim
    function getClaimInfo() external view returns (BountyLib.ClaimInfo memory);

    /// @notice Verifica se un nullifier è già stato usato
    /// @param nullifier Il nullifier da verificare
    /// @return true se già usato, false altrimenti
    function isNullifierUsed(bytes32 nullifier) external view returns (bool);
}
