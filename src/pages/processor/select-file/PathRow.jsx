import { BsInfo, BsX } from "react-icons/bs";
import { Button, Tooltip } from "@nextui-org/react";
import { useEffect, useState } from "react";

import { getFileIcon } from "../../../lib/file-icon";
import { useNavigate } from "react-router-dom";

export default function Component(props) {
    const navigate = useNavigate();

    const {
        T,
        pathItem,
        setPathOfFileView,
        setShowModalFileMetadata,
    } = props;

    const pathOfFileView = pathItem.full;
    const [fileInfo, setFileInfo] = useState(window.fileInfos[pathOfFileView]);

    console.log("PathRow", pathItem);

    return (
        <div className="group relative flex flex-row gap-2 px-2 hover:bg-default-100 items-center transition-all">
            <div className="opacity-20 text-sm w-4 text-center items-center justify-center">
                {props.index + 1}
            </div>
            <div className="flex flex-row items-center gap-2 py-1 text-nowrap">
                <div className="opacity-50">
                    {getFileIcon(pathItem.is_dir, pathItem.ext)}
                </div>
                <div className="text-nowrap select-text">
                    {pathItem.stem}
                    {pathItem.is_file && "." + pathItem.ext}
                </div>
                <div className="select-text text-nowrap text-small opacity-0 group-hover:opacity-35 transition-all">
                    {pathItem.rel_full}
                </div>
            </div>
            <div className="absolute right-2 flex flex-row gap-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all">
                <Tooltip
                    content={T("app.paths.info")}
                    color="success"
                    showArrow={true}
                    delay={50}
                    closeDelay={50}
                    placement="bottom"
                >
                    <Button
                        variant="solid"
                        radius="none"
                        size="sm"
                        isLoading={
                            fileInfo?.basic?.loading ||
                            fileInfo?.metadata?.loading
                        }
                        onPress={() => {
                            setPathOfFileView(pathItem.full);
                            navigate("/"); // viewer page
                            console.log("navigate to viewer page");
                        }}
                        isIconOnly
                    >
                        <BsInfo />
                    </Button>
                </Tooltip>

                <Tooltip
                    content={T("app.paths.cancel")}
                    color="success"
                    showArrow={true}
                    delay={50}
                    closeDelay={50}
                    placement="bottom"
                >
                    <Button
                        onPress={() => {
                        window.fileProcessor.pathMethods.remove([pathItem.full]);
                    }}
                        variant="solid"
                        radius="none"
                        size="sm"
                        isIconOnly
                    >
                        <BsX />
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
}
