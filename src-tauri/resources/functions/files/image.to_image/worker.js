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
    utils.update_progress("Processing...");
    async function process_func(input_file) {
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

    if (params.to_format === "svg") {
        await image_to_svg(pathResult, srcPathObj);
    } else if (params.to_format === "ico") {
        await image_to_ico(pathResult, srcPathObj);
    } else if (srcPathObj.file_ext === "svg") {
        await svg_to_image(pathResult, srcPathObj);
    } else {
        await image_to_image(pathResult, srcPathObj);
    }
}

async function image_to_svg(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const methods = window.task_methods;
    const utils = window.task_utils;

    let output_file = await utils.get_output_file(params, srcPathObj, "svg");

    let tmp_input_file = srcPathObj.path;
    const directlySupportFormats = [
        "bmp",
        "dds",
        "farbfeld",
        "gif",
        "hdr",
        "ico",
        "jpeg",
        "exr",
        "png",
        "pnm",
        "qoi",
        "tga",
        "tiff",
        "webp",
    ];
    if (!directlySupportFormats.includes(srcPathObj.file_ext)) {
        // convert the image to png first
        let png_output_file = await methods
            .invoke("path.new_temp_file_path", {
                ext: "png",
            })
            .then((rsp) => {
                return rsp.content;
            });
        await methods.invoke("file.image_to_image", {
            input_file: srcPathObj.path,
            output_file: png_output_file,
            to_format: "png",
            width: params.width,
            height: params.height,
            background: "transparent",
        });
        tmp_input_file = png_output_file;
    }

    await methods
        .invoke("file.image_to_svg", {
            input_file: tmp_input_file,
            output_file: output_file,
            color_colorful: params.color_colorful,
        })
        .then((rst) => {
            pathResult.output = rst;
            pathResult.dest_paths.push(output_file);
            // overwrite the src_path
            pathResult.src_path = srcPathObj.path;
        });
}

async function svg_to_image(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const methods = window.task_methods;
    const utils = window.task_utils;

    let output_file = await utils.get_output_file(
        params,
        srcPathObj,
        params.to_format
    );
    let outputPathObj = await utils.read_path(output_file);

    // 1st, convert svg to png
    let png_output_file = await methods
        .invoke("path.new_temp_file_path", {
            parent_dir: outputPathObj.dir,
            ext: "png",
        })
        .then((rsp) => {
            return rsp.content;
        });
    await methods.invoke("file.svg_to_png", {
        input_file: srcPathObj.path,
        output_file: png_output_file,
        width: params.width,
        height: params.height,
    });

    // 2nd, convert png to target format (with magick tool)
    let tmpSrcPathObj = await utils.read_path(png_output_file);
    if (params.to_format === "png") {
        await methods.invoke("file.rename", {
            input_file: png_output_file,
            output_file: output_file,
        });
    } else if (params.to_format === "ico") {
        await image_to_ico(pathResult, tmpSrcPathObj);
    } else {
        await image_to_image(pathResult, tmpSrcPathObj);
    }

    // 3th, overwrite the src_path and dest_paths
    pathResult.src_path = srcPathObj.path;
    pathResult.dest_paths = [output_file];

    // 4rd, remove the temp png file
    await methods.invoke("path.delete", {
        paths: [png_output_file],
    });
}

async function image_to_image(pathResult, srcPathObj) {
    const params = window.task_action.parameters;
    const methods = window.task_methods;
    const utils = window.task_utils;

    const output_file = await utils.get_output_file(
        params,
        srcPathObj,
        params.to_format
    );
    let display_out_file = output_file;
    // 当从动图(gif,apng,webp) 转换单帧图片时, 若原图有多帧会生成多个图片, 文件名以 -0, -1, -2, ... 为后缀
    // 只显示第一帧的文件名
    if (
        ["gif", "apng", "webp"].includes(srcPathObj.file_ext) &&
        !["webp", "apng", "gif"].includes(params.to_format)
    ) {
        display_out_file =
            utils.right_replace_once(output_file, `.${params.to_format}`, "") +
            "-0." +
            params.to_format;
    }

    let cmd_args = [srcPathObj.path];
    if (params.width && params.height) {
        cmd_args.push("-resize", `${params.width}x${params.height}`);
    }
    if (params.background && params.background !== "transparent") {
        cmd_args.push("-background", params.background);
        cmd_args.push("-flatten");
    } else {
        cmd_args.push("-background", "transparent");
    }
    cmd_args.push(output_file);

    await utils
        .run_command(MAGICK_TOOL_NAME, cmd_args)
        .then(async (rsp) => {
            pathResult.output = rsp;
            // if display_out_file and output_file are the same, then dest_paths will be output_file
            if (display_out_file === output_file) {
                pathResult.dest_paths.push(output_file);
                return;
            }
            // else not the same,
            // if display_out_file is exist, then dest_paths will be display_out_file, else will be output_file
            await methods
                .invoke("path.exists", {
                    path: display_out_file,
                })
                .then((rsp) => {
                    if (rsp.content) {
                        pathResult.dest_paths.push(display_out_file);
                    } else {
                        pathResult.dest_paths.push(output_file);
                    }
                })
                .catch(() => {
                    pathResult.dest_paths.push(output_file);
                });
        })
        .catch((error) => {
            pathResult.status = "error";
            pathResult.message = error.message || error.toString();
        });
}

async function image_to_ico(pathResult, srcPathObj) {
    const utils = window.task_utils;
    const params = window.task_action.parameters;

    const output_file = await utils.get_output_file(params, srcPathObj, "ico");
    console.log("output_file:", output_file);

    // ico 格式, 固定的多组尺寸 (其它尺寸 magick 会报错)
    const size_groups = [
        "16x16",
        "32x32",
        "48x48",
        "64x64",
        "128x128",
        "256x256",
    ];

    for (let size of size_groups) {
        let size_output_file =
            utils.right_replace_once(output_file, ".ico", "") + `_${size}.ico`;

        let cmd_args = [
            srcPathObj.path,
            "-resize",
            size,
            "-background",
            "transparent",
            size_output_file,
        ];

        await utils
            .run_command(MAGICK_TOOL_NAME, cmd_args)
            .then((rsp) => {
                pathResult.output = rsp;
                pathResult.dest_paths.push(size_output_file);
            })
            .catch((error) => {
                pathResult.status = "error";
                pathResult.message = error.message || error.toString();
                // break the loop of size_groups
                return;
            });
    }
}
