import { Colors } from "discord.js";
import { bar } from "../data.js";
import db from "../db.js";
import { is_string } from "../utils.js";

export async function display(poll) {
    if (is_string(poll)) poll = await db("polls").findOne({ id: poll });

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

    if (poll.type == "proposal") {
        return {
            embeds: [
                {
                    title: `**[ ${poll.id} ]**`,
                    description: `**${poll.question}**`,
                    color: 0x2d3136,
                },
            ],
        };
    }
}
