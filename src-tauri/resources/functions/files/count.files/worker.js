async function main({ action, task }) {
    const utils = window.task_utils;
    // const props = window.task_props;
    await utils.init({ task, action }).catch((err) => {
        task.result.status = "error";
        task.result.message = `[worker.js - init] ${err.toString()}`;
    });

    // validate the input arguments
    if (!action.parameters || !action.parameters.input_paths) {
        task.result.status = "error";
        task.result.message = "Missing input paths";
        return;
    }

    async function process_func(input_paths) {
        const params = {
            input_paths: input_paths,
        };
        // PROCESS THE INPUT PATHS
        return await task.methods
            .invoke("file.count_files", params)
            .then((rsp) => {
                task.result.output = rsp.content;
            })
            .catch((err) => {
                task.result.status = "error";
                task.result.message = err.message || err.toString();
            });
    }

    // parameters: task_id, input_paths, walk_depth, process_func
    await task.methods.walk_path(
        task.task_id,
        action.parameters.input_paths,
        0, // do not walk, pass input_paths directly
        process_func
    );
}
