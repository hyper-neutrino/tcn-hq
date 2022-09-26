import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChannelType,
    Colors,
} from "discord.js";
import db from "../db.js";
import { defer, ephemeral } from "../utils.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "set-vote-channel",
    description: "set the vote channel",
    options: [
        {
            type: ApplicationCommandOptionType.Channel,
            name: "channel",
            description: "the channel",
            channel_types: [ChannelType.GuildText],
            required: true,
        },
        ephemeral,
    ],
};

export async function execute(cmd) {
    await defer(cmd);

    const channel = cmd.options.getChannel("channel");

    await db("settings").findOneAndUpdate(
        { key: "vote-channel" },
        { $set: { value: channel.id } },
        { upsert: true }
    );

    return {
        embeds: [
            {
                title: "Set Vote Channel",
                description: `The vote channel is now ${channel}`,
                color: Colors.Green,
            },
        ],
    };
}
