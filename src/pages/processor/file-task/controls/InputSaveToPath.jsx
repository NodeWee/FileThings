import { Button, Input } from "@nextui-org/react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";

import { BsFolder2Open } from "react-icons/bs";
import { action_call } from "../../../../lib/caller";
import { make_unused_file_path } from "../../../../lib/actions";

export default function Component(props) {
    const { T, selectedFileFunctionName, variable } = props;
    const preparedTask = window.fileTaskManager.prepared;
    const pathsParsed = window.fileProcessor.paths.parsed;
    const taskSaveTo = preparedTask.save_to;
    const taskArgs = preparedTask.args;

    const [defaultSaveToPath, setDefaultSaveToPath] = useState(
        variable.default
    );

    let pathType = null;
    if (variable.is_dir === undefined || variable.is_dir === null) {
        // if variable.is_dir  not set, auto detect pathType by window.fileProcessor.paths.parsed.is_multiple_files
        pathType = pathsParsed.is_multiple_files ? "dir" : "file";
    } else {
        pathType = variable.is_dir ? "dir" : "file";
    }

    function updateSaveToPath(val) {
        if (pathType === "dir") {
            taskSaveTo.output_dir = val;
        } else {
            taskSaveTo.output_file = val;
        }

        // update default save path
        setDefaultSaveToPath(val);
    }

    async function openFileDialog(event) {
        let selected = null;
        if (pathType === "dir") {
            // open open-dialog to specify a folder path
            selected = await open({
                title: T("app.option.select_save_to_path"),
                defaultPath: taskSaveTo?.output_dir || "",
                directory: true,
            });
        } else {
            // open save-dialog to specify a file path
            selected = await save({
                title: T("app.option.select_save_to_path"),
                defaultPath: taskSaveTo?.output_file || "",
            });
        }

        if (!selected) return; // dialog canceled

        selected = selected.path ? selected.path : selected;
        updateSaveToPath(selected || "");
    }

    // init taskArgs.to_format
    useEffect(() => {
        if (!taskArgs.to_format) {
            taskArgs.to_format = variable.to_format;
        }
    }, []);

    useEffect(() => {
        // auto set default save path
        if (pathType === "file") {
            // if default save path not set, auto generate
            make_unused_file_path({
                path: window.fileProcessor.paths.selected[0],
                ext: taskArgs.to_format || variable.to_format,
                callback: (path) => {
                    updateSaveToPath(path);
                },
            });
        } else {
            // as dir
            action_call("path.read", {
                path: window.fileProcessor.paths.selected[0],
            })
                .then((rst) => {
                    let _obj = rst.content;
                    if (_obj.is_file) {
                        updateSaveToPath(_obj.parent_dir);
                    } else {
                        updateSaveToPath(window.fileProcessor.paths.selected[0]);
                    }
                })
                .catch((err) => {
                    console.error(err);
                });
        }

        // init once, and auto get default save path when to_format changed
    }, [taskArgs.to_format]);

    return (
        <div className="flex flex-row mt-4 gap-2 w-full items-center">
            <Input
                id="input-save-to-path"
                type="text"
                size="md"
                label={T("app.option.save_to")}
                isRequired={variable.required || false}
                isClearable
                defaultValue={defaultSaveToPath}
                value={
                    pathType === "dir"
                        ? taskSaveTo.output_dir
                        : taskSaveTo.output_file
                }
                onClear={() => {
                    updateSaveToPath("");
                }}
                onChange={(e) => {
                    var val = e.target.value;
                    if (!val) return;
                    if (pathType === "dir") {
                        taskSaveTo.output_dir = val;
                    } else {
                        taskSaveTo.output_file = val;
                    }
                    updateSaveToPath(val);
                }}
            />

            <Button
                // onClick={openFileDialog}
                onPress={openFileDialog}
                variant="light"
                radius="full"
                isIconOnly
            >
                <BsFolder2Open size={20} />
            </Button>
        </div>
    );
}
