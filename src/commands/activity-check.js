import { ApplicationCommandType } from "discord.js";
import client from "../client.js";
import db from "../db.js";
import { defer, ephemeral } from "../utils.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "activity-check",
    description: "check voting activity",
    dm_permission: false,
    default_member_permissions: "0",
    options: [ephemeral],
};

export async function execute(cmd) {
    await defer(cmd);

    const users = new Map();
    let polls = await db("polls").find({ open: false }).toArray();

    polls = polls.filter((x) => x.closed);
    polls.sort((x, y) => x.closed - y.closed);

    for (const poll of polls) {
        for (const { id } of poll.missing.concat(poll.voted)) {
            if (!users.has(id)) users.set(id, []);
        }
    }

    for (const poll of polls) {
        let waiting = new Set(users.keys());

        for (const { id } of poll.missing) {
            users.get(id).push("❌");
            waiting.delete(id);
        }

        for (const { id } of poll.voted) {
            users.get(id).push("✅");
            waiting.delete(id);
        }

        for (const id of waiting) {
            users.get(id).push(" ");
        }
    }

    let prefixes = [];
    const seqs = [];

    for (const [id, seq] of users.entries()) {
        let prefix;

        try {
            const user = await client.users.fetch(id);
            prefix = `${user.tag} (${user.id}): `;
        } catch {
            prefix = `Unknown User#0000 (${id}):`;
        }

        prefixes.push(prefix);
        seqs.push(seq);
    }

    const len = Math.max(...prefixes.map((prefix) => prefix.length));
    prefixes = prefixes.map((prefix) => prefix.padEnd(len));

    await cmd.editReply({
        files: [
            {
                attachment: Buffer.from(
                    "Most recent poll first.\n\n" +
                        prefixes
                            .map(
                                (prefix, index) =>
                                    `${prefix}${seqs[index].join("")}`
                            )
                            .sort()
                            .join("\n"),
                    "utf-8"
                ),
                name: "records.txt",
            },
        ],
    });
}
