import { Colors } from "discord.js";
import user_info from "../../lib/user_info.js";

export default async function (dropdown) {
    await dropdown.deferUpdate();

    try {
        const user = await dropdown.client.users.fetch(dropdown.values[0]);
        await dropdown.editReply(await user_info(user));
    } catch {
        await dropdown.editReply({
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
