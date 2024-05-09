const express = require("express");
const app = express();
const port = 8080;
const peerjoin = {};
let peers = [];

app.use(express.json());

app.post("/register", registerPeer);

app.post("/peers", getFilteredPeers);

app.post("/peer/:peerId", updatePeer);

app.get("/peer/:peerId", getPeerInfo);

app.listen(port, () => {
    console.log(`Tracker server is running at http://localhost:${port}`);
});

function registerPeer(req, res) {
    const peerInfo = req.body;

    if (peerjoin[peerInfo.peerId]) {
        return;
    }

    peerjoin[peerInfo.peerId] = true;
    peers.push(peerInfo);
    console.log("Peer registered:", peerInfo);
    res.send("Peer registered successfully");
}

function getFilteredPeers(req, res) {
    const { listHashes } = req.body;

    const filteredPeers = peers.filter((peer) => {
        let filesRequested = [];
        let isPeer = false;
        peer.localFiles.forEach((file) => {
            if (listHashes.includes(file.infoHash)) {
                filesRequested.push(file);
                isPeer = true;
                return true;
            }
        });
        peer.requestedFiles = filesRequested;

        delete peer.peerId;
        return isPeer;
    });

    const peersResults = filteredPeers.map((peer) => {
        return {
            ip: peer.ip,
            port: peer.port,
            requestedFiles: peer.requestedFiles,
        };
    });

    res.json(peersResults);
}

function updatePeer(req, res) {
    const { peerId } = req.params;
    let peerUpdated;
    const newPeers = peers.map((peer) => {
        if (peer.peerId === peerId) {
            const newLocalFiles = [...peer.localFiles, ...req.body.localFiles];
            peerUpdated = {
                ...peer,
                localFiles: newLocalFiles,
            };
            return peerUpdated;
        }
        return peer;
    });
    peers = [...newPeers];
    console.log("Peer updated:", peerUpdated);

    res.send("Peer updated successfully");
}

function getPeerInfo(req, res) {
    const { peerId } = req.params;
    const peer = peers.find((peer) => peer.peerId === peerId);
    res.json(peer);
}