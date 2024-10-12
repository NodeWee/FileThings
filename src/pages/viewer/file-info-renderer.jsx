import { Button, Snippet } from "@nextui-org/react";

import ResultViewCounts from "../../components/ResultViewCounts";
import { action_call } from "../../lib/caller";
import { human_readable_byte_size } from "../../lib/utils";
import toast from "react-hot-toast";
import { getFileIcon } from "../../lib/file-icon";

export const renderButtonFileNameTitle = ({
    T,
    fileInfo,
    openFileDialog,
}) => {
    return (
        <Button
            size="md"
            radius="full"
            variant="faded"
            onPress={(e) => openFileDialog({ event: e, isDirectory: false })}
            className="h-auto min-h-[32px] py-1 mr-6"
        >
            <div className="opacity-50">
                {getFileIcon(
                    fileInfo.basic.data.PathType === "DIR",
                    fileInfo.metadata?.data?.File
                        .FileTypeExtension
                )}
            </div>
            <div className="font-bold select-text text-wrap">
                {fileInfo.basic.data.PathName}
            </div>
        </Button>
    );
};

export const renderFileBasicInfo = ({ T, data }) => {
    if (!data) {
        return null;
    }
    return (
        <div className="flex flex-col pl-4">
            {data.LinkTarget && (
                <div className="flex flex-row gap-4">
                    <div>{T("file-info.LinkTarget")}:</div>
                    <div>{data.LinkTarget}</div>
                </div>
            )}

            {data.FileSize > -1 && (
                <div className="flex flex-row gap-4">
                    {T("file-info." + data.PathType.toLowerCase())}
                    {data.PathType === "FILE" && (
                        <>
                            <div>{human_readable_byte_size(data.FileSize)}</div>
                            <div>
                                ( {data.FileSize} {T("file-info.bytes")} )
                            </div>
                        </>
                    )}
                </div>
            )}

            {data.FileAccessDate && (
                <div className="flex flex-row gap-4">
                    <div>{T("file-info.FileCreateDate")}:</div>
                    <div>{data.FileCreateDate}</div>
                </div>
            )}
            {data.FileModifyDate && (
                <div className="flex flex-row gap-4">
                    <div>{T("file-info.FileModifyDate")}:</div>
                    <div>{data.FileModifyDate}</div>
                </div>
            )}
            {data.FileAccessDate && (
                <div className="flex flex-row gap-4">
                    <div>{T("file-info.FileAccessDate")}:</div>
                    <div>{data.FileAccessDate}</div>
                </div>
            )}
        </div>
    );
};

export const renderFileHash = ({
    fileInfo,
    setFileInfo,
    pathOfFileView,
    T,
}) => {
    if (
        !fileInfo ||
        !pathOfFileView ||
        fileInfo.basic?.data?.PathType === "DIR"
    ) {
        return null;
    }

    async function handleButtonClick(hash_type) {
        if (!hash_type) {
            hash_type = "md5";
        }
        if (fileInfo.hash?.[hash_type]?.loading) {
            return;
        }

        // check if hash already calculated
        if (fileInfo.hash?.[hash_type]?.data) {
            return;
        }

        // if hash already calculated in window.fileInfos, use it directly
        const fileView = window.fileInfos[pathOfFileView];
        if (fileView.hash?.[hash_type]?.data) {
            setFileInfo((prev) => {
                return {
                    ...prev,
                    hash: {
                        ...prev.hash,
                        [hash_type]: {
                            data: fileView.hash[hash_type].data,
                            loading: false,
                        },
                    },
                };
            });

            return;
        }

        // else, calculate hash (and set loading state)
        fileView.hash = {
            ...fileView.hash,
            [hash_type]: {
                data: null,
                loading: true,
            },
        };
        setFileInfo((prev) => {
            return {
                ...prev,
                hash: {
                    ...prev.hash,
                    [hash_type]: {
                        data: null,
                        loading: true,
                    },
                },
            };
        });

        await action_call("file.hash", {
            input_file: pathOfFileView,
            hash_type: hash_type,
        })
            .then((res) => {
                // store hash data to window.fileInfos
                fileView.hash = {
                    ...fileView.hash,
                    [hash_type]: {
                        data: res.content,
                        loading: false,
                    },
                };
                setFileInfo((prev) => {
                    return {
                        ...prev,
                        hash: {
                            ...prev.hash,
                            [hash_type]: {
                                data: res.content,
                                loading: false,
                            },
                        },
                    };
                });
            })
            .catch((err) => {
                console.error(err);
                // set hash error
                fileView.hash = {
                    ...fileView.hash,
                    [hash_type]: {
                        data: null,
                        loading: false,
                        error: err.message || err.toString(),
                    },
                };
                setFileInfo((prev) => {
                    return {
                        ...prev,
                        hash: {
                            ...prev.hash,
                            [hash_type]: {
                                data: null,
                                loading: false,
                                error: err.message || err.toString(),
                            },
                        },
                    };
                });
            });
    }

    return (
        <div className="flex flex-col gap-1 pl-4">
            <div className="flex flex-row items-center gap-4">
                <div>{T("MD5:")}</div>
                {fileInfo.hash?.md5?.data ? (
                    <Snippet size="sm" radius="full" hideSymbol={true}>
                        {fileInfo.hash.md5.data}
                    </Snippet>
                ) : (
                    <Button
                        size="sm"
                        radius="full"
                        variant="solid"
                        isLoading={fileInfo.hash?.md5.loading}
                        onPress={() => handleButtonClick("md5")}
                    >
                        {T("Calculate")}
                    </Button>
                )}
            </div>

            <div className="flex flex-row items-center gap-4">
                <div>{T("SHA1:")}</div>
                {fileInfo.hash?.sha1?.data ? (
                    <Snippet size="sm" radius="full" hideSymbol={true}>
                        {fileInfo.hash.sha1.data}
                    </Snippet>
                ) : (
                    <Button
                        size="sm"
                        radius="full"
                        variant="solid"
                        isLoading={fileInfo.hash?.sha1?.loading}
                        onPress={() => handleButtonClick("sha1")}
                    >
                        {T("Calculate")}
                    </Button>
                )}
            </div>

            <div className="flex flex-row items-center gap-4">
                <div>{T("SHA256:")}</div>
                {fileInfo.hash?.sha256?.data ? (
                    <Snippet size="sm" radius="full" hideSymbol={true}>
                        {fileInfo.hash.sha256.data}
                    </Snippet>
                ) : (
                    <Button
                        size="sm"
                        radius="full"
                        variant="solid"
                        isLoading={fileInfo.hash?.sha256?.loading}
                        onPress={() => handleButtonClick("sha256")}
                    >
                        {T("Calculate")}
                    </Button>
                )}
            </div>
        </div>
    );
};

export const renderFileMetadataObject = ({ T, data }) => {
    if (!data || typeof data !== "object") {
        return null;
    }
    if (data.PathType === "DIR") {
        return null;
    }

    const ignoreKeys = [
        "file",
        "exiftool",
        "sourcefile",
        "directory",
        "filename",
        "filesize",
        "filecreatedate",
        "filemodifydate",
        "fileaccessdate",
    ];

    return (
        <div>
            {Object.keys(data).map((key) => {
                if (ignoreKeys.includes(key.toLowerCase())) {
                    return null;
                }

                const val = data[key];
                if (typeof val === "object") {
                    return (
                        <div key={key} className="flex flex-col gap-1">
                            <div className="metadata-key">
                                {T("file-info." + key).replace(
                                    "file-info.",
                                    ""
                                )}
                            </div>
                            {renderFileMetadataObject({ T, data: val })}
                        </div>
                    );
                } else {
                    return (
                        <div key={key} className="flex flex-row pl-4 gap-4">
                            <div className="metadata-key">
                                {T("file-info." + key).replace(
                                    "file-info.",
                                    ""
                                )}
                                :
                            </div>
                            <div className="metadata-data">
                                {data[key].toString()}
                            </div>
                        </div>
                    );
                }
            })}
        </div>
    );
};

// renderer Counts for DIR
export const renderCounts = ({ T, fileInfo, setFileInfo, isCounting, setIsCounting }) => {
    if (
        !fileInfo ||
        !fileInfo.basic ||
        fileInfo.basic.data.PathType !== "DIR"
    ) {
        return null;
    }

    const counts = fileInfo.counts;


    if (!counts) {
        return (
            <div>
                <div className="mb-2 font-bold">{T("File Counts")}</div>
                <div className="ml-2 flex flex-row gap-2">
                    <Button
                        size="sm"
                        radius="full"
                        variant="solid"
                        className="w-full"
                        isLoading={isCounting}
                        isDisabled={isCounting}
                        onPress={async () => {
                            setIsCounting(true);
                            action_call("file.count_files", {
                                input_paths: [fileInfo.path],
                            })
                                .then((res) => {
                                    window.fileInfos[fileInfo.path].counts =
                                        res.content;

                                    setFileInfo((prev) => {
                                        return {
                                            ...prev,
                                            counts: res.content,
                                        };
                                    });
                                })
                                .catch((err) => {
                                    toast.error(err.message || err.toString());
                                })
                                .finally(() => {
                                    setIsCounting(false);
                                });
                        }}
                    >
                        {isCounting ? T("Counting...") : T("Count Files in Directory")}
                    </Button>
                </div>
            </div>
        );
    }

    // else
    return (
        <div className="mt-2">
            <div className="mb-2 font-bold">{T("File Counts")}</div>
            <ResultViewCounts T={T} counts={counts} />
        </div>
    );
};

export const renderButtonClearMetadata = ({ T, fileInfo, navigate }) => {
    if (!fileInfo || !fileInfo.basic) {
        return null;
    }

    if (fileInfo.basic.data.PathType === "DIR") {
        return null;
    }

    if (!fileInfo.metadata) {
        return null;
    }

    return (
        <Button
            size="sm"
            radius="full"
            variant="solid"
            onPress={async () => {
                // add file path to processor, and navigate to processor page
                window.fileProcessor.pathMethods.append([fileInfo.path]);
                navigate("/processor");
            }}
        >
            {T("to Clear Metadata")}
        </Button>
    );
};
