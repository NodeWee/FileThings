import { Outlet, ScrollRestoration } from "react-router-dom";

import CustomToaster from "../components/CustomToaster";
import NavigationGuard from "../components/NavigationGuard";
import { NextUIProvider } from "@nextui-org/react";

export default function App() {
    return (
        <NextUIProvider>
            <Outlet />
            <ScrollRestoration />
            <CustomToaster />
            <NavigationGuard />
            <div id="function-worker-container" className="hidden"></div>
        </NextUIProvider>
    );
}
