import {
    Button,
    CircularProgress,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
} from "@nextui-org/react";
import {
    get_function_summary,
    get_function_title,
} from "../../../lib/thing-functions/utils";
import { useEffect, useState } from "react";

import ArgControls from "./ArgControls";
import FileFunctionActions from "./FileFunctionActions";
import { IconCancel } from "../../../lib/icons";
import { file_function_variable_when_matches } from "./utils";
import { process_files } from "./file-methods";
import toast from "react-hot-toast";
import { update_selected_paths } from "../../../lib/actions";

export default function Component(props) {
    const {
        navigate,
        showModalThing,
        setShowModalThing,
        showTaskResult,
        setShowTaskResult,
        supportedFileFunctions,
        T,
        selectedFileFunctionName,
        setSelectedTaskId,
    } = props;

    if (!selectedFileFunctionName) {
        return null;
    }
    const file_function =
        supportedFileFunctions.items[selectedFileFunctionName];
    const thing_summary = get_function_summary(file_function);

    function validate_fields() {
        // return bool value to indicate if has error
        if (!file_function.variables || file_function.variables.length === 0) {
            return false;
        }
        const preparedTask = window.fileTaskManager.prepared;
        const the_save_to = preparedTask.save_to;
        const the_args = preparedTask.args;
        const formElement = document.getElementById("file_function-form");
        let has_error = false;

        function validate_field(variable) {
            // if variable not be shown (by .conditions key), skip
            try {
                let beShown = file_function_variable_when_matches(
                    variable,
                    the_args
                );
                if (!beShown) {
                    return false; // not shown, skip, as has_error = false
                }
            } catch (e) {
                console.error(e);
                // toast.error(e.toString());
                return true; // has_error = true
            }

            // check if variable.required
            if (variable.required && variable.name === "@save_to") {
                if (
                    !the_save_to ||
                    (!the_save_to.output_dir && !the_save_to.output_file)
                ) {
                    toast.error(T("Required field is not filled in"));
                    return true; // has_error = true
                }
            } else if (
                variable.required &&
                (the_args[variable.name] === "" ||
                    the_args[variable.name] === undefined)
            ) {
                toast.error(T("Required field is not filled in"));
                return true; // has_error = true
            }

            // validate by variable.validation
            const val = the_args[variable.name];
            if (variable.validation) {
                if (variable.validation.regex) {
                    const regex_pattern = variable.validation.regex;
                    const re = new RegExp(regex_pattern);
                    if (!re.test(val)) {
                        toast.error(
                            T("Invalid input, please check the format.")
                        );
                        return true; // has_error = true
                    }
                }
            }

            return false; // has_error = false
        }

        has_error = file_function.variables.some((variable) => {
            let r = validate_field(variable);
            if (r) {
                // focus on the input field
                const selector =
                    variable.name === "@save_to"
                        ? "#input-save-to-path"
                        : `#arg-${variable.name}`;
                const el = formElement.querySelector(selector);
                el
                    ? el.focus()
                    : console.error(`Element not found: ${selector}`);

                // return true to break the loop
                return true;
            }

            return false;
        });

        return has_error;
    }

    function onFormSubmit(e) {
        e.preventDefault();

        // validate required fields
        if (validate_fields()) {
            return;
        }

        setShowModalThing(false);

        // Note: process_files will return immediately after starting the task,
        // it will not wait for the task to complete
        process_files({
            ...props,
            file_function: file_function,
        })
            .then(() => {
                // after task started, redirect to tasks page
                navigate("/tasks");
            })
            .catch((e) => {
                console.error(e);
                toast.error(`Failed to start task: ${e.toString()}`);
            });

        // after task started, clear the prepared task and args, but keep selected paths
        update_selected_paths({
            action: "replace",
            paths: window.fileProcessor.paths.selected,
            notify: false,
            stateProps: props,
        });
    }

    return (
        <Modal
            aria-label="Thing Modal"
            backdrop="blur"
            scrollBehavior="outside"
            isOpen={showModalThing}
            closeButton={
                <Button
                    className="pointer-events-none"
                    size="md"
                    variant="ghost"
                    radius="full"
                    isIconOnly
                >
                    <IconCancel size={20} />
                </Button>
            }
            onClose={() => setShowModalThing(false)}
            size="5xl"
        >
            <ModalContent>
                <ModalHeader>
                    <div className="flex flex-row w-full text-center items-center justify-center gap-2 opacity-50">
                        {get_function_title(file_function)}
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="w-full h-fit flex flex-col gap-12">
                        <div className="w-full text-center text-sm opacity-45 -mt-1 p-0">
                            {thing_summary}
                        </div>
                        <form
                            noValidate
                            id="file_function-form"
                            aria-label="Thing Form"
                            className="w-full h-fit flex flex-col gap-12"
                            onInvalid={(e) => {
                                console.error("Form invalid: ", e);
                            }}
                            onSubmit={onFormSubmit}
                        >
                            <ArgControls {...props} />
                            <FileFunctionActions {...props} />
                        </form>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
