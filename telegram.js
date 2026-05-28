require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const fs = require("fs");

const filters = require("./config");

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phoneNumber = process.env.PHONE_NUMBER;
const password = process.env.PASSWORD;

const SESSION_FILE = "./telegram.session";
const stringSession = new StringSession(
  fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE, "utf-8") : "",
);

const startTelegeramBot = async () => {
  if (!filters) return console.log("⚠️ Filter list is empty for telegram listening");

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 3,
  });

  await client.start({
    phoneNumber,
    password: async () => password,
    phoneCode: async () => await input.text("Code: "),
    onError: (err) => {
      console.log(err);
      process.exit(1);
    },
  });

  console.log("✅ Telegram logged in successfully!");
  fs.writeFileSync(SESSION_FILE, client.session.save());

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (
      message &&
      message.out === false &&
      message.message &&
      message.peerId &&
      message.peerId.className !== "PeerUser"
    ) {
      const messageText = message.message.toLowerCase();
      const containsFilter = true; //filters.some((filter) => messageText.includes(filter.toLowerCase()));
      if (containsFilter) {
        console.log(`
🚨 New Detected Filter

🔗 Direct Link: https://t.me/c/${message.peerId.channelId}/${message.id}
`);
        return;
      }
    }
  }, new NewMessage({}));
};

module.exports = {
  startTelegeramBot,
};
