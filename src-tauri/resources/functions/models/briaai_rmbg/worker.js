async function main({ action, task }) {
    const utils = window.task_utils;
    await utils
        .init({
            task,
            action,
            tool_name: "tool.model.briaai_rmbg",
            tool_title: "Briaai/RMBG",
        })
        .catch((err) => {
            task.result.status = "error";
            task.result.message = `[worker.js - init] ${err.toString()}`;
        });

    switch (action.name) {
        case "get_version":
            // models are no version, so just check if the file exists
            await get_version(task).catch((err) => {
                task.result.status = "error";
                task.result.message = `[worker.js - get_version] ${err.toString()}`;
                task.result.output = { version: "" }; // empty string means not available
            });
            break;
        case "install":
            await install(task).catch((err) => {
                task.result.status = "error";
                task.result.message = `[worker.js - install] ${err.toString()}`;
            });
            break;
        default:
            task.result.status = "error";
            task.result.message = `[worker.js] The action ${action.name} is not supported`;
            break;
    }

    return task.result;
}

async function get_version(task) {
    const methods = window.task_methods;
    const props = window.task_props;
    // check if the model file exists
    let is_exists = await methods
        .invoke("path.exists", {
            path: props.tool_bin_path,
        })
        .then((rst) => {
            return rst.content;
        });

    task.result.output = { version: is_exists ? "is_exists" : "" }; // empty string means not available
}

async function install(task) {
    const methods = window.task_methods;
    const utils = window.task_utils;
    const props = window.task_props;

    props.progress_current = 1;
    utils.update_progress("Downloading model file...");

    // model installation is downloading the model file
    let download_file = await utils.join_path([
        props.app_data_dir,
        "downloads",
        "briaai_rmbg-1.4_model.onnx",
    ]);
    let downloaded_file = await methods
        .invoke("http.download_file", {
            url: "https://huggingface.co/briaai/RMBG-1.4/blob/main/onnx/model.onnx",
            resume: true,
            output_file: download_file,
        })
        .then((rst) => {
            console.log("downloaded model", rst);
            return rst.content;
        })
        .catch(() => {
            // ignore error, will try to download from mirror below
            // console.error(err);
        });

    if (!downloaded_file) {
        props.progress_current += 5;
        utils.update_progress("Downloading model file...");
        downloaded_file = await methods
            .invoke("http.download_file", {
                url: "https://hf-mirror.com/briaai/RMBG-1.4/resolve/main/onnx/model.onnx",
                resume: true,
                output_file: download_file,
            })
            .then((rst) => {
                console.log("downloaded model from mirror", rst);
                return rst.content;
            })
            .catch((err) => {
                throw new Error(`Failed to download model: ${err.toString()}`);
            });
    }
    props.progress_current = 95;

    // move the downloaded file to the model directory
    utils.update_progress("Moving model file");
    await methods
        .invoke("file.rename", {
            input_file: downloaded_file,
            output_file: props.tool_bin_path,
        })
        .then((rst) => {
            console.log("moved model to model directory", rst);
        })
        .catch((err) => {
            console.error(err);
            throw new Error(
                `Failed to move model to model directory: ${err.toString()}`
            );
        });

    props.progress_current = 100;
    utils.update_progress("Installed");
    task.result.output = { downloaded: true, file: downloaded_file };
}
