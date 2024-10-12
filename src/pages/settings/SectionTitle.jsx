import React from "react";

export default function Component(props) {
    const { title, id, icon, T } = props;
    return (
        <div
            id={id}
            className="flex flex-row items-center opacity-50 text-lg font-bold py-2 px-4 rounded-sm duration-1000"
        >
            {/* {icon && <span className="mr-2">{icon}</span>} */}
            <span>{T(title)}</span>
        </div>
    );
}
