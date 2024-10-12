
import React, { useContext, useEffect, useState } from "react";

import Layout from "../layout";
import { SharedStateContext } from "../../SharedStateContext";

export default function Page() {
    const { passingProps } = useContext(SharedStateContext);

    const { T } = passingProps;


    return (
        <Layout>
            <div className="flex flex-col h-svh max-h-svh gap-4 px-6 py-4 justify-between">
                <div className="flex flex-col gap-4">
                    <div className="text-xl font-bold">{T("Coming Soon")}</div>
                    <div className="text-sm opacity-60">
                        {T("This feature is under development and will be available in the next release.")}
                    </div>
                </div>
            </div>

        </Layout>
    );
}
