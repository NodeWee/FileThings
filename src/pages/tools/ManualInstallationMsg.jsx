import { useEffect, useState } from "react";

import { Link } from "@nextui-org/react";
import { open_link } from "../../lib/actions";

export default function Component(props) {
    const { tool, T, get_lang } = props;
    const links = tool.installation?.manual[get_lang()]?.links; // is an array of objects with text and url
    return (
        <div className="flex flex-row items-center text-sm bg-orange-950 rounded-full py-1 px-4 gap-1">
            <div>{T("Please install it manually.")}</div>
            {links && links.length > 0 && <div>{T("You can refer to")}</div>}
            <div className="flex flex-row items-center gap-1">
                {links.map((link, i) => {
                    return (
                        <Link
                            key={i}
                            href="#"
                            isExternal={true}
                            showAnchorIcon={true}
                            onPress={() => {
                                open_link(link.url);
                            }}
                            size="sm"
                        >
                            {link.text}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
