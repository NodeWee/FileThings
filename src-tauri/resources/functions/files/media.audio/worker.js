const FFMPEG_TOOL_NAME = "tool.exe.ffmpeg";

async function main({ action, task }) {
    const utils = window.task_utils;
    // const props = window.task_props;

    await utils.init({ task, action }).catch((err) => {
        task.result.status = "error";
        task.result.message = `[worker.js - init] ${err.toString()}`;
    });

    // VALIDATE THE PARAMETERS
    if (!action.parameters?.to_format) {
        task.result.status = "error";
        task.result.message = "Missing output format";
        return task.result;
    }
    if (
        !action.parameters.input_paths ||
        action.parameters.input_paths.length < 1
    ) {
        task.result.status = "error";
        task.result.message = "Missing input paths";
        return task.result;
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

        await convert(pathResult)
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
    // depth: 0, return input_paths directly, 1 return each path of the input_paths, else return the each file path
    await task.methods.walk_path(
        task.task_id,
        action.parameters.input_paths,
        -1, // walk all the way
        process_func
    );
}

async function convert(pathResult) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    const srcPathObj = await utils.read_path(pathResult.src_path);

    if (srcPathObj.file_ext === params.to_format) {
        pathResult.status = "ignored";
        pathResult.message = "Source and target format are the same";
        return;
    }

    if (
        params.to_format === "m4a" &&
        ["mp4", "mkv", "mov"].includes(srcPathObj.file_ext)
    ) {
        await some_to_m4a(pathResult, srcPathObj);
    } else {
        await normal_to_audio(pathResult, srcPathObj);
    }
}

async function some_to_m4a(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    let output_file = await utils.get_output_file(
        params,
        srcPathObj,
        params.to_format
    );

    let cmd_args = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        srcPathObj.path,
        "-vn",
        "-c:a",
        "copy",
        output_file,
    ];

    await utils.run_command(FFMPEG_TOOL_NAME, cmd_args).then((rsp) => {
        pathResult.output = rsp;
        pathResult.dest_paths.push(output_file);
    });
}

async function normal_to_audio(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    let output_file = await utils.get_output_file(
        params,
        srcPathObj,
        params.to_format
    );

    let cmd_args = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        srcPathObj.path,
        "-q:a",
        "0",
        "-map",
        "a",
        output_file,
    ];

    await utils.run_command(FFMPEG_TOOL_NAME, cmd_args).then((rst) => {
        pathResult.output = rst;
        pathResult.dest_paths.push(output_file);
    });
}
