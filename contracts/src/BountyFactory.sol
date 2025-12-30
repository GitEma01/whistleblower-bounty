// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BountyLib} from "./libraries/BountyLib.sol";
import {IBountyFactory} from "./interfaces/IBountyFactory.sol";
import {BountyEscrow} from "./BountyEscrow.sol";
import {IProofVerifier} from "./interfaces/IProofVerifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BountyFactory
/// @notice Contratto factory per creare e gestire bounty di whistleblowing
/// @dev Deploya un nuovo BountyEscrow per ogni bounty creato
contract BountyFactory is IBountyFactory, Ownable {
    
    // ============ STATE VARIABLES ============

    /// @notice Contatore dei bounty creati
    uint256 private _bountyCounter;

    /// @notice Riferimento al contratto ProofVerifier
    address public proofVerifier;

    /// @notice Mapping bountyId => indirizzo escrow
    mapping(uint256 => address) private _bountyEscrows;

    /// @notice Array di tutti i bounty ID (per iterazione)
    uint256[] private _allBountyIds;

    /// @notice Mapping per verificare se un indirizzo è un escrow valido
    mapping(address => bool) public isValidEscrow;

    // ============ ERRORS ============

    error InvalidDeadline();
    error InvalidReward();
    error InvalidDomain();
    error BountyNotFound();
    error InvalidProofVerifier();

    // ============ CONSTRUCTOR ============

    /// @notice Inizializza la factory
    /// @param _proofVerifier Indirizzo del contratto ProofVerifier
    constructor(address _proofVerifier) Ownable(msg.sender) {
        if (_proofVerifier == address(0)) revert InvalidProofVerifier();
        proofVerifier = _proofVerifier;
    }

    // ============ EXTERNAL FUNCTIONS ============

    /// @inheritdoc IBountyFactory
    function createBounty(
        string calldata domain,
        string calldata description,
        uint256 deadline
    ) external payable returns (uint256 bountyId, address escrowAddress) {
        // Validazioni
        if (bytes(domain).length == 0) revert InvalidDomain();
        if (msg.value < BountyLib.MIN_REWARD) revert InvalidReward();
        if (deadline <= block.timestamp + BountyLib.MIN_BOUNTY_DURATION) revert InvalidDeadline();
        if (deadline > block.timestamp + BountyLib.MAX_BOUNTY_DURATION) revert InvalidDeadline();

        // Incrementa il contatore
        bountyId = _bountyCounter++;

        // Deploya il nuovo contratto escrow
        BountyEscrow escrow = new BountyEscrow{value: msg.value}(
            bountyId,
            domain,
            description,
            deadline,
            msg.sender,
            proofVerifier
        );

        escrowAddress = address(escrow);

        // Salva il riferimento
        _bountyEscrows[bountyId] = escrowAddress;
        _allBountyIds.push(bountyId);
        isValidEscrow[escrowAddress] = true;

        emit BountyCreated(
            bountyId,
            msg.sender,
            escrowAddress,
            domain,
            msg.value,
            deadline
        );

        return (bountyId, escrowAddress);
    }

    /// @inheritdoc IBountyFactory
    function getBounty(uint256 bountyId) external view returns (BountyLib.BountyDetails memory details) {
        address escrowAddress = _bountyEscrows[bountyId];
        if (escrowAddress == address(0)) revert BountyNotFound();
        
        BountyEscrow escrow = BountyEscrow(payable(escrowAddress));
        return escrow.getBountyDetails();
    }

    /// @inheritdoc IBountyFactory
    function getEscrowAddress(uint256 bountyId) external view returns (address) {
        address escrowAddress = _bountyEscrows[bountyId];
        if (escrowAddress == address(0)) revert BountyNotFound();
        return escrowAddress;
    }

    /// @inheritdoc IBountyFactory
    function getBountyCount() external view returns (uint256) {
        return _bountyCounter;
    }

    /// @inheritdoc IBountyFactory
    function getActiveBounties() external view returns (uint256[] memory) {
        // Prima conta quanti bounty attivi ci sono
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _allBountyIds.length; i++) {
            address escrowAddress = _bountyEscrows[_allBountyIds[i]];
            BountyEscrow escrow = BountyEscrow(payable(escrowAddress));
            if (escrow.isActive()) {
                activeCount++;
            }
        }

        // Crea l'array della dimensione giusta
        uint256[] memory activeBounties = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _allBountyIds.length; i++) {
            address escrowAddress = _bountyEscrows[_allBountyIds[i]];
            BountyEscrow escrow = BountyEscrow(payable(escrowAddress));
            if (escrow.isActive()) {
                activeBounties[index] = _allBountyIds[i];
                index++;
            }
        }

        return activeBounties;
    }

    // ============ ADMIN FUNCTIONS ============

    /// @notice Aggiorna l'indirizzo del ProofVerifier
    /// @param _newProofVerifier Nuovo indirizzo del verifier
    /// @dev Solo l'owner può chiamare questa funzione
    function setProofVerifier(address _newProofVerifier) external onlyOwner {
        if (_newProofVerifier == address(0)) revert InvalidProofVerifier();
        proofVerifier = _newProofVerifier;
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Restituisce tutti i bounty ID
    /// @return Array di tutti i bounty ID
    function getAllBountyIds() external view returns (uint256[] memory) {
        return _allBountyIds;
    }

    /// @notice Restituisce i bounty creati da un indirizzo specifico
    /// @param creator L'indirizzo del creatore
    /// @return Array di bounty ID creati da quell'indirizzo
    function getBountiesByCreator(address creator) external view returns (uint256[] memory) {
        // Conta i bounty del creatore
        uint256 count = 0;
        for (uint256 i = 0; i < _allBountyIds.length; i++) {
            address escrowAddress = _bountyEscrows[_allBountyIds[i]];
            BountyEscrow escrow = BountyEscrow(payable(escrowAddress));
            BountyLib.BountyDetails memory details = escrow.getBountyDetails();
            if (details.creator == creator) {
                count++;
            }
        }

        // Popola l'array
        uint256[] memory creatorBounties = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _allBountyIds.length; i++) {
            address escrowAddress = _bountyEscrows[_allBountyIds[i]];
            BountyEscrow escrow = BountyEscrow(payable(escrowAddress));
            BountyLib.BountyDetails memory details = escrow.getBountyDetails();
            if (details.creator == creator) {
                creatorBounties[index] = _allBountyIds[i];
                index++;
            }
        }

        return creatorBounties;
    }

    /// @notice Restituisce informazioni aggregate sui bounty
    /// @return totalBounties Numero totale di bounty
    /// @return activeBounties Numero di bounty attivi
    /// @return totalValueLocked Valore totale bloccato nei bounty attivi
    function getStats() external view returns (
        uint256 totalBounties,
        uint256 activeBounties,
        uint256 totalValueLocked
    ) {
        totalBounties = _bountyCounter;
        
        for (uint256 i = 0; i < _allBountyIds.length; i++) {
            address escrowAddress = _bountyEscrows[_allBountyIds[i]];
            BountyEscrow escrow = BountyEscrow(payable(escrowAddress));
            
            if (escrow.isActive()) {
                activeBounties++;
                BountyLib.BountyDetails memory details = escrow.getBountyDetails();
                totalValueLocked += details.totalReward;
            }
        }

        return (totalBounties, activeBounties, totalValueLocked);
    }
}
