# University Incident System
## Technical Review Summary

Date: 2026-08-28

## Cleanup Completed

Removed confirmed non-runtime artifacts:

- `client/src/App_backup.jsx`
- `test-evidence.txt`
- `server/fabric-test.js.save`
- `server/fabric-test.js.save.1`
- `server/services/blockchainService.backup.js`
- Empty invalid duplicate tree: `blockchain/chaincode/incident-contract/`

`server/.env` was removed from the Git index but retained locally so the current installation continues to run. Runtime logs, uploads, IPFS state, and build output are now ignored where applicable.

## Validation

- Client ESLint: passed.
- Client production build: passed.
- Modified server JavaScript syntax checks: passed.
- Working chaincode module: test command completes with no test files.
- Live API login: passed.
- Live incident listing: passed.
- Live incident submission: passed.
- Evidence upload through IPFS: passed.
- DVC assignment: passed.
- Assigned status update and audit history: passed.
- Mark Complete: passed.

## Findings

### High: Live database and canonical schema diverged

The live database uses a hybrid legacy model: `users.user_id` and `roles.role_id/role_name`, but bigint internal incident and assignment foreign keys, plus text incident numbers. The application has been aligned to the live database through migrations and focused query repairs. A fresh deployment must apply the schema and migrations in order; there is currently no automated migration runner.

### High: Local environment secret requires rotation

The PostgreSQL password was present in `server/.env`. It is no longer tracked, but if it existed in prior Git history or was shared, rotate the PostgreSQL password and JWT secret before publishing the repository. Keep only placeholders in `.env.example`.

### Medium: Default credentials are weak

Administrative accounts use `password123`. Replace these credentials before production use and enforce password complexity/rate limiting.

### Medium: Automated backend tests are absent

`server/package.json` has a placeholder test script and no backend test suite. Add integration tests for authentication, reporting, assignment, status transitions, evidence upload, and authorization boundaries.

### Medium: Fabric configuration is environment-dependent

Blockchain operations require certificates, peer connectivity, and matching Fabric settings. The application logs anchoring failures and continues database workflows, so deployment monitoring should distinguish database success from blockchain anchoring success.

### Low: Client bundle is large

The production build succeeds, but Vite reports a minified chunk larger than 500 kB. Consider route-level lazy loading and code splitting.

## Recommended Next Actions

1. Rotate PostgreSQL and JWT secrets.
2. Replace default account passwords.
3. Add a migration runner and CI database migration job.
4. Add backend integration tests and authorization tests.
5. Add CI checks for client lint/build, server syntax/tests, and chaincode tests.
6. Run a fresh-database deployment rehearsal before release.
