import { Button, Snippet } from "@nextui-org/react";
import { open_link } from "../../../lib/actions";

export default function Component(props) {
    const { T, appVersion } = props;
    const mail_addr = "nodewee@gmail.com";
    const mail_url = `mailto:${mail_addr}?subject=Feedback%20for%20FileThings%20v${appVersion.current}`;

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">
                    {T("app.settings.feedback.email")}
                </div>
                <div className="setting-row-summary"></div>
                <div className="setting-row-more">
                    <Snippet symbol="" size="sm">
                        {mail_addr}
                    </Snippet>
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Button
                    onPress={(e) => {
                        open_link(mail_url);
                        e.preventDefault();
                    }}
                    size="sm"
                >
                    {T("app.settings.feedback.open-email")}
                </Button>
            </div>
        </div>
    );
}
