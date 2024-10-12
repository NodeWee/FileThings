import { useCallback } from "react";

import { useBlocker, useLocation, useNavigate } from "react-router";

const locationProperties = ["pathname", "search", "state"];

function isSameLocation(location1, location2) {
    return locationProperties.every(
        (property) => location1[property] === location2[property]
    );
}

export default function NavigationGuard() {
    const location = useLocation();
    const navigate = useNavigate();

    const blocker = useCallback(
        (props) => {
            // props:
            //      currentLocation: {pathname: "/", search: "", hash: "", state: null, key: "0kqki9jn"}
            //      historyAction: "PUSH"
            //      nextLocation: {pathname: "/creator", search: "", hash: "", state: null, key: "l4vibu38"}
            const action = props.historyAction;
            switch (action) {
                case "PUSH":
                case "REPLACE": {
                    return false; // 允许前进
                }
                case "POP": {
                    return true; // 不允许后退
                }
            }
        },
        [location, navigate]
    );

    useBlocker(blocker);

    return null;
}
