import { action_call, file_function_command_invoke } from "../caller";

import FunctionWorker from "./function-worker";
import { createRoot } from "react-dom/client";
import i18n from "../i18n";

const TOOL_TASK_RESULT_TEMPLATE = {
    status: "ok",
    message: "",
    output: null,
};
const FILE_TASK_RESULT_TEMPLATE = {
    status: "ok",
    message: "",
    output: null,
    path_results: [], //every path's processed result
    counter: {
        path_not_exist: 0,
        dir: 0,
        file: 0,
        dir_ok: 0,
        file_ok: 0,
        dir_error: 0,
        file_error: 0,
        file_ignored: 0,
    },
};

function prepare_task_display_status(task) {
    let isError = false;
    let errorMessage = "";
    if (task.result.status === "error") {
        isError = true;
        errorMessage = task.result.message;
    } else {
        // check path results if path results exist
        if (task.result.path_results && task.result.path_results.length > 0) {
            if (task.result.path_results.length === 1) {
                // single path result
                if (task.result.path_results[0].status === "error") {
                    isError = true;
                    errorMessage = task.result.path_results[0].message;
                }
            } else {
                // multiple path results
                // default is ERROR
                isError = true;
                // if any path result is OK, then the task is OK
                for (let path_result of task.result.path_results) {
                    if (path_result.status === "error") {
                        errorMessage = path_result.message;
                    }
                    if (path_result.status === "ok") {
                        isError = false;
                        break;
                    }
                }
            }
        }
        errorMessage = isError ? errorMessage : "";
    }

    task.result.displayStatus = {
        isError: isError,
        isOk: !isError,
        errorMessage: i18n.translate(errorMessage, [], false),
    };

    // console.log("displayStatus:", task.result.displayStatus);
}

function prepare_task_display_paths(task) {
    if (!task.result?.path_results || task.result.path_results.length === 0) {
        return;
    }
    for (let i = 0; i < task.result.path_results.length; i++) {
        const result = task.result.path_results[i];
        // src paths
        if (result.src_path && result.src_path.length > 0) {
            action_call("path.relative.with_home_dir", {
                input_paths: [result.src_path],
            })
                .then((res) => {
                    result.rel_src_path = res.content[0];
                })
                .catch((e) => {
                    console.error("Failed to get relative src path:", e);
                });
        }

        // dest paths
        if (result.dest_paths && result.dest_paths.length > 0) {
            action_call("path.relative.with_home_dir", {
                input_paths: result.dest_paths,
            })
                .then((res) => {
                    result.rel_dest_paths = res.content;
                })
                .catch((e) => {
                    console.error("Failed to get relative dest paths:", e);
                });
        }
    }
}

export async function create_function_task({
    task_type, // tool or file
    the_function, // tool function or file function
    action_name, // defined in the function worker.js file
    action_params, // optional
    on_task_started, // optional
    on_task_progress, // optional
    on_task_error, // optional
    on_task_done, // optional
}) {
    // Generate a unique task ID
    const task_id = Date.now().toString() + Math.random().toString(16).slice(2);

    // Task list
    const tasks =
        task_type === "tool" ? window.toolTasks : window.fileTaskManager.tasks;

    const result_template =
        task_type === "tool"
            ? TOOL_TASK_RESULT_TEMPLATE
            : FILE_TASK_RESULT_TEMPLATE;

    // Create a new task
    //  function-worker required: task_id, action, methods, result, worker:{ root, code, callback }
    tasks[task_id] = {
        task_id: task_id,
        task_type: task_type,
        function_name: the_function.name, // for on_task_done to point to the function
        the_function: the_function,

        status: {
            running: false,
            result_read_times: 0,
            result_read: false,
        },
        progress: {}, // {value, message}
        start_time: new Date().toLocaleTimeString(),

        action: { name: action_name, parameters: action_params },

        result: JSON.parse(JSON.stringify(result_template)), // deep copy

        // for worker.js to use
        counter: {
            walk: {
                path_index: 0,
                path_total: 0,
            },
        },

        // for worker.js to use
        methods: {
            invoke: async (command, params) => {
                if (task_type === "tool") {
                    return await action_call(command, params);
                } else {
                    return await file_function_command_invoke(command, params);
                }
            },

            get_language: () => {
                return i18n.get_lang();
            },
            translate: (key, vars) => {
                return i18n.translate(key, vars, false);
            },

            progress: async (value, message) => {
                const task = tasks[task_id];
                on_task_progress && on_task_progress({ task, value, message });
            },

            walk_path: async function (
                _task_id,
                input_paths,
                walk_depth,
                process_func
            ) {
                // validate params
                if (!_task_id) {
                    throw new Error("Missing task id for walk_path");
                }
                if (!input_paths || input_paths.length === 0) {
                    throw new Error("Missing input paths for walk_path");
                }
                if (!process_func || typeof process_func !== "function") {
                    throw new Error("Missing process function for walk_path");
                }
                if (walk_depth === undefined) {
                    walk_depth = -1; // no limit
                }
                if (walk_depth < 0) {
                    walk_depth = -1;
                }

                const _task = tasks[_task_id];

                async function read_path(path) {
                    /// get: is_exists, is_file, is_dir, parent_dir, file_name, file_stem, file_ext, sub_names(if list_sub_names is true
                    return await file_function_command_invoke("path.read", {
                        path: path,
                        list_sub_paths: true,
                    }).then((rst) => {
                        return rst.content;
                    });
                }

                if (walk_depth === 0) {
                    // no walk
                    return await process_func(input_paths);
                }

                if (walk_depth === 1) {
                    _task.counter.walk.path_total = input_paths.length;
                    _task.counter.walk.path_index++;
                    // only walk one level
                    for (let path of input_paths) {
                        await process_func(path).catch((error) => {
                            throw error;
                        });
                    }
                    return;
                }

                // else, recursive walk
                _task.counter.walk.path_total = input_paths.length;
                async function traverse_path(one_path, pathContext) {
                    _task.counter.walk.path_index++;
                    if (
                        // -1 means no limit
                        pathContext.walk_depth.limit !== -1 &&
                        pathContext.walk_depth.current >
                            pathContext.walk_depth.limit
                    ) {
                        return; // limit reached
                    }

                    let path_obj = await read_path(one_path)
                        .then((rsp) => {
                            return rsp;
                        })
                        .catch((error) => {
                            throw error;
                        });
                    if (!path_obj.is_exists) {
                        _task.result.counter.path_not_exist++;
                        _task.result.path_results.push({
                            status: "ignored",
                            src_path: one_path,
                            dest_paths: [],
                            output: null,
                            message: "Path does not exist",
                        });
                        return;
                    }

                    if (path_obj.is_dir) {
                        _task.counter.walk.path_total +=
                            path_obj.sub_paths.length;
                        for (let sub_path of path_obj.sub_paths) {
                            pathContext.walk_depth.current++;
                            await traverse_path(sub_path, pathContext);
                            pathContext.walk_depth.current--;
                        }
                    } else if (path_obj.is_file) {
                        await process_func(one_path)
                            // assign _task.result in process_func(including: result.output, result.path_results)
                            .catch((error) => {
                                throw error;
                            });
                    }
                }

                // loop over the input paths
                let pathContext = {
                    walk_depth: { limit: walk_depth, current: 0 },
                    // result: {
                    //     status: "ok",
                    //     src_path: null, // string
                    //     dest_paths: [],
                    //     output: null, // any
                    // },
                };
                for (let path of input_paths) {
                    pathContext.walk_depth.current = 1;
                    await traverse_path(path, pathContext).catch((error) => {
                        _task.result.counter.file_error++;
                        _task.result.path_results.push({
                            status: "error",
                            src_path: path,
                            dest_paths: [],
                            output: null,
                            message: error.message || error.toString(),
                        });
                    });
                }
            },
        },
    };

    // read worker code from file
    const task = tasks[task_id];
    let worker_code = await action_call("file.read", {
        input_file: the_function.worker_file,
        format: "text",
    })
        .then((rsp) => {
            return rsp.content;
        })
        .catch((e) => {
            task.result.status = "error";
            task.result.message = `Failed to read worker code: ${e.toString()}`;
            throw new Error(task.result.message);
        });
    if (!worker_code) {
        task.result.status = "error";
        task.result.message = "No worker code loaded";
        throw new Error(task.result.message);
    }

    // read worker utils code from file
    let worker_utils_code = await action_call("file.read", {
        input_file: the_function.worker_utils_file,
        format: "text",
    })
        .then((rsp) => {
            return rsp.content;
        })
        .catch((e) => {
            task.result.status = "error";
            task.result.message = `Failed to read worker utils code: ${e.toString()}`;
            throw new Error(task.result.message);
        });

    // add worker tracing field (for worker component, not for worker.js)
    task.worker = {
        code: worker_code,
        utils_code: worker_utils_code,

        unmount: (_task_id) => {
            // unmount current FunctionWorker component
            const _task = tasks[_task_id];
            _task.worker.root.unmount();
            const specificContainer = document.getElementById(
                _task.worker.containerId
            );
            specificContainer.remove();
        },

        on_error: function (_task_id, message) {
            const _task = tasks[_task_id];
            _task.result.status = "error";
            _task.result.message = message;

            prepare_task_display_status(_task);
            prepare_task_display_paths(_task);

            on_task_error && on_task_error(_task);
            _task.worker.unmount(_task_id);
        },

        on_done: function (_task_id) {
            const _task = tasks[_task_id];

            prepare_task_display_status(_task);
            prepare_task_display_paths(_task);

            on_task_done && on_task_done(_task);
            _task.worker.unmount(_task_id);
        },
    };

    
    // Append a new task worker (FunctionWorker component / iframe) to the function-worker-container(in App DOM)
    // - create worker container
    const parentContainer = document.getElementById("function-worker-container");
    const workerContainer = document.createElement("div");
    workerContainer.id = `function-worker-${task_id}`;
    parentContainer.appendChild(workerContainer);
    const root = createRoot(workerContainer); // create a root to display FunctionWorker (React components) inside iframe (a browser) DOM node.
    // - bind the worker container to task
    task.worker.containerId = workerContainer.id;
    task.worker.root = root;

    // - create worker (FunctionWorker component / iframe) for running worker
    const worker = <FunctionWorker task={task} />;

    on_task_started && on_task_started(task); // for trigger task started event (if any)
    root.render(worker); // render FunctionWorker component to run worker code
} // end of function_worker
