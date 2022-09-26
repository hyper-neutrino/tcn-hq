import { Colors, ComponentType } from "discord.js";
import client from "../client.js";
import { bar, characters } from "../data.js";
import { api } from "../utils.js";

export default async function () {
    try {
        const observers = (await api("/users")).filter((user) =>
            user.roles.includes("observer")
        );

        const users = new Map();

        for (const api_user of observers) {
            try {
                users.set(api_user.id, await client.users.fetch(api_user.id));
            } catch {}
        }

        const positions = new Map();

        for (const guild of await api("/guilds")) {
            for (const key of ["owner", "advisor"]) {
                if (positions.has(guild[key])) {
                    positions.set(
                        guild[key],
                        ":x: This user's position data contains errors. Use `/audit` to find all issues."
                    );
                } else {
                    positions.set(
                        guild[key],
                        `${
                            {
                                owner: "Server Owner",
                                advisor: "Council Advisor",
                            }[key]
                        } of ${guild.name} (${characters[guild.character].join(
                            " "
                        )} ${guild.character}: \`${guild.id}\`)`
                    );
                }
            }
        }

        return {
            embeds: [
                {
                    title: "Observers",
                    description: "",
                    fields: await Promise.all(
                        observers.map((api_user) =>
                            ((user) => ({
                                name: `_ _\n${
                                    user
                                        ? `Info for **${user.tag}**`
                                        : "**Missing User**"
                                }`,
                                value: `${
                                    user
                                        ? `${user} (${user.tag} \`${user.id}\`)`
                                        : `Missing user with ID \`${api_user.id}\``
                                }\n${positions.get(api_user.id)}`,
                            }))(users.get(api_user.id))
                        )
                    ),
                    color: 0x2d3136,
                    ...bar,
                },
            ],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.SelectMenu,
                            options: observers
                                .map((api_user) => users.get(api_user.id))
                                .filter((x) => x)
                                .map((user) => ({
                                    label: `Info: ${user.tag}`,
                                    value: user.id,
                                })),
                            customId: "::info/user-dropdown",
                        },
                    ],
                },
            ],
        };
    } catch (error) {
        console.error(error);

        return {
            embeds: [
                {
                    title: "ERROR",
                    description:
                        "An error occurred fetching or displaying the observer info.",
                    color: Colors.Red,
                },
            ],
        };
    }
}
