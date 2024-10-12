const MAGICK_TOOL_NAME = "tool.exe.magick";

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
    const utils = window.task_utils;
    const params = window.task_action.parameters;

    const srcPathObj = await utils.read_path(pathResult.src_path);

    if (params.to_format === "png") {
        await png_compress(pathResult, srcPathObj);
    } else if (params.to_format === "jpg") {
        await jpg_compress(pathResult, srcPathObj);
    } else if (params.to_format === "webp") {
        await webp_compress(pathResult, srcPathObj);
    } else {
        throw new Error(`Unsupported target format: ${params.to_format}`);
    }
}

async function png_compress(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const methods = window.task_methods;
    const utils = window.task_utils;

    let output_file = await utils.get_output_file(params, srcPathObj, "png");

    if (srcPathObj.file_ext === "png") {
        await methods
            .invoke("file.image.png_optimize", {
                input_file: srcPathObj.path,
                output_file: output_file,
            })
            .then((rsp) => {
                pathResult.output = rsp;
                pathResult.dest_paths.push(output_file);
            });
    } else {
        // convert to png
        let temp_output_file = await methods
            .invoke("path.new_temp_file_path", {
                ext: "png",
            })
            .then((rsp) => {
                return rsp.content;
            });
        let cmd_args = [
            srcPathObj.path,
            "-background",
            "transparent",
            temp_output_file,
        ];
        await utils.run_command(MAGICK_TOOL_NAME, cmd_args);

        // then optimize
        await methods
            .invoke("file.image.png_optimize", {
                input_file: temp_output_file,
                output_file: output_file,
            })
            .then((rsp) => {
                pathResult.output = rsp;
                pathResult.dest_paths.push(output_file);
            });
    }
}

async function webp_compress(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    let output_file = await utils.get_output_file(params, srcPathObj, "webp");

    let cmd_args = [srcPathObj.path, "-background", "transparent", output_file];
    await utils.run_command(MAGICK_TOOL_NAME, cmd_args).then((rsp) => {
        pathResult.output = rsp;
        pathResult.dest_paths.push(output_file);
    });
}

async function jpg_compress(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    const output_file = await utils.get_output_file(params, srcPathObj, "jpg");

    let cmd_args = [srcPathObj.path, "-background", "white", output_file];
    await utils.run_command(MAGICK_TOOL_NAME, cmd_args).then((rsp) => {
        pathResult.output = rsp;
        pathResult.dest_paths.push(output_file);
    });
}
