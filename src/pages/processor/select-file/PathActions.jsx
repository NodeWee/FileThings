import { BsFileEarmarkPlus, BsFolderPlus, BsX } from "react-icons/bs";
import { Button, Divider, Tooltip } from "@nextui-org/react";
import { useEffect, useState } from "react";

export default function Component(props) {
    const { T, openFileDialog, taskResult } =
        props;

    return (
        <>
            <div className="flex flex-row w-full bg-default-50 mb-4 gap-1">
                <Tooltip
                    content={T("app.paths.add-files")}
                    color="success"
                    showArrow={true}
                    delay={50}
                    closeDelay={50}
                    placement="bottom"
                >
                    <Button
                        className="w-12"
                        onPress={(event) =>
                            openFileDialog({ event, isDirectory: false, isAppend: true })
                        }
                        variant="light"
                        radius="none"
                        size="md"
                        isIconOnly
                    >
                        <BsFileEarmarkPlus size={18} />
                    </Button>
                </Tooltip>

                <Tooltip
                    content={T("app.paths.add-folders")}
                    color="success"
                    showArrow={true}
                    delay={50}
                    closeDelay={50}
                    placement="bottom"
                >
                    <Button
                        className="w-12"
                        onPress={(event) =>
                            openFileDialog({
                                event,
                                isDirectory: true,
                                isAppend: true,
                            })
                        }
                        variant="light"
                        radius="none"
                        size="md"
                        isIconOnly
                    >
                        <BsFolderPlus size={18} />
                    </Button>
                </Tooltip>

                {/* <div className="flex-auto"></div> */}

                <Tooltip
                    content={T("app.paths.clear-selected")}
                    color="success"
                    showArrow={true}
                    delay={50}
                    closeDelay={50}
                    placement="bottom"
                >
                    <Button
                        onPress={() => {
                            // reset selected files
                            window.fileProcessor.pathMethods.clear();
                        }}
                        variant="light"
                        radius="none"
                        size="md"
                    >
                        <BsX size={20} />
                        <span className="opacity-50 text-sm">
                            {window.fileProcessor.paths.selected.length}
                        </span>
                    </Button>
                </Tooltip>
            </div>
        </>
    );
}
