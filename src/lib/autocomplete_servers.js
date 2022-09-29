import { guild_cache } from "../utils.js";
import { get_api_guilds } from "./api.js";

export default async function (cmd) {
    const focused = cmd.options.getFocused(true);

    let cache;
    if (focused.value || !(cache = guild_cache())) {
        cache = guild_cache(await get_api_guilds());
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
