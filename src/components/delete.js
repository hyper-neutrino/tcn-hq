import { Colors } from "discord.js";
import db from "../db.js";

export default async function (button, id) {
    await button.deferUpdate();
    await db("polls").findOneAndDelete({ id });

    await button.editReply({
        embeds: [
            {
                title: "Poll Deleted",
                description: `Deleted the poll with ID \`${id}\`.`,
                color: Colors.Red,
            },
        ],
        components: [],
    });
}
