import { useEffect } from "react";

export default function Component(props) {
    const { T, selectedTaskId } = props;
    const task = window.fileTaskManager.tasks[selectedTaskId];

    if (task.status.result_read_times > 1) {
        // doneIcon only show once
        return null;
    }

    // when rendering, set class to done-icon to trigger css animation
    useEffect(() => {
        if (task.status.result_read_times < 3) {
            // only trigger animation once (3 is tested, to ensure animation trigger once)
            document.getElementById("done-icon").classList.add("bounceIn");
        }
    });

    return (
        <div id="done-icon" className="text-green-500">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="68"
                height="68"
                fill="currentColor"
                viewBox="0 0 16 16"
            >
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
            </svg>
        </div>
    );
}
