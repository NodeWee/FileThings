import { BsPlay, BsX } from "react-icons/bs";
import { Button, Tooltip } from "@nextui-org/react";
import React, { useEffect, useState } from "react";

export default function Component(props) {
    const { T, changeThing, taskRunning, setShowModalThing } = props;

    if (taskRunning) {
        return null;
    }

    return (
        <div className="flex flex-row items-center justify-center gap-12">
            {/* button - cancel */}
            <Button
                radius="full"
                variant="ghost"
                color="default"
                onClick={() => {
                    setShowModalThing(false);
                }}
                onPress={() => {
                    setShowModalThing(false);
                }}
                size="md"
            >
                <BsX size={28} />
                {T("app.things.cancel")}
            </Button>

            {/* button - run */}
            <Button
                type="submit"
                radius="full"
                variant="ghost"
                color="success"
                // onPress={} // will trigger form submit to do file_function
                size="md"
            >
                <BsPlay size={28} />
                {T("app.things.run")}
            </Button>
        </div>
    );
}
