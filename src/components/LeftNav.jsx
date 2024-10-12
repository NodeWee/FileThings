import { Badge, Button, Tooltip } from "@nextui-org/react";
import {
    BsCardChecklist,
    BsCheck,
    BsExclamationCircle,
    BsFileEarmark,
    BsFilesAlt,
    BsGear,
    BsInfoSquare,
} from "react-icons/bs";
import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AiOutlineClear } from "react-icons/ai";
import { PiToolbox } from "react-icons/pi";
import { SharedStateContext } from "../SharedStateContext";

export default function Component(props) {
    const { passingProps } = useContext(SharedStateContext);
    const { T } = passingProps;
    const cur_path = useLocation().pathname;
    const navigate = useNavigate();

    const buttonClasses =
        "w-full py-8 justify-start items-center hover:bg-default-100/80 bg-transparent opacity-65";
    const buttonActiveClasses =
        "w-full py-8 justify-start items-center bg-default-200/80 opacity-100";

    const tasks = window.fileTaskManager.tasks;
    const [hasTask, setHashTask] = useState(
        tasks && Object.keys(tasks).length > 0
    );
    const [hasTaskRunning, setHasTaskRunning] = useState(false);
    const [hasNewDoneTask, setHasNewDoneTask] = useState(false);
    const [hasNewErrorTask, setHasNewErrorTask] = useState(false);

    useEffect(() => {
        const isHasTask = tasks && Object.keys(tasks).length > 0;
        setHashTask(isHasTask);

        if (isHasTask) {
            let isRunning = Object.values(tasks).some(
                (task) => task.status.running
            );
            setHasTaskRunning(isRunning);

            let isNewDoneTask = Object.values(tasks).some(
                (task) =>
                    task.result &&
                    task.result.status === "ok" &&
                    task.status.result_read === false
            );
            setHasNewDoneTask(isNewDoneTask);

            let isNewErrorTask = Object.values(tasks).some(
                (task) =>
                    task.result &&
                    task.result.status === "error" &&
                    task.status.result_read === false
            );
            setHasNewErrorTask(isNewErrorTask);
        }
    }, [window.fileTaskManager.tasks]);

    return (
        <div
            aria-label="Left Navigation"
            className="w-fit flex flex-col justify-between"
        >
            <Tooltip
                content={T("View file metadata")}
                delay={800}
                closeDelay={50}
                color="success"
                showArrow={true}
                placement="right"
            >
                <div className="w-full flex flex-col p-0 m-0">
                    <Button
                        aria-label="Navigate to Viewer page"
                        className={
                            cur_path === "/"
                                ? buttonActiveClasses
                                : buttonClasses
                        }
                        startContent={<BsInfoSquare size={20} />}
                        onPress={() => navigate("/")}
                        radius="none"
                        size="lg"
                    >
                        {T("app.nav.view")}
                    </Button>
                </div>
            </Tooltip>

            <Tooltip
                content={T(
                    "File rename, format conversion, parsing, synthesis and other processing"
                )}
                delay={800}
                closeDelay={50}
                color="success"
                showArrow={true}
                placement="right"
            >
                <div className="w-full flex flex-col p-0 m-0">
                    <Button
                        aria-label="Navigate to Processor page"
                        className={
                            cur_path === "/processor"
                                ? buttonActiveClasses
                                : buttonClasses
                        }
                        startContent={<BsFilesAlt size={20} />}
                        onPress={() => navigate("/processor")}
                        radius="none"
                        size="lg"
                    >
                        {T("app.nav.process")}
                    </Button>
                </div>
            </Tooltip>

            <Tooltip
                content={T("Clean up junk files")}
                delay={800}
                closeDelay={50}
                color="success"
                showArrow={true}
                placement="right"
            >
                <div className="w-full flex flex-col p-0 m-0">
                    <Button
                        aria-label="Navigate to Cleaner page"
                        className={
                            cur_path === "/cleaner"
                                ? buttonActiveClasses
                                : buttonClasses
                        }
                        startContent={<AiOutlineClear size={20} />}
                        onPress={() => navigate("/cleaner")}
                        radius="none"
                        size="lg"
                    >
                        {T("app.nav.clean")}
                    </Button>
                </div>
            </Tooltip>

            <div className="flex flex-auto p-0 m-0">
                <div></div>
            </div>

            <div className="w-full flex flex-col p-0 m-0">
                {hasTask && (
                    <Tooltip
                        content={T("Task records for file processing")}
                        delay={800}
                        closeDelay={50}
                        color="success"
                        showArrow={true}
                        placement="right"
                    >
                        <div
                            aria-label="Navigate to Tasks Page"
                            className="w-full flex flex-col p-0 m-0"
                        >
                            <Badge
                                aria-label="Tasks Badge"
                                variant="shadow"
                                shape="circle"
                                color="success"
                                size="sm"
                                isOneChar={true}
                                placement="top-right"
                                isInvisible={
                                    cur_path === "/tasks" ||
                                    (!hasTaskRunning &&
                                        !hasNewDoneTask &&
                                        !hasNewErrorTask)
                                }
                                content={
                                    hasTaskRunning ? (
                                        <></>
                                    ) : hasNewErrorTask ? (
                                        <BsExclamationCircle />
                                    ) : hasNewDoneTask ? (
                                        <BsCheck />
                                    ) : null
                                }
                            >
                                <Button
                                    aria-label="Navigate to Tasks"
                                    className={
                                        cur_path === "/tasks"
                                            ? buttonActiveClasses
                                            : buttonClasses
                                    }
                                    startContent={<BsCardChecklist size={20} />}
                                    onPress={() => navigate("/tasks")}
                                    radius="none"
                                    size="lg"
                                >
                                    {T("app.tasks.title")}
                                </Button>
                            </Badge>
                        </div>
                    </Tooltip>
                )}

                <Button
                    aria-label="Navigate to Tools"
                    className={
                        cur_path === "/tools"
                            ? buttonActiveClasses
                            : buttonClasses
                    }
                    startContent={<PiToolbox size={20} />}
                    onPress={() => navigate("/tools")}
                    radius="none"
                    size="lg"
                >
                    {T("app.tools.title")}
                </Button>
                <Button
                    aria-label="Navigate to Settings"
                    className={
                        cur_path === "/settings"
                            ? buttonActiveClasses
                            : buttonClasses
                    }
                    startContent={<BsGear size={20} />}
                    onPress={() => navigate("/settings")}
                    radius="none"
                    size="lg"
                >
                    {T("app.settings.title")}
                </Button>
            </div>
        </div>
    );
}
