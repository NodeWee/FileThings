import { create_function_task } from "../../lib/thing-functions/function-task-taker";
import { get_translation_from_object_node } from "../../lib/utils";
import toast from "react-hot-toast";

export async function check_version(props) {
    const { tool, T } = props;
    const toolDirectly = window.app.tools.items[tool.name];

    if (
        toolDirectly.available ||
        toolDirectly.checking ||
        toolDirectly.installing
    ) {
        return;
    }
    if (toolDirectly.version) {
        return;
    }

    toolDirectly.checking = true;
    tool.update_tool_states({ checking: true });

    await create_function_task({
        task_type: "tool",
        the_function: tool, // for task-taker to get tool.name, tool.worker_file
        action_name: "get_version",
        on_task_started: (task) => {
            const _tool = window.app.tools.items[task.the_function.name];
            _tool.update_tool_states({ checking: true });
        },
        // on_task_progress: ({task, value, message}) => {
        // }
        on_task_done: (task) => {
            const _tool = window.app.tools.items[task.the_function.name];
            console.log("task done:", task);
            if (task.result.status === "error") {
                _tool.update_tool_states({
                    error: `Failed to get tool version: ${task.result.message}`,
                    checking: false,
                });
            } else {
                _tool.update_tool_states({
                    version: task.result.output.version || "", // empty string means not available
                    checking: false,
                });
            }
        },
        on_task_error: (task) => {
            const _tool = window.app.tools.items[task.the_function.name];
            _tool.update_tool_states({
                error: `Failed to get tool version: ${task.result.message}`,
                checking: false,
            });
        },
    }).catch((e) => {
        tool.update_tool_states({
            checking: false,
            error: `Failed to get tool version: ${e.message}`,
        });
    });
    // can't set checking in create_function_task.finally, because it just start the task, then finally
}

export async function install_tool(props) {
    const { tool, T } = props;
    const toolDirectly = window.app.tools.items[tool.name];
    if (toolDirectly.installing || toolDirectly.checking) return;

    const tool_title = get_translation_from_object_node(tool.profile.title);

    // call create_function_task to execute install task
    toolDirectly.installing = true;
    tool.update_tool_states({ installing: true });
    await create_function_task({
        task_type: "tool",
        the_function: tool,
        action_name: "install",
        on_task_started: (task) => {
            const _tool = window.app.tools.items[task.the_function.name];
            _tool.update_tool_states
                ? _tool.update_tool_states({
                      installing: true,
                      installProgress: { value: 0, message: "" },
                  })
                : (_tool.installing = true);
        },
        on_task_progress: ({ task, value, message }) => {
            const _tool = window.app.tools.items[task.the_function.name];
            _tool.update_tool_states
                ? _tool.update_tool_states({
                      installProgress: { value: value, message: message },
                  })
                : (_tool.installProgress = { value: value, message: message });
        },
        on_task_error: (task) => {
            const _tool = window.app.tools.items[task.the_function.name];
            _tool.update_tool_states
                ? _tool.update_tool_states({ installing: false })
                : (_tool.installing = false);
            toast.error(
                T("Failed to install {0}.", [tool_title]) +
                    T(task.result.message),
                { duration: 4000 }
            );
        },
        on_task_done: async (task) => {
            const _tool = window.app.tools.items[task.the_function.name];
            if (task.result.status === "error") {
                // if install error, show error message
                toast.error(
                    T("Failed to install {0}.", [tool_title]) +
                        T(task.result.message),

                    { duration: 4000 }
                );
                _tool.update_tool_states
                    ? _tool.update_tool_states({ installing: false })
                    : (_tool.installing = false);
            } else {
                // after install success, get and update version info
                await create_function_task({
                    task_type: "tool",
                    the_function: tool,
                    action_name: "get_version",
                    on_task_done: (versionTask) => {
                        const _tool2 =
                            window.app.tools.items[versionTask.function_name];
                        if (versionTask.result.status === "error") {
                            // get version info error
                            toast.error(
                                T("Failed to install {0}.", [tool_title]) +
                                    T(versionTask.result.message),
                                { duration: 4000 }
                            );

                            _tool2.update_tool_states
                                ? _tool2.update_tool_states({
                                      installing: false,
                                  })
                                : (_tool2.installing = false);
                            return;
                        } else {
                            // update tool state: version
                            _tool2.update_tool_states
                                ? _tool2.update_tool_states({
                                      installing: false,
                                      version:
                                          versionTask.result.output.version,
                                        // don't update: availability. it will be checked and updated when version changes (compare version to decide availability)
                                  })
                                : (_tool2.installing = false);

                            toast.success(
                                T("app.tools.install-success", [tool_title]),
                                { duration: 3000 }
                            );
                        }
                    },
                }).catch((e) => {
                    console.error("task error:", e);
                    toast.error(
                        T("Failed to install {0}.", [tool_title]) +
                            T(e.toString()),
                        { duration: 4000 }
                    );
                    _tool.update_tool_states({ installing: false });
                });
            }
        },
    }).catch((e) => {
        // if create_function_task call failed
        console.error("install function error:", e);
        toast.error(
            T("Failed to install {0}.", [tool_title]) + T(e.toString()),
            {
                duration: 4000,
            }
        );
        tool.update_tool_states({ installing: false });
    });
    // can't set installing in create_function_task.finally, because it just start the task, then finally
}
