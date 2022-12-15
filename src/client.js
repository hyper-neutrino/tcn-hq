import { ActivityType, Client, IntentsBitField } from "discord.js";
import db from "./db.js";

Client.prototype.log = async function (message) {
    try {
        const { value } =
            (await db("settings").findOne({ key: "log-channel" })) ?? {};

        if (!value) return;

        const channel = await this.channels.fetch(value);

        if (!channel) return;

        return await channel.send(message);
    } catch {}
};

export default new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
    presence: {
        status: "online",
        activities: [{ type: ActivityType.Watching, name: "your votes" }],
    },
});
