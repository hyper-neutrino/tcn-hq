import observers_info from "../../lib/observers_info.js";

export default async function (button) {
    await button.deferUpdate();
    await button.editReply(await observers_info());
}
