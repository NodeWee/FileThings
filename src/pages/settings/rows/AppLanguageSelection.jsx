import toast from "react-hot-toast";
import { BsGlobe2 } from "react-icons/bs";

import { Select, SelectItem, Link } from "@nextui-org/react";
import { action_call } from "../../../lib/caller";
import { open_link } from "../../../lib/actions";
import i18n from "../../../lib/i18n";

export default function Component(props) {
    const { T, updateUiConfigItems } = props;
    const langRepoUrl = "https://github.com/nodewee/FileThingsApp-Languages";

    return (
        <div className="setting-row">
            <div className="flex flex-col">
                <div className="setting-row-title">
                    {T("app.settings.language.title")}
                </div>
                <div className="setting-row-summary">
                    {T("app.settings.language.summary")}
                </div>
                <div className="setting-row-more">
                <Link
                        href="#"
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault();
                        }}
                        onPress={(e) => {
                            open_link(langRepoUrl);
                            e.preventDefault();
                        }}
                        isExternal
                        showAnchorIcon
                    >
                        {T("Open Languages Repository")}
                    </Link>
                </div>
            </div>
            <div className="flex-auto"></div>
            <div className="setting-row-action">
                <Select
                    aria-label="Language selection"
                    className="w-48"
                    labelPlacement="inside"
                    variant="flat"
                    isRequired={true}
                    defaultSelectedKeys={[i18n.get_lang() || "en"]}
                    placeholder={T("app.settings.language.placeholder")}
                    selectionMode="single"
                    startContent={<BsGlobe2 />}
                    onChange={(e) => {
                        const lang_code = e.target.value || "en";
                        // load translation
                        action_call("i18n.load.translation", {
                            lang_code: lang_code,
                        })
                            .then((rsp) => {
                                window.app.translation = rsp.content;

                                // update ui lang
                                i18n.set_lang(e.target.value);
                                updateUiConfigItems({ lang: e.target.value });
                            })
                            .catch((e) => {
                                console.error(e);
                                toast.error(
                                    T("app.error.failed-to-load-translation", [
                                        e,
                                    ])
                                );
                            });
                    }}
                >
                    {window.app.languages.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                            {item.name}
                        </SelectItem>
                    ))}
                </Select>
            </div>
        </div>
    );
}
