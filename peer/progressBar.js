const cliProgress = require("cli-progress");

// create new container
const multibar = new cliProgress.MultiBar(
    {
        clearOnComplete: false,
        hideCursor: true,
        format: " {bar} | {filename} | {value}/{total} Bytes",
    },
    cliProgress.Presets.shades_grey
);

module.exports = multibar;
