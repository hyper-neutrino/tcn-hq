import { ApplicationCommandOptionType } from "discord.js";
import { get_council_members, get_voters } from "./lib/api.js";

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
    return `<t:${Math.round(date / 1000)}${format ? `:${format}` : ""}>`;
}

export function display_election_vote(poll, vote) {
    return poll.candidates
        .map(
            (candidate) =>
                `<@${candidate}>: ${
                    vote.abstain || vote.ranking[candidate] < 0
                        ? "[abstain]"
                        : vote.ranking[candidate] == 0
                        ? ":x:"
                        : `#${vote.ranking[candidate]}`
                }`
        )
        .join("\n");
}

export async function get_eligible(poll) {
    let eligible = (
        poll.restricted ? await get_voters() : await get_council_members()
    ).map((x) => x.id);

    if (poll.type == "election") {
        eligible = eligible.filter((x) => !poll.candidates.includes(x));
    }

    return eligible;
}
