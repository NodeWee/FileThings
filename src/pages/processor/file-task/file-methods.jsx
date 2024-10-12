import { create_function_task } from "../../../lib/thing-functions/function-task-taker";
import { get_function_title } from "../../../lib/thing-functions/utils";

export async function process_files(props) {
    const {
        file_function,
        T,
        showTaskResult,
        setShowTaskResult,
        setSelectedTaskId,
    } = props;
    const preparedTask = window.fileTaskManager.prepared;

    const func_title = get_function_title(file_function);

    function show_task_result_if_on_tasks_page(task_id) {
        // if on tasks page and task result board not showing, show task result board
        if (window.location.pathname === "/tasks" && !showTaskResult) {
            setSelectedTaskId(task_id);
            setShowTaskResult(true);
        }
    }

    return await create_function_task({
        task_type: "file",
        the_function: file_function, // for task-taker to get tool.name, tool.worker_file
        action_name: "main",
        action_params: {
            input_paths: window.fileProcessor.paths.selected,
            ...preparedTask.save_to,
            ...preparedTask.args,
        },
        on_task_started: (task) => {
            task.update_task_status
                ? task.update_task_status({ running: true })
                : (task.status.running = true);
            // let msg = T("Task started") + " - " + func_title;
            // toast(msg, { duration: 1000 });
        },
        on_task_progress: ({ task, value, message }) => {
            task.update_task_progress
                ? task.update_task_progress({ value, message })
                : (task.progress = { value, message });
        },
        on_task_error: (task) => {
            task.update_task_status
                ? task.update_task_status({ running: false })
                : (task.status.running = false);

            let msg = `${T("Task failed")} - ${func_title}: ${
                task.result.message
            }`;
            // toast.error(msg);

            show_task_result_if_on_tasks_page(task.task_id);
        },
        on_task_done: (task) => {
            task.update_task_status
                ? task.update_task_status({ running: false })
                : (task.status.running = false);

            show_task_result_if_on_tasks_page(task.task_id);
        },
    });
}
