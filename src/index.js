import {
    ActivityType,
    Client,
    Colors,
    ComponentType,
    IntentsBitField,
    InteractionType,
} from "discord.js";
import fs from "fs";
import client from "./client.js";
import config from "./config.js";
import guild_info from "./lib/guild_info.js";
import observers_info from "./lib/observers_info.js";
import user_info from "./lib/user_info.js";
import { is_string, respond } from "./utils.js";

process.on("uncaughtException", (error) => console.error(error));

const commands = [];
const command_map = new Map();

for (const name of fs.readdirSync("src/commands")) {
    const { command, execute, autocomplete } = await import(
        `./commands/${name}`
    );

    commands.push(command);
    command_map.set(command.name, { execute, autocomplete });
}

client.once("ready", async () => {
    await client.application.commands.set(commands);
    client.hq = await client.guilds.fetch("804174916907171870");

    console.log("HQ Systems are ready.");
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.type == InteractionType.ApplicationCommand) {
        const { execute } = command_map.get(interaction.commandName) ?? {};

        if (execute) {
            try {
                let data = await execute(interaction);

                if (data) {
                    if (is_string(data)) data = { content: data };
                    await respond(interaction, data);
                }
            } catch (error) {
                await respond(interaction, {
                    embeds: [
                        {
                            title: "Error",
                            description:
                                "An error occurred executing this command.",
                            color: Colors.Red,
                        },
                    ],
                });

                throw error;
            }
        }
    } else if (
        interaction.type == InteractionType.ApplicationCommandAutocomplete
    ) {
        const { autocomplete } = command_map.get(interaction.commandName) ?? {};

        if (autocomplete) {
            let data = await autocomplete(interaction);
            if (data) {
                if (!Array.isArray(data)) data = [data];
                await interaction.respond(
                    data.map((x) => (is_string(x) ? { name: x, value: x } : x))
                );
            }
        }
    } else if (interaction.type == InteractionType.MessageComponent) {
        if (interaction.customId.startsWith(":")) {
            let cmd = interaction.customId.substring(1);
            const [id, key, ...args] = cmd.split(/:/);

            if (id && interaction.user.id != id) return;

            let handle;

            try {
                ({ default: handle } = await import(`./components/${key}.js`));
            } catch {
                return;
            }

            if (handle) await handle(interaction, ...args);
        }
    }
});

await client.login(config.discord_token);
