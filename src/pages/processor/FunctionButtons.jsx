import { BsInfo, BsViewList } from "react-icons/bs";
import { Button, ScrollShadow, Tooltip } from "@nextui-org/react";
import {
    get_function_summary,
    get_function_title,
} from "../../lib/thing-functions/utils";
import { useEffect, useState } from "react";

import { select_file_function_name } from "../../lib/actions";

export default function Component(props) {
    const {
        T,
        supportedFileFunctions,
        setShowModalThing,
        setShowModalThingFinder,
    } = props;

    return (
        <div className="flex flex-row gap-2 items-center">
            <div className=" text-nowrap text-small opacity-50 pt-1 pb-3">
                {T("app.things.title")}
            </div>
            <ScrollShadow
                aria-label="BarThings"
                className="flex flex-row gap-2 overflow-x-scroll scrollbar-hide px-1 pt-1 pb-3"
                // className="flex flex-row flex-wrap gap-2 scrollbar-hide px-1 pt-1 pb-3"
                orientation="horizontal"
            >
                {supportedFileFunctions.names.map((thing_name, index) => {
                    // only show file_function that user star
                    let thing_config = window.app.config.things[thing_name];
                    // init file_function config
                    if (!thing_config || thing_config === undefined) {
                        thing_config = {
                            star: true, // default star (show by default)
                        };
                    }

                    if (!thing_config.star) {
                        return null;
                    }

                    let file_function =
                        supportedFileFunctions.items[thing_name];
                    let thing_title = get_function_title(file_function);
                    let thing_summary = get_function_summary(file_function);
                    return (
                        <Tooltip
                            key={index}
                            content={thing_summary}
                            placement="bottom"
                            delay={50}
                            closeDelay={400}
                            size="sm"
                            color="success"
                        >
                            <Button
                                className="min-w-fit"
                                key={index}
                                onPress={() => {
                                    select_file_function_name({
                                        value: file_function.name,
                                        stateProps: props,
                                    });
                                    setShowModalThing(true);
                                }}
                                variant="ghost"
                                radius="full"
                                size="sm"
                            >
                                {thing_title}
                            </Button>
                        </Tooltip>
                    );
                })}
            </ScrollShadow>

            <div className="flex flex-row items-center  px-1 pt-1 pb-3">
                <Tooltip
                    content={T("app.things.expand-all")}
                    color="success"
                    showArrow={true}
                    closeDelay={50}
                    placement="bottom"
                >
                    <Button
                        onPress={() => setShowModalThingFinder(true)}
                        variant="light"
                        radius="full"
                        size="md"
                        isIconOnly
                    >
                        <BsViewList size={18} />
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
}
