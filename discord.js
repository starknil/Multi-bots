require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const filters = require("./config");
//const { send } = require("./send");

const kingstar = new Client({
  checkUpdate: false,
});

const sendTicketMessage = async (data) => {
  console.log(data);
  const { type, guild, creator, creatorId, msg } = data;
  const content = `
🎫 <b>${type}</b> created in <b>${guild}</b> server!

<b>👤 Creator:</b> @${creator}
${creatorId ? `<b>🆔 ID:</b> <code>${creatorId}</code>` : ""}
${msg ? `<b>💬 Message:</b> <i>${msg}</i>` : ""}
<b>📅 Created at:</b> ${new Date().toLocaleString()}
`;
  //await send(content, data.topicId);
};

/*
kingstar.on("guildMemberAdd", async (member) => {
  const { guild, user } = member;

  let content;

  if (kingstar.user.id === user.id) {
    content = `✅ You just joined ${
      guild ? guild.name : "Unknown Server"
    } server!`;
  } else {
    content = `
🆕 New user joined <b>${guild ? guild.name : "Unknown Server"}</b> server!

<b>👤 UserName:</b> @${user.username}
<b>🆔 ID:</b> <code>${user.id}</code>
<b>📅 Joined at:</b> ${new Date().toLocaleString()}
`;
  }
  await send(content, 2);
});
*/


kingstar.on("channelCreate", async (channel) => {
  if (!channel.guild) return;

  const text = `${channel.name} ${channel.topic || ""}`.toLowerCase();

  const isTicket =
    text.includes("ticket") ||
    text.includes("support") ||
    text.includes("help") ||
    text.includes("created by") ||
    /ticket\s?#\d+/i.test(text);

  if (!isTicket) return;

  const match = channel.topic?.match(/<@(\d+)>/);

  const creatorId = match?.[1] || null;

  const [id, ...rest] = channel.name.split("-");
  const creator = rest.join("-") || "Unknown User";

  await sendTicketMessage({
    type: "Channel Ticket",
    guild: channel.guild.name,
    creator,
    creatorId,
    topicId: 3
  });
});

kingstar.on("threadCreate", async (thread) => {
  if (!thread.guild) return;
  console.log("🧵 THREAD TICKET", thread);
  await sendTicketMessage({
    type: "Thread Ticket",
    guild: thread.guild.name,
    creator: thread.name,
    topicId: 3
  });
});

kingstar.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (
    !message.content ||
    !filters.some((filter) =>
      message.content.toLowerCase().includes(filter.toLowerCase()),
    )
  )
    return;

  await sendTicketMessage(
    {
      type: "Filtered Crypto Issue",
      guild: message.guild.name,
      creator: message.author.username,
      creatorId: message.author.id,
      msg: message.content,
      topicId: 4
    },
    true,
  );
});

kingstar.on("error", (error) => {
  console.error("An error occurred:", error);
});

const startDiscordBot = async () => {
  if (!filters) return console.log("⚠️ Filter list is empty for discord listening");
  kingstar
  .login(process.env.TOKEN)
  .then(() => {
    console.log("✅ Discord logged in successfully! ("+kingstar.user.tag+")");
  })
  .catch((err) => {
    console.error("📛 Failed to login discord:", err);
  });
};

module.exports = { startDiscordBot };