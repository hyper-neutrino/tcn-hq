import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Colors,
} from "discord.js";
import db from "../db.js";
import autocomplete_servers from "../lib/autocomplete_servers.js";
import { api, defer, ephemeral } from "../utils.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "bind",
    description: "bind an API role to an HQ role",
    dm_permission: false,
    default_member_permissions: "0",
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "server",
            description: "bind a server role",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "server",
                    description: "the name of the server to bind",
                    required: true,
                    autocomplete: true,
                },
                {
                    type: ApplicationCommandOptionType.Role,
                    name: "role",
                    description: "the role to bind (leave blank to unbind)",
                    required: false,
                },
                ephemeral,
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "position",
            description: "bind a position role",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "position",
                    description: "the position to bind",
                    required: true,
                    choices: ["owner", "advisor", "voter", "observer"].map(
                        (x) => ({
                            name: x,
                            value: x,
                        })
                    ),
                },
                {
                    type: ApplicationCommandOptionType.Role,
                    name: "role",
                    description: "the role to bind (leave blank to unbind)",
                    required: false,
                },
                ephemeral,
            ],
        },
    ],
};

export async function execute(cmd) {
    await defer(cmd);

    const sub = cmd.options.getSubcommand();

    let db_name, selector, message;
    const role = cmd.options.getRole("role");

    if (role) {
        let e;

        if ((e = await db("guild_bind").findOne({ role: role.id }))) {
            let guild;

            try {
                guild = await api(`/guilds/${e.guild}`);

                return {
                    embeds: [
                        {
                            title: "ERROR",
                            description: `That role is already bound to ${guild.name} (${guild.character}: \`${guild.id}\`)`,
                            color: Colors.Red,
                        },
                    ],
                };
            } catch {
                await db("guild_bind").findOneAndDelete({
                    role: role.id,
                });
            }
        }

        if ((e = await db("position_bind").findOne({ role: role.id }))) {
            return {
                embeds: [
                    {
                        title: "ERROR",
                        description: `That role is currently bound as the ${e.position} role.`,
                        color: Colors.Red,
                    },
                ],
            };
        }
    }

    if (sub == "server") {
        let guild;

        try {
            guild = await api(`/guilds/${cmd.options.getString("server")}`);
        } catch {
            return {
                embeds: [
                    {
                        title: "ERROR",
                        description: "That is not a valid server.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        db_name = "guild_bind";
        selector = { guild: guild.id };

        message = `server role for ${guild.name} (${guild.character}: \`${guild.id}\`)`;
    } else if (sub == "position") {
        const position = cmd.options.getString("position");

        db_name = "position_bind";
        selector = { position };

        message = `${position} role`;
    }

    if (role) {
        await db(db_name).findOneAndUpdate(
            selector,
            { $set: { role: role.id } },
            { upsert: true }
        );
    } else {
        await db(db_name).findOneAndDelete(selector);
    }

    return {
        embeds: [
            {
                title: "SUCCESS",
                description: `The ${message} has been ${
                    role ? `set to ${role}` : "unset"
                }.`,
                color: Colors.Green,
            },
        ],
    };
}

export const autocomplete = autocomplete_servers;
