import { BsBan, BsCheckCircle, BsFile, BsXSquare } from "react-icons/bs";
import React, { useEffect, useState } from "react";

import { Tooltip } from "@nextui-org/react";

export default function Component(props) {
    const { T, task_counter } = props;

    if (!task_counter) {
        return null;
    }

    return (
        <div className="flex flex-row items-center justify-center gap-6 opacity-65">
            {task_counter.path > 0 && (
                <Tooltip
                    content={T("app.result.detail.counter.path")}
                    showArrow={true}
                >
                    <div className="flex flex-row items-center gap-1">
                        <BsFile size={14} /> {task_counter.path}
                    </div>
                </Tooltip>
            )}
            {task_counter.path_ok > 0 && (
                <Tooltip
                    content={T("app.result.detail.counter.ok")}
                    showArrow={true}
                >
                    <div className="flex flex-row items-center gap-1">
                        <BsCheckCircle size={14} /> {task_counter.path_ok}
                    </div>
                </Tooltip>
            )}
            {task_counter.path_error > 0 && (
                <Tooltip
                    content={T("app.result.detail.counter.failed")}
                    showArrow={true}
                >
                    <div className="flex flex-row items-center gap-1">
                        <BsXSquare size={14} /> {task_counter.path_error}
                    </div>
                </Tooltip>
            )}

            {task_counter.path_ignore > 0 && (
                <Tooltip
                    content={T("app.result.detail.counter.ignored")}
                    showArrow={true}
                >
                    <div className="flex flex-row items-center gap-1">
                        <BsBan size={14} /> {task_counter.path_ignore}
                    </div>
                </Tooltip>
            )}
        </div>
    );
}
