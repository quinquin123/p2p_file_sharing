const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs").promises;

const FileHandler = require("./fileHandler");
const multibar = require("./progressBar");

const app = express();
const port = process.argv[2];

const trackerUrl = "http://localhost:8080";

// Example peer info
const peerInfo = {
    peerId: port, //random Id
    ip: "localhost",
    port: port,
    localFiles: [],
};
const folderPath = process.argv[3];
const option = process.argv[4];

// Middleware Ä‘á»ƒ xá»­ lÃ½ dá»¯ liá»‡u JSON
app.use(express.json());

// Peer Services
app.post("/download", async (req, res) => {
    const { filePath } = req.body;
    const option = {
        root: path.join(__dirname) + folderPath,
    };

    console.log("Sending file: " + filePath);
    res.sendFile(filePath, option);
});

app.post("/upload", async (req, res) => {});

// Connect to bittorrent network
const mainProgram = {
    joinToBitTorrentNetwork: async function () {
        try {
            const allFiles = await FileHandler.getFiles("." + folderPath);
            peerInfo.localFiles = allFiles;
            await axios.post(`${trackerUrl}/register`, peerInfo);
            console.log("Connected to tracker server");
        } catch (error) {
            console.error("Error joining BitTorrent network:", error.message);
        }
    },

    start: async function () {
        try {
            // Káº¿t ná»‘i vÃ  Ä‘Äƒng kÃ½ vá»›i tracker server
            await this.joinToBitTorrentNetwork();
            app.listen(port, () => {
                console.log(`Peer is running at http://localhost:${port}`);
            });
        } catch (error) {
            console.error("Error connecting to tracker server:", error.message);
        }
    },
};

// Download
const DownloadProgress = {
    requestPeers: async function (listHashes) {
        try {
            const response = await axios.post(`${trackerUrl}/peers`, {
                listHashes,
            });
            const peers = response.data;
            console.log("Received peers from tracker server:", peers);
            return peers;
        } catch (error) {
            console.error(
                "Error getting peers from tracker server:",
                error.message
            );
        }
    },
    saveFilesAlreadyDownloaded: async function (fileDownLoad, folderSave) {
        try {
            const filePath = path.join(__dirname) + folderSave + "/logs.txt";

            // Write content continuously
            const content =
                fileDownLoad.infoHash + "-" + fileDownLoad.pieceOrder + "\n";

            fs.appendFile(filePath, content);
        } catch (error) {
            console.log(
                "Error saving files already downloaded:",
                error.messages
            );
        }
    },
    checkAlreadyDownloaded: async function (fileCheck, folderSave) {
        try {
            const filePath = path.join(__dirname) + folderSave + "/logs.txt";
            const content = fileCheck.infoHash + "-" + fileCheck.pieceOrder;

            const data = await fs.readFile(filePath, "utf8");
            if (data.includes(content)) {
                return true;
            }
            return false;
        } catch (error) {
            console.log(
                "Error checking files already downloaded:",
                error.messages
            );
        }
    },
    downloadFromPeers: async function (peers) {
        try {
            // Calculate the total size of files
            const toltalSizeFiles = {};
            for (const peer of peers) {
                for (const file of peer.requestedFiles) {
                    if (!toltalSizeFiles[file.originFileName]) {
                        toltalSizeFiles[file.originFileName] = 0;
                    }
                    toltalSizeFiles[file.originFileName] += file.size;
                }
            }

            // Create progress bar
            const bars = {};
            for (const file in toltalSizeFiles) {
                bars[file] = multibar.create(toltalSizeFiles[file], 0, {
                    filename: file,
                });
            }

            let fileSize = {};
            for (const peer of peers) {
                for (const file of peer.requestedFiles) {
                    if (await this.checkAlreadyDownloaded(file, folderPath)) {
                        console.log(
                            `File ${file.originFileName}- peice ${file.pieceOrder} is already downloaded`
                        );
                        continue;
                    }

                    const response = await axios.post(
                        `http://${peer.ip}:${peer.port}/download`,
                        {
                            filePath: file.path.split("/")[2],
                        }
                    );

                    console.log(
                        `Downloaded file ${file.originFileName}: peice ${file.pieceOrder}`
                    );

                    this.saveFilesAlreadyDownloaded(file, folderPath);

                    // Update progress bar
                    if (!fileSize[file.originFileName]) {
                        fileSize[file.originFileName] = 0;
                    }
                    fileSize[file.originFileName] +=
                        +response.headers["content-length"];
                    bars[file.originFileName].update(
                        fileSize[file.originFileName],
                        {
                            filename: file.originFileName,
                        }
                    );

                    // Write file to local
                    const filePath =
                        path.join(__dirname) +
                        folderPath +
                        "/" +
                        file.originFileName;
                    // Write content continuously

                    await fs.appendFile(filePath, response.data);
                }
            }
            multibar.stop();
        } catch (error) {
            console.error("Error connecting to peers:", error.message);
        }
    },
};

// Upload
const UploadProgress = {
    uploadToPeers: async function (filePath) {
        try {
            const { data: isJoined } = await axios.get(
                `${trackerUrl}/peer/${port}`
            );

            if (!isJoined) {
                await mainProgram.start();
            }

            const allFiles = await FileHandler.getFiles("." + filePath);
            await FileHandler.moveFilesToFolder(
                "." + filePath,
                "." + folderPath
            );

            const allFilesWithnewPath = allFiles.map((file) => {
                return {
                    ...file,
                    path: file.path.replace(filePath, folderPath),
                };
            });

            // Inform new files to tracker server
            await axios.post(`${trackerUrl}/peer/${port}`, {
                localFiles: allFilesWithnewPath,
            });

            const newLocalFiles = [
                ...peerInfo.localFiles,
                ...allFilesWithnewPath,
            ];
            console.log(newLocalFiles);

            peerInfo.localFiles = newLocalFiles;

            console.log("Uploaded files to tracker server");
        } catch (error) {
            console.error(
                "Error uploading files to tracker server:",
                error.message
            );
        }
    },
};

const program = async () => {
    if (option === "-d") {
        const [a, b, c, d, e, ...listHashes] = process.argv;
        const peers = await DownloadProgress.requestPeers(listHashes);
        await DownloadProgress.downloadFromPeers(peers);
    } else if (option === "-u") {
        const [a, b, c, d, e, uploadPath] = process.argv;
        await UploadProgress.uploadToPeers(uploadPath);
    } else {
        mainProgram.start();
    }
};

program();