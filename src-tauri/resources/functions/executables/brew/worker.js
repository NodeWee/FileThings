async function main({ action, task }) {
    const utils = window.task_utils;
    await utils
        .init({
            task,
            action,
            tool_name: "tool.exe.brew",
            tool_title: "Homebrew",
        })
        .catch((err) => {
            task.result.status = "error";
            task.result.message = `[worker.js - init] ${err.toString()}`;
        });

    switch (action.name) {
        case "get_version":
            // models are no version, so just check if the file exists
            await get_version(task).catch((err) => {
                task.result.status = "error";
                task.result.message = `[worker.js - get_version] ${err.toString()}`;
                task.result.output = { version: "" }; // empty string means not available
            });
            break;
        default:
            task.result.status = "error";
            task.result.message = `[worker.js] The action ${action.name} is not supported`;
            break;
    }

    return task.result;
}

async function get_version(task) {
    const props = window.task_props;
    const methods = window.task_methods;
    const params = { arguments: ["-v"] };
    // execute the command to get the version
    let text = await methods
        .invoke(props.tool_name, params)
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            let t = err.message || err.toString();
            if (t.includes("install it")) {
                task.result.output = { version: "" }; // empty string means not available, 前端会根据这个值显示安装按钮
                return;
            }
            // else
            throw new Error(`Failed to get version: ${t}`);
        });

    if (!text) {
        task.result.output = { version: "" }; // empty string means not available
        return;
    }

    // extract the version
    const pattern = "(\\d+)\\.(\\d+)(?:\\.(\\d+))?";
    const captures = new RegExp(pattern).exec(text);
    const version = captures[0];
    task.result.output = { version: version };
}
