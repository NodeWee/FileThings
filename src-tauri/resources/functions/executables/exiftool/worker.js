async function main({ action, task }) {
    const T = task.methods.translate; // 此时还没有初始化，所以不能使用window.task_methods.translate
    const utils = window.task_utils;

    await utils
        .init({
            task,
            action,
            tool_name: "tool.exe.exiftool",
            tool_title: "Exiftool",
        })
        .catch((err) => {
            task.result.status = "error";
            task.result.message = `[init] ${T(err.toString())}`;
        });

    switch (action.name) {
        case "get_version":
            await get_version(task).catch((err) => {
                task.result.status = "error";
                task.result.message = `[version] ${T(err.toString())}`;
                task.result.output = { version: "" }; // empty string means not available
            });
            break;
        case "install":
            await install(task).catch((err) => {
                task.result.status = "error";
                task.result.message = `[install] ${T(err.toString())}`;
            });
            break;
        default:
            task.result.status = "error";
            task.result.message = `[worker.js] ${T(
                "The action {0} is not supported",
                [action.name]
            )}`;
            break;
    }

    return task.result;
}

async function get_version(task) {
    const props = window.task_props;
    const methods = window.task_methods;
    const T = methods.translate;
    const params = { arguments: ["-ver"] };
    // execute the command to get the version
    let text = await methods
        .invoke(props.tool_name, params)
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            let msg = err.message || err.toString();
            if (msg.includes("install it")) {
                task.result.output = { version: "" }; // empty string means not available, 前端会根据这个值显示安装按钮
                return;
            }
            // else
            throw new Error(T("Failed to get version:") + T(msg));
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

async function install(task) {
    const props = window.task_props;
    const utils = window.task_utils;
    const methods = window.task_methods;
    const T = methods.translate;

    props.progress_current += 1;
    utils.update_progress("Checking platform");

    const platform = await methods
        .invoke("env.platform", {})
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            throw new Error(T("Failed to get platform:") + T(err.toString()));
        });

    if (platform === "macos") {
        props.progress_current += 5;
        utils.update_progress("Installing...");
        await methods
            .invoke("tool.exe.brew", {
                arguments: ["install", "exiftool"],
            })
            .then(() => {
                task.result.output = { installed: true };
            })
            .catch((err) => {
                let msg = T(err.toString());
                throw new Error(msg);
            });
    } else if (platform === "windows") {
        props.progress_current += 5;
        utils.update_progress("Downloading...");
        const download_file = await utils.join_path([
            props.app_data_dir,
            "downloads",
            "exiftool.zip",
        ]);
        await methods
            .invoke("http.download_file", {
                url: "https://releases.filethings.net/external/exiftool-12.83.zip",
                resume: false,
                output_file: download_file,
            })
            .catch((err) => {
                console.error(err);
                throw new Error(
                    `Failed to download ${props.tool_title}: ${err.toString()}`
                );
            });
        props.progress_current += 65;

        // clear existing installation
        utils.update_progress("Clearing existing installation");
        const exe_dir = await utils.join_path([
            props.app_data_dir,
            "tools",
            "exe",
        ]);
        await utils.clear_specified_files(exe_dir, "(?i)^exiftool.*$");
        props.progress_current += 5;

        utils.update_progress("Unzipping...");
        const unzip_output_dir = await utils.join_path([
            props.app_data_dir,
            "tools",
            "exe",
            "exiftool",
        ]);
        await methods
            .invoke("zip.unzip_file", {
                input_file: download_file,
                output_dir: unzip_output_dir,
            })
            .catch((err) => {
                console.error(err);
                throw new Error(
                    `Failed to unzip ${props.tool_title}: ${err.toString()}`
                );
            });

        props.progress_current = props.progress_max;
        utils.update_progress("Installed");

        // clear downloaded files
        const download_dir = await utils.join_path([
            props.app_data_dir,
            "downloads",
        ]);
        await utils
            .clear_specified_files(download_dir, "(?i)^exiftool.*$")
            .catch((err) => {
                console.error(err);
                throw new Error(
                    `Failed to clear downloaded files: ${err.toString()}`
                );
            });

        // Done.
    } else {
        throw new Error(
            `${props.tool_name} is not supported on platform: ${platform}`
        );
    }
}
