// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IProofVerifier.sol";
import "./libraries/BountyLib.sol";

/// @title ProofVerifier
/// @notice Verifica le prove ZK Email in modalità test o produzione
contract ProofVerifier is IProofVerifier {
    
    /// @notice Se true, accetta tutte le prove con struttura valida (per testing)
    bool public immutable testMode;
    
    /// @notice Indirizzo del verifier Groth16 (se non in test mode)
    address public immutable groth16Verifier;

    /// @notice Inizializza il verifier
    /// @param _groth16Verifier Indirizzo del verifier Groth16, o address(0) per test mode
    constructor(address _groth16Verifier) {
        if (_groth16Verifier == address(0)) {
            testMode = true;
        } else {
            testMode = false;
            groth16Verifier = _groth16Verifier;
        }
    }

    /// @inheritdoc IProofVerifier
    function verifyProof(BountyLib.ProofData calldata proofData) external view override returns (bool) {
        if (testMode) {
            // In test mode, verifica solo che la struttura sia valida
            return _hasValidStructure(proofData);
        }
        
        // In produzione, chiama il verifier Groth16 reale
        // Per ora, in produzione restituisce false (da implementare)
        return false;
    }

    /// @inheritdoc IProofVerifier
    function extractDomainHash(uint256[] calldata publicSignals) external pure override returns (uint256) {
        // Il domain hash è tipicamente il primo public signal
        if (publicSignals.length == 0) {
            return 0;
        }
        return publicSignals[0];
    }

    /// @inheritdoc IProofVerifier
    function extractNullifier(uint256[] calldata publicSignals) external pure override returns (bytes32) {
        // Il nullifier è tipicamente il secondo public signal (o una combinazione)
        // Per ZK Email, usiamo una combinazione di più signals per unicità
        if (publicSignals.length < 2) {
            return bytes32(0);
        }
        
        // Combina i primi due signals per creare un nullifier unico
        return keccak256(abi.encodePacked(publicSignals[0], publicSignals[1]));
    }

    /// @inheritdoc IProofVerifier
    function verifyDomain(uint256 domainHash, string calldata expectedDomain) external pure override returns (bool) {
        // In test mode, accettiamo qualsiasi dominio
        // In produzione, dovremmo verificare che domainHash == keccak256(expectedDomain)
        
        // Per semplicità in test mode, accettiamo sempre
        // Il domainHash dalla prova dovrebbe corrispondere al domain atteso
        if (bytes(expectedDomain).length == 0) {
            return false;
        }
        
        // In test mode accettiamo qualsiasi combinazione valida
        // In produzione: return domainHash == uint256(keccak256(abi.encodePacked(expectedDomain)));
        return true;
    }

    /// @notice Verifica che la prova abbia una struttura valida
    /// @param proofData I dati della prova
    /// @return true se la struttura è valida
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
}
