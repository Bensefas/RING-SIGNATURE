# University Incident System

University incident reporting and role-based case management application.

## Local Stack

- Frontend: React + Vite
- API: Node.js + Express
- Database: PostgreSQL
- Evidence: Kubo IPFS
- Blockchain: Hyperledger Fabric Gateway configuration

## Run Locally

1. Start PostgreSQL using the values in `server/.env`.
2. Start IPFS:

```powershell
docker compose up -d ipfs
```

3. Start the API:

```powershell
Push-Location server
npm start
Pop-Location
```

4. Start the frontend in another terminal:

```powershell
Push-Location client
npm run dev -- --host 127.0.0.1
Pop-Location
```

Open `http://127.0.0.1:5173`.

## Validation

Frontend production build:

```powershell
Push-Location client
npm run build
Pop-Location
```

Fabric chaincode test:

```powershell
Push-Location chaincode/incident-contract
go test ./...
Pop-Location
```

IPFS status:

```powershell
docker compose ps
```

## Performance Report

The 100-transaction report is available at [docs/phase1-performance-report.html](docs/phase1-performance-report.html).

Latest benchmark:

- 100 transactions
- 100 successful
- 0 failed
- 22.71 transactions per second
- Average latency: 401.92 ms
- P50: 261.16 ms
- P95: 1,525.58 ms
- P99: 1,529.25 ms
- Maximum: 1,543.47 ms

## External Fabric Setup

Live Fabric anchoring requires certificates, a wallet identity, a running peer and orderer, and matching values for the `FABRIC_*` variables in `server/.env.example`. The application keeps database workflow available when Fabric is unavailable and logs the anchoring failure.

Email and SMS delivery are not enabled. Database notifications are available through `/api/notifications` and the Topbar notification bell.
