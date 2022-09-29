import client from "../client.js";
import db from "../db.js";
import { get_eligible } from "../utils.js";

export default async function (poll, observer) {
    const userfetch = async (x) => {
        try {
            return await client.users.fetch(x);
        } catch {
            return { id: x, tag: "Unknown User#0000" };
        }
    };

    const eligible = await Promise.all(
        (await get_eligible(poll)).map(userfetch)
    );

    const candidates = {};

    if (poll.type == "election") {
        for (const candidate of await Promise.all(
            poll.candidates.map(userfetch)
        )) {
            candidates[candidate.id] = candidate;
        }
    }

    const votes = new Map();

    for (const ballot of await db("votes").find({ poll: poll.id }).toArray()) {
        votes.set(ballot.user, ballot);
    }

    const voted = [];
    const waiting = [];

    for (const user of eligible) {
        if (votes.has(user.id)) voted.push(user);
        else waiting.push(user);
    }

    voted.sort((a, b) => a.tag.localeCompare(b.tag));
    waiting.sort((a, b) => a.tag.localeCompare(b.tag));

    const data = { eligible, voted, waiting };

    if (poll.anonymous) {
        if (observer) {
            data.file =
                `Turnout: ${
                    Math.round((voted.length / eligible.length) * 10000) / 100
                }%\n\n` +
                voted
                    .concat(waiting)
                    .map(
                        (user) =>
                            `${votes.has(user.id) ? "✅" : "❌"} ${user.tag} (${
                                user.id
                            })`
                    )
                    .join("\n");
        } else {
            return false;
        }
    } else {
        data.file =
            `Turnout: ${
                Math.round((voted.length / eligible.length) * 10000) / 100
            }%\n\n` +
            (poll.type == "selection"
                ? `${poll.options
                      .map((line, index) => `${index + 1}. ${line}`)
                      .join("\n")}\n\n`
                : "") +
            voted
                .concat(waiting)
                .map(
                    (user) =>
                        `${votes.has(user.id) ? "✅" : "❌"} ${user.tag} (${
                            user.id
                        }): ${
                            votes.has(user.id)
                                ? ((ballot) =>
                                      ballot.abstain
                                          ? "⬜ abstain"
                                          : poll.type == "proposal"
                                          ? ballot.approve
                                              ? "🟩 YES"
                                              : "🟥 NO"
                                          : poll.type == "selection"
                                          ? ballot.choices
                                                .map(
                                                    (choice) =>
                                                        poll.options.indexOf(
                                                            choice
                                                        ) + 1
                                                )
                                                .sort()
                                                .join(", ") ||
                                            "(voted for no options)"
                                          : poll.type == "election"
                                          ? [
                                                [(x) => x > 0, "🟩", " > "],
                                                [(x) => x == 0, "🟥", ", "],
                                                [(x) => x < 0, "⬜", ", "],
                                            ]
                                                .map(([f, e, j]) =>
                                                    ((x) =>
                                                        x.length > 0
                                                            ? `${e}: ${x.join(
                                                                  j
                                                              )}`
                                                            : "")(
                                                        poll.candidates
                                                            .filter((x) =>
                                                                f(
                                                                    ballot
                                                                        .ranking[
                                                                        x
                                                                    ]
                                                                )
                                                            )
                                                            .sort(
                                                                (x, y) =>
                                                                    ballot
                                                                        .ranking[
                                                                        x
                                                                    ] -
                                                                    ballot
                                                                        .ranking[
                                                                        y
                                                                    ]
                                                            )
                                                            .map(
                                                                (x) =>
                                                                    candidates[
                                                                        x
                                                                    ].tag
                                                            )
                                                    )
                                                )
                                                .filter((x) => x)
                                                .join("; ")
                                          : "?")(votes.get(user.id))
                                : "no vote yet"
                        }`
                )
                .join("\n");
    }

    return data;
}
