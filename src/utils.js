import { ApplicationCommandOptionType } from "discord.js";
import fetch from "node-fetch";
import config from "./config.js";

export async function api(route) {
    const response = await fetch(
        `https://api.teyvatcollective.network${route}`,
        { headers: { Authorization: config.api_token } }
    );

    if (!response.ok) {
        throw `API did not return OK:\n- route: ${route}\n- ${response.status}: ${response.statusText}`;
    }

    return await response.json();
}

export async function defer(interaction, ephemeral) {
    await interaction.deferReply({
        ephemeral: ephemeral ?? !!interaction.options.getBoolean("ephemeral"),
    });
}

export async function respond(interaction, data) {
    if (interaction.options.getBoolean("ephemeral")) {
        data.ephemeral = true;
    }

    try {
        await interaction.reply(data);
    } catch {
        await interaction.editReply(data);
    }
}

export function is_string(object) {
    return object instanceof String || typeof object == "string";
}

export const ephemeral = {
    name: "ephemeral",
    description: "whether or not to hide the message",
    type: ApplicationCommandOptionType.Boolean,
};

let _cache;

export function guild_cache(data) {
    return (_cache = data ?? _cache);
}

export function timestamp(date, format = "F") {
    date = date?.getTime?.() ?? date;
    return `<t:${Math.floor(date / 1000)}${format ? `:${format}` : ""}>`;
}
