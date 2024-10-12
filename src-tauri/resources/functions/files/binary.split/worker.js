async function main({ action, task }) {
    const utils = window.task_utils;
    const props = window.task_props;
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
    if (!action.parameters.output_dir) {
        task.result.status = "error";
        task.result.message = "Missing output directory";
        return;
    }
    if (!action.parameters.chunk_size) {
        task.result.status = "error";
        task.result.message = "Missing chunk size";
        return;
    }

    // PROCESS THE INPUT PATHS
    async function process_func(input_file) {
        utils.update_progress("Processing...");

        let pathResult = {
            status: "ok",
            src_path: input_file,
            dest_paths: [],
            output: null,
            message: "",
        };

        const srcPathObj = await utils.read_path(input_file);

        if (!srcPathObj.is_file) {
            // ignore the directory, and no record in the result
            return;
        }
        if (
            !task.matches.extensions.includes(srcPathObj.file_ext) &&
            !task.matches.extensions.includes("/file")
        ) {
            // ignore the file, and no record in the result
            return;
        }

        await split_file_in_bytes(pathResult, srcPathObj)
            // .then, already assign task.result or task.result.path_results (depends on the situation)
            .catch((error) => {
                pathResult.status = "error";
                pathResult.message = error.message || error.toString();
            });

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
        -1, // walk all the way
        process_func
    );
}

async function split_file_in_bytes(pathResult) {
    const params = window.task_action.parameters;
    const methods = window.task_methods;

    await methods
        .invoke("file.binary.split", {
            input_file: pathResult.src_path,
            output_dir: params.output_dir,
            chunk_size: params.chunk_size,
        })
        .then((rsp) => {
            pathResult.dest_paths = [rsp.output_paths[0]];
        });
}
