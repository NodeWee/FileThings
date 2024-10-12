import { BsStar, BsStarFill } from "react-icons/bs";
import {
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Tooltip,
} from "@nextui-org/react";
import {
    get_function_summary,
    get_function_title,
} from "../../../lib/thing-functions/utils";
import { useEffect, useRef, useState } from "react";

import { select_file_function_name } from "../../../lib/actions";

export default function Component(props) {
    const {
        file_function,
        T,
        setShowModalThing,
        setShowModalThingFinder,
        updateThingConfigItems,
    } = props;

    const [starPopoverIsOpen, setStarPopoverIsOpen] = useState(false);
    const popoverTimer = useRef(null);

    let thing_title = get_function_title(file_function);
    let thing_summary = get_function_summary(file_function);
    let thing_config = window.app.config.things[file_function.name];

    // init file_function config
    if (!thing_config || thing_config === undefined) {
        thing_config = {
            star: true, // default star (show by default)
        };
    }

    return (
        <Tooltip
            content={thing_summary}
            placement="bottom"
            showArrow={true}
            delay={50}
            closeDelay={400}
            size="sm"
            color="success"
        >
            <div className="file_function-card h-fit rounded-lg">
                <Button
                    className="w-full"
                    onPress={() => {
                        select_file_function_name({
                            value: file_function.name,
                            stateProps: props,
                        });
                        setShowModalThingFinder(false);
                        setShowModalThing(true);
                    }}
                    size="md"
                    variant="light"
                    radius="none"
                >
                    <div className="pointer-events-none select-none">
                        {thing_title}
                    </div>
                </Button>

                <Button
                    className="star m-0 p-0"
                    onPress={() => {
                        thing_config.star = !thing_config.star;
                        updateThingConfigItems({
                            [file_function.name]: thing_config,
                        });
                        //

                        // show popover
                        setStarPopoverIsOpen(true);
                        // auto close popover
                        if (popoverTimer.current !== null) {
                            clearTimeout(popoverTimer.current);
                        }
                        popoverTimer.current = setTimeout(() => {
                            setStarPopoverIsOpen(false);
                        }, 800);
                    }}
                    size="md"
                    variant="light"
                    radius="none"
                    isIconOnly
                >
                    {thing_config.star ? (
                        <BsStarFill size={16} />
                    ) : (
                        <BsStar size={16} />
                    )}
                </Button>
                <Popover isOpen={starPopoverIsOpen} placement="right">
                    <PopoverTrigger>
                        <div className="disabled pointer-events-none select-none absolute right-0  w-0"></div>
                    </PopoverTrigger>
                    <PopoverContent>
                        <div>
                            {thing_config.star
                                ? T("app.things.stared")
                                : T("app.things.un-stared")}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </Tooltip>
    );
}
