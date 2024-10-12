use crate::commands;
use crate::commands::command_names as cmd_names;
use crate::commands::structures::CommandResult;
use crate::commands::tools_cmd::model_tool_mock_command_execution;
use crate::errors::BoxedError;
use crate::functions::tool::read::{check_tool_available, get_bin_path};
use async_recursion::async_recursion;
use serde_json::Value as JsonValue;

#[async_recursion]
pub async fn route(command: &str, params: &JsonValue) -> Result<CommandResult, BoxedError> {
    log::debug!("route - command: {}, params: {:?}", command, params);

    // shell.command
    if command.starts_with("shell.") {
        let cmd = command.replace("shell.", "");
        return commands::shell_cmd::execute(&cmd, &params).await;
    };

    // starts with `tool.exe.` and `tool.model.`
    if command.starts_with("tool.exe.") || command.starts_with("tool.model.") {
        let name = command;
        let tool_exists = match check_tool_available(&name) {
            Ok(exists) => exists,
            Err(e) => return Err(e),
        };

        if !tool_exists {
            log::error!("Tool `{}` not available.", name);
            return Err(format!("Tool `{}` not available, please install it first.", name).into());
        }

        let cmd = get_bin_path(&name)?;
        if command.starts_with("tool.exe.") {
            return commands::shell_cmd::execute(&cmd, &params).await;
        } else {
            // tool.model
            return model_tool_mock_command_execution(&cmd, &params);
        }
    };

    // internal command
    match command {
        //
        cmd_names::PATH_EXISTS => commands::path_cmd::is_exists(&params),
        cmd_names::PATH_SPLIT => commands::path_cmd::split_path(&params),
        cmd_names::PATH_READ => commands::path_cmd::read_path(&params),
        cmd_names::PATH_JOIN => commands::path_cmd::join_path(&params),
        cmd_names::PATH_RELATIVE_WITH_HOME_DIR => {
            commands::path_cmd::relative_with_home_dir(&params)
        }
        cmd_names::PATH_ABSOLUTE_WITH_HOME_DIR => {
            commands::path_cmd::absolute_with_home_dir(&params)
        }
        cmd_names::PATH_PARSE_FOR_TASK => commands::path_cmd::parse_for_task(&params),
        cmd_names::PATH_MAKE_UNUSED_PATH => commands::path_cmd::make_unused_file_path(&params),
        cmd_names::PATH_NEW_TEMP_FILE_PATH => commands::path_cmd::new_temp_file_path(&params),
        cmd_names::PATH_LOCATE => commands::path_cmd::locate_path(&params),
        cmd_names::PATH_LOCATE_APP_DATA_DIR => commands::path_cmd::locate_app_data_dir(&params),
        cmd_names::PATH_DELETE => commands::path_cmd::delete_path(&params),
        cmd_names::PATH_RENAME => commands::file_cmd::rename_file(&params), // same as file.rename

        //
        cmd_names::DIR_LIST => commands::path_cmd::dir_list(&params),

        // FILE
        cmd_names::FILE_GET_NAME => commands::file_cmd::get_file_name(&params),
        cmd_names::FILE_GET_EXTENSION => commands::file_cmd::get_file_extension(&params),
        cmd_names::FILE_INFO_BASIC => commands::file_cmd::get_basic_info(&params),
        cmd_names::FILE_INFO_METADATA => commands::file_cmd::get_metadata_info(&params),
        cmd_names::FILE_EXIF_GET => commands::exif_cmd::get_tags(&params),
        cmd_names::FILE_COUNT_FILES => commands::file_cmd::count_files(&params),
        //
        cmd_names::FILE_RENAME => commands::file_cmd::rename_file(&params),
        // FILE
        cmd_names::FILE_READ => commands::file_cmd::read_file(&params),
        cmd_names::FILE_COPY => commands::file_cmd::copy_file(&params),
        cmd_names::FILE_WRITE => commands::file_cmd::write_file(&params),
        // FILES
        cmd_names::FILES_CLEAR => commands::file_cmd::clear_files(&params),

        //
        cmd_names::FILE_SVG_TO_PNG => commands::image_cmd::file_svg_to_png(&params),
        cmd_names::FILE_IMAGE_TO_SVG => commands::image_cmd::file_image_to_svg(&params),
        cmd_names::FILE_IMAGE_REMOVE_BACKGROUND => commands::image_cmd::remove_background(&params),
        cmd_names::FILE_IMAGE_PNG_OPTIMIZE => commands::image_cmd::png_optimize(&params),
        //
        cmd_names::FILE_BINARY_SPLIT => commands::file_cmd::split_file_in_bytes(&params),
        cmd_names::FILE_BINARY_JOIN => commands::file_cmd::join_files_in_bytes(params),
        //
        cmd_names::FILE_HASH => commands::file_cmd::hash_file(&params),

        // text
        cmd_names::TEXT_REPLACE => commands::text_cmd::replace_text(&params),
        cmd_names::TEXT_REPLACE_WORDS => commands::text_cmd::replace_words(&params),
        cmd_names::TEXT_REGEX_EXTRACT => commands::text_cmd::regex_extract(&params),
        cmd_names::TEXT_REGEX_FIND_ALL => commands::text_cmd::regex_find_all(&params),
        cmd_names::TEXT_REGEX_MATCH => commands::text_cmd::regex_match(&params),
        cmd_names::TEXT_SPLIT => commands::text_cmd::split_text(&params),
        cmd_names::TEXT_DATETIME_SPLIT => commands::text_cmd::datetime_split(&params),

        //
        cmd_names::ENV_PLATFORM => commands::env_cmd::get_platform(),
        cmd_names::ENV_ARCH => commands::env_cmd::get_arch(),
        cmd_names::ENV_IS_DEBUG => commands::env_cmd::is_debug(),
        cmd_names::ENV_APP_DATA_DIR => commands::env_cmd::get_app_data_dir(),
        cmd_names::ENV_HOME_DIR => commands::env_cmd::get_home_dir(),
        //
        cmd_names::ARRAY_GET => commands::array_cmd::get_item(&params),
        cmd_names::SEMVER_COMPARE => commands::semver_cmd::compare(&params),

        // url
        cmd_names::URL_OPEN => commands::url_cmd::open_url(&params),

        // data
        cmd_names::I18N_LOAD_LANGUAGES => commands::i18n_cmd::load_languages(),
        cmd_names::I18N_LOAD_TRANSLATION => commands::i18n_cmd::load_translation(&params),

        // tool data
        cmd_names::TOOL_DATA_GET_ALL_TOOLS => commands::tools_cmd::get_tools(),
        cmd_names::TOOL_DATA_GET_BIN_PATH => commands::tools_cmd::get_tool_bin_path(&params),

        //
        cmd_names::IMAGE_SVG_TO_PNG => commands::image_cmd::raw_svg_to_png(&params),

        //
        cmd_names::FONT_LIST_SYSTEM_FONTS => commands::font_cmd::list_system_fonts(&params),
        cmd_names::TEMPLATE_LIST_TEMPLATES => commands::template_cmd::list_templates(&params),
        cmd_names::TEMPLATE_GET_TEMPLATE_CONTENT => {
            commands::template_cmd::get_template_content(&params)
        }

        //
        cmd_names::UPDATER_UPDATE_WORKFLOWS => commands::updater_cmd::update_functions().await,
        cmd_names::UPDATER_UPDATE_I18N => commands::updater_cmd::update_i18n().await,
        cmd_names::UPDATER_DOWNLOAD_APP_WINDOWS_INSTALLER => {
            commands::updater_cmd::download_app_windows_installer(&params).await
        }

        //
        cmd_names::HTTP_DOWNLOAD_FILE => commands::http_cmd::download_file(&params).await,
        cmd_names::ZIP_UNZIP_FILE => commands::zip_cmd::unzip_file(&params),

        //
        _ => Err(format!("Unknown command: {}", command).into()),
    }
}
