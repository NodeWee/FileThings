(() => {
    window.task_props = {
        progress_max: 100,
        progress_current: 0,
        app_data_dir: "",
        tool_bin_path: "",
        tool_name: "",
        tool_title: "",
    };
    window.task_methods = {};
    // window.task_utils = {};

    async function init({ task, action, tool_name, tool_title }) {
        window.task_methods = task.methods; // {invoke, progress, walk_path, get_language, translate}
        window.task_action = action;
        const methods = task.methods;
        const props = window.task_props;
        props.tool_name = tool_name;
        props.tool_title = tool_title;

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

        // get the tool bin path
        await methods
            .invoke("tool_data.get_bin_path", {
                tool_name: tool_name,
            })
            .then((rst) => {
                props.tool_bin_path = rst.content;
            })
            .catch((err) => {
                throw new Error(
                    `Failed to get tool bin path: ${err.toString()}`
                );
            });
    }

    async function update_progress(message) {
        const props = window.task_props;
        const methods = window.task_methods;
        if (props.progress_max <= 1) return;
        let percent = parseInt(
            (props.progress_current / props.progress_max) * 100
        );
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

    window.task_utils = {
        init,
        join_path,
        read_path,
        clear_specified_files,
        update_progress,
        run_command,
    };
})();
