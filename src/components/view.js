import db from "../db.js";
import { is_council_member, is_voter } from "../lib/api.js";
import { display_election_vote } from "../utils.js";

export default async function (button, id) {
    await button.deferReply({ ephemeral: true });

    const poll = await db("polls").findOne({ id });
    if (!poll) return;

    if (
        poll.restricted
            ? !(await is_voter(button.user))
            : !(await is_council_member(button.user))
    ) {
        return await button.editReply({
            embeds: [
                {
                    title: "**You are not eligible!**",
                    description: "You are not eligible to vote on this poll.",
                    color: 0x2d3136,
                },
            ],
        });
    }

    if (poll.type == "election" && poll.candidates.includes(button.user.id)) {
        return await button.editReply({
            embeds: [
                {
                    title: "**You are not eligible!**",
                    description:
                        "You may not vote in elections in which you are a candidate.",
                    color: 0x2d3136,
                },
            ],
            ephemeral: true,
        });
    }

    const vote = await db("votes").findOne({ poll: id, user: button.user.id });

    if (!vote) {
        return await button.editReply({
            embeds: [
                {
                    title: "**You have not voted!**",
                    description: "You have not voted yet.",
                    color: 0x2d3136,
                },
            ],
        });
    }

    if (vote.abstain) {
        return await button.editReply({
            embeds: [
                {
                    title: "**Abstained**",
                    description:
                        "You have abstained, meaning you have voted (in accordance with the voting requirement) and your vote is counted towards quorum, but your ballot will be ignored in the tally.",
                    color: 0x2d3136,
                },
            ],
        });
    }

    let message;

    if (poll.type == "proposal") {
        message = vote.approve ? ":arrow_up: Yes" : ":arrow_down: No";
    } else if (poll.type == "selection") {
        message =
            vote.choices.length == 0
                ? "You voted for none of the options."
                : vote.choices.length == 1
                ? vote.choices[0]
                : vote.choices.map((x) => `- ${x}`).join("\n");
    } else if (poll.type == "election") {
        message = display_election_vote(poll, vote);
    }

    await button.editReply({
        embeds: [
            { title: "**Your Vote**", description: message, color: 0x2d3136 },
        ],
    });
}
