import { Toaster } from "react-hot-toast";
import i18n from "../lib/i18n";

export default function Component(props) {
    const T = i18n.translate;

    return (
        <Toaster
            // more params ref: https://react-hot-toast.com/docs/toast
            gutter={18}
            containerStyle={{
                // position: "absolute",
                top: "1px",
                userSelect: "text",
                opacity: 0.9,
                filter: "drop-shadow(0 0 0.75rem rgba(255, 255, 255, 0.3))",
            }}
            containerClassName="select-text"
            toastOptions={{
                // position: "top-right",
                style: {
                    border: "none",
                    padding: "16px",
                    borderRadius: "24px",
                    color: "var(--clr-txt-1st)",
                    background: "#000",
                    width: "fit-content",
                    maxWidth: "100%",
                    textWrap: "wrap",
                    overflow: "hidden",
                    userSelect: "text",
                },
                success: {
                    style: {
                        background: "green",
                        userSelect: "text",
                    },
                },
                error: {
                    style: {
                        background: "red",
                        userSelect: "text",
                    },
                },
            }}
        />
    );
}
