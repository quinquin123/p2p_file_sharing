const fs = require("fs").promises;
const crypto = require("crypto");
const path = require("path");

class FileHandler {
    static async getFiles(fpath) {
        try {
            const allFiles = [];

            const files = await fs.readdir(fpath);

            for (const file of files) {
                const path_file = fpath + "/" + file;
                const fileInfo = {
                    path: path_file,
                    size: await FileHandler.readSizeFileByKB(path_file),
                    pieceOrder: FileHandler.getFileOrder(file),
                    infoHash: FileHandler.getInfoHash(file),
                    originFileName: FileHandler.getOriginFileName(file),
                };

                allFiles.push(fileInfo);
            }

            return allFiles;
        } catch (error) {
            console.error("Error reading folder:", error);
        }
    }

    static getFileOrder(fileName) {
        try {
            const splitName = fileName.split(".");
            const fileNameWithoutExtension = splitName[0];
            const lastNumberIndex = fileNameWithoutExtension.search(/\d+$/);
            return parseInt(fileNameWithoutExtension.substring(lastNumberIndex));
        } catch (error) {
            console.error("Error getting file order:", error);
        }
    }

    static getOriginFileName(path_file) {
        const fileName = path.basename(path_file, path.extname(path_file));
        return fileName;
    }

    static async readSizeFileByKB(path_file) {
        try {
            const stats = await fs.stat(path_file);
            return stats.size;
        } catch (error) {
            console.error("Error reading file size:", error);
        }
    }


    static getInfoHash(fileName) {
        try {
            const splitName = fileName.split(".")[0];
            const originFileName = splitName.slice(0, splitName.length - 1);

            const hash = crypto.createHash("sha1");
            hash.update(originFileName);
            const infoHash = hash.digest("hex");

            return infoHash;
        } catch (error) {
            console.error("Error getting info hash:", error);
        }
    }


    static async moveFilesToFolder(source, destination) {
        try {
            const files = await fs.readdir(source);

            for (const file of files) {
                const sourcePath = path.join(source, file);
                const destinationPath = path.join(destination, file);

                await fs.rename(sourcePath, destinationPath);
                console.log(`File ${file} moved successfully`);
            }
        } catch (error) {
            console.error("Error moving files:", error);
        }
    }
}

module.exports = FileHandler;
