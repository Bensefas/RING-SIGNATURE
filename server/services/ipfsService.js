const { create } = require("kubo-rpc-client");

const client = create({
    url: process.env.IPFS_API_URL || "http://127.0.0.1:5001"
});

async function uploadEvidence(fileBuffer, fileName) {
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        throw new Error("Evidence file is empty.");
    }

    const result = await client.add({
        content: fileBuffer,
        path: fileName
    });

    return {
        cid: result.cid.toString(),
        mock: false
    };
}

module.exports = { uploadEvidence };