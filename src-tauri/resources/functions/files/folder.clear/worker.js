async function main({ action, task }) {
    const utils = window.task_utils;
    // const props = window.task_props;
    await utils.init({ task, action }).catch((err) => {
        task.result.status = "error";
        task.result.message = `[worker.js - init] ${err.toString()}`;
    });

    // VALIDATE THE PARAMETERS
    if (
        !action.parameters.input_paths ||
        action.parameters.input_paths.length < 1
    ) {
        task.result.status = "error";
        task.result.message = "Missing input paths";
        return;
    }

    // PROCESS THE INPUT PATHS
    async function process_func(input_path) {
        let pathResult = {
            status: "ok",
            src_path: input_path,
            dest_paths: [],
            output: null,
            message: "",
        };

        await process_path(input_path)
            .then((deleted) => {
                if (deleted) {
                    pathResult.message = `Deleted ${deleted} files/folders`;
                } else {
                    pathResult.message = "No file/folder deleted";
                }
            })
            .catch((error) => {
                pathResult.status = "error";
                pathResult.message = error.message || error.toString();
            });

        utils.update_progress("Processing...");

        switch (pathResult.status) {
            case "ok":
                task.result.counter.file_ok++;
                break;
            case "error":
                task.result.counter.file_error++;
                break;
            case "ignored":
                task.result.counter.file_ignored++;
                break;
            default:
                break;
        }

        task.result.path_results.push(pathResult);
    }

    // parameters: task_id, input_paths, walk_depth, process_func
    // depth:
    // 0, means no walk, pass input_paths to process_func directly,
    // 1, means only loop input paths, pass each path of the input_paths to process_func,
    // -1, means no limit, walk all the way to the end (nested files and directories)
    await task.methods.walk_path(
        task.task_id,
        action.parameters.input_paths,
        1,
        process_func
    );
}

async function process_path(the_path) {
    const methods = window.task_methods;
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    const thePathObj = await utils.read_path(the_path, false, true);
    let name_patterns = [];
    let path_patterns = [];
    if (params.method === "clear_folder_attribute_files") {
        name_patterns = [
            /^\.DS_Store$/i,
            /^Thumbs\.db$/i,
            /^_MACOSX$/i,
            /^__MACOSX$/i,
            /^desktop\.ini$/i,
        ];
    } else if (params.method === "clear_development_environment_files") {
        name_patterns = [
            /^node_modules$/i,
            /^__pycache__$/i,
            /^\.pytest_cache$/i,
            /\.pyc$/i,
        ];
    } else {
        throw new Error(`Unsupported method: ${params.method}`);
    }

    let will_delete = false;
    // match the file name
    for (let name_pattern of name_patterns) {
        const re = new RegExp(name_pattern);
        if (re.test(thePathObj.file_name)) {
            will_delete = true;
            break;
        }
    }
    if (!will_delete) {
        // match the file path
        for (let path_pattern of path_patterns) {
            const re = new RegExp(path_pattern);
            if (re.test(thePathObj.path)) {
                will_delete = true;
                break;
            }
        }
    }
    if (will_delete) {
        const deleted = await methods
            .invoke("path.delete", { paths: [thePathObj.path] })
            .then((rst) => {
                return rst.content;
            });
        return deleted;
    }

    // not match
    if (thePathObj.is_file) {
        // ignore
        return;
    }
    // if it is a directory, continue to process the sub paths
    let deleted = 0;
    for (let subPath of thePathObj.sub_paths) {
        let sub_deleted = await process_path(subPath);
        if (sub_deleted) {
            deleted += sub_deleted;
        }
    }
    return deleted;
}
