const PANDOC_TOOL_NAME = "tool.exe.pandoc";

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

        await convert(pathResult, srcPathObj)
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

async function convert(pathResult, srcPathObj) {
    // const methods = window.task_methods;
    const params = window.task_action.parameters;

    if (srcPathObj.file_ext === params.to_format) {
        pathResult.status = "ignored";
        pathResult.message = "Source and target format are the same";
        return;
    }

    if (
        ["md", "markdown"].includes(srcPathObj.file_ext) &&
        ["pdf", "html"].includes(params.to_format)
    ) {
        await markdown_to_doc(pathResult, srcPathObj);
    } else {
        await doc_to_doc(pathResult, srcPathObj);
    }
}

async function markdown_to_doc(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    // validate required parameters
    if (!params.html_template_file) {
        throw new Error("Missing HTML template file");
    }

    const output_file = utils.get_output_file(
        params,
        srcPathObj,
        params.to_format
    );

    let cmd_args = [
        "-s",
        "--template",
        params.html_template_file,
        srcPathObj.path,
        "-o",
        output_file,
    ];

    await utils.run_command(PANDOC_TOOL_NAME, cmd_args).then(async (rsp) => {
        pathResult.output = rsp;
        pathResult.dest_paths.push(output_file);
    });
}

async function doc_to_doc(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    const output_file = utils.get_output_file(
        params,
        srcPathObj,
        params.to_format
    );

    let cmd_args = ["-s", srcPathObj.path, "-o", output_file];

    await utils.run_command(PANDOC_TOOL_NAME, cmd_args).then(async (rsp) => {
        pathResult.output = rsp;
        pathResult.dest_paths.push(output_file);
    });
}
