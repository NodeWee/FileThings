import { log_error, log_info } from "./actions";

// import { app } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";

export async function config_call({
    scope,
    action,
    params,
    ok_callback,
    error_callback,
}) {
    var backend_func_args = {
        scope: scope,
        action: action,
        params: JSON.stringify(params || {}),
    };

    return await invoke("config_call", backend_func_args)
        .then((rsp) => {
            rsp = JSON.parse(rsp);
            // console.log(`config ${action} ok:`, rsp);
            ok_callback && ok_callback(rsp);
            return rsp;
        })
        .catch((e) => {
            console.error(`config ${action} error:`, e);
            error_callback && error_callback(e);
            throw e;
        });
}

export async function action_call(action_name, action_params) {
    var backend_func_args = {
        action: action_name,
        params: JSON.stringify(action_params),
    };

    return await invoke("action_call", backend_func_args).then((rsp) => {
        rsp = JSON.parse(rsp);
        return rsp;
    });
}

export async function file_function_command_invoke(
    command_name,
    command_params
) {
    var backend_func_args = {
        command: command_name,
        params: command_params ? JSON.stringify(command_params) : "{}",
    };

    return await invoke("file_function_command_invoke", backend_func_args)
        .then((rsp) => {
            rsp = JSON.parse(rsp);
            return rsp;
        })
        .catch((e) => {
            log_error(
                `${e.toString()}. Args: ${JSON.stringify(backend_func_args)}`
            );
            throw e;
        });
}
