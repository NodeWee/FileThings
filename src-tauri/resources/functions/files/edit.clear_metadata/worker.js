const FFMPEG_TOOL_NAME = "tool.exe.ffmpeg";
const MAGICK_TOOL_NAME = "tool.exe.magick";

let MAGICK_HANDLED_EXTS = [
    "HEIC",
    "HEIF",
    "AVIF",
    "AAI",
    "ART",
    "AVS",
    "BAYER",
    "BAYERA",
    "BGR",
    "BGRA",
    "BGRO",
    "BMP",
    "BMP2",
    "BMP3",
    "CAL",
    "CALS",
    "CIN",
    "CLIP",
    "CMYK",
    "CMYKA",
    "CUR",
    "DATA",
    "DCX",
    "DDS",
    "DPX",
    "DXT1",
    "DXT5",
    "FARBFELD",
    "FAX",
    "FF",
    "FITS",
    "FL32",
    "FTS",
    "FTXT",
    "G3",
    "G4",
    "GIF",
    "GIF87",
    "GRAY",
    "GRAYA",
    "GROUP4",
    "HDR",
    "HRZ",
    "ICB",
    "ICO",
    "ICON",
    "INLINE",
    "IPL",
    "J2C",
    "J2K",
    "JNG",
    "JP2",
    "JPC",
    "JPE",
    "JPEG",
    "JPG",
    "JPM",
    "JPS",
    "JPT",
    "JXL",
    "MAP",
    "MASK",
    "MIFF",
    "MNG",
    "MONO",
    "MPC",
    "MSL",
    "MSVG",
    "MTV",
    "MVG",
    "NULL",
    "OTB",
    "PAL",
    "PALM",
    "PAM",
    "PBM",
    "PCD",
    "PCDS",
    "PCT",
    "PCX",
    "PDB",
    "PFM",
    "PGM",
    "PGX",
    "PHM",
    "PICON",
    "PICT",
    "PJPEG",
    "PNG",
    "PNG00",
    "PNG24",
    "PNG32",
    "PNG48",
    "PNG64",
    "PNG8",
    "PNM",
    "PPM",
    "PSB",
    "PSD",
    "PTIF",
    "QOI",
    "RAS",
    "RGB",
    "RGBA",
    "RGBO",
    "RGF",
    "SGI",
    "SIX",
    "SIXEL",
    "STRIMG",
    "SUN",
    "TGA",
    "TIFF",
    "TIFF64",
    "TXT",
    "UYVY",
    "VDA",
    "VICAR",
    "VID",
    "VIFF",
    "VIPS",
    "VST",
    "WBMP",
    "WEBP",
    "WPG",
    "XBM",
    "XPM",
    "XV",
    "YCbCr",
    "YCbCrA",
    "YUV",
];
let FFMPEG_HANDLED_EXTS = [
    "3g2",
    "3gp",
    "3gp2",
    "3gpp",
    "3gpp2",
    "asf",
    "avi",
    "divx",
    "evo",
    "f4v",
    "flv",
    "h264",
    "h265",
    "hevc",
    "m1v",
    "m2v",
    "m4v",
    "mkv",
    "mov",
    "mp4",
    "mpeg",
    "mpg",
    "mts",
    "mxf",
    "ogm",
    "ogv",
    "rm",
    "rmvb",
    "ts",
    "vob",
    "webm",
    "wmv",
    "wav",
    "mp3",
    "aac",
    "flac",
    "ogg",
    "opus",
    "m4a",
    "wma",
];

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
        task.result.message = "No input paths provided";
        return;
    }

    // lower case all handled extensions
    FFMPEG_HANDLED_EXTS = FFMPEG_HANDLED_EXTS.map((ext) => ext.toLowerCase());
    MAGICK_HANDLED_EXTS = MAGICK_HANDLED_EXTS.map((ext) => ext.toLowerCase());

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

async function process_file(pathResult) {
    const methods = window.task_methods;
    const T = methods.translate;
    const params = window.task_action.parameters;
    const utils = window.task_utils;

    const srcPathObj = await utils.read_path(pathResult.src_path);

    let output_file = await utils.get_output_file(
        params,
        srcPathObj,
        srcPathObj.file_ext
    );

    let new_output_file = await methods
        .invoke("path.make_unused_path", {
            input_file: output_file,
        })
        .then((rsp) => {
            return rsp.content;
        })
        .catch((error) => {
            throw new Error(
                T("Failed to make unused path:") + T(error.message)
            );
        });

    const outputPathObj = await utils.read_path(new_output_file);

    let temp_file = await methods
        .invoke("path.new_temp_file_path", {
            parent_dir: outputPathObj.parent_dir,
        })
        .then((rsp) => {
            return rsp.content;
        });
    temp_file = temp_file + "." + outputPathObj.file_ext;

    srcPathObj.file_ext = srcPathObj.file_ext.toLowerCase();
    if (FFMPEG_HANDLED_EXTS.includes(srcPathObj.file_ext)) {
        await clear_by_ffmpeg(srcPathObj, temp_file);
    } else if (MAGICK_HANDLED_EXTS.includes(srcPathObj.file_ext)) {
        await clear_by_magick(srcPathObj, temp_file);
    } else {
        await only_copy(srcPathObj, temp_file);
    }

    // rename temp file to output file
    await methods
        .invoke("file.rename", {
            input_file: temp_file,
            output_file: new_output_file,
        })
        .then(() => {
            pathResult.dest_paths.push(new_output_file);
        });

    // remove xattr (only works on macos)
    await remove_xattr(new_output_file);
}

async function clear_by_ffmpeg(srcPathObj, temp_file) {
    const utils = window.task_utils;

    let cmd_args = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        srcPathObj.path,
        "-map_metadata",
        "-1",
        "-c:v",
        "copy",
        "-c:a",
        "copy",
        temp_file,
    ];

    await utils.run_command(FFMPEG_TOOL_NAME, cmd_args);
}

async function clear_by_magick(srcPathObj, temp_file) {
    const utils = window.task_utils;
    let cmd_args = [srcPathObj.path, "-strip", temp_file];

    await utils.run_command(MAGICK_TOOL_NAME, cmd_args);
}

async function only_copy(srcPathObj, temp_file) {
    const methods = window.task_methods;
    await methods
        .invoke("file.copy", {
            input_file: srcPathObj.path,
            output_file: temp_file,
        })
        .catch((error) => {
            throw new Error(`Failed to copy file: ${error.toString()}`);
        });
}

async function remove_xattr(file) {
    const methods = window.task_methods;
    const utils = window.task_utils;

    let cmd_args = ["-c", file];

    const platform = await methods
        .invoke("env.platform", {})
        .then((rst) => {
            return rst.content;
        })
        .catch((err) => {
            throw new Error(`Failed to get platform: ${err.toString()}`);
        });

    // only macos has xattr command
    if (platform !== "macos") {
        return;
    }

    return await utils.run_command("shell.xattr", cmd_args);
}
