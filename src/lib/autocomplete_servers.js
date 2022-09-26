import { api, guild_cache } from "../utils.js";

export default async function (cmd) {
    const focused = cmd.options.getFocused(true);

    let cache;
    if (focused.value || !(cache = guild_cache())) {
        cache = guild_cache(await api("/guilds"));
    }

    const query = focused.value.toLowerCase();

    return cache
        .filter(
            (guild) =>
                guild.name.toLowerCase().indexOf(query) != -1 ||
                guild.character.toLowerCase().indexOf(query) != -1
        )
        .map((guild) => ({
            name: `${guild.character}: ${guild.name}`,
            value: guild.id,
        }))
        .slice(0, 25);
}
