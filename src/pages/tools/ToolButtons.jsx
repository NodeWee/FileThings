import { useEffect, useState } from "react";

import { Button } from "@nextui-org/react";
import { install_tool } from "./tool-methods";

export default function Component(props) {
    const { tool, T } = props;
    return (
        <div
            aria-label="tool-buttons"
            className={`flex flex-row gap-2 items-center ${
                tool.installing ? "hidden" : ""
            }`}
        >
            <Button
                aria-label={`install-button-${tool.name}`}
                size="sm"
                color="primary"
                onPress={(e) => {
                    install_tool({ ...props });
                }}
                radius="full"
            >
                {T("app.tools.install")}
            </Button>
        </div>
    );
}
