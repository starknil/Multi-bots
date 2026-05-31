require("dotenv").config();
const { connectDb, getApps } = require("./db/db");
const TelegramBot = require("./telegram");
const DiscordBot = require("./discord");

process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception");
  console.error(err.stack || err);
});

process.on("unhandledRejection", (reason) => {
  console.error("🚨 Unhandled Rejection");
  console.error(reason);
});

const runApps = async () => {
  let telegramApps = await getApps("telegram");
  let discordApps = await getApps("discord");

  console.log(`🚀 Starting ${telegramApps.length} Telegram Bots...`);
  console.log(`🚀 Starting ${discordApps.length} Discord Bots...`);

  for (const app of discordApps) {
    new DiscordBot(app.token, app.id, app.receiver).start();
  }
  for (const app of telegramApps) {
    new TelegramBot(
      app.phoneNumber,
      app.password,
      app.receiver,
      app.id,
      app.session,
      'auto'
    ).start();
  }
    
};

(async () => {
  try {
    console.log("⌛️ Connecting to database...");
    await connectDb();
    console.log("✅ Database Connected Successfully!");
    runApps();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();
