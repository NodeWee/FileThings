import { BsArrowRightCircle, BsX } from "react-icons/bs";
import {
    renderButtonFileNameTitle,
    renderButtonClearMetadata,
    renderCounts,
    renderFileBasicInfo,
    renderFileHash,
    renderFileMetadataObject,
} from "./file-info-renderer";
import { useContext, useEffect, useState } from "react";

import { Button } from "@nextui-org/react";
import FileLanding from "../../components/controls/FileLanding";
import Layout from "../layout";
import { Link } from "@nextui-org/react";
import { SharedStateContext } from "../../SharedStateContext";

import { get_file_info } from "../../lib/actions";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Component(props) {
    const navigate = useNavigate();
    const { passingProps } = useContext(SharedStateContext);
    const { T, pathOfFileView, setPathOfFileView, } =
        passingProps;
    const [fileInfo, setFileInfo] = useState(window.fileInfos[pathOfFileView]);
    const [isCounting, setIsCounting] = useState(false);

    const openFileDialog = async ({ event, isDirectory }) => {
        const selected = await open({
            multiple: false,
            directory: isDirectory,
        });

        if (selected) {
            // selected is an object when file is selected, is a string when directory is selected
            const path = selected.path || selected;
            setPathOfFileView(path);
        }
    };

    async function bindEvents() {
        // put this code in home page //

        // // bind notify_user event
        // if (!window.app.event_bounds.notify_user) {
        //     window.app.event_bounds.notify_user = true;
        //     await listen("notify_user", (event) => {
        //     });
        // }

        // bind file-drop event
        if (!window.app.event_bounds.file_drop) {
            // 标记已经绑定了事件, 防止重复绑定
            window.app.event_bounds.file_drop = true;
            // tauri drag & drop events: drag, drag-over, drop, drag-cancelled
            await listen("tauri://drag-drop", (event) => {
                console.log("tauri://drag-drop", event.payload);

                if (event.payload.paths.length === 0) {
                    // no file dropped (such as text or other data)
                    return;
                }

                // depending on the current page, may want to view file info or process the file
                if (window.location.pathname === "/") {
                    // home page (viewer page) - view file info
                    setPathOfFileView(event.payload.paths[0]);
                    return;
                }
                else {
                    // other pages - process the file
                    window.fileProcessor.pathMethods.append(event.payload.paths);
                    // navigate to processor page if not already there
                    if (window.location.pathname !== "/processor") {
                        navigate("/processor");
                    }
                }
            });
        }
    }

    useEffect(() => {
        // put this code in home page //

        if (window.app.languages.error) {
            toast.error(window.app.languages.error);
        }

        bindEvents();
    }, []);

    // when pathOfFileView changes, get & update current file info
    useEffect(() => {
        if (!pathOfFileView) {
            return;
        }

        get_file_info(pathOfFileView)
            .then((file_info) => {
                // setPathOfFileView(pathItem.full);
                if (!file_info?.basic?.data?.PathName) {
                    let msg = T(file_info?.basic.error || "No data returned");
                    toast.error(msg);
                    return;
                }

                setFileInfo(file_info);
            })
            .catch((error) => {
                let msg =
                    T("Failed to get file info") +
                    T(error.message || error.toString());
                toast.error(msg);
            });
    }, [pathOfFileView]);

    const exiftoolAvailable =
        window.app.tools?.items["tool.exe.exiftool"].available;

    return (
        <Layout>
            <div className="flex flex-col gap-12 px-6 py-4">
                {!pathOfFileView && (
                    <div className="flex flex-col gap-4 w-full h-full">
                        <FileLanding
                            {...passingProps}
                            openFileDialog={openFileDialog}
                            showDirectoryButton={true}
                        />
                    </div>
                )}
                {fileInfo?.basic?.data && (
                    <div className=" relative flex flex-col gap-2">
                        <div className="sticky top-0 z-40 flex flex-row">
                            {/* <div className="flex flex-row flex-nowrap items-center gap-1 py-1 px-4 rounded-full bg-background border-1 border-foreground/20 sticky top-0"> */}
                            {renderButtonFileNameTitle({
                                T,
                                fileInfo,
                                openFileDialog,
                            })}
                            {/* </div> */}
                        </div>

                        {renderFileBasicInfo({
                            T,
                            data: fileInfo.basic.data,
                        })}

                        {renderFileHash({
                            fileInfo,
                            setFileInfo,
                            pathOfFileView,
                            T,
                        })}

                        {fileInfo.basic.data.PathType === "FILE" && (
                            <div className="flex flex-col">
                                <div className="flex flex-col font-bold text-nowrap">
                                    {T("More metadata")}
                                </div>
                                {
                                    // display .File metadata at the top
                                    fileInfo.metadata.data.File && (
                                        <>
                                            {renderFileMetadataObject({
                                                T,
                                                data: fileInfo.metadata.data
                                                    .File,
                                            })}
                                        </>
                                    )
                                }
                                {
                                    // render the rest of the metadata
                                    renderFileMetadataObject({
                                        T,
                                        data: fileInfo.metadata.data,
                                    })
                                }
                            </div>
                        )}

                        {fileInfo.basic.data.PathType === "DIR" &&
                            renderCounts({
                                T,
                                fileInfo,
                                setFileInfo,
                                isCounting,
                                setIsCounting,
                            })}
                    </div>
                )}

                {exiftoolAvailable === false && (
                    <div className="flex items-center gap-2 opacity-50">
                        {"("}
                        <span>
                            {T(
                                "Recommend installing Exiftool for more metadata support.",
                                [],
                                false
                            )}
                        </span>
                        <span>
                            {T(
                                "Go dependencies page to install Exiftool",
                                [],
                                false
                            )}
                        </span>
                        <Link
                            className="text-blue-400"
                            href="#"
                            onPress={() => {
                                navigate("/tools");
                            }}
                        >
                            <BsArrowRightCircle />
                        </Link>
                        {")"}
                    </div>
                )}

                {renderButtonClearMetadata({
                    T,
                    fileInfo,
                    navigate,
                })}

                <div className="flex bottom-base-line"></div>
            </div>

            {/* cancel button */}
            {pathOfFileView && (
                <div className="absolute top-4 right-4 z-50">
                    <Button
                        variant="ghost"
                        size="sm"
                        radius="full"
                        onPress={() => {
                            setPathOfFileView(null);
                            setFileInfo(null);
                        }}
                        isIconOnly
                    >
                        <BsX size={24} />
                    </Button>
                </div>
            )}
        </Layout>
    );
}
