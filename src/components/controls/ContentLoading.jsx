import { CircularProgress } from "@nextui-org/react";

export default function Component({ color }) {
    return (
        <div className="flex flex-row items-center align-middle justify-center">
            <CircularProgress color={color || "primary"} />
        </div>
    );
}
