// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/BountyLib.sol";

/// @title IProofVerifier
/// @notice Interfaccia per il contratto che verifica le prove ZK
interface IProofVerifier {

    /// @notice Verifica una prova ZK
    /// @param proofData I dati della prova
    /// @return valid true se la prova è valida
    function verifyProof(BountyLib.ProofData calldata proofData) external view returns (bool valid);

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
