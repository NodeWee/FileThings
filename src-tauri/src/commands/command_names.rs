// path
pub const PATH_EXISTS: &'static str = "path.exists";
pub const PATH_JOIN: &'static str = "path.join";
pub const PATH_SPLIT: &'static str = "path.split";
pub const PATH_READ: &'static str = "path.read";
pub const PATH_RELATIVE_WITH_HOME_DIR: &'static str = "path.relative.with_home_dir";
pub const PATH_ABSOLUTE_WITH_HOME_DIR: &'static str = "path.absolute.with_home_dir";
pub const PATH_NEW_TEMP_FILE_PATH: &'static str = "path.new_temp_file_path";
pub const PATH_LOCATE: &'static str = "path.locate";
pub const PATH_LOCATE_APP_DATA_DIR: &'static str = "path.locate.app_data_dir";
pub const PATH_PARSE_FOR_TASK: &'static str = "path.parse_for_task";
pub const PATH_MAKE_UNUSED_PATH: &'static str = "path.make_unused_path";
pub const PATH_DELETE: &'static str = "path.delete";
pub const PATH_RENAME: &'static str = "path.rename"; // same as file.rename
                                                     // DIR
pub const DIR_LIST: &'static str = "dir.list";
// file

pub const FILE_GET_NAME: &'static str = "file.get_name";
pub const FILE_GET_EXTENSION: &'static str = "file.get_extension";

pub const FILE_INFO_BASIC: &'static str = "file.info.basic";
pub const FILE_INFO_METADATA: &'static str = "file.info.metadata";
pub const FILE_EXIF_GET: &'static str = "file.exif.get";
pub const FILE_COUNT_FILES: &'static str = "file.count_files";
//
pub const FILE_RENAME: &'static str = "file.rename";
//
pub const FILE_READ: &'static str = "file.read";
pub const FILE_WRITE: &'static str = "file.write";
pub const FILE_COPY: &'static str = "file.copy";
// FILES
pub const FILES_CLEAR: &'static str = "files.clear";

// file - convert
pub const FILE_SVG_TO_PNG: &'static str = "file.svg_to_png";
pub const FILE_IMAGE_TO_SVG: &'static str = "file.image_to_svg";

pub const FILE_IMAGE_REMOVE_BACKGROUND: &'static str = "file.image.remove_background";
pub const FILE_IMAGE_PNG_OPTIMIZE: &'static str = "file.image.png_optimize";

pub const FILE_BINARY_SPLIT: &'static str = "file.binary.split";
pub const FILE_BINARY_JOIN: &'static str = "file.binary.join";

pub const FILE_HASH: &'static str = "file.hash";

// raw
pub const IMAGE_SVG_TO_PNG: &'static str = "image.svg_to_png";

// load/get data
pub const I18N_LOAD_LANGUAGES: &'static str = "i18n.load.languages";
pub const I18N_LOAD_TRANSLATION: &'static str = "i18n.load.translation";

// Tool data
// NOTE: prefix using tool_data. to avoid confusion with tool. (tool. for executing tool commands)
pub const TOOL_DATA_GET_ALL_TOOLS: &'static str = "tool_data.get_all_tools";
pub const TOOL_DATA_GET_BIN_PATH: &'static str = "tool_data.get_bin_path";
//
pub const HTTP_DOWNLOAD_FILE: &'static str = "http.download_file";
pub const ZIP_UNZIP_FILE: &'static str = "zip.unzip_file";

//
pub const URL_OPEN: &'static str = "url.open";

pub const TEXT_REPLACE: &'static str = "text.replace";
pub const TEXT_REPLACE_WORDS: &'static str = "text.replace_words";
pub const TEXT_REGEX_EXTRACT: &'static str = "text.regex.extract";
pub const TEXT_REGEX_FIND_ALL: &'static str = "text.regex.find_all";
pub const TEXT_REGEX_MATCH: &'static str = "text.regex.match";
pub const TEXT_SPLIT: &'static str = "text.split";
pub const TEXT_DATETIME_SPLIT: &'static str = "text.datetime.split";

//
pub const ENV_PLATFORM: &'static str = "env.platform";
pub const ENV_ARCH: &'static str = "env.arch";
pub const ENV_IS_DEBUG: &'static str = "env.is_debug";
pub const ENV_APP_DATA_DIR: &'static str = "env.app_data_dir";
pub const ENV_HOME_DIR: &'static str = "env.home_dir";

//
pub const ARRAY_GET: &'static str = "array.get";
//
pub const SEMVER_COMPARE: &'static str = "semver.compare";

//
pub const FONT_LIST_SYSTEM_FONTS: &'static str = "font.list_system_fonts";
pub const TEMPLATE_LIST_TEMPLATES: &'static str = "template.list_templates";
pub const TEMPLATE_GET_TEMPLATE_CONTENT: &'static str = "template.get_template_content";

//
pub const UPDATER_UPDATE_WORKFLOWS: &'static str = "updater.update_functions";
pub const UPDATER_UPDATE_I18N: &'static str = "updater.update_i18n";
pub const UPDATER_DOWNLOAD_APP_WINDOWS_INSTALLER: &'static str =
    "updater.download_app_windows_installer";
