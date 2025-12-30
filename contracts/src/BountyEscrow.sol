// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BountyLib} from "./libraries/BountyLib.sol";
import {IBountyEscrow} from "./interfaces/IBountyEscrow.sol";
import {IProofVerifier} from "./interfaces/IProofVerifier.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BountyEscrow
/// @notice Gestisce i fondi e il ciclo di vita di un singolo bounty
/// @dev Ogni bounty ha il proprio contratto escrow deployato dalla factory
contract BountyEscrow is IBountyEscrow, ReentrancyGuard {
    
    // ============ STATE VARIABLES ============

    /// @notice Dettagli del bounty
    BountyLib.BountyDetails public bountyDetails;

    /// @notice Informazioni sul claim corrente
    BountyLib.ClaimInfo public claimInfo;

    /// @notice Riferimento al contratto factory
    address public immutable factory;

    /// @notice Riferimento al contratto verifier
    IProofVerifier public immutable proofVerifier;

    /// @notice Mapping dei contributori e i loro importi
    mapping(address => uint256) public contributions;

    /// @notice Lista dei contributori
    address[] public contributors;

    /// @notice Mapping dei nullifier già utilizzati
    mapping(bytes32 => bool) public usedNullifiers;

    // ============ ERRORS ============

    error BountyNotOpen();
    error BountyExpired();
    error BountyNotExpired();
    error InvalidAmount();
    error InvalidProof();
    error NullifierAlreadyUsed();
    error NotClaimant();
    error DisputePeriodNotOver();
    error DisputePeriodOver();
    error AlreadyClaimed();
    error NoContribution();
    error TransferFailed();
    error InvalidStatus();

    // ============ MODIFIERS ============

    modifier onlyWhenOpen() {
        if (bountyDetails.status != BountyLib.BountyStatus.OPEN) revert BountyNotOpen();
        if (block.timestamp >= bountyDetails.deadline) revert BountyExpired();
        _;
    }

    modifier onlyClaimant() {
        if (msg.sender != claimInfo.claimant) revert NotClaimant();
        _;
    }

    // ============ CONSTRUCTOR ============

    /// @notice Inizializza il contratto escrow
    /// @param _id ID del bounty
    /// @param _domain Dominio email richiesto
    /// @param _description Descrizione del bounty
    /// @param _deadline Timestamp di scadenza
    /// @param _creator Creatore del bounty
    /// @param _proofVerifier Indirizzo del contratto verifier
    constructor(
        uint256 _id,
        string memory _domain,
        string memory _description,
        uint256 _deadline,
        address _creator,
        address _proofVerifier
    ) payable {
        require(_deadline > block.timestamp + BountyLib.MIN_BOUNTY_DURATION, "Deadline too soon");
        require(_deadline < block.timestamp + BountyLib.MAX_BOUNTY_DURATION, "Deadline too far");
        require(msg.value >= BountyLib.MIN_REWARD, "Reward too low");
        require(bytes(_domain).length > 0, "Domain required");

        factory = msg.sender;
        proofVerifier = IProofVerifier(_proofVerifier);

        bountyDetails = BountyLib.BountyDetails({
            id: _id,
            domain: _domain,
            description: _description,
            totalReward: msg.value,
            deadline: _deadline,
            status: BountyLib.BountyStatus.OPEN,
            creator: _creator,
            createdAt: block.timestamp
        });

        // Il creatore è il primo contributore
        contributions[_creator] = msg.value;
        contributors.push(_creator);

        emit FundsAdded(_creator, msg.value);
    }

    // ============ EXTERNAL FUNCTIONS ============

    /// @inheritdoc IBountyEscrow
    function contribute() external payable onlyWhenOpen {
        if (msg.value == 0) revert InvalidAmount();

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }
        
        contributions[msg.sender] += msg.value;
        bountyDetails.totalReward += msg.value;

        emit FundsAdded(msg.sender, msg.value);
    }

    /// @inheritdoc IBountyEscrow
    function submitProof(BountyLib.ProofData calldata proofData) external onlyWhenOpen nonReentrant {
        // 1. Verifica la prova ZK
        bool isValid = proofVerifier.verifyProof(proofData);
        if (!isValid) revert InvalidProof();

        // 2. Estrai e verifica il nullifier
        bytes32 nullifier = proofVerifier.extractNullifier(proofData.publicSignals);
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();

        // 3. Verifica il dominio
        uint256 domainHash = proofVerifier.extractDomainHash(proofData.publicSignals);
        bool domainValid = proofVerifier.verifyDomain(domainHash, bountyDetails.domain);
        if (!domainValid) revert InvalidProof();

        // 4. Registra il nullifier come usato
        usedNullifiers[nullifier] = true;

        // 5. Aggiorna lo stato
        bountyDetails.status = BountyLib.BountyStatus.PENDING_CLAIM;
        
        claimInfo = BountyLib.ClaimInfo({
            claimant: msg.sender,
            claimTimestamp: block.timestamp,
            nullifier: nullifier,
            disputeDeadline: block.timestamp + BountyLib.DISPUTE_PERIOD
        });

        emit ProofSubmitted(msg.sender, nullifier);
    }

    /// @inheritdoc IBountyEscrow
    function claimReward() external onlyClaimant nonReentrant {
        if (bountyDetails.status != BountyLib.BountyStatus.PENDING_CLAIM) revert InvalidStatus();
        if (block.timestamp < claimInfo.disputeDeadline) revert DisputePeriodNotOver();

        // Aggiorna lo stato prima del trasferimento (pattern checks-effects-interactions)
        bountyDetails.status = BountyLib.BountyStatus.CLAIMED;
        uint256 reward = bountyDetails.totalReward;

        // Trasferisci la ricompensa
        (bool success, ) = payable(claimInfo.claimant).call{value: reward}("");
        if (!success) revert TransferFailed();

        emit RewardClaimed(claimInfo.claimant, reward);
    }

    /// @inheritdoc IBountyEscrow
    function refund() external nonReentrant {
        // Verifica che il bounty sia scaduto e ancora OPEN
        if (bountyDetails.status != BountyLib.BountyStatus.OPEN) revert InvalidStatus();
        if (block.timestamp < bountyDetails.deadline) revert BountyNotExpired();

        uint256 contribution = contributions[msg.sender];
        if (contribution == 0) revert NoContribution();

        // Aggiorna lo stato prima del trasferimento
        contributions[msg.sender] = 0;
        
        // Se è l'ultimo rimborso, marca come expired
        bool allRefunded = true;
        for (uint256 i = 0; i < contributors.length; i++) {
            if (contributions[contributors[i]] > 0) {
                allRefunded = false;
                break;
            }
        }
        
        if (allRefunded) {
            bountyDetails.status = BountyLib.BountyStatus.EXPIRED;
        }

        // Trasferisci il rimborso
        (bool success, ) = payable(msg.sender).call{value: contribution}("");
        if (!success) revert TransferFailed();

        emit RefundProcessed(msg.sender, contribution);
    }

    /// @inheritdoc IBountyEscrow
    function openDispute(string calldata reason) external {
        if (bountyDetails.status != BountyLib.BountyStatus.PENDING_CLAIM) revert InvalidStatus();
        if (block.timestamp >= claimInfo.disputeDeadline) revert DisputePeriodOver();

        // Solo i contributori possono aprire dispute
        if (contributions[msg.sender] == 0) revert NoContribution();

        bountyDetails.status = BountyLib.BountyStatus.DISPUTED;

        emit DisputeOpened(msg.sender, reason);
    }

    // ============ VIEW FUNCTIONS ============

    /// @inheritdoc IBountyEscrow
    function getBountyDetails() external view returns (BountyLib.BountyDetails memory) {
        return bountyDetails;
    }

    /// @inheritdoc IBountyEscrow
    function getClaimInfo() external view returns (BountyLib.ClaimInfo memory) {
        return claimInfo;
    }

    /// @inheritdoc IBountyEscrow
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }

    /// @notice Restituisce la lista dei contributori
    /// @return Array degli indirizzi dei contributori
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    /// @notice Restituisce il contributo di un indirizzo specifico
    /// @param contributor L'indirizzo del contributore
    /// @return L'importo contribuito
    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

    /// @notice Verifica se il bounty è ancora attivo
    /// @return true se il bounty è aperto e non scaduto
    function isActive() external view returns (bool) {
        return bountyDetails.status == BountyLib.BountyStatus.OPEN && 
               block.timestamp < bountyDetails.deadline;
    }

    // ============ RECEIVE ============

    /// @notice Permette di ricevere ETH direttamente (viene contato come contribuzione del sender)
    receive() external payable {
        if (bountyDetails.status != BountyLib.BountyStatus.OPEN) revert BountyNotOpen();
        if (block.timestamp >= bountyDetails.deadline) revert BountyExpired();
        
        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }
        
        contributions[msg.sender] += msg.value;
        bountyDetails.totalReward += msg.value;

        emit FundsAdded(msg.sender, msg.value);
    }
}
