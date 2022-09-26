import { ActivityType, Client, IntentsBitField } from "discord.js";

export default new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
    presence: {
        status: "online",
        activities: [{ type: ActivityType.Watching, name: "your votes" }],
    },
});
