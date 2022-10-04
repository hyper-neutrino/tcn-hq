import { ButtonStyle, Colors, ComponentType } from "discord.js";
import client from "../client.js";
import db from "../db.js";
import { get_eligible, is_string, timestamp } from "../utils.js";

export async function display(poll) {
    poll = await db("polls").findOne({ id: poll?.id ?? poll });

    if (!poll) {
        return {
            embeds: [
                {
                    title: "Missing Poll",
                    description: `This poll could not be located. It may have been deleted.`,
                    color: Colors.Red,
                },
            ],
        };
    }

    let fields = [];
    let rows = [];

    const settings = {};

    const results = await tally(poll);

    if (poll.type == "proposal") {
        rows.push([
            {
                type: ComponentType.Button,
                style: ButtonStyle.Success,
                customId: `::vote:${poll.id}:yes`,
                emoji: "⬆️",
                disabled: !poll.open,
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Danger,
                customId: `::vote:${poll.id}:no`,
                emoji: "⬇️",
                disabled: !poll.open,
            },
        ]);

        if (poll.live || poll.valid) {
            fields.push({
                name: "**Results**",
                value: `${
                    results.yes + results.no == 0
                        ? `:arrow_up: 0 \`${"-".repeat(25)}\` 0 :arrow_down:`
                        : `:arrow_up: ${results.yes} \`${"█"
                              .repeat(
                                  Math.round(
                                      (results.yes /
                                          (results.yes + results.no)) *
                                          25
                                  )
                              )
                              .padEnd(25, " ")}\` ${results.no} :arrow_down:`
                }\n\nApproval: ${
                    Math.round(
                        (results.yes / (results.yes + results.no || 1)) * 10000
                    ) / 100
                }%\nAbstain: ${results.abstain}`,
            });
        }
    } else if (poll.type == "selection") {
        settings.min = Math.min(poll.min, poll.options.length);
        settings.max = Math.min(poll.max, poll.options.length);

        rows.push([
            {
                type: ComponentType.SelectMenu,
                customId: `::vote:${poll.id}:select`,
                options: poll.options.map((option) => ({
                    label: option,
                    value: option,
                })),
                min_values: settings.min,
                max_values: settings.max,
                disabled: !poll.open,
            },
        ]);

        if (poll.live || poll.valid) {
            fields.push({
                name: "**Results**",
                value:
                    poll.options
                        .map(
                            (x) =>
                                `${x}: ${results.selections[x]} / ${
                                    results.voted - results.abstain
                                } (${
                                    Math.round(
                                        (results.selections[x] /
                                            (results.voted - results.abstain ||
                                                1)) *
                                            10000
                                    ) / 100
                                }%)`
                        )
                        .join("\n") + `\n\nAbstain: ${results.abstain}`,
            });
        }
    } else if (poll.type == "election") {
        rows.push([
            {
                type: ComponentType.Button,
                style: ButtonStyle.Success,
                customId: `::vote:${poll.id}:election`,
                emoji: "🗳️",
                label: "VOTE/CHANGE YOUR VOTE",
                disabled: !poll.open,
            },
        ]);

        fields.push({
            name: "**Election System Info**",
            value: `When you click \`vote\`: next to each candidate's name, enter their rank (from 1 - ${poll.candidates.length}), 0 to vote against them, and -1 to abstain from voting for them specifically. You may also abstain from all candidates at once with the abstain button (there is no difference between doing this and entering -1 for everyone).`,
        });

        const users = {};

        for (const id of poll.candidates) {
            users[id] = await client.users.fetch(id);
        }

        if (poll.live || poll.valid) {
            fields.push({
                name: "**Results**",
                value: poll.candidates
                    .sort((a, b) =>
                        ((x, y) =>
                            (x.no >= x.yes
                                ? y.no >= y.yes
                                    ? 0
                                    : 1
                                : y.no >= y.yes
                                ? -1
                                : 0) || y.points - x.points)(
                            results.candidates[a],
                            results.candidates[b]
                        )
                    )
                    .map(
                        (id) =>
                            `${users[id]} (${users[id].tag}): ${((x) =>
                                `${
                                    x.yes + x.no
                                        ? `\`${x.points} pt${
                                              x.points == 1 ? "" : "s"
                                          }\` - \`${x.yes}-${x.no}\` (${
                                              Math.round(
                                                  (x.yes /
                                                      (x.yes + x.no || 1)) *
                                                      10000
                                              ) / 100
                                          }%) approval`
                                        : "no votes"
                                } - abstain: ${x.abstain}`)(
                                results.candidates[id]
                            )}`
                    )
                    .join("\n"),
            });
        }
    }

    return {
        embeds: [
            {
                title: `**[ ${poll.id} ]** | Turnout: ${
                    Math.round(
                        (results.voted / results.eligible.size) * 10000
                    ) / 100
                }%`,
                description: `**${poll.title}**`,
                color: 0x2d3136,
                fields: [
                    ...fields,
                    {
                        name: "**Details**",
                        value: [
                            poll.anonymous
                                ? "Your vote is anonymous. Observers can see who has voted."
                                : "Your vote is visible to everyone.",
                            poll.live
                                ? "This poll's results update in real-time."
                                : "This poll's results are hidden until the poll closes with sufficient voter turnout.",
                            poll.restricted
                                ? "This poll is restricted to voters."
                                : "This poll is open to all council members.",
                            poll.quorum
                                ? `This poll requires ${poll.quorum}% turnout.`
                                : "This poll has no voter turnout requirement.",
                            poll.type == "selection"
                                ? settings.min == settings.max
                                    ? `You must select ${settings.min} option${
                                          settings.min == 1 ? "" : "s"
                                      }.`
                                    : `You may select between ${settings.min} and ${settings.max} options.`
                                : "",
                            poll.type == "election"
                                ? poll.seats == 1
                                    ? "There is one position available."
                                    : poll.seats > poll.candidates.length
                                    ? `There are ${
                                          poll.seats
                                      } positions available (but only ${
                                          poll.candidates.length
                                      } candidate${
                                          poll.candidates.length == 1 ? "" : "s"
                                      })`
                                    : `There are ${poll.seats} positions available.`
                                : "",
                        ]
                            .filter((x) => x)
                            .map((x) => `- ${x}`)
                            .join("\n"),
                    },
                    {
                        name: "**Deadline**",
                        value: `${timestamp(poll.close)} (${timestamp(
                            poll.close,
                            "R"
                        )})`,
                    },
                ],
            },
        ],
        components: [
            ...rows,
            [
                ...(settings.min == 0
                    ? [
                          {
                              type: ComponentType.Button,
                              style: ButtonStyle.Danger,
                              customId: `::vote:${poll.id}:select:`,
                              label: "VOTE FOR NONE",
                              disabled: !poll.open,
                          },
                      ]
                    : []),
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Primary,
                    customId: `::vote:${poll.id}:abstain`,
                    label: "ABSTAIN",
                    disabled: !poll.open,
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    customId: `::view:${poll.id}`,
                    label: "VIEW YOUR VOTE",
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    customId: `::list:${poll.id}`,
                    label: "LIST VOTERS",
                },
            ],
        ].map((row) => ({ type: ComponentType.ActionRow, components: row })),
    };
}

export async function tally(poll) {
    const eligible = new Set(await get_eligible(poll));

    const ballots = (
        await db("votes").find({ poll: poll.id }).toArray()
    ).filter((vote) => eligible.has(vote.user));

    const results = { voted: ballots.length, eligible, abstain: 0 };

    switch (poll.type) {
        case "proposal":
            results.yes = results.no = 0;

            for (const ballot of ballots) {
                if (ballot.abstain) results.abstain++;
                else results[ballot.approve ? "yes" : "no"]++;
            }

            break;
        case "selection":
            results.selections = {};
            poll.options.forEach((option) => (results.selections[option] = 0));

            for (const ballot of ballots) {
                if (ballot.abstain) results.abstain++;
                else {
                    for (const choice of ballot.choices) {
                        results.selections[choice]++;
                    }
                }
            }

            break;
        case "election":
            results.candidates = {};

            for (const candidate of poll.candidates) {
                results.candidates[candidate] = {
                    yes: 0,
                    no: 0,
                    abstain: 0,
                    points: 0,
                };
            }

            for (const ballot of ballots) {
                if (ballot.abstain) results.abstain++;
                else {
                    for (const candidate of poll.candidates) {
                        const slot = results.candidates[candidate];
                        const value = ballot.ranking[candidate];

                        if (value > 0) {
                            slot.yes++;
                            slot.points += poll.candidates.length + 1 - value;
                        } else if (value == 0) slot.no++;
                        else slot.abstain++;
                    }
                }
            }

            if (results.abstain > 0) {
                poll.candidates.forEach(
                    (candidate) =>
                        (results.candidates[candidate].abstain +=
                            results.abstain)
                );
            }

            delete results.abstain;
            break;
    }

    return results;
}
