# Anonymous Reporting Integration Summary

## Conceptual framework

Registered university members -> cryptographic identity -> public-key registry -> reporting interface -> normal or anonymous reporting.

For anonymous reporting:

1. User selects anonymous option.
2. Client requests eligible public keys.
3. Client builds a ring with the signer public key included.
4. Client canonicalizes the incident and hashes it using SHA-256.
5. Client generates a linkable ring signature on the report hash.
6. Backend verifies the signature and checks linkability.
7. Valid reports proceed through the Hyperledger Fabric flow and IPFS evidence upload.
8. Incident management continues with the same existing dashboard and status workflow.

## Use cases

- Submit anonymous report using linkable ring signature
- Register public key
- Retrieve eligible public keys
- Generate ring signature
- Verify ring signature
- View and track incidents
- Manage public keys

## Sequence overview

Reporter -> React client -> public-key registry -> ring signature module -> Node.js API -> smart contract -> Hyperledger Fabric -> IPFS.

## Class overview

- RingSignatureService: createRing, generateRingSignature, verifyRingSignature, deriveLinkabilityTag
- PublicKeyRegistry: registerPublicKey, getEligibleKeys, revokeKey
- RingSignatureRecord: signature, ring information, linkability information, verification result
- IncidentReport: incident ID, hash, timestamp, evidence CID

## Flow decision

If the report is not anonymous, continue with the existing identified reporting workflow.
If the report is anonymous:

- retrieve eligible public keys
- build ring
- hash incident data
- generate linkable ring signature
- verify signature
- reject if invalid
- check linkability policy
- proceed to blockchain and IPFS

## Deployment

Client device:

- React frontend
- local key generation and private-key handling
- ring construction
- ring signature generation

Application server:

- Node.js API
- public-key registry service
- signature verification service
- linkability checks
- incident processing

Blockchain network:

- Hyperledger Fabric
- incident smart contract

Storage layer:

- PostgreSQL for registry metadata
- IPFS for evidence files

## Implementation notes

This project keeps the normal reporting flow in place and adds the anonymous path only when the user selects anonymous reporting. The private key is generated and kept on the client device. The backend receives only the public key and signature verification payload.

The implementation keeps the original architecture intact while layering the new cryptographic workflow around it.
