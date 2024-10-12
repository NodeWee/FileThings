import { action_call, config_call } from "./caller";

import { BsFile } from "react-icons/bs";
import { check } from "@tauri-apps/plugin-updater";
import toast from "react-hot-toast";

export async function getFontData(fontFullName) {
    if (!fontFullName) {
        throw new Error("fontFullName is required.");
    }

    const fonts = window.creator.fonts;
    if (!fonts || !fonts.system || Object.keys(fonts.system).length === 0) {
        throw new Error("fonts.system is not ready.");
    }
    if (!fonts.dataCache) {
        fonts.dataCache = {};
    }

    // data cache exists, return it
    let data = fonts.dataCache[fontFullName];
    if (data) {
        return data;
    }

    // else, find font path (window.creator.fonts.system is an object)
    const fontPath = Object.values(fonts.system).find(
        (font) => font.full_name === fontFullName
    )?.path;
    if (!fontPath) {
        throw new Error(
            "No font path found for font full name: " + fontFullName
        );
    }
    // load font data from file
    return await action_call("file.read", {
        input_file: fontPath,
        format: "bytes",
    })
        .then((rsp) => {
            const data = new Uint8Array(rsp.content);
            fonts.dataCache[fontFullName] = data; // cache data
            return data;
        })
        .catch((err) => {
            console.error(err);
            toast.error(`Failed to read font file:${fontPath}`);
        });
}

export async function do_auto_download_ai_model(stateProps) {
    const dependencies = window.app.dependencies;
    const {
        dependsAiModelName,
        setDependsAiModelName,
        T,
        setShowNotifyDependsAiModel,
        setDependencies,
    } = stateProps;

    const cur_depends = dependencies.ai_model[dependsAiModelName];

    cur_depends.downloading = true;

    select_file_function_name({ value: "", stateProps }); // to clear error and task result dialog if any

    let toast_id = toast.loading(
        T("app.tools.auto-downloading", [dependsAiModelName]),
        {
            duration: 0,
        }
    );

    await action_call("download.ai_model", {
        model_name: dependsAiModelName,
    })
        .then((rsp) => {
            setDependsAiModelName(null);
            setShowNotifyDependsAiModel(false);

            toast.success(
                T("app.tools.download-success", [dependsAiModelName]),
                {
                    id: toast_id,
                    duration: 3000,
                }
            );
            cur_depends.downloading = false;
            cur_depends.available = true;
            log_info({ "ai-model.download - success": rsp });
        })
        .catch((e) => {
            toast.error(
                T("app.tools.download-error", [
                    dependsAiModelName,
                    e.toString(),
                ]),
                { id: toast_id, duration: 7000 }
            );
            cur_depends.downloading = false;
            cur_depends.available = false;
            console.error("ai-model.download error:", e);
        })
        .finally(() => {
            setDependencies((prev) => ({ ...prev, ...dependencies }));
        });
}

export async function parse_paths_for_task({ stateProps }) {
    const { setSupportedFileFunctions, setParsedPaths } = stateProps;
    if (window.fileProcessor.paths.selected.length === 0) {
        return;
    }

    await action_call("path.parse_for_task", {
        input_paths: window.fileProcessor.paths.selected,
    })
        .then((res) => {
            // res: {paths,file_functions,is_multiple_files,is_multiple_dirs}
            window.fileProcessor.paths.parsed = res.content;
            setParsedPaths(window.fileProcessor.paths.parsed.paths);
            setSupportedFileFunctions(window.fileProcessor.paths.parsed.file_functions);
        })
        .catch((e) => {
            console.error("path.parse_for_task error:", e);
        });
}

export function open_link(url) {
    let url_with_ref;
    if (url.startsWith("mailto:")) {
        url_with_ref = url;
    }
    if (url.startsWith("https://github.com")) {
        url_with_ref = url;
    }
    else if (url.startsWith("https://filethings.net")) {
        if (url.includes("?")) {
            url_with_ref = url + `&referrer=app`;
        } else {
            url_with_ref = url + `?referrer=app`;
        }
    
    } else {
        if (url.includes("?")) {
            url_with_ref = url + `&referrer=https://filethings.net/?app`;
        } else {
            url_with_ref = url + `?referrer=https://filethings.net/?app`;
        }
    }


    action_call("url.open", {
        url: url_with_ref,
    }).catch((e) => {
        console.error("open.link error:", e);
        toast.error(e.toString(), { duration: 3000 });
    });
}

export async function update_selected_paths({
    action = "append",
    paths,
    notify = false,
    stateProps,
}) {
    const { setParsedPaths, setSupportedFileFunctions, setSelectedTaskId, T } =
        stateProps;
    // if paths is a Set, convert it to an array
    if (paths instanceof Set) {
        paths = Array.from(paths);
    }

    // re-init current prepared task
    window.fileTaskManager.init_prepared();
    setSelectedTaskId(null); // clear selected task

    // update paths
    if (action == "clear") {
        window.fileProcessor.paths.selected = [];
        window.fileProcessor.paths.parsed = {};
    } else if (action === "replace") {
        window.fileProcessor.paths.selected = paths;
    } else if (action === "append") {
        window.fileProcessor.paths.selected = window.fileProcessor.paths.selected.concat(paths);
    } else if (action === "remove") {
        window.fileProcessor.paths.selected = window.fileProcessor.paths.selected.filter(
            (item) => !paths.includes(item)
        );
    } else {
        console.error("update_selected_paths action not supported:", action);
    }

    // remove duplicate paths
    window.fileProcessor.paths.selected = Array.from(new Set(window.fileProcessor.paths.selected));

    if (notify) {
        toast(T("tasks.selected-files-changed"), {
            icon: <BsFile />,
            duration: 2000,
        });
    }

    // clear selected file_function, task result
    select_file_function_name({ value: "", stateProps });
    // clear available things
    window.fileProcessor.paths.parsed = [];
    setSupportedFileFunctions({});

    if (window.fileProcessor.paths?.selected?.length > 0) {
        await parse_paths_for_task({ stateProps }).catch((e) => {
            console.error("parse_paths_for_task error:", e);
        });
        // set @from_format for file functions' variable when_matches/when_not_matches
        window.fileTaskManager.prepared.args["@from_format"] =
            window.fileProcessor.paths.parsed.file_exts;
    } else {
        setParsedPaths([]);
    }
}

export async function get_file_info(path) {
    if (!window.fileInfos) {
        window.fileInfos = {};
    }

    if (window.fileInfos[path]) {
        return window.fileInfos[path];
    }

    let file_info = {
        path: path,
        basic: {
            loading: false,
            data: {},
        },
        metadata: {
            loading: false,
            data: {},
        },
        hash: {
            md5: { loading: false, data: "" },
            sha1: { loading: false, data: "" },
            sha256: { loading: false, data: "" },
        },
        counts: null,
    };

    await action_call("file.info.basic", {
        input_file: path,
    })
        .then((rsp) => {
            file_info.basic.data = rsp.content;
        })
        .catch((e) => {
            file_info.basic.error = e.message || e.toString();
        })
        .finally(() => {
            file_info.basic.loading = false;
        });

    await action_call("file.info.metadata", {
        input_file: path,
    })
        .then((res) => {
            let metadata = res.content;
            if (metadata) {
                // modify all xattr(metadata["Extended file attributes"]) keys (replace '.' with '_') for i18n
                let xattrs = metadata["Extended file attributes"];
                if (xattrs) {
                    let new_xattrs = {};
                    for (let key in xattrs) {
                        new_xattrs[key.replace(/\./g, "_")] = xattrs[key];
                    }
                    metadata["Extended file attributes"] = new_xattrs;
                }
            }
            file_info.metadata.data = metadata;
        })
        .catch((e) => {
            file_info.metadata.error = e.message || e.toString();
        })
        .finally(() => {
            file_info.metadata.loading = false;
        });

    window.fileInfos[path] = file_info;

    return file_info;
}

export function select_file_function_name({ value, stateProps }) {
    const { setSelectedFileFunctionName } = stateProps;
    value = value || "";
    window.fileTaskManager.prepared.file_function_name = value;

    setSelectedFileFunctionName(value);
}

export async function check_app_updates({
    interval_hours = 12, // 0 means check immediately
    manual_check = false, // if true, means must check updates but not auto install
    stateProps,
}) {
    if (window.app.version.updating) return;
    if (window.app.version.checking) return;

    const ui_cfg = window.app.config.ui;
    if (!ui_cfg.switchAutoUpdate && !manual_check) return;

    // === CHECK INTERVAL
    ui_cfg.appUpdatesCheckingLastTime = ui_cfg.appUpdatesCheckingLastTime
        ? ui_cfg.appUpdatesCheckingLastTime
        : 0;

    if (interval_hours > 0) {
        const now = new Date().getTime();
        if (
            now - ui_cfg.appUpdatesCheckingLastTime <
            1000 * 3600 * interval_hours
        ) {
            console.log(
                `Skip check app updates, less than ${interval_hours} hours`
            );
            return;
        }

        // save last check time
        ui_cfg.appUpdatesCheckingLastTime = now;
        set_config_items("ui", { appUpdatesCheckingLastTime: now });
    }

    // === CHECK UPDATES
    console.log("Checking app updates...");
    const { updateAppVersion } = stateProps;
    updateAppVersion("checking", true);
    const update = await check()
        .catch((e) => {
            console.error("Failed to check app updates:", e);
            log_error({ "check.updates - error": e.toString() });
            return;
        })
        .finally(() => {
            updateAppVersion("checking", false);
        });

    if (!update?.available) {
        // checking success, but no updates available
        updateAppVersion("latest", window.app.version.current); // for showing already latest version message
        return;
    }

    updateAppVersion("latest", update.version);
    updateAppVersion("newVerInfo", update.body);

    // === AUTO UPDATE
    if (only_check_not_update) return;
    if (stateProps.platform === "macos") {
        // macOS can auto update by Tauri updater
        console.log("Downloading and installing update...");
        updateAppVersion("updating", true);
        update
            .downloadAndInstall()
            .then(() => {
                console.log("Downloaded and installed update");
                updateAppVersion("newAppReady", true);
            })
            .catch((e) => {
                console.error("Failed to download and install update:", e);
                log_error({
                    "update.downloadAndInstall - error": e.toString(),
                });
                return;
            })
            .finally(() => {
                updateAppVersion("updating", false);
            });
    } else if (stateProps.platform === "windows") {
        // Windows update method: auto download installer, then notify user to install
        updateAppVersion("updating", true);
        let installer_path = "";
        await action_call("updater.download_app_windows_installer", {
            version: update.version,
        })
            .then((rsp) => {
                installer_path = rsp.content;
                // update these info, Settings page will update the message of new version available
                updateAppVersion("newAppDownloaded", true);
                updateAppVersion("installerPath", installer_path);
                // show a pop up window to notify user to install
                stateProps.setIsNoticeInstallNewApp(true);
            })
            .catch((e) => {
                console.error(
                    "updater.download_app_windows_installer error:",
                    e
                );
                log_error({
                    "updater.download_app_windows_installer - error": e,
                });
            })
            .finally(() => {
                updateAppVersion("updating", false);
            });
    }
}

export async function auto_update_functions(interval_hours) {
    if (window.app.isUpdating.functions) return;
    if (!window.app.config.ui.switchAutoUpdate) return;

    // check interval
    const ui_cfg = window.app.config.ui;
    ui_cfg.functionsUpdateLastTime = ui_cfg.functionsUpdateLastTime
        ? ui_cfg.functionsUpdateLastTime
        : 0;
    if (interval_hours > 0) {
        const now = new Date().getTime();
        if (
            now - ui_cfg.functionsUpdateLastTime <
            1000 * 3600 * interval_hours
        ) {
            console.log(
                `Skip update functions, less than ${interval_hours} hours`
            );
            return;
        }

        // update last check time
        ui_cfg.functionsUpdateLastTime = now;
        set_config_items("ui", { functionsUpdateLastTime: now });
    }

    window.app.isUpdating.functions = true;
    await action_call("updater.update_functions", {})
        .then((rst) => {
            console.log("functions.update ok:", rst);
        })
        .catch((e) => {
            console.error("functions.update error:", e);
            log_error({ "functions.update - error": e.toString() });
        })
        .finally(() => {
            window.app.isUpdating.functions = false;
        });
}

export async function auto_update_i18n(interval_hours) {
    if (window.app.isUpdating.i18n) return;
    if (!window.app.config.ui.switchAutoUpdate) return;

    // check interval
    const ui_cfg = window.app.config.ui;
    ui_cfg.i18nUpdateLastTime = ui_cfg.i18nUpdateLastTime
        ? ui_cfg.i18nUpdateLastTime
        : 0;
    if (interval_hours > 0) {
        const now = new Date().getTime();
        if (now - ui_cfg.i18nUpdateLastTime < 1000 * 3600 * interval_hours) {
            console.log(`Skip update i18n, less than ${interval_hours} hours`);
            return;
        }

        // update last check time
        ui_cfg.i18nUpdateLastTime = now;
        set_config_items("ui", { i18nUpdateLastTime: now });
    }

    window.app.isUpdating.i18n = true;
    await action_call("updater.update_i18n", {})
        .then((rst) => {
            console.log("i18n.update ok:", rst);
        })
        .catch((e) => {
            console.error("i18n.update error:", e);
            log_error({ "i18n.update - error": e.toString() });
        })
        .finally(() => {
            window.app.isUpdating.i18n = false;
        });
}

export function locate_paths(paths) {
    action_call("path.locate", {
        input_paths: paths,
    }).catch((e) => {
        console.error("path.locate error:", e);
        toast.error(e.toString(), { duration: 3000 });
    });
}

export function make_unused_file_path({ path, ext, callback }) {
    action_call("path.make_unused_path", {
        input_file: path,
        ext: ext,
    })
        .then((rsp) => {
            if (callback) {
                callback(rsp.content);
            }
        })
        .catch((e) => {
            console.error("make_unused_file_path error:", e);
            log_error({ "make_unused_file_path error": e });
        });
}

export async function get_config_all(scope) {
    return await config_call({
        scope: scope,
        action: "get_all",
    })
        .then((rsp) => {
            // console.log("get_config_all ok:", rsp);
            return rsp;
        })
        .catch((e) => {
            console.error("get_config_all error:", e);
            log_error({ "get_config_all error": e });
            throw e;
        });
}

// export async function get_config_items(scope, keys) {
//     return config_call({
//         scope: scope,
//         action: "get",
//         args: keys,
//     })
//         .then((rsp) => {
// console.log("get_config_items ok:", rsp);
//             return rsp;
//         })
//         .catch((e) => {
//             console.error("get_config_items error:", e);
//             log_error({ "get_config_items error": e });
//             throw e;
//         });
// }

// export async function set_config_all(scope, items) {
//     return config_call({
//         scope: scope,
//         action: "set_all",
//         args: items,
//     })
//         .then((rsp) => {
// console.log("set_config_all ok:", rsp);
//             return rsp;
//         })
//         .catch((e) => {
//             console.error("set_config_all error:", e);
//             log_error({ "set_config_all error": e });
//             throw e;
//         });
// }

export async function set_config_items(scope, keyValMap) {
    return config_call({
        scope: scope,
        action: "set",
        params: keyValMap,
    })
        .then((rsp) => {
            // console.log("set_config_items ok:", rsp);
            return rsp;
        })
        .catch((e) => {
            console.error("set_config_items error:", e);
            log_error({ "set_config_items error": e });
            // throw e;
        });
}

export function log_info(message) {
    action_call("log.info", { message }).catch((e) => {
        console.error("Failed to log info:", e);
    });
}

export function log_error(message) {
    const msg = `[FRONTEND] ${JSON.stringify(message)}`;
    action_call("log.error", { msg }).catch((e) => {
        console.error("Failed to call log error:", e.toString());
    });
}
