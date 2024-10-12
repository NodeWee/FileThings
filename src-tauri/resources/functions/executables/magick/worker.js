const TOOL_TITLE = "ImageMagick";
const TOOL_DIR_NAME = "imagemagick";

async function main({ action, task }) {
    const T = task.methods.translate;
    const utils = window.task_utils;
    const props = window.task_props;

    await utils
        .init({
            task,
            action,
            tool_name: "tool.exe.magick",
            tool_title: "ImageMagick",
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
            await install(task)
                .then(() => {
                    props.progress_current = props.progress_max;
                    task.result.output = { installed: true };
                    utils.update_progress("Installed");
                })
                .catch((err) => {
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
    const methods = window.task_methods;
    const props = window.task_props;
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
    //  example: Version: ImageMagick 7.1.1-34 Q16-H
    //  extract: 7.1.1
    const pattern = /ImageMagick (\d+\.\d+\.\d+)/;
    const captures = text.match(pattern);
    if (!captures) {
        throw new Error(`Failed to extract version from: ${text}`);
    }
    const version = captures[1];
    task.result.output = { version: version };
}

async function install(task) {
    const methods = window.task_methods;
    const T = methods.translate;
    const utils = window.task_utils;
    const props = window.task_props;
    props.progress_current += 1;
    utils.update_progress("Checking...");

    const platform = await methods
        .invoke("env.platform", {})
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            throw new Error(
                `${T("Failed to get platform:")} ${T(err.toString())}`
            );
        });
    props.progress_current += 1;

    if (platform === "macos") {
        await macos_install(task);
    } else if (platform === "windows") {
        await windows_install(task);
    } else {
        throw new Error(T("Unsupported platform: ") + platform);
    }
}

async function macos_install(task) {
    const props = window.task_props;
    const methods = window.task_methods;
    const T = methods.translate;
    const utils = window.task_utils;

    utils.update_progress("Installing...");
    await methods
        .invoke("tool.exe.brew", {
            arguments: ["install", "imagemagick"],
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
}

async function windows_install() {
    const props = window.task_props;
    const methods = window.task_methods;
    const T = methods.translate;
    const utils = window.task_utils;

    utils.update_progress("Checking...");
    // get system architecture
    const arch = await methods
        .invoke("env.arch", {})
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            throw new Error(
                T("Failed to get architecture:" + T(err.toString()))
            );
        });
    let exeArchName = "";
    if (arch === "x86_64") {
        exeArchName = "x64";
    } else if (arch === "aarch64") {
        exeArchName = "arm64";
    } else {
        throw new Error(T("Unsupported architecture:") + arch);
    }
    props.progress_current += 2;

    // 1st, try to download from official site
    utils.update_progress("Downloading...");
    const zip_filename = "ImageMagick-7.zip";
    let downloaded_file_path = null;
    await windows_download_from_official(exeArchName, zip_filename)
        .then((p) => {
            downloaded_file_path = p;
        })
        .catch(() => {
            // do nothing, continue to download from filethings
        });

    if (!downloaded_file_path) {
        props.progress_current += 5;
        utils.update_progress("Downloading...");
        // if failed, then try to download from filethings
        await windows_download_from_filethings(exeArchName, zip_filename)
            .then((p) => {
                downloaded_file_path = p;
            })
            .catch((err) => {
                throw new Error(
                    T(`Failed to download ${TOOL_TITLE}:`) + T(err.toString())
                );
            });
    }
    props.progress_current += 70;

    // clear existing installation
    utils.update_progress("Clearing existing installation");
    const exe_dir = await utils.join_path([props.app_data_dir, "tools", "exe"]);
    await utils.clear_specified_files(exe_dir, `(?i)^${TOOL_DIR_NAME}.*`);
    props.progress_current += 5;

    utils.update_progress("Unzipping...");
    // unzip
    await methods
        .invoke("zip.unzip_file", {
            input_file: downloaded_file_path,
            output_dir: exe_dir,
        })
        .catch((err) => {
            console.error(err);
            throw new Error(T("Failed to unzip file:" + T(err.toString())));
        });
    props.progress_current += 5;

    utils.update_progress("Unzipping...");
    // rename the dir
    const unzipped_dirname = await methods
        .invoke("dir.list", {
            input_dir: exe_dir,
            pattern: `(?i)^${TOOL_DIR_NAME}.*`,
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
    const to_dir = await utils.join_path([exe_dir, TOOL_DIR_NAME]);
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
        .clear_specified_files(download_dir, `(?i)^${TOOL_DIR_NAME}.*`)
        .catch((err) => {
            console.error(err);
            throw new Error(
                `Failed to clear downloaded files: ${err.toString()}`
            );
        });
}

async function windows_download_from_official(exeArchName, zip_filename) {
    const methods = window.task_methods;
    const utils = window.task_utils;
    const props = window.task_props;

    // download digest.rdf
    utils.update_progress("Downloading...");
    const digest_file = await utils.join_path([
        props.app_data_dir,
        "downloads",
        "digest.rdf",
    ]);
    const digest_url = "https://imagemagick.org/archive/binaries/digest.rdf";
    await methods
        .invoke("http.download_file", {
            url: digest_url,
            resume: false,
            output_file: digest_file,
        })
        .catch((err) => {
            throw new Error(`Failed to download digest.rdf: ${err.toString()}`);
        });
    props.progress_current += 5;

    // parse digest.rdf(read the file and get the download link)
    utils.update_progress("Downloading...");
    const file_content = await methods
        .invoke("file.read", {
            input_file: digest_file,
            format: "text",
        })
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            throw new Error(`Failed to read digest.rdf: ${err.toString()}`);
        });
    const pattern_str = `ImageMagick-7\\.\\d+\\.\\d+-\\d+-portable-Q16-HDRI-${exeArchName}\\.zip`;
    const pattern = new RegExp(pattern_str);
    // regex find all, then get last one as the latest version zip file
    const source_filename = file_content.match(pattern).pop();
    // delete "digest.rdf" file
    await methods
        .invoke("path.delete", {
            input_paths: [digest_file],
        })
        .catch((err) => {
            console.error(err);
            // continue
        });
    props.progress_current += 5;

    utils.update_progress("Downloading...");
    // download the zip file
    const zip_file_path = await utils.join_path([
        props.app_data_dir,
        "downloads",
        zip_filename,
    ]);
    const zip_file_url = `https://imagemagick.org/archive/binaries/${source_filename}`;
    await methods.invoke("http.download_file", {
        url: zip_file_url,
        resume: false,
        output_file: zip_file_path,
    });

    return zip_file_path;
}

async function windows_download_from_filethings(exeArchName, zip_filename) {
    const props = window.task_props;
    const methods = window.task_methods;
    const T = methods.translate;
    const utils = window.task_utils;

    utils.update_progress("Downloading...");
    const suffix_num_arr = ["001", "002", "003"];
    const url_prefix = "https://releases.filethings.net/external/";
    const percent_per_file = (80 - 6) / suffix_num_arr.length;
    for (let i = 0; i < suffix_num_arr.length; i++) {
        const url = url_prefix + zip_filename + "." + suffix_num_arr[i];
        let download_file = await utils.join_path([
            props.app_data_dir,
            "downloads",
            zip_filename + "." + suffix_num_arr[i],
        ]);
        await methods.invoke("http.download_file", {
            url: url,
            resume: false,
            output_file: download_file,
        });
        props.progress_current += percent_per_file;
        utils.update_progress("Downloading...");
    }

    utils.update_progress("Unzipping...");
    // join the files
    const first_zip_file = await utils.join_path([
        props.app_data_dir,
        "downloads",
        zip_filename + ".001",
    ]);
    const zip_file = await utils.join_path([
        props.app_data_dir,
        "downloads",
        zip_filename,
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
            throw new Error(T("Failed to join file:") + T(err.toString()));
        });

    return result_zip_file;
}
