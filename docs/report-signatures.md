# Report signatures and anonymity

## Identified reports

Normal reports are signed in the browser with ECDSA P-256 and SHA-256. The server verifies the signature against the public key registered to the authenticated account, stores a copy of that public key with the report, and rejects signatures over altered report details. A random nonce is included in the signed data and is unique per report.

## Anonymous reports

Anonymous reports use LSAG linkable ring signatures on secp256k1. The server verifies the signature against the active enrolled reporter-key ring without receiving a signer public key in the submission. A key image is linkable only within the same incident category and UTC reporting year.

The authenticated account ID remains in trusted server-side records so reporters can access their own cases and the institution can retain its restricted audit mapping. Case and assignment APIs redact reporter IDs, names, and email addresses for anonymous reports. The anonymity set must contain at least two enrolled keys; the larger the ring, the larger the potential anonymity set. This is anonymity from case handlers through the application, not protection from database operators, server compromise, traffic analysis, or a malicious browser.

## Key storage and rollout

Private keys are stored in browser IndexedDB and are never sent to the server. Clearing browser data loses the local keys; a new key can be enrolled, but old keys cannot be recovered. The signature public key is stored with each identified report so key rotation does not invalidate historical verification.

Run `database/migrations/008_report_signatures.sql` after the existing anonymous-reporting migration. On Windows, `database/migrations/apply_report_signatures.ps1` prompts for the PostgreSQL password without echoing it and applies the migration transactionally. For a fresh database, use the updated `database/schema.sql` and then apply migrations as usual.

The LSAG package is pinned in the client and server manifests. Its JavaScript implementation documents that signing is not constant-time, and it has not received an independent security audit as part of this project. The implementation therefore requires a cryptographic review before deployment for high-risk or legally sensitive reporting. Production deployment also requires HTTPS, strong same-origin script controls, and a reviewed key-recovery policy.
