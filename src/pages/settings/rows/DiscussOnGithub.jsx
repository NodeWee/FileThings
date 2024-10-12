import { Button } from '@nextui-org/react';

import { open_link } from '../../../lib/actions';

export default function Component(props) {
    const { T, appVersion } = props;
    const githubUrl = `https://github.com/nodewee/FileThingsApp/discussions`;

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">
                    {T("Discuss on Github")}
                </div>
                <div className="setting-row-summary">
                    {T("app.settings.feedback.discuss-on-github-summary")}
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Button
                    color="default"
                    variant="solid"
                    size="sm"
                    onPress={(e) => {
                        open_link(githubUrl);
                    }}
                >
                    {T("Open Webpage")}
                </Button>
            </div>
        </div>
    );
}
