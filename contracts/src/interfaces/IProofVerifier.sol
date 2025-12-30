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

    /// @notice Verifica che il domain hash corrisponda al dominio atteso
    /// @param domainHash L'hash del dominio dalla prova
    /// @param expectedDomain Il dominio atteso come stringa
    /// @return true se corrispondono
    function verifyDomain(uint256 domainHash, string calldata expectedDomain) external pure returns (bool);
}
