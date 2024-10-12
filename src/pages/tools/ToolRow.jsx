import { BsCheck2Circle, BsCircle } from "react-icons/bs";
import { Chip, CircularProgress, Link, Tooltip } from "@nextui-org/react";
import { useEffect, useState } from "react";

import ManualInstallationMsg from "./ManualInstallationMsg";
import ToolButtons from "./ToolButtons";
import { check_version } from "./tool-methods";
import { get_translation_from_object_node } from "../../lib/utils";
import { open_link } from "../../lib/actions";

function compare_semver(v1, v2) {
    v1 = v1.split(".");
    v2 = v2.split(".");
    for (let i = 0; i < v1.length; i++) {
        if (v2[i] === undefined) {
            return 1;
        }
        if (parseInt(v1[i]) > parseInt(v2[i])) {
            return 1;
        }
        if (parseInt(v1[i]) < parseInt(v2[i])) {
            return -1;
        }
    }
    if (v2[v1.length] !== undefined) {
        return -1;
    }
    return 0;
}

export default function Component(props) {
    const { toolName, T } = props;
    const toolFunction = window.app.tools.items[toolName];
    const [tool, setTool] = useState(toolFunction);

    if (!tool) {
        return null;
    }

    const toolUrl = tool.profile.website;
    const toolOnlyManualInstall = tool.installation?.auto === false;

    function update_tool_states(updates) {
        Object.keys(updates).forEach((key) => {
            toolFunction[key] = updates[key];
        });

        setTool({ ...toolFunction });
    }

    // attach update_tool_states to tool's self, when component mounted
    //      for use in do_task to update tool states
    useEffect(() => {
        update_tool_states({ update_tool_states: update_tool_states });
    }, []);

    // check tool version when component mounted
    useEffect(() => {
        if (tool.checking || tool.installing) {
            return;
        }
        if (tool.checked) {
            return;
        }

        check_version({ tool: tool, ...props })
            .then(() => {
                update_tool_states({ checked: true });
            })
            .catch((e) => {
                console.error(e);
                update_tool_states({
                    checking: false,
                    error: `Failed to get tool version: ${e.message}`,
                });
            });
    }, []);

    // check tool available(compare version) when version changed
    useEffect(() => {
        if (tool.checking || tool.installing) {
            return;
        }
        if (tool.version === null || tool.version === undefined) {
            // version not get yet
            return;
        }
        if (tool.version === "") {
            // means not available
            update_tool_states({ available: false });
            return;
        }

        if (!tool.required_bin_version) {
            // consider available if no required_bin_version
            update_tool_states({ available: true });
            return;
        }

        // compare version
        let is_available = true;
        let err_msg = null;
        const min_ver = tool.required_bin_version.min;
        const max_ver = tool.required_bin_version.max;
        if (min_ver) {
            // if (tool.version < min_ver) {
            if (compare_semver(tool.version, min_ver) === -1) {
                // is_available = false;
                err_msg = `The installed version is too low: ${tool.version}, at least ${min_ver} is required`;
            }
        }
        if (max_ver) {
            // if (tool.version > max_ver) {
            if (compare_semver(tool.version, max_ver) === 1) {
                // is_available = false;
                err_msg = `The installed version is too high: ${tool.version}, at most ${max_ver} is required`;
            }
        }

        update_tool_states({
            available: is_available,
            error: err_msg,
            checking: false,
        });
    }, [tool.version]);

    return (
        <div className="w-full flex flex-col px-2 py-4 rounded-sm hover:bg-default-50 duration-1000">
            <div className="w-full flex flex-row gap-8 items-center">
                <div className="flex flex-row gap-2 items-center font-bold">
                    <>
                        {tool.available ? (
                            <BsCheck2Circle />
                        ) : (
                            <BsCircle opacity={0.5} />
                        )}
                    </>
                    <>{get_translation_from_object_node(tool.profile.title)}</>
                </div>

                {tool.version && tool.func_type === "tool.exe" && (
                    <div className="flex flex-row items-center text-small opacity-50">
                        <span>
                            {"v"}
                            {tool.version}
                        </span>
                    </div>
                )}

                <div className="flex flex-row items-center text-sm">
                    {tool.available === false && !toolOnlyManualInstall && (
                        <ToolButtons tool={tool} {...props} />
                    )}
                    {tool.available === false && toolOnlyManualInstall && (
                        <ManualInstallationMsg tool={tool} {...props} />
                    )}

                    {tool.checking && (
                        <div className="flex flex-row justify-center items-center gap-1">
                            <CircularProgress
                                aria-label="Progress Circle - Checking"
                                classNames={{
                                    svg: "w-8 h-8 drop-shadow-sm",
                                }}
                                strokeWidth={3}
                                // value={installProgress}
                                color="success"
                            />
                            {T("app.tools.checking")}
                        </div>
                    )}

                    {tool.installing && (
                        <div className="flex flex-row justify-center items-center gap-2">
                            {tool.installProgress ? (
                                <>
                                    <CircularProgress
                                        aria-label="Progress Circle - Installing"
                                        classNames={{
                                            svg: "w-8 h-8 drop-shadow-sm",
                                        }}
                                        strokeWidth={3}
                                        value={
                                            tool.installProgress?.value || null
                                        }
                                        color="success"
                                    />
                                    {T(
                                        tool.installProgress?.message ||
                                            "app.tools.auto-installing"
                                    )}
                                </>
                            ) : (
                                <>
                                    <CircularProgress
                                        aria-label="Progress Circle - Installing"
                                        color="success"
                                        size="sm"
                                    />
                                    {T("app.tools.auto-installing")}
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className=" flex-auto"></div>
                <div>
                    {toolUrl && (
                        <Link
                            aria-label="Tool Website Link"
                            href="#"
                            className="opacity-90"
                            isExternal={true}
                            showAnchorIcon={true}
                            onClick={(e) => {
                                open_link(toolUrl);
                                e.preventDefault();
                            }}
                            size="sm"
                        >
                            {T("app.tools.website")}
                        </Link>
                    )}
                </div>
            </div>

            <div className="w-full text-small">
                {tool.error && tool.available !== false ? (
                    <div className="text-red-500">
                        {T(tool.error, [], false)}
                    </div>
                ) : (
                    <div className="opacity-50">
                        {get_translation_from_object_node(tool.profile.summary)}
                    </div>
                )}
            </div>
        </div>
    );
}
