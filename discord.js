require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const filters = require("./config");
const { send } = require("./send");

const cll = new Client({
  checkUpdate: false,
});

const sendTicketMessage = async (data) => {
  console.log(data);
  const { type, guild, creator, creatorId, msg, directLink } = data;
const lines = [
  `🎫 <b>${type}</b> created in <b>${guild}</b> server!`,
  ``,
  `<b>🪪 Ticket ID:</b> ${data.name}`,
  `<b>👤 Creator:</b> @${creator}`,
];

if (creatorId) {
  lines.push(`<b>🆔 Creator ID:</b> <code>${creatorId}</code>`);
}

if (msg) {
  lines.push(`<b>💬 Message:</b> <i>${msg}</i>`);
}

lines.push(`<b>📅 Created at:</b> ${new Date().toLocaleString()}
`);

if (directLink) {
  lines.push(`<b>🔗 Direct Link:</b> <i>${directLink}</i>`);
}


const content = lines.join("\n");
  await send(content, data.topicId);
};

cll.on("guildMemberAdd", async (member) => {
  const { guild, user } = member;

  let content;

  if (cll.user.id === user.id) {
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
  await send(content, 3);
});

cll.on("messageCreate", async (message) => {
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
      topicId: 9,
    },
    true,
  );
});

cll.on("channelCreate", async (channel) => {
  //console.log("📁 CHANNEL CREATED", channel);

  if (!channel.guild) return;

  const overwrites = channel.permissionOverwrites.cache;
  const memberOverwrites = channel.permissionOverwrites.cache.filter(
    (o) => o.type === "member",
  );

  let ticketOwner = null;

  for (const overwrite of memberOverwrites.values()) {
    const member = await channel.guild.members
      .fetch(overwrite.id)
      .catch(() => null);

    if (!member) continue;

    const isStaff =
      member.permissions.has("MANAGE_CHANNELS") || member.user.bot;

    if (!isStaff) {
      ticketOwner = member.user;
      break;
    }
  }

  await sendTicketMessage({
    type: "Channel Ticket",
    guild: channel.guild.name,
    name: channel.name,
    creator: ticketOwner ? ticketOwner.username : "Unknown_username",
    creatorId: ticketOwner ? ticketOwner.id : null,
    directLink: `https://discord.com/channels/${channel.guild.id}/${channel.id}`,
    topicId: 11,
  });
});


cll.on("threadCreate", async (thread) => {

  console.log("📁 THREAD CREATED", thread);
  /*
  if (!thread.guild) return;
  await sendTicketMessage({
    type: "Thread Ticket",
    guild: thread.guild.name,
    creator: thread.name,
    topicId: 11,
  });
  */

});

cll.on("error", (error) => {
  console.error("An error occurred:", error);
});

const startDiscordBot = async () => {
  if (!filters)
    return console.log("⚠️ Filter list is empty for discord listening");
  cll
    .login(process.env.TOKEN)
    .then(async () => {
      console.log("✅ Discord logged in successfully! (" + cll.user.tag + ")");
    })
    .catch((err) => {
      console.error("📛 Failed to login discord:", err);
    });
};

module.exports = { startDiscordBot };