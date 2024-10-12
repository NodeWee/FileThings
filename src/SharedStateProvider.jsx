import React, { useEffect, useState } from "react";
import {
    auto_update_functions,
    auto_update_i18n,
    check_app_updates,
} from "./lib/actions";
import { set_config_items, update_selected_paths } from "./lib/actions";

import { SharedStateContext } from "./SharedStateContext";
import { action_call } from "./lib/caller";
import i18n from "./lib/i18n";

export function SharedStateProvider({ children }) {
    // basic
    const [isDebug, setIsDebug] = useState(null);
    const [platform, setPlatform] = useState(null);
    const T = i18n.translate;
    const get_lang = i18n.get_lang;
    const [uiConfig, setUiConfig] = useState(window.app.config.ui);
    const [appVersion, setAppVersion] = useState(window.app.version);
    const [isNoticeInstallNewApp, setIsNoticeInstallNewApp] = useState(false);

    // file viewer
    const [fileInfo, setFileInfo] = useState(null);
    const [pathOfFileView, setPathOfFileView] = useState("");
    // file converter
    // file cleaner

    const [selectedFileFunctionName, setSelectedFileFunctionName] =
        useState("");
    const [supportedFileFunctions, setSupportedFileFunctions] = useState({});
    const [showModalThing, setShowModalThing] = useState(false);
    const [showModalThingFinder, setShowModalThingFinder] = useState(false);
    const [showModelFileMetadata, setShowModalFileMetadata] = useState(false);

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [showTaskResult, setShowTaskResult] = useState(false);

    const [parsedPaths, setParsedPaths] = useState([]);

    // functions

    function updateAppVersion(key, value) {
        window.app.version[key] = value;
        setAppVersion((prev) => {
            return { ...prev, ...window.app.version };
        });
    }

    function updateUiConfigItems(keyValMap) {
        // keyValMap is object { key: value, ... }

        // update window.app.config.ui
        window.app.config.ui = { ...window.app.config.ui, ...keyValMap };

        // update React state, refresh components
        setUiConfig((prev) => {
            // merge two objects: prev and window.app.config.ui
            return { ...prev, ...window.app.config.ui };
        });

        // persist to Tauri config file
        set_config_items("ui", keyValMap);
    }

    function updateThingConfigItems(keyValMap) {
        // keyValMap: { key: value, ... }

        // update window.app.config.things
        window.app.config.things = {
            ...window.app.config.things,
            ...keyValMap,
        };

        // update React state, refresh components
        setUiConfig((prev) => {
            // merge two objects: prev and window.app.config.things
            return { ...prev, ...window.app.config.things };
        });

        // persist to Tauri config file
        set_config_items("file_function", keyValMap);
    }


    // add method function to window.fileProcessor
    window.fileProcessor.pathMethods.append = function (paths) {
        update_selected_paths({
            action: "append",
            paths,
            stateProps: passingProps,
        });
    }
    window.fileProcessor.pathMethods.remove = function (paths) {
        update_selected_paths({
            action: "remove",
            paths,
            stateProps: passingProps,
        });
    }
    window.fileProcessor.pathMethods.clear = function () {
        update_selected_paths({
            action: "clear",
            stateProps: passingProps,
        });
    }
    window.fileProcessor.pathMethods.replace = function (paths) {
        update_selected_paths({
            action: "replace",
            paths,
            stateProps: passingProps,
        });
    }


    const passingProps = {
        // basic
        isDebug,
        platform,

        uiConfig,
        setUiConfig,
        parsedPaths,
        setParsedPaths,

        isNoticeInstallNewApp,
        setIsNoticeInstallNewApp,

        fileInfo,
        setFileInfo,
        pathOfFileView,
        setPathOfFileView,

        selectedTaskId,
        setSelectedTaskId,
        showTaskResult,
        setShowTaskResult,

        showModalThing,
        setShowModalThing,
        showModalThingFinder,
        setShowModalThingFinder,
        showModelFileMetadata,
        setShowModalFileMetadata,

        selectedFileFunctionName,
        setSelectedFileFunctionName,
        supportedFileFunctions,
        setSupportedFileFunctions,
        appVersion,

        T,
        get_lang,
        updateAppVersion: updateAppVersion,
        updateUiConfigItems: updateUiConfigItems,
        updateThingConfigItems: updateThingConfigItems,
    };

    // === trigger data loading; shared state update, etc. ===
    const [isToolsLoaded, setIsToolsLoaded] = useState(false);

    // get environment info: is debug mode, current OS
    useEffect(() => {
        // get if is debug mode
        if (!window.app.isLoading.isDebug) {
            window.app.isLoading.isDebug = true;
            action_call("env.is_debug", {})
                .then((rst) => {
                    setIsDebug(rst.content);
                })
                .catch((e) => {
                    console.error("Failed to get debug status:", e);
                    setIsDebug(false); // default not debug mode
                });
        }

        // get current OS
        if (!window.app.isLoading.platform) {
            window.app.isLoading.platform = true;
            action_call("env.platform", {})
                .then((rst) => {
                    setPlatform(rst.content);
                })
                .catch((e) => {
                    console.error("Failed to get platform:", e);
                });
        }
    }, []);

    // setUiConfig again, (e.g. window.app.config.ui may not loaded when uiConfig initialized, on Windows)
    // to ensure settings page components can display settings state in time
    useEffect(() => {
        setUiConfig((prev) => {
            return { ...prev, ...window.app.config.ui };
        });
    }, [window.app.config.ui]);

    useEffect(() => {
        // delay to trigger backend to load: tools data (tools functions)
        if (!window.app.isLoading.toolFunctions) {
            window.app.isLoading.toolFunctions = true;
            // delay to invoke `load.tools` // load tool functions
            setTimeout(() => {
                action_call("load.tools", {})
                    .then((rsp) => {
                        setIsToolsLoaded(true);
                    })
                    .catch((e) => {
                        console.error("load.tools:", e);
                    })
                    .finally(() => {
                        window.app.isLoading.toolFunctions = false;
                    });
            }, 1000);
        }

        // delay to trigger backend to load  file functions
        if (!window.app.isLoading.fileFunctions) {
            window.app.isLoading.fileFunctions = true;

            // delay to invoke load.file.functions
            setTimeout(() => {
                action_call("load.file.functions", {})
                    .catch((e) => {
                        console.error("load.file.functions:", e);
                    })
                    .finally(() => {
                        window.app.isLoading.fileFunctions = false;
                    });
            }, 1000);
        }
    }, []);

    // when backend finish loading "tools data", read tools data to frontend
    useEffect(() => {
        if (isToolsLoaded === false) {
            return;
        }
        action_call("tool_data.get_all_tools", {})
            .then((rst) => {
                let data = rst.content;
                // init tools state
                for (let tool_name in data.items) {
                    let tool = data.items[tool_name];
                    tool.available = null; // set to null to indicate not checked
                    tool.version = null; // set to null to indicate not checked
                    tool.installing = false;
                }
                window.app.tools = data;
            })
            .catch((error) => {
                console.error("error", error);
            });
    }, [isToolsLoaded]);

    // disable right-click menu automatically according to isDebug
    useEffect(() => {
        if (isDebug === null) {
            // isDebug not loaded
            return;
        }
        const handleContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        if (!isDebug) {
            // not debug mode, disable right-click menu
            if (!window.app.event_bounds.disable_context_menu) {
                window.app.event_bounds.disable_context_menu = true;
                window.addEventListener("contextmenu", handleContextMenu);
            }
        }
        // when disabled, cannot enable right-click menu again (because later in dom-editor will listen contextmenu event again, so here will not work)
    }, [isDebug]);

    //
    const [autoUpdateTimeoutId, setAutoUpdateTimeoutId] = useState(null);
    useEffect(() => {
        // auto check updates when platform has value
        if (!platform) {
            return;
        }

        // clear previous timer
        if (autoUpdateTimeoutId) {
            clearTimeout(autoUpdateTimeoutId);
        }

        // delay to trigger check updates (but if autoUpdate is switched off, it will not check)
        const newTimeoutId = setTimeout(async () => {
            await check_app_updates({ stateProps: passingProps }).catch((e) => {
                console.error("check_app_updates error:", e);
            });

            await auto_update_functions(12).catch((e) => {
                console.error("auto_update_functions error:", e);
            });

            await auto_update_i18n(12).catch((e) => {
                console.error("auto_update_i18n error:", e);
            });
        }, 5000);

        setAutoUpdateTimeoutId(newTimeoutId);

        return () => {
            if (autoUpdateTimeoutId) {
                clearTimeout(autoUpdateTimeoutId);
            }
        };
    }, [platform]);

    return (
        <SharedStateContext.Provider value={{ passingProps: passingProps }}>
            {children}
        </SharedStateContext.Provider>
    );
}
