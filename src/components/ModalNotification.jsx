import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@nextui-org/react";

import { BsX } from "react-icons/bs";
import { useState } from "react";

export default function Component(props) {
    const {
        T,
        showThisNotification,
        setShowThisNotification,
        notificationTitle,
        notificationContent,
        backdrop,
        isDismissable,
    } = props;

    return (
        <Modal
            aria-label={`Modal Notification - ${notificationTitle}`}
            className="modal px-1 py-4"
            // backdrop={backdrop || "blur"}
            isOpen={showThisNotification}
            isDismissable={isDismissable}
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
            onClose={() => {
                setShowThisNotification(false);
            }}
            size="xl"
        >
            <ModalContent>
                <ModalHeader className="flex flex-row items-center gap-2">
                    <span className="select-text">
                        {T("-app.notification")}
                    </span>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-4 select-text">
                    {notificationContent}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
