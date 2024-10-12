const FFMPEG_TOOL_NAME = "tool.exe.ffmpeg";

async function main({ action, task }) {
    const utils = window.task_utils;
    const T = window.task_methods.translate;

    // const props = window.task_props;

    await utils.init({ task, action }).catch((err) => {
        task.result.status = "error";
        task.result.message = `[worker.js - init] ${T(err.toString())}`;
    });

    // VALIDATE THE PARAMETERS
    if (!action.parameters?.to_format) {
        task.result.status = "error";
        task.result.message = "Missing output format";
        return;
    }
    if (
        !action.parameters.input_paths ||
        action.parameters.input_paths.length < 1
    ) {
        task.result.status = "error";
        task.result.message = "Missing input paths";
        return;
    }

    // PROCESS THE INPUT PATHS
    utils.update_progress("Processing...");
    async function process_func(input_file) {
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

        await convert(pathResult, srcPathObj)
            // .then, already assign task.result or task.result.path_results (depends on the situation)
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
        -1, // walk all the way
        process_func
    );
}

async function convert(pathResult, srcPathObj) {
    // const methods = window.task_methods;
    const params = window.task_action.parameters;

    if (srcPathObj.file_ext === params.to_format) {
        pathResult.status = "ignored";
        pathResult.message = "Source and target format are the same";
        return;
    }

    await image_to_video(pathResult, srcPathObj);
}

async function image_to_video(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    let output_file = await utils
        .get_output_file(params, srcPathObj, params.to_format)
        .catch((error) => {
            throw error;
        });

    let cmd_args = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-loop",
        "1",
        "-i",
        srcPathObj.path,
        "-c:v",
        "libx264",
        "-t",
        params.duration || 1,
        output_file,
    ];

    await utils.run_command(FFMPEG_TOOL_NAME, cmd_args).then((rsp) => {
        pathResult.output = rsp;
        pathResult.dest_paths.push(output_file);
    });
}
