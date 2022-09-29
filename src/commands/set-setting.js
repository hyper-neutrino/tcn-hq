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
    name: "set-setting",
    description: "set a setting",
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "channel",
            description: "set a channel setting",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "key",
                    description: "the setting key",
                    required: true,
                    choices: ["vote-channel", "log-channel"].map((x) => ({
                        name: x,
                        value: x,
                    })),
                },
                {
                    type: ApplicationCommandOptionType.Channel,
                    name: "channel",
                    description: "the channel",
                    channel_types: [ChannelType.GuildText],
                    required: true,
                },
                ephemeral,
            ],
        },
    ],
};

export async function execute(cmd) {
    await defer(cmd);

    const key = cmd.options.getString("key");

    let value;

    switch (cmd.options.getSubcommand()) {
        case "channel":
            value = cmd.options.getChannel("channel").id;
    }

    await db("settings").findOneAndUpdate(
        { key },
        { $set: { value } },
        { upsert: true }
    );

    return {
        embeds: [
            {
                title: "Set Setting",
                description: `\`${key}\` => \`${value}\``,
                color: Colors.Green,
            },
        ],
    };
}
