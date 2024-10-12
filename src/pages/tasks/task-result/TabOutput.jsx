import { useEffect, useState } from "react";

import ResultViewCounts from "../../../components/ResultViewCounts";

export default function Component(props) {
    const { T, selectedTaskId } = props;
    const task = window.fileTaskManager.tasks[selectedTaskId];
    const the_function = task.the_function;
    const counts = task.result.output;

    console.log(the_function);

    return (
        <>
            {the_function.name === "file.count.files" && (
                <ResultViewCounts T={T} counts={counts} />
            )}
        </>
    );
}
