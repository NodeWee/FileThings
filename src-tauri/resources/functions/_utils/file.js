(() => {
    window.task_props = {
        progress_max: -1, // means use path_walk_counter to track the progress in update_progress
        progress_current: 0,
        app_data_dir: "",
        path_walk_counter: {},
    };
    window.task_methods = {};
    // window.task_utils = {};

    async function init({ task, action }) {
        window.task_methods = task.methods; // {invoke, progress, walk_path, get_language, translate}
        window.task_action = action; // {name, parameters}
        const methods = task.methods;
        const props = window.task_props;
        props.path_walk_counter = task.counter.walk; // {walk:{path_index,path_total}}

        // get the app data directory
        await methods
            .invoke("env.app_data_dir", {})
            .then((rst) => {
                props.app_data_dir = rst.content;
            })
            .catch((err) => {
                throw new Error(
                    `Failed to get app data directory: ${err.toString()}`
                );
            });
    }

    async function update_progress(message) {
        const props = window.task_props;
        const methods = window.task_methods;

        let progress_max = props.progress_max;
        let progress_current = props.progress_current;
        if (progress_max < 0) {
            progress_max = props.path_walk_counter.path_total;
            progress_current = props.path_walk_counter.path_index;
        }

        if (progress_max <= 1) return;
        let percent = parseInt((progress_current / progress_max) * 100);
        methods.progress && (await methods.progress(percent, message));
    }

    async function run_command(cmd, cmd_args) {
        const methods = window.task_methods;
        return await methods.invoke(cmd, {
            arguments: cmd_args,
        });
    }

    async function join_path(parts) {
        const methods = window.task_methods;
        return await methods.invoke("path.join", { parts }).then((rst) => {
            return rst.content;
        });
    }

    async function read_path(
        path,
        list_sub_names = false,
        list_sub_paths = false
    ) {
        const methods = window.task_methods;
        let obj = await methods
            .invoke("path.read", {
                path: path,
                list_sub_names: list_sub_names,
                list_sub_paths: list_sub_paths,
            })
            .then((rst) => {
                /// get: is_exists, is_file, is_dir, parent_dir, file_name, file_stem, file_ext, sub_names, sub_paths
                return rst.content;
            });

        obj.path = path;

        return obj;
    }

    async function clear_specified_files(parent_dir, name_pattern) {
        const methods = window.task_methods;

        const existingPaths = await methods
            .invoke("dir.list", {
                input_dir: parent_dir,
                pattern: name_pattern,
                is_full_path: true,
            })
            .then((rst) => {
                return rst.content;
            });

        await methods.invoke("path.delete", {
            input_paths: existingPaths,
        });
    }

    function right_replace_once(str, search, replace) {
        let idx = str.lastIndexOf(search);
        if (idx < 0) {
            return str;
        }
        return (
            str.substring(0, idx) + replace + str.substring(idx + search.length)
        );
    }

    async function get_output_file(params, srcPathObj, to_ext) {
        if (!params.output_file && !params.output_dir) {
            throw new Error("No output file path or directory provided");
        }

        let output_file = "";
        if (params.output_file) {
            output_file = params.output_file;
        } else {
            output_file = await join_path([
                params.output_dir,
                `${srcPathObj.file_stem}.${to_ext}`,
            ])
                .then((rsp) => {
                    return rsp;
                })
                .catch((error) => {
                    throw error;
                });
        }

        if (!output_file || output_file === "") {
            throw new Error("Invalid output file path or directory");
        }

        return output_file;
    }

    window.task_utils = {
        init,
        join_path,
        read_path,
        clear_specified_files,
        update_progress,
        right_replace_once,
        get_output_file,
        run_command,
    };
})();
