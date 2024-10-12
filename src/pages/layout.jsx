import React, { useEffect, useState } from "react";

import AppPopover from "../components/AppPopover";
import { Divider } from "@nextui-org/react";
import LeftNav from "../components/LeftNav";

export default function Layout({ children }) {
    return (
        <div
            aria-label="Main Layout"
            className="flex flex-row w-full max-w-full h-svh max-h-svh overflow-hidden scrollbar-hide"
        >
            <LeftNav />
            <Divider orientation="vertical" />
            <main className="flex flex-col w-full max-w-full h-svh max-h-svh overflow-scroll">
                {/* <div className="flex flex-col w-full max-w-full gap-4"> */}
                {children}
                {/* </div> */}
            </main>
            <AppPopover />
        </div>
    );
}
