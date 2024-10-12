const MAGICK_TOOL_NAME = "tool.exe.magick";

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

    utils.update_progress("Processing...");
    // prepare watermark image
    let temp_watermark_path = await task.methods
        .invoke("path.new_temp_file_path", {
            ext: "png",
        })
        .then((rsp) => {
            return rsp.content;
        });
    let _cmd_args = [
        action.parameters.watermark_file,
        "-background",
        "none",
        "-rotate",
        parseInt(action.parameters.rotation || "0"),
        "-alpha",
        "set",
        "-channel",
        "A",
        "-evaluate",
        "multiply",
        parseFloat(action.parameters.opacity || "1"),
        temp_watermark_path,
    ];
    await utils.run_command(MAGICK_TOOL_NAME, _cmd_args);

    // PROCESS THE INPUT PATHS
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

        await convert(pathResult, srcPathObj, temp_watermark_path)
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

    // delete the temp watermark file
    await task.methods.invoke("path.delete", {
        paths: [temp_watermark_path],
    });
}

async function convert(pathResult, srcPathObj, temp_watermark_path) {
    // const methods = window.task_methods;
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    let output_file = await utils.get_output_file(
        params,
        srcPathObj,
        srcPathObj.file_ext
    );

    let cmd_args = [
        srcPathObj.path,
        temp_watermark_path,
        "-gravity",
        params.gravity || "center",
        "-geometry",
        `+${params.geometry_x || 0}+${params.geometry_y || 0}`,
        "-composite",
        output_file,
    ];

    await utils.run_command(MAGICK_TOOL_NAME, cmd_args).then(() => {
        pathResult.dest_paths.push(output_file);
    });
}
