import { ButtonStyle, Colors, ComponentType, TextInputStyle } from "discord.js";
import client from "../client.js";
import db from "../db.js";
import { is_council_member, is_voter } from "../lib/api.js";
import { display } from "../lib/polls.js";
import { display_election_vote } from "../utils.js";

export default async function (interaction, id, key) {
    const poll = await db("polls").findOne({ id });
    if (!poll) return;

    if (
        poll.restricted
            ? !(await is_voter(interaction.user))
            : !(await is_council_member(interaction.user))
    ) {
        if (!(await is_voter(interaction.user))) {
            return await interaction.reply({
                embeds: [
                    {
                        title: "Not Allowed",
                        description:
                            "You are not eligible to vote on this poll.",
                        color: Colors.Red,
                    },
                ],
                ephemeral: true,
            });
        }
    }

    if (
        poll.type == "election" &&
        poll.candidates.includes(interaction.user.id)
    ) {
        return await interaction.reply({
            embeds: [
                {
                    title: "Not Allowed",
                    description:
                        "You may not vote in elections in which you are a candidate.",
                    color: Colors.Red,
                },
            ],
            ephemeral: true,
        });
    }

    if (!poll.open) {
        return await interaction.reply({
            embeds: [
                {
                    title: "Poll Closed",
                    description: "This poll is closed already.",
                    color: Colors.Red,
                },
            ],
            ephemeral: true,
        });
    }

    if (key == "election") {
        const vote = await db("votes").findOne({
            poll: id,
            user: interaction.user.id,
        });

        return await interaction.showModal({
            customId: `::vote:${id}:election-submit`,
            title: "Election",
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.TextInput,
                            style: TextInputStyle.Paragraph,
                            customId: "ranks",
                            label: `1 = BEST, ${poll.candidates.length} = WORST`,
                            value: (
                                await Promise.all(
                                    poll.candidates.map(
                                        async (candidate) =>
                                            `${
                                                (
                                                    await client.users.fetch(
                                                        candidate
                                                    )
                                                ).tag
                                            }: ${
                                                vote?.ranking[candidate] ?? ""
                                            }`
                                    )
                                )
                            ).join("\n"),
                        },
                    ],
                },
            ],
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const $set = { abstain: key == "abstain" };

    let message;

    if (key == "abstain") {
        message = "You have chosen to __abstain__.";
    } else if (poll.type == "proposal") {
        $set.approve = key == "yes";
        message = `Your vote has been set to __${key}__.`;
    } else if (poll.type == "selection") {
        $set.choices = interaction.values ?? [];
        message = `Your vote has been set to ${$set.choices
            .map((value) => `__${value}__`)
            .join(", ")}.`;
    } else if (poll.type == "election") {
        const lines = interaction.fields
            .getTextInputValue("ranks")
            .split(/\n/)
            .map((line) => line.trim())
            .filter((x) => x);

        const tagmap = {};
        for (const candidate of poll.candidates) {
            tagmap[(await client.users.fetch(candidate)).tag] = candidate;
        }

        const ranking = {};
        const ranked = new Set();

        for (const line of lines) {
            const match = line.match(/([^#]+#\d{4})\s*:\s*(.*)/);

            if (!match) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Unrecognized Line",
                            description: `The following line was not understood:\n\n\`\`\`\n${line}\n\`\`\``,
                            color: Colors.Red,
                        },
                    ],
                });
            }

            const tag = match[1];
            const rank = match[2];

            const uid = tagmap[tag];
            if (!uid) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Invalid Candidate",
                            description: `${tag} is not a recognized candidate in this election.`,
                            color: Colors.Red,
                        },
                    ],
                });
            }

            if (!rank) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Missing Rank",
                            description: `You did not rank ${tag}. If you wish to vote against them (\`0\`) or abstain (\`-1\`), please do so manually.`,
                            color: Colors.Red,
                        },
                    ],
                });
            }

            const value = parseInt(rank);

            if (isNaN(value)) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Unrecognized Rank Format",
                            description: `The following rank was not recognized (was expecting a number):\n\n\`\`\`\n${rank}\n\`\`\``,
                            color: Colors.Red,
                        },
                    ],
                });
            }

            if (value > poll.candidates.length) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Rank Out Of Range",
                            description: `Expected a rank between 1 and ${poll.candidates.length}; got ${value} instead.`,
                            color: Colors.Red,
                        },
                    ],
                });
            }

            if (ranking[uid] !== undefined) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Duplicate Rank",
                            description: `You ranked <@${uid}> (${tag} \`${uid}\`) multiple times.`,
                            color: Colors.Red,
                        },
                    ],
                });
            }

            if (ranked.has(value)) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Repeated Ranking",
                            description: `You ranked multiple users #${value}.`,
                            color: Colors.Red,
                        },
                    ],
                });
            }

            ranking[uid] = value;
            ranked.add(value);
        }

        if (poll.candidates.some((uid) => ranking[uid] === undefined)) {
            return await interaction.editReply({
                embeds: [
                    {
                        title: "Missing Rankings",
                        description: "You did not rank all of the candidates.",
                        color: Colors.Red,
                    },
                ],
            });
        }

        for (let x = Math.max(...ranked) - 1; x >= 1; x--) {
            if (!ranked.has(x)) {
                return await interaction.editReply({
                    embeds: [
                        {
                            title: "Gaps in Rankings",
                            description:
                                "Your rankings should go down one at a time without gaps (e.g. #1, #3 is invalid).",
                            color: Colors.Red,
                        },
                    ],
                });
            }
        }

        $set.ranking = ranking;

        message = `Your vote has been updated:\n\n${display_election_vote(
            poll,
            { ranking }
        )}`;
    }

    await db("votes").findOneAndUpdate(
        { poll: id, user: interaction.user.id },
        { $set },
        { upsert: true }
    );

    await interaction.editReply({
        embeds: [
            { title: "Success", description: message, color: Colors.Green },
        ],
    });

    await interaction.message.edit(await display(poll));
}
