import { Select, SelectItem } from "@nextui-org/react";
import { useEffect, useState } from "react";

import i18n from "../../lib/i18n";

export default function Component({
    fontFileExts,
    variant,
    label,
    placeholder,
    defaultFontName,
    onChange,
    isMultiple,
}) {
    const fonts = window.creator.fonts;
    if (!fonts || !fonts.system || Object.keys(fonts.system).length === 0) {
        return <div>{T("app.option.no_font_data")}</div>;
    }
    const T = i18n.translate;

    // prepare selected font keys
    // clear quotes, and empty font name
    const selectFontNames = defaultFontName
        .split(",")
        .map((name) => name.replace(/"/g, "").trim())
        .filter((name) => name.length > 0);
    let selectFontKeys = selectFontNames.map((name) => {
        for (const key in fonts.system) {
            if (fonts.system[key].full_name === name) {
                return key;
            }
        }
        return "";
    });
    selectFontKeys = selectFontKeys.filter((key) => key.length > 0);

    function ItemLabel({ item }) {
        let displayName = item.local_name || item.full_name || item.family_name;
        if (!displayName) {
            // use path as display name
            displayName = item.path.replace(window.app.home_dir, "~");
        }

        return (
            <div className="flex flex-row justify-between gap-1">
                <div
                    style={{
                        fontSize: "0.8rem",
                    }}
                >
                    {displayName}
                </div>
                {item.family_name && (
                    <div
                        style={{
                            fontSize: "1rem",
                            opacity: 0.5,
                            fontFamily: item.family_name,
                        }}
                    >
                        {"Abc 123 甲乙丙"}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <Select
                className="w-full"
                size="sm"
                aria-label="Select Font"
                variant={variant || "flat"}
                label={label}
                placeholder={placeholder}
                selectionMode={isMultiple ? "multiple" : "single"}
                defaultSelectedKeys={selectFontKeys}
                onChange={(e) => {
                    // e.target.value is selected keys, separated by comma
                    const keys = e.target.value
                        .split(",")
                        .filter((key) => key.length > 0);
                    const names = keys.map((key) => {
                        return fonts.system[key].full_name;
                    });
                    onChange && onChange(names);
                }}
            >
                {Object.keys(fonts.system).map((key) => {
                    const font = fonts.system[key];
                    return (
                        <SelectItem
                            key={key}
                            value={key}
                            textValue={font.full_name}
                        >
                            <ItemLabel item={font} />
                        </SelectItem>
                    );
                })}
            </Select>
        </>
    );
}
