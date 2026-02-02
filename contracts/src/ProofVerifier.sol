// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IProofVerifier.sol";
import "./libraries/BountyLib.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Interfaccia standard per i Verifier Groth16 generati da ZK Email Registry
/// @dev ZK Email registry verifiers use fixed-size uint256[N] for public signals,
///      where N varies per circuit (e.g. 7 for Gmail, 8 for Succinct).
///      We cannot use a Solidity interface here because the array size differs.
///      Instead, we use a low-level staticcall with manually encoded calldata.
///      The verifier function signature is: verify(uint256[2],uint256[2][2],uint256[2],uint256[N])
///      We encode pi_a, pi_b, pi_c as fixed arrays and publicSignals as a fixed array
///      by writing them directly into the ABI encoding (no length prefix, no offset).

/// @title ProofVerifier
/// @notice Router che indirizza le prove ZK ai verifier Groth16 corretti per ogni dominio
/// @dev Implementa il pattern Registry per gestire verifier multipli
/// @author Whistleblower Bounty Project - Blockchain Exam 2025
contract ProofVerifier is IProofVerifier, Ownable {

    // ============ STATE VARIABLES ============

    /// @notice Mapping: hash del dominio (lowercase) -> indirizzo del verifier Groth16
    mapping(bytes32 => address) public domainVerifiers;

    /// @notice Lista dei domini registrati (per enumerazione)
    string[] public registeredDomains;

    /// @notice Se true, accetta tutte le prove con struttura valida (per testing)
    bool public testMode;

    /// @notice Contatore delle prove verificate con successo
    uint256 public totalProofsVerified;

    /// @notice Contatore delle prove fallite
    uint256 public totalProofsFailed;

    // ============ CONSTANTS ============
    
    /// @notice Indice del domain nei public signals
    uint256 public constant DOMAIN_SIGNAL_INDEX = 0;
    
    /// @notice Indice del nullifier nei public signals
    uint256 public constant NULLIFIER_SIGNAL_INDEX = 1;
    
    /// @notice Indice di inizio delle keyword hashes nei public signals
    uint256 public constant KEYWORDS_START_INDEX = 2;

    // ============ EVENTS ============

    /// @notice Emesso quando il test mode viene cambiato
    event TestModeChanged(bool enabled, uint256 timestamp);

    /// @notice Emesso quando un verifier viene rimosso
    event VerifierRemoved(string domain, uint256 timestamp);

    // ============ ERRORS ============

    error VerifierNotFound(string domain);
    error InvalidVerifierAddress();
    error DomainAlreadyRegistered(string domain);
    error InvalidProofStructure();
    error UseVerifyProofForDomain();

    // ============ CONSTRUCTOR ============

    /// @notice Inizializza il ProofVerifier
    /// @param _testMode Se true, inizia in test mode (non verifica le prove crittograficamente)
    constructor(bool _testMode) Ownable(msg.sender) {
        testMode = _testMode;
        
        emit TestModeChanged(_testMode, block.timestamp);
    }

    // ============ ADMIN FUNCTIONS ============

    /// @inheritdoc IProofVerifier
    function registerVerifier(
        string calldata domain, 
        address verifierAddress
    ) external onlyOwner {
        if (verifierAddress == address(0)) revert InvalidVerifierAddress();
        
        string memory lowerDomain = _toLowerCase(domain);
        bytes32 domainHash = keccak256(abi.encodePacked(lowerDomain));
        
        // Se è un nuovo dominio, aggiungilo alla lista
        if (domainVerifiers[domainHash] == address(0)) {
            registeredDomains.push(lowerDomain);
        }
        
        domainVerifiers[domainHash] = verifierAddress;
        
        emit VerifierRegistered(
            lowerDomain,
            lowerDomain,
            verifierAddress,
            block.timestamp
        );
    }

    /// @notice Rimuove un verifier per un dominio
    /// @param domain Il dominio da rimuovere
    function removeVerifier(string calldata domain) external onlyOwner {
        string memory lowerDomain = _toLowerCase(domain);
        bytes32 domainHash = keccak256(abi.encodePacked(lowerDomain));
        
        if (domainVerifiers[domainHash] == address(0)) {
            revert VerifierNotFound(domain);
        }
        
        delete domainVerifiers[domainHash];
        
        emit VerifierRemoved(lowerDomain, block.timestamp);
    }

    /// @notice Abilita/disabilita test mode
    /// @param _testMode true per abilitare, false per disabilitare
    function setTestMode(bool _testMode) external onlyOwner {
        testMode = _testMode;
        emit TestModeChanged(_testMode, block.timestamp);
    }

    // ============ VERIFICATION FUNCTIONS ============

    /// @inheritdoc IProofVerifier
    /// @dev Legacy function - solo per test mode. In produzione usa verifyProofForDomain
    function verifyProof(
        BountyLib.ProofData calldata proofData
    ) external view override returns (bool) {
        if (testMode) {
            return _hasValidStructure(proofData);
        }
        
        // In produzione, forza l'uso di verifyProofForDomain
        revert UseVerifyProofForDomain();
    }

    /// @inheritdoc IProofVerifier
    /// @notice Verifica una prova ZK per un dominio specifico ed emette eventi per BaseScan
    function verifyProofForDomain(
        BountyLib.ProofData calldata proofData,
        string calldata domain,
        address prover,
        address _verifierAddress // 
    ) external override returns (bool) {        
        string memory lowerDomain = _toLowerCase(domain);
        bytes32 nullifier = _extractNullifier(proofData.publicSignals);
        
        // ===== TEST MODE =====
        if (testMode) {
            if (!_hasValidStructure(proofData)) {
                totalProofsFailed++;
                
                emit ProofVerificationFailed(
                    lowerDomain,
                    lowerDomain,
                    prover,
                    "Invalid proof structure (test mode)",
                    block.timestamp
                );
                
                return false;
            }
            
            totalProofsVerified++;
            
            // Evento visibile su BaseScan!
            emit ProofVerified(
                lowerDomain,
                lowerDomain,
                prover,
                nullifier,
                block.timestamp,
                unicode"✅ ZK Proof Verified (Test Mode) - Whistleblower Bounty"
            );
            
            return true;
        }
        
        // ===== PRODUCTION MODE =====
        
        

        // MODIFICA: Usiamo direttamente l'indirizzo passato, ignorando il mapping interno
        // Questo permette a BountyEscrow di specificare il verifier corretto (Gmail o Succinct)
        address verifier = _verifierAddress; 

        // Controllo di sicurezza
        if (verifier == address(0)) {
            totalProofsFailed++;

            emit ProofVerificationFailed(
                lowerDomain,
                lowerDomain,
                prover,
                "Verifier address is zero", // Messaggio aggiornato
                block.timestamp
            );
            
            // Rimuoviamo il revert specifico VerifierNotFound per usare un errore più generico o revert
            revert InvalidVerifierAddress();
        }
        
        // Call the Groth16 verifier using low-level staticcall.
        // ZK Email registry verifiers expect fixed-size uint256[N] for public signals,
        // so the function selector depends on N. We compute the selector dynamically
        // and encode the public signals as a fixed-size array (no length prefix/offset).
        bool isValid;
        {
            uint256 n = proofData.publicSignals.length;

            // Build the function signature string: "verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[N])"
            // ZK Email registry verifiers use "verifyProof" and return a bool.
            bytes memory sig = abi.encodePacked(
                "verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[",
                _uintToString(n),
                "])"
            );
            bytes4 selector = bytes4(keccak256(sig));

            // Encode calldata: selector + pi_a(2) + pi_b(4) + pi_c(2) + pubSignals(N)
            // All values are uint256, encoded as 32-byte words with no offsets (all fixed-size).
            bytes memory payload = abi.encodePacked(selector);
            // pi_a[0], pi_a[1]
            payload = abi.encodePacked(payload, proofData.pi_a[0], proofData.pi_a[1]);
            // pi_b[0][0], pi_b[0][1], pi_b[1][0], pi_b[1][1]
            payload = abi.encodePacked(payload, proofData.pi_b[0][0], proofData.pi_b[0][1], proofData.pi_b[1][0], proofData.pi_b[1][1]);
            // pi_c[0], pi_c[1]
            payload = abi.encodePacked(payload, proofData.pi_c[0], proofData.pi_c[1]);
            // publicSignals[0..N-1]
            for (uint256 i = 0; i < n; i++) {
                payload = abi.encodePacked(payload, proofData.publicSignals[i]);
            }

            // The verifyProof() function returns a bool.
            (bool success, bytes memory returnData) = verifier.staticcall(payload);
            if (success && returnData.length >= 32) {
                isValid = abi.decode(returnData, (bool));
            } else {
                isValid = false;
            }
        }
        
        if (isValid) {
            totalProofsVerified++;
            
            // 🎉 Evento visibile su BaseScan per verifica riuscita!
            emit ProofVerified(
                lowerDomain,
                lowerDomain,
                prover,
                nullifier,
                block.timestamp,
                unicode"🔐 ZK Email Proof Verified On-Chain! Whistleblower identity protected by zero-knowledge cryptography."
            );
        } else {
            totalProofsFailed++;
            
            emit ProofVerificationFailed(
                lowerDomain,
                lowerDomain,
                prover,
                "Groth16 verification failed - invalid proof",
                block.timestamp
            );
        }
        
        return isValid;
    }

    // ============ VIEW FUNCTIONS ============

    /// @inheritdoc IProofVerifier
    function getVerifier(string calldata domain) external view override returns (address) {
        string memory lowerDomain = _toLowerCase(domain);
        bytes32 domainHash = keccak256(abi.encodePacked(lowerDomain));
        return domainVerifiers[domainHash];
    }

    /// @inheritdoc IProofVerifier
    function isDomainSupported(string calldata domain) external view override returns (bool) {
        string memory lowerDomain = _toLowerCase(domain);
        bytes32 domainHash = keccak256(abi.encodePacked(lowerDomain));
        return domainVerifiers[domainHash] != address(0);
    }

    /// @notice Restituisce tutti i domini registrati
    function getRegisteredDomains() external view returns (string[] memory) {
        return registeredDomains;
    }

    /// @notice Restituisce le statistiche del verifier
    function getStats() external view returns (
        uint256 domainsRegistered,
        uint256 proofsVerified,
        uint256 proofsFailed,
        bool isTestMode
    ) {
        return (
            registeredDomains.length,
            totalProofsVerified,
            totalProofsFailed,
            testMode
        );
    }

    /// @inheritdoc IProofVerifier
    function verifyDomainMatch(
        string calldata provenDomain, 
        string calldata expectedDomain
    ) external pure override returns (bool) {
        return keccak256(abi.encodePacked(_toLowerCase(provenDomain))) == 
               keccak256(abi.encodePacked(_toLowerCase(expectedDomain)));
    }

    /// @inheritdoc IProofVerifier
    function verifyKeywords(
        bytes32[] calldata providedHashes,
        bytes32[] calldata requiredHashes
    ) external pure override returns (bool) {
        if (requiredHashes.length == 0) return true;

        for (uint256 i = 0; i < requiredHashes.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < providedHashes.length; j++) {
                if (requiredHashes[i] == providedHashes[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    /// @inheritdoc IProofVerifier
    function extractDomainHash(uint256[] calldata publicSignals) external pure override returns (uint256) {
        if (publicSignals.length == 0) return 0;
        return publicSignals[DOMAIN_SIGNAL_INDEX];
    }

    /// @inheritdoc IProofVerifier
    function extractNullifier(uint256[] calldata publicSignals) external pure override returns (bytes32) {
        return _extractNullifier(publicSignals);
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

    /// @notice Calcola l'hash di una keyword (helper per testing)
    /// @param keyword La keyword in chiaro
    /// @return L'hash della keyword
    function hashKeyword(string calldata keyword) external pure returns (bytes32) {
        return BountyLib.hashKeyword(keyword);
    }

    // ============ INTERNAL FUNCTIONS ============

    /// @notice Verifica che la prova abbia una struttura valida
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

    /// @notice Estrae il nullifier dai public signals
    function _extractNullifier(uint256[] calldata publicSignals) internal pure returns (bytes32) {
        if (publicSignals.length < 2) return bytes32(0);
        return keccak256(abi.encodePacked(publicSignals[0], publicSignals[1]));
    }

    /// @notice Converts a uint to its decimal string representation
    function _uintToString(uint256 value) internal pure returns (bytes memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return buffer;
    }

    /// @notice Converte una stringa in lowercase
    /// @dev Funziona sia con memory che calldata grazie alla conversione implicita
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
