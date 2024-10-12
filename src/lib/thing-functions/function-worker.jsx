import React, { useEffect, useRef, useState } from "react";

export default function Component({
    task, // task_id, action, methods, result, worker:{ root, code, callback }
}) {
    const pageCode = `
<!DOCTYPE html>
<html>
<head></head>
<body>
<script>
${task.worker.utils_code}
${task.worker.code}
window.task_function_main=main;
</script>
</body>
</html>
`;

    const pageRef = useRef(null);

    useEffect(() => {
        const iframe = pageRef.current;
        if (!iframe) {
            return;
        }

        const handleLoad = () => {
            let attempt = 0;
            const maxAttempts = 20;
            const interval = 50; // 每50毫秒检查一次

            const attemptInvokeHandler = () => {
                let handler = iframe.contentWindow.task_function_main;

                if (handler) {
                    handler({
                        action: task.action, // {name, parameters}
                        // wrapper a task object for worker to use
                        task: {
                            task_id: task.task_id,
                            methods: task.methods,
                            counter: task.counter,
                            result: task.result,
                            matches: task.the_function.matches,
                        },
                    })
                        .then(() => {
                            task.worker.on_done(task.task_id);
                        })
                        .catch((e) => {
                            let msg = `${
                                task.action.name
                            } failed: ${e.toString()}`;
                            console.error(msg);
                            task.worker.on_error(task.task_id, msg);
                        });
                } else {
                    if (attempt < maxAttempts) {
                        attempt++;
                        setTimeout(attemptInvokeHandler, interval);
                    } else {
                        task.worker.on_error(
                            task.task_id,
                            `Handler function not found in worker code after max attempts`
                        );
                    }
                }
            };

            attemptInvokeHandler();
        };

        iframe.addEventListener("load", handleLoad);

        return () => {
            iframe.removeEventListener("load", handleLoad);
        };
    }, [pageRef?.current]);

    return (
        <div className="hidden">
            <iframe
                aria-label="function-worker-page"
                hidden
                ref={pageRef}
                srcDoc={pageCode}
            />
        </div>
    );
}
