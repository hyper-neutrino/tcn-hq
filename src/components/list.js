import db from "../db.js";
import { is_observer } from "../lib/api.js";
import export_results from "../lib/export_results.js";

export default async function (button, id) {
    await button.deferReply({ ephemeral: true });

    const poll = await db("polls").findOne({ id });
    if (!poll) return;

    const data = await export_results(poll, await is_observer(button.user));

    if (!data) {
        return await button.editReply({
            embeds: [
                {
                    title: "Forbidden",
                    description:
                        "You may not view individual votes for anonymous polls.",
                    color: 0x2d3136,
                },
            ],
        });
    }

    await button.editReply({
        files: [
            {
                attachment: Buffer.from(data.file, "utf-8"),
                name: "voters.txt",
            },
        ],
    });
}
