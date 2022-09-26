import { Colors } from "discord.js";

export default async function (button) {
    await button.update({
        embeds: [
            {
                title: "Canceled",
                description: "This operation was canceled by the user.",
                color: Colors.Red,
            },
        ],
        components: [],
    });
}
