import {
    BsBook,
    BsFileCode,
    BsFileEarmark,
    BsFileEarmarkImage,
    BsFileEarmarkMusic,
    BsFileEarmarkPdf,
    BsFileEarmarkPlay,
    BsFileEarmarkPpt,
    BsFileEarmarkSpreadsheet,
    BsFileEarmarkZip,
    BsFileFont,
    BsFileRichtext,
    BsFileRuled,
    BsFileText,
    BsFileWord,
    BsFolder,
} from "react-icons/bs";

export function getFileIcon(isDir, fileExt) {
    if (isDir) {
        return <BsFolder />;
    }

    const ext = fileExt.toLowerCase();
    if (
        [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "bmp",
            "ico",
            "svg",
            "webp",
            "tiff",
            "tif",
            "heic",
            "heif",
            "avif",
        ].includes(ext)
    ) {
        return <BsFileEarmarkImage />;
    } else if (["ttf", "otf", "woff", "woff2", "eot"].includes(ext)) {
        return <BsFileFont />;
    } else if (["mp4", "mov", "webm", "mkv", "avi", "flv"].includes(ext)) {
        return <BsFileEarmarkPlay />;
    } else if (["mp3", "m4a", "wav", "flac", "ape", "ogg"].includes(ext)) {
        return <BsFileEarmarkMusic />;
    } else if (["txt", "log", "ini", "cfg", "conf", "env"].includes(ext)) {
        return <BsFileText />;
    } else if (["markdown", "md", "html", "htm"].includes(ext)) {
        return <BsFileRichtext />;
    } else if (["json", "xml", "yaml", "yml", "toml"].includes(ext)) {
        return <BsFileRuled />;
    } else if (["doc", "docx", "rtx"].includes(ext)) {
        return <BsFileWord />;
    } else if (["ppt", "pptx", "key"].includes(ext)) {
        return <BsFileEarmarkPpt />;
    } else if (["xls", "xlsx", "numbers", "csv"].includes(ext)) {
        return <BsFileEarmarkSpreadsheet />;
    } else if (["pdf"].includes(ext)) {
        return <BsFileEarmarkPdf />;
    } else if (["mobi", "epub", "azw3"].includes(ext)) {
        return <BsBook />;
    } else if (["js", "jsx", "html", "css", "py", "rs", "cpp"].includes(ext)) {
        return <BsFileCode />;
    } else if (["zip", "rar", "7z", "tar", "gz", "iso", "dmg"].includes(ext)) {
        return <BsFileEarmarkZip />;
    } else {
        return <BsFileEarmark />;
    }
}
