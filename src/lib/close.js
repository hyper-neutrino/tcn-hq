import client from "../client.js";
import db from "../db.js";
import export_results from "./export_results.js";
import { display } from "./polls.js";

export default async function (poll) {
    const data = await export_results(poll, true);

    await client.log({
        embeds: [
            {
                title: `**Closed poll \`${poll.id}\`**`,
                description: `\`${poll.id}\` is now closed. Above are the records for who did and did not vote, out of people currently eligible.`,
                color: 0x2d3136,
            },
        ],
        files: [
            {
                attachment: Buffer.from(data.file),
                name: "voters.txt",
            },
        ],
    });

    await db("polls").findOneAndUpdate(
        { id: poll.id },
        {
            $set: {
                open: false,
                closed: poll.close,
                close: null,
                dm: null,
                valid:
                    data.voted.length * 100 >=
                    data.eligible.length * poll.quorum,
                voted: data.voted,
                missing: data.waiting,
            },
        }
    );

    poll = await db("polls").findOne({ id: poll.id });

    try {
        const channel = await client.channels.fetch(poll.channel);
        const message = await channel.messages.fetch(poll.message);
        await message.edit(await display(poll));
    } catch {
        const entry = await db("settings").findOne({ key: "vote-channel" });
        if (entry) {
            try {
                const channel = await client.channels.fetch(entry.value);
                await channel.send(await display(poll));
            } catch {}
        }
    }
}
