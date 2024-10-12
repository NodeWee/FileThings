import "./style.css";

import React, { useContext, useEffect, useState } from "react";

import FileFunctionFinder from "./select-file-function/FileFunctionFinder";
import FileSelection from "./select-file/index";
import FunctionButtons from "./FunctionButtons";
import Layout from "../layout";
import ModalFileFunction from "./file-task/ModalFileFunction";
import { SharedStateContext } from "../../SharedStateContext";
import { useNavigate } from "react-router-dom";

export default function Page() {
    const { passingProps } = useContext(SharedStateContext);
    const navigate = useNavigate();
    const thisProps = { ...passingProps, navigate };

    const { supportedFileFunctions, T } = passingProps;


    return (
        <Layout>
            <div className="flex flex-col h-svh max-h-svh gap-4 px-6 py-4 justify-between">
                <div className="flex flex-col gap-4 w-full h-full">
                    <FileSelection {...thisProps} />

                    {supportedFileFunctions.names?.length > 0 && (
                        <FunctionButtons {...thisProps} />
                    )}
                </div>
            </div>


            <ModalFileFunction {...thisProps} />

            <FileFunctionFinder {...thisProps} />
        </Layout>
    );
}
