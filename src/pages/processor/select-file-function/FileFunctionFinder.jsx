import {
    Button,
    CircularProgress,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ScrollShadow,
} from "@nextui-org/react";
import React, { useState } from "react";

import { BsX } from "react-icons/bs";
import FileFunctionCard from "./FileFunctionCard";
import { invoke } from "@tauri-apps/api/core";

export default function Component(props) {
    const {
        T,
        supportedFileFunctions,
        changeThing,
        showModalThingFinder,
        setShowModalThingFinder,
    } = props;

    if (!supportedFileFunctions) {
        return null;
    }

    return (
        <Modal
            key="modal-file_function-finder"
            backdrop="blur"
            scrollBehavior="inside"
            isOpen={showModalThingFinder}
            closeButton={
                <Button
                    className="pointer-events-none"
                    size="md"
                    variant="ghost"
                    radius="full"
                    isIconOnly
                >
                    <BsX size={20} />
                </Button>
            }
            onClose={() => setShowModalThingFinder(false)}
            size="5xl"
        >
            <ModalContent>
                <ModalHeader>
                    <div className="flex flex-row items-center gap-2 opacity-50">
                        <span className="select-text">
                            {T("app.things.select")}
                        </span>
                    </div>
                </ModalHeader>
                <ModalBody className="">
                    {supportedFileFunctions.names?.length > 0 ? (
                        <ScrollShadow
                            className="flex flex-row flex-wrap gap-6 mt-4 mb-4"
                            size={20}
                            hideScrollBar={true}
                        >
                            {supportedFileFunctions.names.map((thing_name) => {
                                let file_function =
                                    supportedFileFunctions.items[thing_name];
                                return (
                                    <FileFunctionCard
                                        key={thing_name}
                                        file_function={file_function}
                                        {...props}
                                    />
                                );
                            })}
                        </ScrollShadow>
                    ) : (
                        <div className="flex flex-row items-center justify-center">
                            {T("app.things.no-matched")}
                        </div>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
