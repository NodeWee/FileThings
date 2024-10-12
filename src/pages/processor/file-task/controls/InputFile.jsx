import { Button, Input } from "@nextui-org/react";
import { useEffect, useState } from "react";

import { BsFileEarmark } from "react-icons/bs";
import { get_translation_from_object_node } from "../../../../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";

export default function Component(props) {
    const { T, selectedFileFunctionName, variable } = props;
    const preparedTask = window.fileTaskManager.prepared;
    const taskArgs = preparedTask.args;

    const [defaultInputFile, setDefaultInputFile] = useState(
        variable.default || ""
    );

    // prepare variable translations
    const inputLabel = get_translation_from_object_node(variable.label);
    // prepare variable filters(.name(obj) -> .name(str))
    if (variable.filters) {
        variable.filters.forEach((filter) => {
            filter.name = get_translation_from_object_node(filter.name);
        });
    }

    function onFileChange(val) {
        taskArgs[variable.name] = val;

        // update default save path
        setDefaultInputFile(val);
    }

    async function openFileDialog(event) {
        const selected = await open({
            directory: false,
            multiple: false,
            filters: variable.filters,
        });
        if (Array.isArray(selected)) {
            // user selected multiple files
            onFileChange(selected[0].path);
        } else if (selected === null) {
            // user cancelled the selection
            //   do nothing
        } else {
            // user selected a single file
            onFileChange(selected.path);
        }
    }

    return (
        <div className="flex flex-row gap-2 w-full items-center">
            <Input
                id={`arg-${variable.name}`}
                type="text"
                size="md"
                fileAccept={variable.filters}
                label={inputLabel}
                isRequired={variable.required || false}
                defaultValue={defaultInputFile}
                value={taskArgs[variable.name]}
            />

            <Button
                // onClick={openFileDialog}
                onPress={openFileDialog}
                variant="light"
                radius="full"
                isIconOnly
            >
                <BsFileEarmark size={20} />
            </Button>
        </div>
    );
}
