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
    if (!action.parameters.output_file) {
        task.result.status = "error";
        task.result.message = "Missing output file";
        return;
    }

    // PROCESS THE INPUT PATHS
    async function process_func(input_paths) {
        let pathResult = {
            status: "ok",
            src_path: input_paths[0],
            src_paths: input_paths,
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
        0,
        process_func
    );
}

async function convert(pathResult) {
    const utils = window.task_utils;
    const params = window.task_action.parameters;
    const methods = window.task_methods;
    const T = methods.translate;

    // 输出格式默认为 PNG, 为了支持透明背景色
    // make sure the output file is not exist
    let new_output_file = await methods
        .invoke("path.make_unused_path", {
            input_file: params.output_file,
            ext: "png",
        })
        .then((rsp) => {
            return rsp.content;
        })
        .catch((error) => {
            throw new Error(
                T("Failed to make unused path:") +
                    T(error.message || error.toString())
            );
        });

    let cmd_args = [];
    // add input paths
    for (let i = 0; i < pathResult.src_paths.length; i++) {
        cmd_args.push(pathResult.src_paths[i]);
    }
    // 如果没有指定颜色, 默认是透明色
    cmd_args.push("-background");
    cmd_args.push(params.background || "none");
    cmd_args.push("-gravity");
    cmd_args.push(params.gravity || "center");
    cmd_args.push(params.direction === "left-to-right" ? "+smush" : "-smush");
    cmd_args.push(parseInt(params.spacing || "0"));
    cmd_args.push(new_output_file);

    await utils.run_command(MAGICK_TOOL_NAME, cmd_args).then((rst) => {
        pathResult.dest_paths.push(new_output_file);
        pathResult.output = rst.content;
    });
}
