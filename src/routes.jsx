import { Suspense, lazy, useState } from "react";

import ContentLoading from "./components/controls/ContentLoading";

const ProcessorPage = lazy(() => import("./pages/processor/index"));
const ViewerPage = lazy(() => import("./pages/viewer/index"));
const CleanerPage = lazy(() => import("./pages/cleaner/index"));
const SettingsPage = lazy(() => import("./pages/settings/index"));
const ToolsPage = lazy(() => import("./pages/tools/index"));
const TasksPage = lazy(() => import("./pages/tasks/index"));
const Notfound = lazy(() => import("./pages/404"));

export const routes = [
    {
        index: true,
        // path: "/viewer", // default path `/`
        element: (
            <Suspense fallback={<ContentLoading />}>
                <ViewerPage />
            </Suspense>
        ),
    },
    {
        path: "/processor",
        element: (
            <Suspense fallback={<ContentLoading />}>
                <ProcessorPage />
            </Suspense>
        ),
    },
    {
        path: "/cleaner",
        element: (
            <Suspense fallback={<ContentLoading />}>
                <CleanerPage />
            </Suspense>
        ),
    },

    {
        path: "/settings",
        element: (
            <Suspense fallback={<ContentLoading />}>
                <SettingsPage />
            </Suspense>
        ),
    },
    {
        path: "/tools",
        element: (
            <Suspense fallback={<ContentLoading />}>
                <ToolsPage />
            </Suspense>
        ),
    },
    {
        path: "/tasks",
        element: (
            <Suspense fallback={<ContentLoading />}>
                <TasksPage />
            </Suspense>
        ),
    },
    {
        path: "*",
        element: (
            <Suspense fallback={<ContentLoading />}>
                <Notfound />
            </Suspense>
        ),
    },
];

export default routes;
