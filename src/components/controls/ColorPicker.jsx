import React, { useState } from "react";

import { Input } from "@nextui-org/react";

export default function Component({
    onChange,
    size,
    defaultValue,
    label,
    value,
}) {
    size = size || "md";

    function int_to_hex(i) {
        const hex = parseInt(i).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgb_to_hex(rgb_str) {
        if (!rgb_str) {
            return "";
        }
        try {
            const rgb = rgb_str.match(/\d+/g);
            const hex_str =
                "#" +
                int_to_hex(rgb[0]) +
                int_to_hex(rgb[1]) +
                int_to_hex(rgb[2]);
            return hex_str;
        } catch (e) {
            return "";
        }
    }

    const defaultColor = defaultValue.startsWith("rgb")
        ? rgb_to_hex(defaultValue)
        : defaultValue;
    const valueColor = value.startsWith("rgb") ? rgb_to_hex(value) : value;

    return (
        <Input
            aria-label="color-picker"
            label={label}
            type="color"
            radius="sm"
            size={size}
            classNames={{
                label: "text-tiny mb-5",
                input: "rounded-lg pt-1",
            }}
            defaultValue={defaultColor}
            value={valueColor}
            onChange={(e) => {
                onChange(e);
            }}
        />
    );
}
