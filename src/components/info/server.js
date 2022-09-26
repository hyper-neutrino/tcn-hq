import guild_info from "../../lib/guild_info.js";

export default async function (button, id) {
    await button.deferUpdate();
    await button.editReply(await guild_info(id));
}
