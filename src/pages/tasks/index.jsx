import { useContext, useEffect } from "react";

import Layout from "../layout";
import ModalTaskResult from "./task-result/ModalTaskResult";
import { SharedStateContext } from "../../SharedStateContext";
import TaskRow from "./TaskRow";

// FILE TASKS PAGE
export default function Component(props) {
    const { passingProps } = useContext(SharedStateContext);
    const { T, selectedTaskId, showTaskResult, setShowTaskResult } =
        passingProps;

    const tasks = window.fileTaskManager.tasks; // tasks is an object {id:{task data},...}

    useEffect(() => {
        // when open tasks page, show task result automatically according to the situation
        if (selectedTaskId) {
            const task = tasks[selectedTaskId];
            if (task && task.status.result_read === false) {
                // if task is not read, show task result
                setShowTaskResult(true);
            }
        }
    }, []);

    return (
        <Layout>
            <div className="flex flex-col gap-10 px-8 py-4">
                <div className="w-full text-center opacity-50">
                    {T("app.tasks.description")}
                </div>

                <div className="flex flex-col-reverse gap-4">
                    {tasks &&
                        Object.keys(tasks).length > 0 &&
                        Object.values(tasks).map((task) => (
                            <TaskRow
                                aria-label={`TaskRow ${task.task_id}`}
                                key={task.task_id}
                                task={task}
                                {...passingProps}
                            />
                        ))}
                </div>

                <div className="bottom-base-line"></div>
            </div>

            <ModalTaskResult {...passingProps} />
        </Layout>
    );
}
