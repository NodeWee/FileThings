// This file is the main entry point, used to import global styles, initialize global variables, load configurations, and render the root component
// This file is also used to initialize global variables, load configurations, and render the root component
import "./css/animation.css";
import "./css/app.css";
import "./css/atom-at-last.css";

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import {
    auto_update_functions,
    auto_update_i18n,
    check_app_updates,
    get_config_all,
} from "./lib/actions";

import App from "./pages/App";
import ContentLoading from "./components/controls/ContentLoading";
import ErrorPage from "./pages/error";
import React from "react";
import ReactDOM from "react-dom/client";
import { SharedStateProvider } from "./SharedStateProvider";
import { action_call } from "./lib/caller";
import i18n from "./lib/i18n";
import routes from "./routes";

window.fileTaskManager = {
    tasks: {}, // manage tasks: {id:{},...}
    selected: null, // current selected task ID
    prepared: {}, // user config and manage current preparing tasks
    init_prepared: () => {
        // initialize prepared
        window.fileTaskManager.prepared = {
            // user config and manage current preparing tasks
            file_function_name: "", // selected file_function name
            save_to: {}, // output_file/output_dir, to_format
            args: {}, //
        };
    },
};
window.fileTaskManager.init_prepared();

window.toolTasks = {}; // manage tool tasks: {id:{},...}

window.fileInfos = {}; // store file info
// struct: {
//     "full path": {
//         isLoadingBasic: false,
//         basic: { loading, data, error },
//         isLoadingMetadata: false,
//         metadata: { loading, data, error },
//         hash: { md5: { loading, data, error }, sha1, sha256 },
//     },
//     ...
// }

window.fileProcessor = {
    // methods
    pathMethods: {},

    paths: {
        selected: [], // user selected file paths
        parsed: [], // parsed file paths
    },
}

window.app = {
    languages: [],
    translations: {},
    isLoading: {}, // mark if loading a resource, to avoid duplicate loading. e.g. load functions, duplicate loading will cause error
    isUpdating: {}, // mark if updating a resource, to avoid duplicate updating. e.g. update functions, duplicate updating will cause error
    env: {
        // isDebug: null, // defined in SharedStateProvider by useState
    },
    version: {
        current: "",
        latest: "",
        checking: false,
        updating: false,
        newAppReady: false,
        newVerInfo: {},
    },
    config: {
        ui: {
            loaded: false,
        },
        things: {},
    },
    event_bounds: {}, // avoid duplicate binding events
    tools: null, // {exe_names, model_names, items: {tool_name: tool_obj}

};

// load config first to guide user to set language, then load language data for UI display
get_config_all("ui")
    .then((cfg) => {
        // set default value to some settings
        // if switchAutoUpdate is not set, set it to true
        if (cfg.switchAutoUpdate === undefined) {
            cfg.switchAutoUpdate = true;
        }

        window.app.config.ui = cfg;

        // load language and translation (after config.ui loaded)
        action_call("i18n.load.languages", {})
            .then((rsp) => {
                window.app.languages = rsp.content;
            })
            .catch((e) => {
                window.app.languages.error = `Failed to load languages: ${e}`;
                console.error(e);
            });

        action_call("i18n.load.translation", {
            lang_code: i18n.get_lang(),
        })
            .then((rsp) => {
                window.app.translation = rsp.content;
            })
            .catch((e) => {
                console.error(e);
            });
    })
    .catch((e) => {
        console.error("get_config_all.ui:", e);
    });

get_config_all("file_function")
    .then((cfg) => {
        window.app.config.things = cfg;
    })
    .catch((e) => {
        console.error("get_config_all.file_function:", e);
    });

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: routes,
        errorElement: <ErrorPage />,
    },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <SharedStateProvider>
            <RouterProvider
                router={router}
                fallbackElement={<ContentLoading />}
            />
        </SharedStateProvider>
    </React.StrictMode>
);
