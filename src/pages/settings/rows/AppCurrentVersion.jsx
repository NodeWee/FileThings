import { Button, Link, Switch, Tooltip } from "@nextui-org/react";
import { check_app_updates, open_link } from "../../../lib/actions";

import { app } from "@tauri-apps/api";
import { get_variable_type } from "../../../lib/utils";
import { useEffect, useState } from "react";

export default function Component(props) {
    const { uiConfig, T, appVersion, updateAppVersion } = props;
    const [newVerInfoText, setNewVerInfoText] = useState("");

    useEffect(() => {
        app.getVersion()
            .then((version) => {
                updateAppVersion("current", version);
            })
            .catch((e) => {
                console.error("Failed to get app version:", e);
            });
    }, []);

    const app_download_url = `https://filethings.net/${uiConfig.lang}`;

    useEffect(() => {
        switch (get_variable_type(appVersion.newVerInfo)) {
            case "[object Object]":
                let text = appVersion.newVerInfo[uiConfig.lang];
                if (!text) {
                    text = appVersion.newVerInfo["en"];
                }
                setNewVerInfoText(text);
                break;
            case "[object String]":
                setNewVerInfoText(appVersion.newVerInfo);
                break;
            default:
                setNewVerInfoText("");
        }
    }, [appVersion.newVerInfo, uiConfig.lang]);

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title gap-2">
                    <div>{T("app.settings.version.current")}</div>
                    {appVersion.current && (
                        <div>
                            {"v"}
                            {appVersion.current}
                        </div>
                    )}
                </div>
                <div className="setting-row-summary"></div>
                <div className="setting-row-more">
                    {appVersion.checking ? (
                        <div>{T("app.settings.version.checking")}</div>
                    ) : appVersion.latest ? (
                        appVersion.latest > appVersion.current ? (
                            <div className="flex flex-row items-center gap-1">
                                {T("app.settings.version.has-new")}

                                <Tooltip
                                    content={newVerInfoText}
                                    color="foreground"
                                    placement="bottom"
                                    showArrow={true}
                                >
                                    <div className=" underline underline-offset-2">
                                        {"v"}
                                        {appVersion.latest}
                                    </div>
                                </Tooltip>
                            </div>
                        ) : (
                            <div>
                                {T("app.title")}{" "}
                                {T("app.settings.version.is-up-to-date")}
                            </div>
                        )
                    ) : (
                        " "
                    )}

                    <Link
                        href="#"
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault();
                        }}
                        onPress={(e) => {
                            open_link(app_download_url);
                            e.preventDefault();
                        }}
                        isExternal
                        showAnchorIcon
                    >
                        {T("app.settings.version.open-download-page")}
                    </Link>
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Button
                    color="default"
                    variant="solid"
                    size="sm"
                    onPress={(e) => {
                        // check new version now (not install)
                        check_app_updates({
                            interval_hours: 0,
                            manual_check: true,
                            stateProps: props,
                        });
                    }}
                >
                    {T("app.settings.version.to-check")}
                </Button>
            </div>
        </div>
    );
}
