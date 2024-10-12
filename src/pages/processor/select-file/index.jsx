import { useEffect, useState } from "react";

import FileLanding from "../../../components/controls/FileLanding.jsx";
import PathListing from "./PathListing.jsx";
import { open } from "@tauri-apps/plugin-dialog";

export default function Component(props) {
    const { parsedPaths } = props;

    async function openFileDialogForProcessor({ event, isDirectory, isAppend=true }) {
        const isMultiple = true;

        const selected = await open({
            multiple: isMultiple,
            directory: isDirectory,
        });

        let paths;
        if (isAppend === true) {
            paths = new Set(window.fileProcessor.paths.selected);
        } else {
            paths = new Set();
        }

        if (Array.isArray(selected)) {
            // user selected multiple files
            selected.forEach((item) => {
                if (item.path) {
                    paths.add(item.path);
                } else {
                    // item is a directory path
                    paths.add(item);
                }
            });
            window.fileProcessor.pathMethods.append(Array.from(paths));
        } else if (selected === null) {
            // user cancelled the selection
        } else {
            // user selected a single file
            if (selected.path) {
                paths.add(selected.path);
            } else {
                // selected is a directory path
                paths.add(selected);
            }
            window.fileProcessor.pathMethods.append(Array.from(paths));
        }
    }

    return (
        <>
            {parsedPaths.length < 1 ? (
                <FileLanding
                    {...props}
                    openFileDialog={openFileDialogForProcessor}
                    showDirectoryButton={true}
                />
            ) : (
                <PathListing {...props}
                    openFileDialog={openFileDialogForProcessor}
                 />
            )}
        </>
    );
}
