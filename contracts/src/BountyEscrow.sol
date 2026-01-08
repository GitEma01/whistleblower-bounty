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

    /// @notice Dettagli base del bounty
    uint256 public bountyId;
    string public domain;
    string public description;
    uint256 public totalReward;
    uint256 public deadline;
    BountyLib.BountyStatus public status;
    address public creator;
    uint256 public createdAt;

    /// @notice Keywords in chiaro (per lettura frontend)
    string[] private _keywords;

    /// @notice Keywords hashate (per verifica on-chain)
    bytes32[] private _hashedKeywords;

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
    error DomainMismatch();
    error KeywordsMismatch();

    // ============ MODIFIERS ============

    modifier onlyWhenOpen() {
        if (status != BountyLib.BountyStatus.OPEN) revert BountyNotOpen();
        if (block.timestamp >= deadline) revert BountyExpired();
        _;
    }

    modifier onlyClaimant() {
        if (msg.sender != claimInfo.claimant) revert NotClaimant();
        _;
    }

    // ============ CONSTRUCTOR ============

    /// @notice Inizializza il contratto escrow
    constructor(
        uint256 _id,
        string memory _domain,
        string memory _description,
        uint256 _deadline,
        address _creator,
        address _proofVerifier,
        string[] memory _keywordsInput
    ) payable {
        require(_deadline > block.timestamp + BountyLib.MIN_BOUNTY_DURATION, "Deadline too soon");
        require(_deadline < block.timestamp + BountyLib.MAX_BOUNTY_DURATION, "Deadline too far");
        require(msg.value >= BountyLib.MIN_REWARD, "Reward too low");
        require(bytes(_domain).length > 0, "Domain required");
        require(_keywordsInput.length <= BountyLib.MAX_KEYWORDS, "Too many keywords");

        factory = msg.sender;
        proofVerifier = IProofVerifier(_proofVerifier);

        bountyId = _id;
        domain = _domain;
        description = _description;
        totalReward = msg.value;
        deadline = _deadline;
        status = BountyLib.BountyStatus.OPEN;
        creator = _creator;
        createdAt = block.timestamp;

        // Salva keywords in chiaro e calcola hash
        for (uint256 i = 0; i < _keywordsInput.length; i++) {
            _keywords.push(_keywordsInput[i]);
            _hashedKeywords.push(BountyLib.hashKeyword(_keywordsInput[i]));
        }

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
        totalReward += msg.value;

        emit FundsAdded(msg.sender, msg.value);
    }

    /// @inheritdoc IBountyEscrow
    function submitProof(
        BountyLib.ProofData calldata proofData,
        string calldata provenDomain,
        bytes32[] calldata keywordHashes
    ) external onlyWhenOpen nonReentrant {
        // 1. Verifica la prova ZK
        bool isValid = proofVerifier.verifyProof(proofData);
        if (!isValid) revert InvalidProof();

        // 2. Verifica il dominio (case-insensitive)
        if (!_domainsMatch(provenDomain, domain)) revert DomainMismatch();

        // 3. Verifica le keywords (se richieste)
        if (_hashedKeywords.length > 0) {
            if (!_verifyKeywordHashes(keywordHashes)) revert KeywordsMismatch();
        }

        // 4. Estrai e verifica il nullifier
        bytes32 nullifier = proofVerifier.extractNullifier(proofData.publicSignals);
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();

        // 5. Registra il nullifier come usato
        usedNullifiers[nullifier] = true;

        // 6. Aggiorna lo stato
        status = BountyLib.BountyStatus.PENDING_CLAIM;

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
        if (status != BountyLib.BountyStatus.PENDING_CLAIM) revert InvalidStatus();
        if (block.timestamp < claimInfo.disputeDeadline) revert DisputePeriodNotOver();

        status = BountyLib.BountyStatus.CLAIMED;
        uint256 reward = totalReward;

        (bool success, ) = payable(claimInfo.claimant).call{value: reward}("");
        if (!success) revert TransferFailed();

        emit RewardClaimed(claimInfo.claimant, reward);
    }

    /// @inheritdoc IBountyEscrow
    function refund() external nonReentrant {
        if (status != BountyLib.BountyStatus.OPEN) revert InvalidStatus();
        if (block.timestamp < deadline) revert BountyNotExpired();

        uint256 contribution = contributions[msg.sender];
        if (contribution == 0) revert NoContribution();

        contributions[msg.sender] = 0;

        bool allRefunded = true;
        for (uint256 i = 0; i < contributors.length; i++) {
            if (contributions[contributors[i]] > 0) {
                allRefunded = false;
                break;
            }
        }

        if (allRefunded) {
            status = BountyLib.BountyStatus.EXPIRED;
        }

        (bool success, ) = payable(msg.sender).call{value: contribution}("");
        if (!success) revert TransferFailed();

        emit RefundProcessed(msg.sender, contribution);
    }

    /// @inheritdoc IBountyEscrow
    function openDispute(string calldata reason) external {
        if (status != BountyLib.BountyStatus.PENDING_CLAIM) revert InvalidStatus();
        if (block.timestamp >= claimInfo.disputeDeadline) revert DisputePeriodOver();
        if (contributions[msg.sender] == 0) revert NoContribution();

        status = BountyLib.BountyStatus.DISPUTED;

        emit DisputeOpened(msg.sender, reason);
    }

    // ============ VIEW FUNCTIONS ============

    /// @inheritdoc IBountyEscrow
    function getBountyDetails() external view returns (BountyLib.BountyDetails memory) {
        return BountyLib.BountyDetails({
            id: bountyId,
            domain: domain,
            description: description,
            totalReward: totalReward,
            deadline: deadline,
            status: status,
            creator: creator,
            createdAt: createdAt,
            keywords: _keywords,
            hashedKeywords: _hashedKeywords
        });
    }

    /// @inheritdoc IBountyEscrow
    function getClaimInfo() external view returns (BountyLib.ClaimInfo memory) {
        return claimInfo;
    }

    /// @inheritdoc IBountyEscrow
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }

    /// @notice Restituisce le keywords in chiaro
    function getKeywords() external view returns (string[] memory) {
        return _keywords;
    }

    /// @notice Restituisce gli hash delle keywords
    function getHashedKeywords() external view returns (bytes32[] memory) {
        return _hashedKeywords;
    }

    /// @notice Restituisce il numero di keywords richieste
    function getKeywordCount() external view returns (uint256) {
        return _keywords.length;
    }

    /// @notice Restituisce la lista dei contributori
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    /// @notice Restituisce il contributo di un indirizzo specifico
    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

    /// @notice Verifica se il bounty è ancora attivo
    function isActive() external view returns (bool) {
        return status == BountyLib.BountyStatus.OPEN &&
               block.timestamp < deadline;
    }

    // ============ INTERNAL FUNCTIONS ============

    /// @notice Confronta due domini in modo case-insensitive
    function _domainsMatch(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(_toLowerCase(a))) == 
               keccak256(abi.encodePacked(_toLowerCase(b)));
    }

    /// @notice Converte una stringa in lowercase
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

    /// @notice Verifica che tutti gli hash richiesti siano presenti
    function _verifyKeywordHashes(bytes32[] calldata providedHashes) internal view returns (bool) {
        // Ogni hash richiesto deve essere presente in providedHashes
        for (uint256 i = 0; i < _hashedKeywords.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < providedHashes.length; j++) {
                if (_hashedKeywords[i] == providedHashes[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    // ============ RECEIVE ============

    receive() external payable {
        if (status != BountyLib.BountyStatus.OPEN) revert BountyNotOpen();
        if (block.timestamp >= deadline) revert BountyExpired();

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }

        contributions[msg.sender] += msg.value;
        totalReward += msg.value;

        emit FundsAdded(msg.sender, msg.value);
    }
}
