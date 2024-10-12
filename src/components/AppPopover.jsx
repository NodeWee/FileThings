import React, { useContext, useState } from "react";

import { BsX } from "react-icons/bs";
import { Button } from "@nextui-org/react";
import { SharedStateContext } from "../SharedStateContext";
import { action_call } from "../lib/caller";

// 用于提示 App 有新版本等
export default function Component(props) {
    const { passingProps } = useContext(SharedStateContext);
    const { T, isNoticeInstallNewApp, setIsNoticeInstallNewApp, appVersion } =
        passingProps;

    function noticeInstallNewApp() {
        return (
            <div className="flex flex-col gap-4 items-center justify-center">
                <div className="opacity-50">
                    {T("app.version.new-ver-downloaded")}
                </div>
                <div>
                    {"FileThings"} v{appVersion.latest}
                </div>
                <Button
                    color="primary"
                    onPress={async () => {
                        await action_call("url.open", {
                            url: appVersion.installerPath,
                        }).catch((e) => {
                            toast.error(e.toString(), {
                                duration: 2000,
                            });
                        });

                        setIsNoticeInstallNewApp(false);
                    }}
                    size="md"
                >
                    {T("app.version.install-now")}
                </Button>
            </div>
        );
    }

    return (
        isNoticeInstallNewApp && (
            <div
                id="app-popover"
                className={`relative bg-default-100 ${
                    isNoticeInstallNewApp ? "show" : ""
                }`}
            >
                {noticeInstallNewApp()}

                {/* close button */}
                <Button
                    onPress={() => setIsNoticeInstallNewApp(false)}
                    className="absolute -top-4 -right-4"
                    radius="full"
                    isIconOnly
                >
                    <BsX />
                </Button>
            </div>
        )
    );
}
