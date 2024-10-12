import React, { useState } from "react";

import { Button } from "@nextui-org/react";

export default function Component({ onChange, variant, size, defaultColor }) {
    const [color, setColor] = useState(defaultColor || "white");
    size = size || 24;

    const handleClick = () => {
        const newColor = color === "black" ? "white" : "black";
        setColor(newColor);
        onChange && onChange(newColor);
    };

    return (
        <Button
            aria-label="color-switch"
            className="flex flex-row items-center justify-center m-0 p-0"
            onPress={handleClick}
            variant={variant || "light"}
            radius="full"
            size="sm"
            isIconOnly>
            <div
                className="flex flex-row items-center justify-between overflow-hidden p-0 m-0 rounded-full"
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    border: "1px solid #999",
                }}>
                <div
                    className="flex-1 block"
                    style={{
                        width: `${size / 2}px`,
                        height: `${size}px`,
                        backgroundColor:
                            color === "black" ? "#000000" : "#FFFFFF",
                    }}></div>
                <div
                    className="flex-1 block"
                    style={{
                        width: `${size / 2}px`,
                        height: `${size}px`,
                        backgroundColor:
                            color === "black" ? "#FFFFFF" : "#000000",
                    }}></div>
            </div>
        </Button>
    );
}
