console.log("⌛️ Launching bot...");
const { startTelegeramBot } = require("./telegram");
const { startDiscordBot } = require("./discord");


startTelegeramBot();
startDiscordBot();