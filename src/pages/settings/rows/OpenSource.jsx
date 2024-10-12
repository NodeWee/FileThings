import { Button } from '@nextui-org/react';

import { open_link } from '../../../lib/actions';

export default function Component(props) {
    const { T  } = props;
    const appRepoUrl = "https://github.com/nodewee/FileThingsApp";
    

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">
                    {T("Source Code")}
                </div>
                <div className="setting-row-summary">
                    {T("app.settings.source-code.summary")}
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Button
                    color="default"
                    variant="solid"
                    size="sm"
                    onPress={(e) => {
                        open_link(appRepoUrl);
                    }}
                >
                    {T("Open Repository")}
                </Button>
            </div>
        </div>
    );
}
