async function main({ action, task }) {
    const T = task.methods.translate;
    const utils = window.task_utils;
    await utils
        .init({
            task,
            action,
            tool_name: "tool.exe.ffmpeg",
            tool_title: "FFmpeg",
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
}

async function get_version(task) {
    const props = window.task_props;
    const methods = window.task_methods;
    const params = { arguments: ["-version"] };
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
    //  text sample: "ffmpeg version 7.0.1 Copyright (c) 2000-2024 the FFmpeg developers\n...."
    //  extract the version number: 7.0.1
    const captures = text.match(/ffmpeg version (\d+\.\d+\.\d+)/i);
    if (!captures) {
        throw new Error(`Failed to extract version from: ${text}`);
    }
    const version = captures[1];
    task.result.output = { version: version };
}

async function install(task) {
    const props = window.task_props;
    const methods = window.task_methods;
    const T = methods.translate;
    const utils = window.task_utils;

    props.progress_current += 1;
    utils.update_progress("Checking platform");

    const platform = await methods
        .invoke("env.platform", {})
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            throw new Error(`Failed to get platform: ${err.toString()}`);
        });

    if (platform === "macos") {
        props.progress_current += 5;
        utils.update_progress("Installing...");
        await methods
            .invoke("tool.exe.brew", {
                arguments: ["install", "ffmpeg"],
            })
            .then(() => {
                props.progress_current = props.progress_max;
                utils.update_progress("Installed");
                task.result.output = { installed: true };
            })
            .catch((err) => {
                let msg = T(err.toString());
                throw new Error(msg);
            });
    } else if (platform === "windows") {
        props.progress_current += 5;
        utils.update_progress("Downloading...");
        const suffix_num_arr = ["001", "002", "003", "004"];
        const file_name = "ffmpeg-7.0.1-essentials_build.zip";
        const url_prefix = "https://releases.filethings.net/external/";
        const percent_per_file = (80 - 6) / suffix_num_arr.length;
        for (let i = 0; i < suffix_num_arr.length; i++) {
            const url = url_prefix + file_name + "." + suffix_num_arr[i];
            let download_file = await utils.join_path([
                props.app_data_dir,
                "downloads",
                file_name + "." + suffix_num_arr[i],
            ]);
            await methods
                .invoke("http.download_file", {
                    url: url,
                    resume: false,
                    output_file: download_file,
                })
                .catch((err) => {
                    throw new Error(
                        `Failed to download ${
                            props.tool_title
                        }: ${err.toString()}`
                    );
                });
            props.progress_current += percent_per_file;
            utils.update_progress("Downloading...");
        }

        // clear existing installation
        utils.update_progress("Clearing existing installation");
        const exe_dir = await utils.join_path([
            props.app_data_dir,
            "tools",
            "exe",
        ]);
        await utils.clear_specified_files(exe_dir, "(?i)^ffmpeg.*$");
        props.progress_current += 5;

        utils.update_progress("Unzipping...");
        // join the files
        const first_zip_file = await utils.join_path([
            props.app_data_dir,
            "downloads",
            file_name + ".001",
        ]);
        const zip_file = await utils.join_path([
            props.app_data_dir,
            "downloads",
            file_name,
        ]);
        let result_zip_file = await methods
            .invoke("file.binary.join", {
                input_file: first_zip_file,
                output_file: zip_file,
            })
            .then((rsp) => {
                return rsp.output_paths[0];
            })
            .catch((err) => {
                console.error(err);
                throw new Error(`Failed to join file: ${err.toString()}`);
            });
        props.progress_current += 5;

        utils.update_progress("Unzipping...");
        // unzip
        await methods
            .invoke("zip.unzip_file", {
                input_file: result_zip_file,
                output_dir: exe_dir,
            })
            .catch((err) => {
                console.error(err);
                throw new Error(`Failed to unzip file: ${err.toString()}`);
            });
        props.progress_current += 5;

        utils.update_progress("Unzipping...");
        // rename the dir
        const unzipped_dirname = await methods
            .invoke("dir.list", {
                input_dir: exe_dir,
                pattern: "(?i)^ffmpeg.*",
                is_full_path: false,
            })
            .then((rst) => {
                return rst.content[0];
            })
            .catch((err) => {
                console.error(err);
                throw new Error(`Failed to list dir: ${err.toString()}`);
            });
        const from_dir = await utils.join_path([exe_dir, unzipped_dirname]);
        const to_dir = await utils.join_path([exe_dir, "ffmpeg"]);
        await methods.invoke("path.rename", {
            input_path: from_dir,
            output_path: to_dir,
        });

        props.progress_current = props.progress_max;
        utils.update_progress("Installed");

        // clear downloaded files
        const download_dir = await utils.join_path([
            props.app_data_dir,
            "downloads",
        ]);
        await utils
            .clear_specified_files(download_dir, "(?i)^ffmpeg.*$")
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
