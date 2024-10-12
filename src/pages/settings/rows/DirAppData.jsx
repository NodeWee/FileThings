import { Button } from "@nextui-org/react";
import { action_call } from "../../../lib/caller";

export default function Component(props) {
    const { T } = props;

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">
                    {T("app.settings.dirs.app-data-dir")}
                </div>
                <div className="setting-row-summary">
                    {T("app.settings.dirs.app-data-dir-summary")}
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Button
                    className="w-fit"
                    onPress={() => {
                        action_call("path.locate.app_data_dir", {}).catch(
                            (e) => {
                                console.error(
                                    "Failed to locate app data directory:",
                                    e
                                );
                            }
                        );
                    }}
                    size="sm"
                >
                    {T("Open Folder")}
                </Button>
            </div>
        </div>
    );
}
