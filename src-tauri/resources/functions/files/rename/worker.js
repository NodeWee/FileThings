let file_number = 0;

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

    // INIT SOME COUNTERS
    file_number = action.parameters.start_number || 1;

    // PROCESS THE INPUT PATHS
    async function process_func(input_file) {
        let pathResult = {
            status: "ok",
            src_path: input_file,
            dest_paths: [],
            output: null,
            message: "",
        };

        await process_file(pathResult)
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

    const walk_depth =
        action.parameters.method === "by_numerical_order" ? 1 : -1;

    // parameters: task_id, input_paths, walk_depth, process_func
    // depth:
    // 0, means no walk, pass input_paths to process_func directly,
    // 1, means only loop input paths, pass each path of the input_paths to process_func,
    // -1, means no limit, walk all the way to the end (nested files and directories)
    await task.methods.walk_path(
        task.task_id,
        action.parameters.input_paths,
        walk_depth,
        process_func
    );
}

async function process_file(pathResult) {
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    const srcPathObj = await utils.read_path(pathResult.src_path, true, true);

    if (params.method === "by_numerical_order") {
        await rename_by_numerical_order(pathResult, srcPathObj);
    } else if (params.method === "by_photo_taken_time") {
        await rename_by_photo_taken_time(pathResult, srcPathObj);
    } else {
        throw new Error(`Unsupported method: ${params.method}`);
    }
}

async function rename_by_numerical_order(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const methods = window.task_methods;
    const utils = window.task_utils;

    const pad_len = params.padding_length || 4;

    if (srcPathObj.is_file) {
        let new_path = await new_sequence_number_path(srcPathObj, pad_len);
        if (new_path === null) {
            return;
        }

        await methods
            .invoke("file.rename", {
                input_file: srcPathObj.path,
                output_file: new_path,
            })
            .then(() => {
                pathResult.dest_paths.push(new_path);
            });
    } else if (srcPathObj.is_dir) {
        // 收集当前文件夹内所有文件
        let sub_path_objs = [];
        for (let i = 0; i < srcPathObj.sub_paths.length; i++) {
            let sub_path = srcPathObj.sub_paths[i];
            let sub_path_obj = await utils.read_path(sub_path);
            sub_path_objs.push(sub_path_obj);
        }
        let sub_files = sub_path_objs.filter((_obj) => {
            // 过滤掉目录和以'.'开头的文件
            return _obj.is_file && !_obj.file_name.startsWith(".");
        });

        // 按文件名排序
        sub_files.sort((a, b) => {
            let a_val = parseInt(a.file_stem);
            let b_val = parseInt(b.file_stem);
            if (a_val < b_val) {
                return -1;
            } else if (a_val > b_val) {
                return 1;
            } else {
                return 0;
            }
        });

        // 遍历文件, 递增序号重命名
        for (let i = 0; i < sub_files.length; i++) {
            let sub_file = sub_files[i];
            let new_path = await new_sequence_number_path(sub_file, pad_len);

            if (new_path === null) {
                continue;
            }

            await methods
                .invoke("file.rename", {
                    input_file: sub_file.path,
                    output_file: new_path,
                })
                .then(() => {
                    pathResult.dest_paths.push(new_path);
                });
        }
    }
}

async function rename_by_photo_taken_time(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const methods = window.task_methods;
    const utils = window.task_utils;

    if (!srcPathObj.is_file) {
        pathResult.status = "ignored";
        pathResult.message = "Not a file";
        return;
    }

    const ACCEPTED_EXTENSIONS = [
        "jpg",
        "jpeg",
        "png",
        "heic",
        "heif",
        "webp",
        "tiff",
        "tif",
    ];

    if (!ACCEPTED_EXTENSIONS.includes(srcPathObj.file_ext.toLowerCase())) {
        pathResult.status = "ignored";
        pathResult.message = "Unsupported file format";
        return;
    }

    let text_pattern =
        params.text_pattern || "{year}-{month}-{day}_{hour}-{minute}-{second}";

    let datetime_str = await methods
        .invoke("file.exif.get", {
            input_file: srcPathObj.path,
            tags: ["DateTimeOriginal"],
        })
        .then((rsp) => rsp.content.DateTimeOriginal);

    if (!datetime_str) {
        pathResult.status = "ignored";
        pathResult.message = "No DateTimeOriginal found in the file";
        return;
    }

    // split datetime_str, "2021:08:01 12:34:56"
    const [date_str, time_str] = datetime_str.split(" ");
    const [year, month, day] = date_str.split("-");
    const [hour, minute, second] = time_str.split(":");

    let new_file_stem = text_pattern
        .replace("{year}", year)
        .replace("{month}", month)
        .replace("{day}", day)
        .replace("{hour}", hour)
        .replace("{minute}", minute)
        .replace("{second}", second);
    let new_filename = `${new_file_stem}.${srcPathObj.file_ext}`;
    let output_file = await utils.join_path([
        srcPathObj.parent_dir,
        new_filename,
    ]);

    await methods
        .invoke("file.rename", {
            input_file: srcPathObj.path,
            output_file: output_file,
        })
        .then(() => {
            pathResult.dest_paths.push(output_file);
        });
}

async function new_sequence_number_path(fileObj, pad_len) {
    const methods = window.task_methods;
    const utils = window.task_utils;

    // 如果当前文件名已经是目标格式(长度相同,且数字在范围之内), 则保持原文件名不变, 直接跳过
    if (fileObj.file_stem.length === pad_len) {
        if (parseInt(fileObj.file_stem) === file_number) {
            file_number++;
            return null; // 外部获得返回值是空,则认为是跳过
        }
    }

    // 生成新文件名(序号递增,直到没有重复的文件名)
    let new_filename;
    let new_path;
    let new_path_existed = false;
    do {
        new_filename = `${file_number.toString().padStart(pad_len, "0")}.${
            fileObj.file_ext
        }`;
        new_path = await utils.join_path([fileObj.parent_dir, new_filename]);
        await methods.invoke("path.exists", { path: new_path }).then((rsp) => {
            new_path_existed = rsp.content;
        }); // error will break the loop

        file_number++;
    } while (new_path_existed);

    return new_path;
}
