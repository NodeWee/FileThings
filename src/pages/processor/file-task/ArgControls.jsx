import {
    Autocomplete,
    AutocompleteItem,
    Input,
    Switch,
} from "@nextui-org/react";
import { useEffect, useState } from "react";

import InputFile from "./controls/InputFile";
import InputSaveToPath from "./controls/InputSaveToPath";
import { file_function_variable_when_matches } from "./utils";
import { get_translation_from_object_node } from "../../../lib/utils";
import { human_readable_byte_size } from "../../../lib/utils";
import toast from "react-hot-toast";

export default function Component(props) {
    const { T, supportedFileFunctions, selectedFileFunctionName } = props;

    const file_function =
        supportedFileFunctions.items[selectedFileFunctionName] || {};
    const preparedTask = window.fileTaskManager.prepared;
    const taskArgs = preparedTask.args;

    if (!file_function.variables) {
        return null;
    }
    if (!Array.isArray(file_function.variables)) {
        console.error("Thing variables is not an array");
        toast.error(
            T(
                "Invalid file_function/function variables format, must be an array."
            )
        );
        return null;
    }

    // create a react state for each variable, and init value
    let valStates = {};
    let errorStates = {};
    file_function.variables.forEach((variable) => {
        let initVal = taskArgs[variable.name];
        if (initVal === undefined || initVal === null) {
            initVal = variable.default;
        }
        taskArgs[variable.name] = initVal;
        const [value, setValue] = useState(initVal);
        valStates[variable.name] = [value, setValue];

        const [error, setError] = useState(null);
        errorStates[variable.name] = [error, setError];
    });

    return (
        <div className="flex flex-row flex-wrap justify-between gap-4">
            {createUI(
                T,
                file_function,
                taskArgs,
                valStates,
                errorStates,
                props
            )}
        </div>
    );
}

function createUI(T, file_function, taskArgs, valStates, errorStates, props) {
    const uiElements = [];

    file_function.variables.forEach((variable) => {
        try {
            // shown if matched
            let beShown = file_function_variable_when_matches(
                variable,
                taskArgs
            );
            if (!beShown) {
                return;
            }
        } catch (e) {
            console.error(e);
            // toast.error(e);
            return;
        }

        //
        let el;
        switch (variable.type) {
            case "integer":
            case "int":
            case "float":
            case "number":
            case "text":
            case "string":
            case "color":
                el = createInput(
                    T,
                    variable,
                    file_function,
                    taskArgs,
                    valStates[variable.name],
                    errorStates[variable.name]
                );
                break;
            case "file":
                el = (
                    <InputFile
                        key={variable.name}
                        variable={variable}
                        {...props}
                    />
                );
                break;
            case "select":
                el = createSelect(
                    variable,
                    file_function,
                    taskArgs,
                    valStates[variable.name]
                );
                break;
            case "switch":
                el = createSwitch(
                    variable,
                    file_function,
                    taskArgs,
                    valStates[variable.name]
                );
                break;
            case "@save_to":
                el = (
                    <InputSaveToPath
                        key={variable.name}
                        variable={variable}
                        {...props}
                    />
                );
                break;

            // ... 其他类型 ...
            default:
                toast.error(
                    T("Unknown function variable type: ") + variable.type
                );
                console.error(
                    "Unknown function variable type: ",
                    variable.type
                );
                el = null;
        }

        uiElements.push(el);
    });

    return uiElements;
}

function createInput(
    T,
    variable,
    file_function,
    taskArgs,
    valState,
    errorState
) {
    const [value, setValue] = valState;
    const [error, setError] = errorState;
    const label = get_translation_from_object_node(variable.label);
    const min_val = variable.min;
    const max_val = variable.max;

    let placeholder =
        get_translation_from_object_node(variable.placeholder) || null;

    let description = update_description(value, variable);

    let unitContent = null;
    if (variable.unit) {
        unitContent = (
            <div className="pointer-events-none flex items-center text-nowrap">
                <span className="text-default-400 text-small">
                    {get_translation_from_object_node(variable.unit)}
                </span>
            </div>
        );
    }

    let value_step = null;

    let isClearable = false;

    let valConvert;
    let input_type = "text";
    switch (variable.type) {
        case "integer":
        case "int":
        case "number":
            value_step = variable.step || 1;
            valConvert = (val) => parseInt(val);
            input_type = "number";
            isClearable = true;
            break;
        case "float":
            valConvert = (val) => parseFloat(val);
            input_type = "number";
            value_step = variable.step || 0.1;
            break;
        case "text":
        case "string":
            value_step = null;
            valConvert = (val) => val;
            input_type = "text";
            isClearable = true;
            break;
        case "color":
            valConvert = (val) => val;
            input_type = "color";
            description = T(value);
            isClearable = true;
            break;
        default:
            console.error("Unknown variable type: ", variable.type);
            return null;
    }
    // NextUI Input component has a bug that endContent and onClear cannot be displayed at the same time
    isClearable = isClearable && unitContent === null; 

    function handleClear() {
        if (variable.type === "color") {
            const val = "transparent";
            setValue(val);
            taskArgs[variable.name] = val;
        } else {
            setValue("");
            taskArgs[variable.name] = "";
        }
    }

    return (
        <Input
            id={`arg-${variable.name}`}
            className={
                (variable.style_width
                    ? variable.style_width
                    : " w-5/12 max-w-screen-lg min-w-fit ") +
                (variable.hidden ? "hidden" : "")
            }
            key={variable.name}
            label={label}
            description={description}
            type={input_type}
            placeholder={placeholder}
            isRequired={variable.required || false}
            value={value}
            min={min_val}
            max={max_val}
            step={value_step || null}
            errorMessage={error || null}
            isInvalid={error !== null}
            onClear={isClearable ? handleClear : null}
            endContent={unitContent}
            onChange={(e) => {
                let val = e.target.value;
                if (!val) return;
                taskArgs[variable.name] = valConvert(val);
                setValue(taskArgs[variable.name]);
                setError(null);
                //
                if (variable.validation) {
                    if (variable.validation.regex) {
                        const re = new RegExp(variable.validation.regex);
                        if (!re.test(val)) {
                            setError(
                                T("Invalid input, please check the format.")
                            );
                        }
                    }
                }
            }}
            size="sm"
        />
    );
}

function createSelect(variable, file_function, taskArgs, valState) {
    const [value, setValue] = valState;
    const label = get_translation_from_object_node(variable.label);
    const options = variable.options;

    let description = update_description(value, variable);

    return (
        <Autocomplete
            id={`arg-${variable.name}`}
            className={
                (variable.style_width
                    ? variable.style_width
                    : " w-5/12 max-w-screen-lg min-w-fit ") +
                (variable.hidden ? "hidden" : "")
            }
            size="sm"
            key={variable.name}
            name={variable.name}
            label={label}
            description={description}
            isRequired={variable.required || false}
            selectedKey={value}
            onSelectionChange={(val) => {
                if (!val) return;
                setValue(val);
                taskArgs[variable.name] = val;
                // onValueChange(val);
            }}
        >
            {options.map((item) => (
                <AutocompleteItem key={item.value} value={item.value}>
                    {get_translation_from_object_node(item.label)}
                </AutocompleteItem>
            ))}
        </Autocomplete>
    );
}

function createSwitch(variable, file_function, taskArgs, valState) {
    const [value, setValue] = valState;

    return (
        <Switch
            className={
                " w-5/12 max-w-screen-lg min-w-fit " +
                (variable.hidden ? "hidden" : "")
            }
            key={variable.name}
            isSelected={value}
            onValueChange={(val) => {
                setValue(val);
                taskArgs[variable.name] = val;
            }}
            color="secondary"
            size="md"
        >
            {value
                ? get_translation_from_object_node(variable["true"].label)
                : get_translation_from_object_node(variable["false"].label)}
        </Switch>
    );
}

function update_description(value, variable) {
    let content = "";

    // 1st, get from value_descriptions
    const value_descriptions = variable.value_descriptions || {};
    content = get_translation_from_object_node(value_descriptions[value]);

    // 2nd, get from default description
    if (!content) {
        content = get_translation_from_object_node(variable.description);
    }
    if (content === "@human_readable_byte_size") {
        const si_size = human_readable_byte_size(value);
        const bi_size = human_readable_byte_size(value, false);
        content = `${si_size} (${bi_size})`;
    }

    // if no description, use space to avoid layout shaking
    return content || " ";
}
