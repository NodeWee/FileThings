const FFMPEG_TOOL_NAME = "tool.exe.ffmpeg";

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

    // PROCESS THE INPUT PATHS
    async function process_func(input_file) {
        let pathResult = {
            status: "ok",
            src_path: input_file,
            dest_paths: [],
            output: null,
            message: "",
        };

        await segment_video(pathResult)
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

async function segment_video(pathResult) {
    const params = window.task_action.parameters;
    // const utils = window.task_utils;

    // const srcPathObj = await utils.read_path(pathResult.src_path);

    if (params.method === "by_time_points") {
        await split_by_timestamps(pathResult);
    } else if (params.method === "by_duration") {
        await split_by_duration(pathResult);
    } else {
        throw new Error("Unknown method: " + params.method);
    }
}

async function split_by_timestamps(pathResult) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    let time_points = params.time_points.split(",");
    if (time_points.length < 1) {
        throw new Error("No time points provided");
    }

    let output_obj = {};
    if (params.output_file) {
        output_obj = await utils.read_path(params.output_file);
    } else if (params.output_dir) {
        output_obj = await utils.read_path(pathResult.src_path);
        output_obj.parent_dir = params.output_dir;
    } else {
        throw new Error("No output file path or directory provided");
    }

    if (params.to_format) {
        // override the extension if provided
        output_obj.file_ext = params.to_format;
    }

    // validate the time_points, 要么都是 hh:mm:ss, 要么都是数字(秒数), 不能混用
    let all_hhmmss = time_points.every((ts) => ts.includes(":"));
    let all_seconds = time_points.every((ts) => !ts.includes(":"));
    if (!all_hhmmss && !all_seconds) {
        throw new Error(
            "Invalid time points. Either all should be in the format hh:mm:ss or all should be in seconds"
        );
    }

    // if ":" in the timestamps, then it is in the format "hh:mm:ss", else it is in seconds
    const zero_time = time_points[0].includes(":") ? "00:00:00" : "0";

    let range_arg_items = [];
    if (time_points.length === 1) {
        range_arg_items.push(["-ss", zero_time, "-to", time_points[0]]);
        range_arg_items.push(["-ss", time_points[0]]);
    } else if (time_points.length === 2) {
        range_arg_items.push(["-ss", zero_time, "-to", time_points[0]]);
        range_arg_items.push(["-ss", time_points[0], "-to", time_points[1]]);
        range_arg_items.push(["-ss", time_points[1]]);
    } else {
        range_arg_items.push(["-ss", zero_time, "-to", time_points[0]]);
        for (let i = 0; i < time_points.length - 1; i++) {
            range_arg_items.push([
                "-ss",
                time_points[i],
                "-to",
                time_points[i + 1],
            ]);
        }
        range_arg_items.push(["-ss", time_points[time_points.length - 1]]);
    }

    for (let i = 0; i < range_arg_items.length; i++) {
        let output_file = await utils
            .join_path([
                output_obj.parent_dir,
                `${output_obj.file_stem}_${i}.${output_obj.file_ext}`,
            ])
            .catch((error) => {
                throw error;
            });

        let range_args = range_arg_items[i];
        let cmd_args = [
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            pathResult.src_path,
        ];
        cmd_args.push(...range_args);
        cmd_args.push(...["-reset_timestamps", "1", "-c", "copy", output_file]);

        await utils.run_command(FFMPEG_TOOL_NAME, cmd_args).then((rsp) => {
            pathResult.output = rsp;
            pathResult.dest_paths.push(output_file);
        });
    } // end of for loop
}

async function split_by_duration(pathResult) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    let duration = params.duration;
    if (!duration) {
        throw new Error("Duration not provided");
    }

    let output_obj = {};
    if (params.output_file) {
        output_obj = await utils
            .read_path(params.output_file)
            .catch((error) => {
                throw error;
            });
    } else if (params.output_dir) {
        output_obj = await utils
            .read_path(pathResult.src_path)
            .catch((error) => {
                throw error;
            });
        output_obj.parent_dir = params.output_dir;
    } else {
        throw new Error("No output file path or directory provided");
    }

    if (params.to_format) {
        // override the extension if provided
        output_obj.file_ext = params.to_format;
    }

    let output_file_pattern = await utils
        .join_path([
            output_obj.parent_dir,
            `${output_obj.file_stem}_%3d.${output_obj.file_ext}`,
        ])
        .catch((e) => {
            throw e;
        });

    let output_file_csv = await utils
        .join_path([
            output_obj.parent_dir,
            `${output_obj.file_stem}.${output_obj.file_ext}.csv`,
        ])
        .catch((e) => {
            throw e;
        });

    // ffmpeg -hide_banner -i test.mp4 -c copy -map 0 -segment_time 6 -f segment -reset_timestamps 1 output_%03d.mp4
    let cmd_args = [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-i",
        pathResult.src_path,
        "-c",
        "copy",
        "-map",
        "0",
        "-segment_time",
        duration,
        "-f",
        "segment",
        "-reset_timestamps",
        "1",
        "-segment_list_type",
        "csv",
        "-segment_list",
        output_file_csv,
        output_file_pattern,
    ];

    await utils.run_command(FFMPEG_TOOL_NAME, cmd_args).then((rsp) => {
        pathResult.output = rsp;
        pathResult.dest_paths.push(output_file_csv);
    });
}
