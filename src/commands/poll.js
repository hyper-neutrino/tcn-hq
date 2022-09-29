import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ButtonStyle,
    Colors,
    ComponentType,
} from "discord.js";
import db from "../db.js";
import { get_api_guilds } from "../lib/api.js";
import { display } from "../lib/polls.js";
import { defer } from "../utils.js";

const id_auto = {
    type: ApplicationCommandOptionType.String,
    name: "id",
    description: "poll ID",
    dm_permission: false,
    default_member_permissions: "0",
    required: true,
    autocomplete: true,
};

const base_options = [
    {
        type: ApplicationCommandOptionType.String,
        name: "id",
        description: "poll ID",
        required: true,
        max_length: 32,
    },
    {
        type: ApplicationCommandOptionType.String,
        name: "title",
        description: "the title of the poll",
        required: true,
        max_length: 512,
    },
    {
        type: ApplicationCommandOptionType.Boolean,
        name: "anonymous",
        description: "should voters' choices be anonymous?",
        required: true,
    },
    {
        type: ApplicationCommandOptionType.Boolean,
        name: "live",
        description:
            "should vote summaries update live or stay hidden until the poll closes?",
        required: true,
    },
    {
        type: ApplicationCommandOptionType.Boolean,
        name: "restricted",
        description:
            "should only voters be allowed to vote (as opposed to all council members)?",
        required: true,
    },
    {
        type: ApplicationCommandOptionType.Integer,
        name: "quorum",
        description:
            "what is the minimum voter turnout required for the vote to be valid?",
        required: true,
        choices: [
            { name: "75%", value: 75 },
            { name: "60%", value: 60 },
            { name: "none", value: 0 },
        ],
    },
];

const options = {
    proposal: [...base_options],
    selection: [
        ...base_options,
        {
            type: ApplicationCommandOptionType.Integer,
            name: "min",
            description:
                "the minimum number of options that must be chosen (default 1)",
            required: false,
            min_value: 0,
        },
        {
            type: ApplicationCommandOptionType.Integer,
            name: "max",
            description:
                "the maximum number of options that must be chosen (default 1)",
            required: false,
            min_value: 1,
        },
    ],
    election: [
        ...base_options,
        {
            type: ApplicationCommandOptionType.Integer,
            name: "seats",
            description: "the number of available observer positions",
            required: true,
            min_value: 1,
        },
    ],
};

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "poll",
    description: "manage polls",
    dm_permission: false,
    options: [
        {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: "create",
            description: "create a poll",
            options: Object.keys(options).map((name) => ({
                type: ApplicationCommandOptionType.Subcommand,
                name,
                description: `create a ${name} poll`,
                options: options[name],
            })),
        },
        {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: "edit",
            description: "edit a poll",
            options: Object.keys(options).map((name) => ({
                type: ApplicationCommandOptionType.Subcommand,
                name,
                description: `edit a ${name} poll`,
                options: [
                    id_auto,
                    ...options[name]
                        .slice(1)
                        .map((option) => ({ ...option, required: false })),
                ],
            })),
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "delete",
            description: "delete a poll",
            options: [id_auto],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "post",
            description: "post a poll",
            options: [
                id_auto,
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "duration",
                    description:
                        "duration to keep the poll open (hours) (0 to never close)",
                    required: true,
                    min_value: 0,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "dm",
                    description:
                        "hours before the poll closes to auto-DM missing voters",
                    required: false,
                    min_value: 1,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "set-options",
            description: "set the options for a selection poll",
            options: [
                id_auto,
                ...new Array(24).fill(0).map((_, x) => ({
                    type: ApplicationCommandOptionType.String,
                    name: `option-${x + 1}`,
                    description: `option #${x + 1}`,
                    required: x < 2,
                    max_length: 100,
                })),
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "set-candidates",
            description: "set the candidates for an election",
            options: [
                id_auto,
                ...new Array(24).fill(0).map((_, x) => ({
                    type: ApplicationCommandOptionType.User,
                    name: `candidate-${x + 1}`,
                    description: `candidate #${x + 1}`,
                    required: x < 1,
                    max_length: 100,
                })),
            ],
        },
    ],
};

export async function execute(cmd) {
    const subgroup = cmd.options.getSubcommandGroup();
    const sub = cmd.options.getSubcommand();

    if (subgroup == "create") {
        const poll = { id: cmd.options.getString("id") };

        if (await db("polls").findOne(poll)) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description: "This ID is already in use.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        poll.type = sub;
        poll.title = cmd.options.getString("title");
        poll.anonymous = cmd.options.getBoolean("anonymous");
        poll.live = cmd.options.getBoolean("live");
        poll.restricted = cmd.options.getBoolean("restricted");
        poll.quorum = cmd.options.getInteger("quorum");

        if (poll.type == "selection") {
            poll.min = cmd.options.getInteger("min") ?? 1;
            poll.max = cmd.options.getInteger("max") ?? poll.min;

            if (poll.min > poll.max) {
                return {
                    embeds: [
                        {
                            title: "Error",
                            description:
                                "The minimum number of options must be no greater than the maximum.",
                            color: Colors.Red,
                        },
                    ],
                };
            }
        } else if (poll.type == "election") {
            poll.seats = cmd.options.getInteger("seats") ?? 1;
        }

        await db("polls").insertOne(poll);

        return {
            embeds: [
                {
                    title: "Poll Created",
                    description: `Created a poll with ID \`${poll.id}\`. ${
                        {
                            selection:
                                "Remember to set the options with `/poll set-options`.",
                            election:
                                "Remember to set the candidates with `/poll set-candidates`.",
                        }[poll.type] ?? ""
                    }`,
                    color: Colors.Green,
                },
            ],
        };
    } else if (subgroup == "edit") {
        const id = cmd.options.getString("id");
        const poll = await db("polls").findOne({ type: sub, id });

        if (!poll) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description:
                            "No poll found with that ID and that type.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        const $set = {};

        $set.title = cmd.options.getString("title") ?? poll.title;
        $set.anonymous = cmd.options.getBoolean("anonymous") ?? poll.anonymous;
        $set.live = cmd.options.getBoolean("live") ?? poll.live;
        $set.restricted =
            cmd.options.getBoolean("restricted") ?? poll.restricted;
        $set.quorum = cmd.options.getInteger("quorum") ?? poll.quorum;

        if (poll.type == "selection") {
            $set.min = cmd.options.getInteger("min") ?? poll.min;
            $set.max =
                cmd.options.getInteger("max") ?? Math.max($set.min, poll.max);

            if ($set.min > $set.max) {
                return {
                    embeds: [
                        {
                            title: "Error",
                            description:
                                "The minimum number of options must be no greater than the maximum.",
                            color: Colors.Red,
                        },
                    ],
                };
            }
        } else if (poll.type == "election") {
            $set.seats = cmd.options.getInteger("seats") ?? poll.seats;
        }

        await db("polls").findOneAndUpdate({ id }, { $set });

        return {
            embeds: [
                {
                    title: "Poll Updated",
                    description: `Edited the poll with ID \`${poll.id}\`. ${
                        {
                            selection:
                                "Remember to set the options with `/poll set-options` if you haven't already.",
                            election:
                                "Remember to set the candidates with `/poll set-candidates` if you haven't already.",
                        }[poll.type] ?? ""
                    }`,
                    color: Colors.Green,
                },
            ],
        };
    } else if (sub == "set-options") {
        const id = cmd.options.getString("id");
        const poll = await db("polls").findOne({ type: "selection", id });

        if (!poll) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description:
                            "No selection poll found with that ID (you can only `set-options` for selection polls).",
                        color: Colors.Red,
                    },
                ],
            };
        }

        const options = new Array(24)
            .fill(0)
            .map((_, x) => cmd.options.getString(`option-${x + 1}`))
            .filter((x) => x);

        if (new Set(options).size != options.length) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description: "Selection poll options must be unique.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        await db("polls").findOneAndUpdate(
            { id },
            {
                $set: {
                    options,
                },
            }
        );

        return {
            embeds: [
                {
                    title: "Poll Updated",
                    description: `Set the options for the poll with ID \`${poll.id}\`.`,
                    color: Colors.Green,
                },
            ],
        };
    } else if (sub == "set-candidates") {
        const id = cmd.options.getString("id");
        const poll = await db("polls").findOne({ type: "election", id });

        if (!poll) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description:
                            "No election poll found with that ID (you can only `set-candidates` for elections).",
                        color: Colors.Red,
                    },
                ],
            };
        }

        const eligible = new Set(
            (await get_api_guilds())
                .map((guild) => [guild.owner, guild.advisor])
                .flat()
                .filter((x) => x)
        );

        const candidates = new Array(24)
            .fill(0)
            .map((_, x) => cmd.options.getUser(`candidate-${x + 1}`)?.id)
            .filter((x) => x);

        if (candidates.some((x) => !eligible.has(x))) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description:
                            "Only TCN council members may run in observer elections.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        if (new Set(candidates).size != candidates.length) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description: "Election candidates must be unique.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        await db("polls").findOneAndUpdate({ id }, { $set: { candidates } });

        return {
            embeds: [
                {
                    title: "Poll Updated",
                    description: `Set the candidates for the poll with ID \`${poll.id}\`.`,
                    color: Colors.Green,
                },
            ],
        };
    } else if (sub == "delete") {
        const id = cmd.options.getString("id");

        const poll = await db("polls").findOne({ id });

        if (!poll) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description: "No poll found with that ID.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        return {
            embeds: [
                {
                    title: "Confirm Deletion",
                    description: `Confirm that you want to delete the poll with ID \`${poll.id}\`:\n\n**${poll.title}**`,
                    color: Colors.Orange,
                },
            ],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Danger,
                            label: "Delete",
                            customId: `:${cmd.user.id}:delete:${poll.id}`,
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Secondary,
                            label: "Cancel",
                            customId: `:${cmd.user.id}:cancel`,
                        },
                    ],
                },
            ],
        };
    } else if (sub == "post") {
        await defer(cmd);

        const id = cmd.options.getString("id");
        const duration = cmd.options.getInteger("duration");
        const dm = cmd.options.getInteger("dm");

        const poll = await db("polls").findOne({ id });

        if (!poll) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description: "No poll found with that ID.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        if (poll.type == "selection") {
            if (!poll.options?.length) {
                return {
                    embeds: [
                        {
                            title: "Error",
                            description:
                                "Please set the poll's options first (`/poll set-options`).",
                            color: Colors.Red,
                        },
                    ],
                };
            }
        }

        if (poll.type == "election") {
            if (!poll.candidates?.length) {
                return {
                    embeds: [
                        {
                            title: "Error",
                            description:
                                "Please set the poll's candidates first (`/poll set-candidates`).",
                            color: Colors.Red,
                        },
                    ],
                };
            }
        }

        const entry = await db("settings").findOne({ key: "vote-channel" });

        if (!entry?.value) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description: "The vote channel has not been set.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        const channel = cmd.client.channels.cache.get(entry.value);

        if (!channel) {
            return {
                embeds: [
                    {
                        title: "Error",
                        description:
                            "The previously set vote channel is missing.",
                        color: Colors.Red,
                    },
                ],
            };
        }

        poll.open = true;
        poll.valid = false;

        const target = await channel.send(await display(poll));

        const $set = {
            message: target.id,
            channel: target.channel.id,
            url: target.url,
            open: true,
            closed: undefined,
            valid: false,
            voted: undefined,
            missing: undefined,
        };

        $set.close = new Date();
        $set.close.setHours($set.close.getHours() + duration);

        if (dm) {
            $set.dm = new Date();
            $set.dm.setHours($set.dm.getHours() + duration - dm);
        }

        await db("polls").findOneAndUpdate({ id }, { $set });

        return {
            embeds: [
                {
                    title: "Posted",
                    description: `Poll posted [here](${target.url})`,
                    color: Colors.Green,
                    url: target.url,
                },
            ],
        };
    }
}

export async function autocomplete(cmd) {
    let sub = cmd.options.getSubcommand();
    sub =
        {
            "set-options": "selection",
            "set-candidates": "election",
            delete: "",
            post: "",
        }[sub] ?? sub;

    const query = cmd.options.getFocused().toLowerCase();

    return (
        await db("polls")
            .find(sub ? { type: sub } : {})
            .toArray()
    )
        .map((entry) => entry.id)
        .filter((x) => x.toLowerCase().indexOf(query) != -1);
}
