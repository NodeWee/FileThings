import { Chip, Link } from "@nextui-org/react";
import { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { BsArrowRightCircle } from "react-icons/bs";
import ContentLoading from "../../components/controls/ContentLoading";
import Layout from "../layout";
import { SharedStateContext } from "../../SharedStateContext";
import ToolRow from "./ToolRow";

export default function Component(props) {
    const { passingProps } = useContext(SharedStateContext);
    const { T } = passingProps;
    const navigate = useNavigate();

    const exe_tool_names = window.app.tools?.exe_names;
    const model_tool_names = window.app.tools?.model_names;
    const sectionTitleClasses = "opacity-50 font-bold mt-8 mb-2 p-2";

    return (
        <Layout>
            <div className="flex flex-col px-6 py-4 gap-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-full text-center opacity-50">
                        {T("app.tools.description")}
                    </div>
                    <div className="flex flex-row items-center justify-center opacity-45 text-sm gap-2">
                        {T(
                            "If you encounter difficulties in installing the tool, you can contact us for help."
                        )}
                        <Link
                            href="#"
                            onPress={() => {
                                navigate("/settings#section-contact");
                            }}
                            className="text-blue-400"
                        >
                            <BsArrowRightCircle />
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className={sectionTitleClasses}>
                        {T("app.tools.executable-tools")}
                    </div>
                    <div className="flex flex-col gap-2">
                        {exe_tool_names ? (
                            exe_tool_names.length > 0 ? (
                                exe_tool_names.map((toolName) => {
                                    return (
                                        <ToolRow
                                            key={toolName}
                                            toolName={toolName}
                                            {...passingProps}
                                        />
                                    );
                                })
                            ) : (
                                <div className="opacity-50">
                                    ({T("app.tools.no-tools")})
                                </div>
                            )
                        ) : (
                            <ContentLoading />
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className={sectionTitleClasses}>
                        {T("app.tools.model-tools")}
                    </div>
                    <div className="flex flex-col gap-2">
                        {model_tool_names ? (
                            model_tool_names.length > 0 ? (
                                model_tool_names.map((toolName) => {
                                    return (
                                        <ToolRow
                                            aria-label={`ToolRow-${toolName}`}
                                            key={toolName}
                                            toolName={toolName}
                                            {...passingProps}
                                        />
                                    );
                                })
                            ) : (
                                <div className="opacity-50">
                                    ({T("app.tools.no-tools")})
                                </div>
                            )
                        ) : (
                            <ContentLoading />
                        )}
                    </div>
                </div>

                <div className="bottom-base-line"></div>
            </div>
        </Layout>
    );
}
