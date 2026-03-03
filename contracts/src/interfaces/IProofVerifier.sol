// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/BountyLib.sol";

/// @title IProofVerifier
/// @notice Interfaccia per il contratto che verifica le prove ZK
/// @dev Aggiornata per supportare verifica per dominio specifico
interface IProofVerifier {

    // ============ EVENTS ============

    /// @notice Emesso quando un verifier viene registrato per un dominio
    event VerifierRegistered(
        string indexed domainIndexed,
        string domain,
        address verifierAddress,
        uint256 timestamp
    );

    /// @notice Emesso quando una prova ZK viene verificata con successo
    event ProofVerified(
        string indexed domainIndexed,
        string domain,
        address indexed prover,
        bytes32 nullifier,
        uint256 timestamp,
        string message
    );

    /// @notice Emesso quando una prova ZK fallisce la verifica
    event ProofVerificationFailed(
        string indexed domainIndexed,
        string domain,
        address indexed prover,
        string reason,
        uint256 timestamp
    );

    // ============ VERIFICATION FUNCTIONS ============

    /// @notice Verifica una prova ZK (legacy - solo test mode)
    /// @param proofData I dati della prova
    /// @return valid true se la prova è valida
    function verifyProof(BountyLib.ProofData calldata proofData) external view returns (bool valid);

    /// @notice Verifica una prova ZK per un dominio specifico
    /// @param proofData I dati della prova Groth16
    /// @param domain Il dominio email per cui verificare
    /// @param prover L'indirizzo di chi sottomette la prova
    /// @return valid true se la prova è valida
    function verifyProofForDomain(
        BountyLib.ProofData calldata proofData,
        string calldata domain,
        address prover,
	address _verifierAddress
    ) external returns (bool valid);

    // ============ DOMAIN MANAGEMENT ============

    /// @notice Registra un verifier Groth16 per un dominio
    /// @param domain Il dominio email (es. "gmail.com")
    /// @param verifierAddress L'indirizzo del contratto Groth16 Verifier
    function registerVerifier(string calldata domain, address verifierAddress) external;

    /// @notice Ottiene l'indirizzo del verifier per un dominio
    /// @param domain Il dominio da cercare
    /// @return L'indirizzo del verifier (address(0) se non registrato)
    function getVerifier(string calldata domain) external view returns (address);

    /// @notice Verifica se un dominio ha un verifier registrato
    /// @param domain Il dominio da verificare
    /// @return true se il dominio è supportato
    function isDomainSupported(string calldata domain) external view returns (bool);

    // ============ EXTRACTION FUNCTIONS ============

    /// @notice Estrae il domain hash dai public signals
    /// @param publicSignals I segnali pubblici della prova
    /// @return Il domain hash
    function extractDomainHash(uint256[] calldata publicSignals) external pure returns (uint256);

    /// @notice Estrae il nullifier dai public signals
    /// @param publicSignals I segnali pubblici della prova
    /// @return Il nullifier come bytes32
    function extractNullifier(uint256[] calldata publicSignals) external pure returns (bytes32);

    /// @notice Verifica che il dominio estratto dalla prova corrisponda a quello atteso
    /// @param provenDomain Il dominio estratto dalla prova ZK (in chiaro)
    /// @param expectedDomain Il dominio atteso dal bounty
    /// @return true se corrispondono (case-insensitive)
    function verifyDomainMatch(
        string calldata provenDomain, 
        string calldata expectedDomain
    ) external pure returns (bool);

    /// @notice Verifica che tutte le keyword richieste siano presenti
    /// @param providedHashes Gli hash delle keyword fornite dal whistleblower
    /// @param requiredHashes Gli hash delle keyword richieste dal bounty
    /// @return true se tutte le keyword richieste sono presenti
    function verifyKeywords(
        bytes32[] calldata providedHashes,
        bytes32[] calldata requiredHashes
    ) external pure returns (bool);

    /// @notice Estrae gli hash delle keyword dai public signals
    /// @param publicSignals I segnali pubblici della prova
    /// @return Array di keyword hashes
    function extractKeywordHashes(uint256[] calldata publicSignals) external pure returns (bytes32[] memory);
}
