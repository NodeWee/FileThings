import React, { useEffect, useState } from "react";
import { BsFolder2Open } from "react-icons/bs";

import { Button } from "@nextui-org/react";
import { locate_paths } from "../../../lib/actions";

export default function Component(props) {
    const { T, taskResult } = props;

    if (!taskResult) {
        return null;
    }

    const result =
        (taskResult.path_results?.length > 0 && taskResult.path_results[0]) ||
        null;
    const dest_path =
        (result?.rel_dest_paths?.length > 0 && result.rel_dest_paths[0]) ||
        null;

    return (
        <div className="flex flex-col gap-8 items-center justify-center pb-4">
            <div className="flex flex-row gap-2 items-center">
                {result.status.toLowerCase() === "ok" && dest_path && (
                    <>
                        <div className="text-nowrap opacity-50">
                            {T("app.result.saved")}
                            {":"}
                        </div>
                        <div className="select-text break-all">{dest_path}</div>
                        <Button
                            size="sm"
                            variant="solid"
                            radius="full"
                            color="default"
                            onClick={() => {
                                locate_paths([dest_path]);
                            }}
                            isIconOnly
                        >
                            <BsFolder2Open />
                        </Button>
                    </>
                )}

                {result.status.toLowerCase() === "ignored" && (
                    <>
                        <div className=" opacity-50">
                            {T("app.result.ignored")}
                            {":"}
                        </div>
                        <div className="select-text">{T(result.message)}</div>
                    </>
                )}
            </div>
        </div>
    );
}
