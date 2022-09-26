import { Colors } from "discord.js";
import user_info from "../../lib/user_info.js";

export default async function (button, id) {
    await button.deferUpdate();

    try {
        const user = await button.client.users.fetch(id);
        await button.editReply(await user_info(user));
    } catch {
        await button.editReply({
            embeds: [
                {
                    title: "Error",
                    description: `Failed to fetch user data for ID \`${uid}\`.`,
                    color: Colors.Red,
                },
            ],
        });

        throw error;
    }
}
