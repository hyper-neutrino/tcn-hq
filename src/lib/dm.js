import client from "../client.js";
import db from "../db.js";
import { get_eligible } from "../utils.js";

export default async function (poll) {
    const failed = [];

    const voted = new Set();

    for (const ballot of await db("votes").find({ poll: poll.id }).toArray()) {
        voted.add(ballot.user);
    }

    for (const id of await get_eligible(poll)) {
        if (voted.has(id)) continue;

        let user;

        try {
            user = await client.users.fetch(id);
        } catch {
            continue;
        }

        try {
            // await user.send(
            //     `You have not yet voted on \`${poll.id}\`: __${poll.title}__. Please vote as soon as possible: <${poll.url}>. Thank you.`
            // );

            await client.log({
                content: `[DM] ${user.tag} (\`${user.id}\`): \`${poll.id}\``,
            });
        } catch {
            failed.push(user);
        }
    }

    if (failed.length > 0) {
        const entry = await db("settings").findOne({ key: "vote-channel" });

        let channel;

        if (entry) {
            try {
                channel = await client.channels.fetch(entry.value);
            } catch {}
        }

        if (channel) {
            await channel.send({
                content: `${failed.join(", ")}: You have not yet voted on **\`${
                    poll.id
                }\`** (<${
                    poll.url
                }>). Tip: if you open your DMs for this server, this bot will DM you instead of pinging you publicly.`,
            });
        } else {
            await client.log({
                content: `Could not DM ${failed.join(
                    ", "
                )}, and vote channel is not set.`,
                allowedMentions: { parse: [] },
            });
        }
    }

    await db("polls").findOneAndUpdate({ id: poll.id }, { $set: { dm: null } });
}
