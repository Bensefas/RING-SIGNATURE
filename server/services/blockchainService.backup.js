const fs = require("fs");
const crypto = require("crypto");
const { connect, signers, hash } = require("@hyperledger/fabric-gateway");
const IPFSService = require("./ipfsService");

const FABRIC_BASE =
    "/mnt/c/Hyperledger/fabric-samples/test-network";

const MSP_ID = "Org1MSP";
const CHANNEL_NAME = "mychannel";
const CHAINCODE_NAME = "incident-contract";

const PEER_ENDPOINT = "localhost:7051";
const PEER_HOST_ALIAS = "peer0.org1.example.com";

const TLS_CERT_PATH =
    `${FABRIC_BASE}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`;

const CERT_PATH =
    `${FABRIC_BASE}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem`;

const KEY_DIR =
    `${FABRIC_BASE}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore`;

const ORDERER_CA_PATH =
    `${FABRIC_BASE}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`;

class BlockchainService {

    async getContract() {
        const credentials = fs.readFileSync(CERT_PATH);

        const keyFile = fs.readdirSync(KEY_DIR)[0];
        const privateKey = fs.readFileSync(
            `${KEY_DIR}/${keyFile}`
        );

        const tlsRootCert = fs.readFileSync(TLS_CERT_PATH);

        const signer = signers.newPrivateKeySigner(
            privateKey
        );

        const client = await connect(
            PEER_ENDPOINT,
            {
                pem: tlsRootCert,
                clientCert: credentials,
                host: PEER_HOST_ALIAS,
            },
            signer
        );

        const network = client.getNetwork(CHANNEL_NAME);

        const contract = network.getContract(
            CHAINCODE_NAME
        );

        return {
            client,
            contract
        };
    }

    async storeIncident(incident) {

        const { client, contract } =
            await this.getContract();

        try {

            const result =
                await contract.submitTransaction(
                    "CreateIncident",
                    incident.incidentId,
                    incident.reporterId,
                    incident.title,
                    incident.description,
                    incident.category,
                    incident.location,
                    incident.dateReported,
                    incident.priority,
                    String(incident.anonymous),
                    incident.ipfsHash || ""
                );

            return {
                success: true,
                transactionId:
                    crypto.randomUUID(),
                result:
                    result.toString()
            };

        } finally {
            client.close();
        }
    }

    async getIncident(incidentId) {

        const { client, contract } =
            await this.getContract();

        try {

            const result =
                await contract.evaluateTransaction(
                    "ReadIncident",
                    incidentId
                );

            return JSON.parse(result.toString());

        } finally {
            client.close();
        }
    }

    async getAllIncidents() {

        const { client, contract } =
            await this.getContract();

        try {

            const result =
                await contract.evaluateTransaction(
                    "GetAllIncidents"
                );

            return JSON.parse(result.toString());

        } finally {
            client.close();
        }
    }

    async updateIncidentStatus(
        incidentId,
        status
    ) {

        const { client, contract } =
            await this.getContract();

        try {

            await contract.submitTransaction(
                "UpdateIncidentStatus",
                incidentId,
                status
            );

            return {
                success: true
            };

        } finally {
            client.close();
        }
    }

    async assignIncident(
        incidentId,
        assignedTo
    ) {

        const { client, contract } =
            await this.getContract();

        try {

            await contract.submitTransaction(
                "AssignIncident",
                incidentId,
                assignedTo
            );

            return {
                success: true
            };

        } finally {
            client.close();
        }
    }

    async uploadEvidence(filePath) {

        const result =
            await IPFSService.uploadToIPFS(filePath);

        return {
            success: true,
            cid: result.cid
        };
    }

    async updateIPFSHash(
        incidentId,
        cid
    ) {

        const { client, contract } =
            await this.getContract();

        try {

            await contract.submitTransaction(
                "UpdateIPFSHash",
                incidentId,
                cid
            );

            return {
                success: true,
                cid
            };

        } finally {
            client.close();
        }
    }

    async updateBlockchainHash(
        incidentId,
        blockchainHash
    ) {

        const { client, contract } =
            await this.getContract();

        try {

            await contract.submitTransaction(
                "UpdateBlockchainHash",
                incidentId,
                blockchainHash
            );

            return {
                success: true,
                blockchainHash
            };

        } finally {
            client.close();
        }
    }

    async verifyEvidence(filePath) {

        const fileBuffer =
            fs.readFileSync(filePath);

        const calculatedHash =
            crypto
                .createHash("sha256")
                .update(fileBuffer)
                .digest("hex");

        return calculatedHash;
    }

    async incidentExists(incidentId) {

        const { client, contract } =
            await this.getContract();

        try {

            const result =
                await contract.evaluateTransaction(
                    "IncidentExists",
                    incidentId
                );

            return result.toString() === "true";

        } finally {
            client.close();
        }
    }

    async deleteIncident(incidentId) {

        const { client, contract } =
            await this.getContract();

        try {

            await contract.submitTransaction(
                "DeleteIncident",
                incidentId
            );

            return {
                success: true
            };

        } finally {
            client.close();
        }
    }
}

module.exports =
    new BlockchainService();