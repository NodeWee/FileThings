import { useEffect } from "react";

import { Button, Link, Switch, Tooltip } from "@nextui-org/react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check_app_updates } from "../../../lib/actions";
import { action_call } from "../../../lib/caller";
import { get_variable_type } from "../../../lib/utils";

export default function Component(props) {
    const { T, uiConfig, updateUiConfigItems, appVersion } = props;

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">
                    {T("app.settings.update.auto-update")}
                </div>
                <div className="setting-row-summary">
                    {T("app.settings.update.auto-update-summary")}
                </div>
                <div className="setting-row-more">
                    {/* relaunch button */}
                    {!appVersion.updating && appVersion.newAppReady && (
                        <div className="flex flex-row gap-2 items-center">
                            {T("app.settings.version.new-ver-ready")}
                            <Button
                                color="primary"
                                onPress={() => {
                                    relaunch()
                                        .then((result) => {
                                            console.log("relaunch:", result);
                                        })
                                        .catch((err) => {
                                            console.error(
                                                "relaunch error:",
                                                err
                                            );
                                        });
                                }}
                                size="sm"
                            >
                                {T("app.settings.version.restart")}
                            </Button>
                        </div>
                    )}

                    {/* install  button */}
                    {!appVersion.updating && appVersion.newAppDownloaded && (
                        <div className="flex flex-row gap-2 items-center">
                            {T("app.settings.version.new-ver-downloaded")} v
                            {appVersion.latest}
                            <Button
                                onPress={async () => {
                                    await action_call("url.open", {
                                        url: appVersion.installerPath,
                                    }).catch((e) => {
                                        toast.error(e.toString(), {
                                            duration: 2000,
                                        });
                                    });
                                }}
                                size="sm"
                            >
                                {T("app.settings.version.install-now")}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Switch
                    isSelected={uiConfig.switchAutoUpdate}
                    onValueChange={(value) => {
                        updateUiConfigItems({ switchAutoUpdate: value });
                        if (value) {
                            // check and update immediately
                            check_app_updates({
                                interval_hours: 0,
                                manual_check: false,
                                stateProps: props,
                            });
                        }
                    }}
                    size="sm"
                ></Switch>
            </div>
        </div>
    );
}
