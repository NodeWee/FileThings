import Layout from "./layout";
import i18n from "../lib/i18n";

export default function Page() {
    const T = i18n.translate;
    return (
        <Layout>
            <div>{T("Page error")}</div>
        </Layout>
    );
}
