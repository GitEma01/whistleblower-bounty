// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/BountyLib.sol";

/// @title IBountyFactory
/// @notice Interfaccia per il contratto factory che crea e gestisce i bounty
interface IBountyFactory {

    // ============ EVENTS ============

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        address escrowAddress,
        string domain,
        uint256 reward,
        uint256 deadline,
        uint256 keywordCount
    );

    event BountyFunded(
        uint256 indexed bountyId,
        address indexed contributor,
        uint256 amount
    );

    // ============ FUNCTIONS ============

    /// @notice Crea un nuovo bounty
    /// @param domain Il dominio email richiesto
    /// @param description Descrizione del bounty
    /// @param deadline Timestamp di scadenza
    /// @param keywords Array di keywords richieste (in chiaro)
    /// @return bountyId L'ID del bounty creato
    /// @return escrowAddress L'indirizzo del contratto escrow
    function createBounty(
        string calldata domain,
        string calldata description,
        uint256 deadline,
        string[] calldata keywords
    ) external payable returns (uint256 bountyId, address escrowAddress);

    /// @notice Restituisce i dettagli di un bounty
    function getBounty(uint256 bountyId) external view returns (BountyLib.BountyDetails memory details);

    /// @notice Restituisce l'indirizzo escrow di un bounty
    function getEscrowAddress(uint256 bountyId) external view returns (address);

    /// @notice Restituisce il numero totale di bounty creati
    function getBountyCount() external view returns (uint256);

    /// @notice Restituisce tutti i bounty attivi
    function getActiveBounties() external view returns (uint256[] memory);
}
