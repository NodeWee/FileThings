import { ScrollShadow } from "@nextui-org/react";

import PathActions from "./PathActions.jsx";
import PathRow from "./PathRow.jsx";

export default function Component(props) {
    const { T, parsedPaths } = props;

    return (
        <div className="w-full flex flex-col overflow-scroll scrollbar-hide border-solid border-2 border-default-200 rounded-md pb-4">
            <PathActions {...props} />

            <ScrollShadow className="w-full flex flex-col scrollbar-hide">
                {parsedPaths.map((item, index) => (
                    <PathRow
                        key={index}
                        index={index}
                        {...props}
                        pathItem={item}
                    />
                ))}
            </ScrollShadow>
        </div>
    );
}
