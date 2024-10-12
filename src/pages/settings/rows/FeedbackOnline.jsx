import { Button } from "@nextui-org/react";
import { MdOutlineFeedback } from "react-icons/md";
import { open_link } from "../../../lib/actions";

export default function Component(props) {
    const { T, appVersion } = props;
    const feedbackUrl = `https://filethings.canny.io/feedback/`;

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">
                    {T("app.settings.feedback.online")}
                </div>
                <div className="setting-row-summary">
                    {T("app.settings.feedback.online-summary")}
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Button
                    color="default"
                    variant="solid"
                    size="sm"
                    onPress={(e) => {
                        open_link(feedbackUrl);
                    }}
                >
                    {T("Open Webpage")}
                </Button>
            </div>
        </div>
    );
}
