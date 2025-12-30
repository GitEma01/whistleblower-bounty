// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/BountyLib.sol";

/// @title IBountyFactory
/// @notice Interfaccia per il contratto factory che crea e gestisce i bounty
interface IBountyFactory {
    
    // ============ EVENTS ============
    
    /// @notice Emesso quando viene creato un nuovo bounty
    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        address escrowAddress,
        string domain,
        uint256 reward,
        uint256 deadline
    );

    /// @notice Emesso quando un bounty viene finanziato ulteriormente
    event BountyFunded(
        uint256 indexed bountyId,
        address indexed contributor,
        uint256 amount
    );

    // ============ FUNCTIONS ============

    /// @notice Crea un nuovo bounty
    /// @param domain Il dominio email richiesto (es. "enron.com")
    /// @param description Descrizione del bounty
    /// @param deadline Timestamp di scadenza
    /// @return bountyId L'ID del bounty creato
    /// @return escrowAddress L'indirizzo del contratto escrow
    function createBounty(
        string calldata domain,
        string calldata description,
        uint256 deadline
    ) external payable returns (uint256 bountyId, address escrowAddress);

    /// @notice Restituisce i dettagli di un bounty
    /// @param bountyId L'ID del bounty
    /// @return details I dettagli del bounty
    function getBounty(uint256 bountyId) external view returns (BountyLib.BountyDetails memory details);

    /// @notice Restituisce l'indirizzo escrow di un bounty
    /// @param bountyId L'ID del bounty
    /// @return L'indirizzo del contratto escrow
    function getEscrowAddress(uint256 bountyId) external view returns (address);

    /// @notice Restituisce il numero totale di bounty creati
    /// @return Il contatore dei bounty
    function getBountyCount() external view returns (uint256);

    /// @notice Restituisce tutti i bounty attivi (status OPEN)
    /// @return Array di ID dei bounty attivi
    function getActiveBounties() external view returns (uint256[] memory);
}
