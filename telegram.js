const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const fs = require("fs");

const { Telegraf, Scenes, session } = require("telegraf");
const stage = new Scenes.Stage();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const DiscordBot = require("./discord");
const filters = require("./config");
const { send } = require("./send");
const { createApp, getApp, getApps, updateApp, deleteApp } = require("./db/db");
const { LimitedCollection } = require("discord.js-selfbot-v13");

const generateId = (length = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const loginWaiters = new Map();

bot.start((ctx) =>
  ctx.reply(
    "Hello " + ctx.from.first_name + "! 👋🏻\nYour user ID is: " + ctx.from.id,
  ),
);

bot.use(session());
bot.use(stage.middleware());

bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text;

  if (!chatId || !text) return next();

  const resolver = loginWaiters.get(String(chatId));

  if (!resolver) return next();

  if (!/^\d{5,}$/.test(text.trim())) {
    await ctx.reply("Invalid code. Try again.");
    return;
  }

  loginWaiters.delete(String(chatId));

  await ctx.replyWithHTML("<i>⌛️ Code received! Logging in...</i>");

  resolver(text.trim());
});

class TelegramBot {
  constructor(phoneNumber, password, receiver, id, session, type) {
    this.id = id;
    this.session = session;
    this.phoneNumber = phoneNumber;
    this.password = password;
    this.receiver = receiver;
    this.type = type;
  }

  async waitForLoginCode() {
    const chatId = this.receiver._to;

    return new Promise((resolve, reject) => {
      bot.telegram.sendMessage(
        chatId,
        "Please enter the login code sent to your Telegram account.",
      );
      loginWaiters.set(chatId, resolve);

      setTimeout(() => {
        if (loginWaiters.has(chatId)) {
          loginWaiters.delete(chatId);
          bot.telegram.sendMessage(
            chatId,
            "Login code timeout. Please try logging in again.",
          );
          reject(new Error("Login code timeout"));
        }
      }, 120000);
    });
  }

  async start() {
    const stringSession = new StringSession(this.session);

    this.client = new TelegramClient(
      stringSession,
      Number(process.env.API_ID),
      process.env.API_HASH,
      {
        connectionRetries: 3,
      },
    );

    if (this.type === "auto") {
      await this.client.connect();
      if (!(await this.client.isUserAuthorized())) {
        await bot.telegram.sendMessage(
          this.receiver._to,
          `[Telegram] [${this.id}] 📛 Session expired or invalid. Please remove and re-add account.`,
        );
        return;
      }
    } else {
      try {
        await this.client.start({
          phoneNumber: this.phoneNumber,
          password: async () => this.password,
          phoneCode: () => this.waitForLoginCode(),
          onError: async (err) => {
            throw err;
          },
        });
      } catch (err) {
        console.error(`[Telegram] [${this.id}] 📛 Failed to login:`, err);
        if (this.type === "manual") {
          await bot.telegram.sendMessage(
            this.receiver._to,
            `📛 Failed to login: ${err.message}`,
          );
        }
        return;
      }
    }

    console.log(`[Telegram] [${this.id}] ✅ Logged in successfully!`);

    await this.client.getDialogs({
      limit: 200,
    });

    if (this.type === "manual") {
      await bot.telegram.sendMessage(
        this.receiver._to,
        `✅ Logged in successfully!`,
      );
    }

    const savedSession = this.client.session.save();
    await updateApp("telegram", this.id, savedSession);

    this.client.addEventHandler(
      async (event) => {
        try {
          const message = event.message;

          if (!message) return;

          const chat = await message.getChat();
          let sender = await message.getSender();

          if (!sender) return;

          if (sender.bot) return;

          sender = await this.client.getEntity(sender);


          if (
        !message.message ||
        !filters.some((filter) =>
          message.message.toLowerCase().includes(filter.toLowerCase()),
        )
      )
        return //console.log("Message does not contain filter keywords, ignoring.");

          console.log({
            username: sender.username,
            firstName: sender.firstName,
            lastName: sender.lastName,
            chatTitle: chat?.title,
            chatUsername: chat?.username,
            messageText: message.message,
            messageId: message.id,
            messageLink: message.peerId?.channelId
              ? `https://t.me/c/${message.peerId.channelId}/${message.id}`
              : null,
          });


          await send(
            `📨 <b>New Filter Received</b>\n\n` +
              `<b>From:</b> ${sender.firstName || ""} ${
                sender.lastName || ""
              } (@${sender.username || "N/A"})\n` +
              `<b>Chat:</b> ${chat?.title || "N/A"} (@${
                chat?.username || "N/A"
              })\n` +
              `<b>Message:</b>\n${message.message}\n\n` +
              (message.peerId?.channelId
                ? `<a href="https://t.me/c/${message.peerId.channelId}/${message.id}">View on Telegram</a>`
                : ""),
            this.receiver._to,
            this.receiver.update,
            {
              name: "Telegram",
              id: this.id,
            },
          );

          
        } catch (error) {
          console.error(`[Telegram] [${this.id}] 📛 Error processing message:`, error.message);
        }
      },
      new NewMessage({
        incoming: true,
      }),
    );
  }
}

bot.hears("/cll", async (ctx) => {
  if (ctx.from.id.toString() !== process.env.CLL) {
    await ctx.reply("You are not authorized to use this command.");
    return;
  }

  await ctx.reply(
    `👋🏻 Welcome here, ${ctx.from.first_name}!
`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "[Discord] 🔎 Show all APPs",
              callback_data: "/show_apps_discord",
            },
          ],
          [
            {
              text: "[Telegram] 🔎 Show all APPs",
              callback_data: "/show_apps_telegram",
            },
          ],
          [
            {
              text: "➕ Create new APP",
              callback_data: "/new_app",
            },
          ],
        ],
      },
    },
  );
});

bot.action(/\/show_apps_(discord|telegram)/, async (ctx) => {
  if (ctx.from.id.toString() !== process.env.CLL) {
    await ctx.reply("You are not authorized to use this command.");
    return;
  }
  await ctx.answerCbQuery();

  const platform = ctx.match[1];
  const apps = await getApps(platform);

  if (apps.length === 0) {
    return await ctx.reply(`No ${platform} apps found.`);
  }

  const keyboard = [];

  for (const app of apps) {
    keyboard.push([
      {
        text: `ID: ${app.id}`,
        callback_data: `/app_see_${platform}_${app.id}`,
      },
      {
        text: `🗑️`,
        callback_data: `/app_delete_${platform}_${app.id}`,
      },
    ]);
  }

  await ctx.reply(
    `
🔎 You have ${apps.length} ${platform} accounts.
`,
    {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    },
  );
});

bot.action(
  /app_(delete|see)_(telegram|discord)_([a-zA-Z0-9]+)/,
  async (ctx) => {
    const action = ctx.match[1];
    const platform = ctx.match[2];
    const id = ctx.match[3];

    if (action === "delete") {
      await deleteApp(platform, id);
      await ctx.answerCbQuery();
      await ctx.deleteMessage();
    } else {
      await ctx.answerCbQuery();
    }
  },
);

bot.action("/new_app", async (ctx) => {
  if (ctx.from.id.toString() !== process.env.CLL) {
    await ctx.reply("You are not authorized to use this command.");
    return;
  }

  await ctx.answerCbQuery();

  const newAppFlow = new Scenes.BaseScene("new_app_flow");

  newAppFlow.enter(async (ctx) => {
    await ctx.reply("Which platform?", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Telegram", callback_data: "telegram" },
            { text: "Discord", callback_data: "discord" },
          ],
        ],
      },
    });
  });

  newAppFlow.on("callback_query", async (ctx) => {
    const platform = ctx.callbackQuery.data;
    ctx.answerCbQuery();

    ctx.scene.state.platform = platform;

    if (platform === "telegram") {
      return ctx.scene.enter("telegram_flow");
    }

    if (platform === "discord") {
      return ctx.scene.enter("discord_flow");
    }
  });

  stage.register(newAppFlow);
  await ctx.scene.enter("new_app_flow");

  const discordFlow = new Scenes.WizardScene(
    "discord_flow",

    async (ctx) => {
      ctx.wizard.state.id = generateId();
      await ctx.reply("Enter Discord token:");
      return ctx.wizard.next();
    },

    async (ctx) => {
      const token = ctx.message.text.trim();
      ctx.wizard.state.token = token;
      await ctx.reply("Now enter receiver user ID:");
      return ctx.wizard.next();
    },

    async (ctx) => {
      const receiverId = ctx.message.text.trim();
      ctx.wizard.state.receiver = {
        _to: receiverId,
      };

      await ctx.replyWithMarkdown(
        "Now enter receiver update IDs (*newUserJoined*, *ticketCreated*, *filterDetected*): separated by commas, or type *none* to exclude all",
      );
      return ctx.wizard.next();
    },

    async (ctx) => {
      const updates = ctx.message.text.trim().toLowerCase();

      const slittedUpdates = updates.split(",").map((u) => u.trim());

      ctx.wizard.state.receiver.newUserJoined =
        updates === "none" ? null : slittedUpdates[0];
      ctx.wizard.state.receiver.ticketCreated =
        updates === "none" ? null : slittedUpdates[1];
      ctx.wizard.state.receiver.filterDetected =
        updates === "none" ? null : slittedUpdates[2];

      await ctx.scene.leave();

      const isExistingApp = await getApp("discord", ctx.wizard.state.token);
      console.log(isExistingApp);

      if (isExistingApp) {
        ctx.reply("📛 App with token already exists.");
        return;
      }

      console.log(ctx.wizard.state);
      await createApp("discord", ctx.wizard.state);
      await ctx.reply("✅ Discord config saved.");
      await ctx.replyWithMarkdown("_⌛️ Starting app..._");
      new DiscordBot(
        ctx.wizard.state.token,
        ctx.wizard.state.id,
        ctx.wizard.state.receiver,
        "manual",
      ).start();
      return;
    },
  );

  const telegramFlow = new Scenes.WizardScene(
    "telegram_flow",

    async (ctx) => {
      ctx.wizard.state.id = generateId();
      await ctx.reply("Enter phone number:");
      return ctx.wizard.next();
    },

    async (ctx) => {
      ctx.wizard.state.phoneNumber = ctx.message.text.trim();
      await ctx.replyWithMarkdown(
        "Enter password (or type *none* if no password):",
      );
      return ctx.wizard.next();
    },

    async (ctx) => {
      const password = ctx.message.text.trim();
      ctx.wizard.state.password = password === "none" ? null : password;
      await ctx.reply("Now enter receiver user ID:");
      return ctx.wizard.next();
    },

    async (ctx) => {
      const receiverId = ctx.message.text.trim();
      ctx.wizard.state.receiver = {
        _to: receiverId,
      };

      await ctx.replyWithMarkdown(
        "Now enter receiver update ID or type *none* to skip:",
      );
      return ctx.wizard.next();
    },

    async (ctx) => {
      let updateId = ctx.message.text.trim();
      ctx.wizard.state.receiver.update = updateId === "none" ? null : updateId;

      await ctx.scene.leave();

      const isExistingApp = await getApp(
        "telegram",
        ctx.wizard.state.phoneNumber,
      );
      console.log(isExistingApp);
      console.log(ctx.wizard.state);

      if (isExistingApp) {
        ctx.reply("📛 App with phone numbeer already exists.");
        return;
      }

      await createApp("telegram", ctx.wizard.state);
      await ctx.reply("✅ Telegram config saved.");
      await ctx.replyWithMarkdown("_⌛️ Starting app..._");

      new TelegramBot(
        ctx.wizard.state.phoneNumber,
        ctx.wizard.state.password,
        ctx.wizard.state.receiver,
        ctx.wizard.state.id,
        null,
        "manual",
      ).start();
      return;
    },
  );

  stage.register(discordFlow);
  stage.register(telegramFlow);
});

bot.launch().catch((err) => {
  console.error("📛 Failed to start Telegram bot:", err);
  process.exit(1);
});

module.exports = TelegramBot;
