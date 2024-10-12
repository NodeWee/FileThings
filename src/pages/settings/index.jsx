import "./index.css";

import { Accordion, AccordionItem, Button, Chip } from "@nextui-org/react";
import { BsFolder, BsGear } from "react-icons/bs";
import { useContext, useEffect, useState } from "react";

import AppCurrentVersion from "./rows/AppCurrentVersion";
import AppLanguageSelection from "./rows/AppLanguageSelection";
import DirAppData from "./rows/DirAppData";
import OpenSource from "./rows/OpenSource";
import FeedbackChineseGroup from "./rows/FeedbackChineseGroup";
import FeedbackEMail from "./rows/FeedbackEMail";
import DiscussOnGithub from "./rows/DiscussOnGithub";
import FeedbackOnline from "./rows/FeedbackOnline";
import Layout from "../layout";
import { MdOutlineFeedback } from "react-icons/md";
import SectionTitle from "./SectionTitle";
import { SharedStateContext } from "../../SharedStateContext";
import SwitchAutoUpdate from "./rows/SwitchAutoUpdate";
import { action_call } from "../../lib/caller";

export default function Component(props) {
    const { passingProps } = useContext(SharedStateContext);
    const { T, isDebug, uiConfig } = passingProps;
    useEffect(() => {
        // if location has hash, scroll to the corresponding position,
        if (window.location.hash) {
            const hash = window.location.hash.replace("#", "");
            const el = document.getElementById(hash);
            if (el) {
                el.scrollIntoView({ behavior: "smooth" });
            }
            // and flash once
            el.classList.add("bg-sky-600");
            setTimeout(() => {
                el.classList.remove("bg-sky-600");
            }, 1000);
        }
    }, []);

    const sectionClasses = "flex flex-col gap-1";

    return (
        <Layout>
            <div className="flex flex-col gap-12 px-6 py-4">
                <div className={sectionClasses}>
                    <SectionTitle
                        {...passingProps}
                        title="Application"
                        icon={<BsGear />}
                    />
                    <AppCurrentVersion {...passingProps} />

                    <SwitchAutoUpdate {...passingProps} />

                    <AppLanguageSelection {...passingProps} />

                    <OpenSource {...passingProps} />
                </div>

                <div className={sectionClasses}>
                    <SectionTitle
                        {...passingProps}
                        id="section-contact"
                        title={T("app.settings.feedback.title")}
                        icon={<MdOutlineFeedback />}
                    />

                    {/* <FeedbackOnline {...passingProps} /> */}
                    <DiscussOnGithub {...passingProps} />
                    {uiConfig.lang !== "zh" && (
                        <FeedbackEMail {...passingProps} />
                    )}

                    {uiConfig.lang === "zh" && (
                        <FeedbackChineseGroup {...passingProps} />
                    )}
                </div>

                <div className={sectionClasses}>
                    <SectionTitle
                        {...passingProps}
                        title="app.settings.dirs.title"
                        icon={<BsFolder />}
                    />

                    <DirAppData {...passingProps} />
                </div>

                {/* <div className="fixed right-4 bottom-12 flex flex-row justify-end -z-10">
                    <div className={`app-title select-none no-cursor`}>
                        {T("app.title")}
                    </div>
                </div> */}

                {isDebug === true && (
                    <Button
                        size="sm"
                        onClick={() => {
                            action_call("open.dev_tools", {}).catch((e) => {
                                console.error("Failed to open dev tools:", e);
                            });
                        }}
                    >
                        dev tools
                    </Button>
                )}

                <div className="bottom-base-line"></div>
            </div>
        </Layout>
    );
}
