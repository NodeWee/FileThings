import "./FileLanding.css";

import { BsFileEarmarkPlus, BsFolderPlus } from "react-icons/bs";
import { Button, Tooltip } from "@nextui-org/react";
import { useEffect, useState } from "react";

import { FaFileImport } from "react-icons/fa6";

export default function Component(props) {
    const { T, openFileDialog, showDirectoryButton } = props;

    return (
        <div className="flex flex-row gap-4">
            <Button
                aria-label="button-file-landing"
                id="file-landing"
                className="select-none flex flex-col justify-center items-center p-4 gap-6"
                onPress={(event) =>
                    openFileDialog({ event, isDirectory: false })
                }
                size="lg"
                radius="sm"
                color="default"
                variant="bordered"
            >
                <div className="icon">
                    <FaFileImport size={24} />
                </div>
                <div className="flex text-wrap">
                    {T("app.paths.file-landing-placeholder", [
                        T("app.paths.files"),
                    ])}
                </div>
            </Button>

            {showDirectoryButton && (
                <Tooltip
                    content={T("app.paths.add-folders")}
                    closeDelay={50}
                    color="success"
                    showArrow={true}
                    placement="left"
                >
                    <Button
                        aria-label="button-folder-add"
                        className="h-full opacity-50"
                        onPress={(event) =>
                            openFileDialog({ event, isDirectory: true })
                        }
                        size="lg"
                        radius="md"
                        color="default"
                        variant="faded"
                        isIconOnly
                    >
                        <BsFolderPlus size={24} />
                    </Button>
                </Tooltip>
            )}
        </div>
    );
}
