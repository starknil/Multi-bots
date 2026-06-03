const { Client } = require("discord.js-selfbot-v13");
const filters = require("./config");
const { send } = require("./send");

const sendTicketMessage = async (data) => {
  console.log(data);
  const { type, guild, creator, creatorId, msg, directLink, _to, topicId } =
    data;
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
  await send(content, _to, topicId, { name: "Discord", id: data.id });
};

class DiscordBot {
  constructor(token, id, receiver, type = "auto") {
    this.id = id;
    this.token = token;
    this.receiver = receiver;
    this.type = type;
    this.client = new Client({
      checkUpdate: false,
    });
    this.registerEvents();
  }

  registerEvents() {
    this.client.on("guildMemberAdd", async (member) => {
      const { guild, user } = member;

      let content;

      if (this.client.user.id === user.id) {
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
      await send(content, this.receiver._to, this.receiver.newUserJoined, {
        name: "Discord",
        id: this.id,
      });
    });

    this.client.on("messageCreate", async (message) => {
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
          id: this.id,
          type: "Filtered Crypto Issue",
          guild: message.guild.name,
          creator: message.author.username,
          creatorId: message.author.id,
          msg: message.content,
          _to: this.receiver._to,
          topicId: this.receiver.filterDetected,
        },
        true,
      );
    });

    this.client.on("channelCreate", async (channel) => {
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
        id: this.id,
        type: "Channel Ticket",
        guild: channel.guild.name,
        name: channel.name,
        creator: ticketOwner ? ticketOwner.username : "Unknown_username",
        creatorId: ticketOwner ? ticketOwner.id : null,
        directLink: `https://discord.com/channels/${channel.guild.id}/${channel.id}`,
        _to: this.receiver._to,
        topicId: this.receiver.ticketCreated,
      });
    });

    this.client.on("threadCreate", async (thread) => {
      if (!thread.guild) return;
      await sendTicketMessage({
        id: this.id,
        type: "Thread Ticket",
        guild: thread.guild.name,
        creator: thread.name,
        _to: this.receiver._to,
        topicId: this.receiver.ticketCreated,
      });
    });

    this.client.on("error", (err) => {
      console.error("[Discord] [${this.id}] Error:", err);
    });
  }

  async start() {
    try {
      await this.client.login(this.token);
      const t = `[Discord] [${this.id}] ✅ Logged in as ${this.client.user.tag}!`;
      console.log(t);

      if (this.type === "manual") {
        await send(
          `✅ Discord bot started successfully. Logged in as ${this.client.user.tag}!`,
          this.receiver._to,
          null,
          { name: "Discord", id: this.id },
        );
      }
    } catch (err) {
      console.error(`[Discord] [${this.id}] 📛 Error:`, err.message);
      const t =
        this.type === "manual"
          ? `❌ Failed to start Discord bot. Error: ${err.message}`
          : `[Discord] [${this.id}] ❌ Failed to login: ${err.message}. Please remove and re-add account.`;
      await send(t, this.receiver._to, null, { name: "Discord", id: this.id });
    }
  }
}

module.exports = DiscordBot;