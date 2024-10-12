import {
    BsCheckCircle,
    BsCircleFill,
    BsExclamationCircle,
} from "react-icons/bs";
import { Button, CircularProgress } from "@nextui-org/react";
import { useEffect, useState } from "react";

import { get_function_title } from "../../lib/thing-functions/utils";
import { locate_paths } from "../../lib/actions";

export default function Component(props) {
    const { task, T, get_lang, setSelectedTaskId, setShowTaskResult } = props;

    if (!task) {
        return null;
    }

    const [taskStatus, setTaskStatus] = useState(task.status);
    const [taskProgress, setTaskProgress] = useState(task.progress);

    const func_title = get_function_title(task.the_function);

    function update_task_status(updates) {
        task.status = { ...task.status, ...updates };
        setTaskStatus(task.status);
    }
    function update_task_progress(updates) {
        task.progress = { ...task.progress, ...updates };
        setTaskProgress(task.progress);
    }

    // attach states updater to task object, for used in worker component
    useEffect(() => {
        task.update_task_status = update_task_status;
        task.update_task_progress = update_task_progress;
    }, []);

    return (
        <div className="flex flex-row gap-8 items-center">
            <div className="flex flex-row items-center gap-2 text-nowrap">
                <div>{func_title}</div>
                <div className="text-small opacity-50">({task.start_time})</div>
            </div>

            {/* show progress */}
            {taskStatus.running && taskProgress === null && (
                <CircularProgress color="success" size="sm" strokeWidth={4} />
            )}
            {taskStatus.running && taskProgress && (
                <CircularProgress
                    color="success"
                    size="sm"
                    strokeWidth={4}
                    value={taskProgress.value}
                />
            )}
            {taskStatus.running && taskProgress?.message && (
                <div className="text-sm">{T(taskProgress.message)}</div>
            )}

            {/* show result status message */}
            {!taskStatus.running &&
                task.result?.displayStatus?.errorMessage && (
                    <div className="text-sm text-red-500 text-nowrap overflow-clip text-ellipsis">
                        {task.result.displayStatus.errorMessage}
                    </div>
                )}

            {/* show first dest path */}
            {task.result?.path_results &&
                task.result.path_results.length > 0 &&
                task.result.path_results[0].rel_dest_paths && (
                    <div
                        className="text-sm text-nowrap overflow-clip text-ellipsis cursor-pointer"
                        onClick={() => {
                            locate_paths([
                                task.result.path_results[0].rel_dest_paths[0],
                            ]);
                        }}
                    >
                        {task.result.path_results[0].rel_dest_paths[0]}
                    </div>
                )}

            <div className="flex-auto"></div>

            {/* new result icon */}
            {!taskStatus.running && task.status?.result_read === false && (
                <BsCircleFill color="lightgreen" size={12} />
            )}

            {/* result button */}
            {!taskStatus.running && task.result && (
                <Button
                    variant="light"
                    onPress={() => {
                        setSelectedTaskId(task.task_id);
                        setShowTaskResult(true);
                    }}
                    size="sm"
                    isIconOnly
                >
                    {task.result.displayStatus?.isError === true ? (
                        <BsExclamationCircle color="red" size={20} />
                    ) : (
                        <BsCheckCircle size={20} />
                    )}
                </Button>
            )}
        </div>
    );
}
