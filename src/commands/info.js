import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
} from "discord.js";
import autocomplete_servers from "../lib/autocomplete_servers.js";
import guild_info from "../lib/guild_info.js";
import observers_info from "../lib/observers_info.js";
import user_info from "../lib/user_info.js";
import { defer, ephemeral } from "../utils.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "info",
    description: "get TCN info for an entity",
    dm_permission: false,
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "user",
            description: "get TCN info for a user",
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "user",
                    description: "the user to fetch",
                    required: true,
                },
                ephemeral,
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "server",
            description: "get TCN info for a server",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "server",
                    description: "the server to fetch",
                    required: true,
                    autocomplete: true,
                },
                ephemeral,
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "observers",
            description: "get info on the current observers",
            options: [ephemeral],
        },
    ],
};

export async function execute(cmd) {
    await defer(cmd);
    const sub = cmd.options.getSubcommand();

    if (sub == "user") {
        const user = cmd.options.getUser("user");
        await user.fetch();

        return await user_info(user);
    } else if (sub == "server") {
        return await guild_info(cmd.options.getString("server"));
    } else if (sub == "observers") {
        return await observers_info();
    }
}

export const autocomplete = autocomplete_servers;
