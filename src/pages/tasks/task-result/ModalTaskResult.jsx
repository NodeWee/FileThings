import {
    Button,
    Card,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Tab,
    Tabs,
} from "@nextui-org/react";
import { useEffect, useState } from "react";

import { BsX } from "react-icons/bs";
import DoneIcon from "./DoneIcon";
import TabMultiFileDetails from "./TabMultiFileDetails";
import TabOutput from "./TabOutput";
import TabSingleFileDetail from "./TabSingleFileDetail";
import { action_call } from "../../../lib/caller";
import { get_function_title } from "../../../lib/thing-functions/utils";

export default function ComponentModalTaskResult(props) {
    const { showTaskResult, setShowTaskResult, selectedTaskId, T } = props;

    if (!selectedTaskId) {
        return null;
    }

    const task = window.fileTaskManager.tasks[selectedTaskId];
    const the_function = task.the_function;

    if (!task.result) {
        return;
    }

    let hasOutput = false;
    if (task.result?.output && Object.keys(task.result.output).length > 0) {
        hasOutput = true;
    }
    let hasFileDetails = false;
    if (task.result?.path_results && task.result.path_results.length > 0) {
        hasFileDetails = true;
    }

    if (!task.status.result_read_times) {
        task.status.result_read_times = 0;
    }
    task.status.result_read_times++;
    task.status.result_read = true;

    return (
        <Modal
            aria-label="Task Result Modal"
            // className="w-fit h-fit min-w-96 max-w-full max-h-full p-1 overflow-hidden scrollbar-hide"
            backdrop="blur"
            scrollBehavior="outside"
            isOpen={showTaskResult}
            closeButton={
                <Button
                    className="pointer-events-none"
                    size="md"
                    variant="ghost"
                    radius="full"
                    isIconOnly
                >
                    <BsX size={20} />
                </Button>
            }
            onClose={() => setShowTaskResult(false)}
            size="5xl"
        >
            <ModalContent className="scrollbar-hide">
                <ModalHeader>
                    <div className="flex flex-row items-center gap-2 opacity-50">
                        <div>{get_function_title(the_function)}</div>
                        <div className="text-sm font-normal">
                            ({task.start_time})
                        </div>
                    </div>
                </ModalHeader>
                {/* <ModalBody className="flex flex-col min-w-40 min-h-40 max-h-full scrollbar-hide"> */}
                <ModalBody>
                    {task.result.displayStatus.isOk && (
                        <div className="flex flex-row w-full justify-center items-center">
                            <DoneIcon {...props} />
                        </div>
                    )}

                    {hasOutput || hasFileDetails ? (
                        <Tabs
                            aria-label="Task result tabs"
                            className="flex flex-row justify-center"
                            variant="solid"
                        >
                            {hasOutput && (
                                <Tab
                                    key="outputs"
                                    title={T("app.result.outputs")}
                                >
                                    <TabOutput {...props} />
                                </Tab>
                            )}
                            {hasFileDetails && (
                                <Tab
                                    key="details"
                                    title={T("app.result.details")}
                                >
                                    <TabMultiFileDetails
                                        taskResult={task.result}
                                        {...props}
                                    />
                                </Tab>
                            )}
                        </Tabs>
                    ) : (
                        !task.result.displayStatus.isOk && (
                            <div className="text-error flex flex-col text-center gap-4 select-text">
                                <span>{T("app.result.task_error")}</span>
                                {/* if errorMessage is multi-line, use textarea */}
                                {task.result.displayStatus.errorMessage.split(
                                    "\n"
                                ).length > 1 ? (
                                    <textarea
                                        className="text-error w-full h-40 p-2 min-h-40"
                                        value={
                                            task.result.displayStatus
                                                .errorMessage
                                        }
                                        // double click to select all
                                        onDoubleClick={(e) => e.target.select()}
                                        readOnly
                                    />
                                ) : (
                                    <div>
                                        {task.result.displayStatus.errorMessage}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
