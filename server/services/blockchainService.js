const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const grpc = require("@grpc/grpc-js");
const { connect, signers } = require("@hyperledger/fabric-gateway");

const fabricBase = resolvePath(process.env.FABRIC_BASE || "/mnt/c/Hyperledger/fabric-samples/test-network");
const certPath = resolvePath(process.env.FABRIC_CERT_PATH || `${fabricBase}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem`);
const keyDir = resolvePath(process.env.FABRIC_KEY_DIR || `${fabricBase}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore`);
const tlsCertPath = resolvePath(process.env.FABRIC_TLS_CERT_PATH || `${fabricBase}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`);
const peerEndpoint = process.env.FABRIC_PEER_ENDPOINT || "localhost:7051";
const peerHostAlias = process.env.FABRIC_PEER_HOST_ALIAS || "peer0.org1.example.com";
const channelName = process.env.FABRIC_CHANNEL || "mychannel";
const chaincodeName = process.env.FABRIC_CHAINCODE || "incident-contract";

function resolvePath(value) {
  if (process.platform === "win32" && /^\/mnt\/[a-zA-Z]\//.test(value)) {
    return path.win32.join(`${value[5].toUpperCase()}:`, value.slice(7));
  }
  return path.resolve(value);
}

function requireFile(filePath, settingName) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${settingName} does not exist: ${filePath}`);
  }
}

function getContract() {
  requireFile(certPath, "FABRIC_CERT_PATH");
  requireFile(tlsCertPath, "FABRIC_TLS_CERT_PATH");
  if (!fs.existsSync(keyDir)) throw new Error(`FABRIC_KEY_DIR does not exist: ${keyDir}`);
  const credentials = fs.readFileSync(certPath);
  const keyFile = fs.readdirSync(keyDir).find((file) => file.endsWith("_sk"));
  if (!keyFile) throw new Error("Fabric private key not found.");
  const privateKey = crypto.createPrivateKey(fs.readFileSync(`${keyDir}/${keyFile}`));
  const tlsRootCert = fs.readFileSync(tlsCertPath);
  const client = new grpc.Client(peerEndpoint, grpc.credentials.createSsl(tlsRootCert), {
    "grpc.ssl_target_name_override": peerHostAlias,
    "grpc.default_authority": peerHostAlias
  });
  const gateway = connect({
    client,
    identity: { mspId: process.env.FABRIC_MSP_ID || "Org1MSP", credentials },
    signer: signers.newPrivateKeySigner(privateKey)
  });
  return { client, gateway, contract: gateway.getNetwork(channelName).getContract(chaincodeName) };
}

async function submit(transactionName, args) {
  const { client, gateway, contract } = getContract();
  try {
    const submission = await contract.submitAsync(transactionName, { arguments: args.map(String) });
    const txId = submission.getTransactionId();
    await submission.getStatus();
    return txId;
  } finally {
    gateway.close();
    client.close();
  }
}

async function anchorIncidentCreation(incident) {
  const txId = await submit("CreateIncident", [
    incident.incident_id,
    incident.reporter_id,
    incident.title,
    incident.description,
    incident.category_id,
    incident.incident_location || "",
    incident.incident_date || "",
    incident.priority || "Medium",
    incident.anonymity,
    ""
  ]);
  return { txId, mock: false };
}

async function anchorStatusChange(incidentId, previousStatus, newStatus, actorId) {
  const txId = await submit("UpdateIncidentStatus", [incidentId, newStatus]);
  return { txId, mock: false, previousStatus, actorId };
}

async function verifyRecord(incidentId) {
  const { client, gateway, contract } = getContract();
  try {
    const payload = await contract.evaluateTransaction("ReadIncident", incidentId);
    const record = JSON.parse(Buffer.from(payload).toString("utf8"));
    return { verified: record.incidentID === incidentId, record, mock: false };
  } finally {
    gateway.close();
    client.close();
  }
}

module.exports = { anchorIncidentCreation, anchorStatusChange, verifyRecord };
