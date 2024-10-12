import i18n from "../i18n";

export function get_function_title(work_function) {
    let func_title = "";
    let cur_lang = i18n.get_lang();
    if (work_function.profile?.title) {
        // if title is string, return it directly, else is an object, get the current language or default to en
        if (typeof work_function.profile.title === "string") {
            return work_function.profile.title;
        }
        // else
        func_title = work_function.profile.title[cur_lang]
            ? work_function.profile.title[cur_lang]
            : work_function.profile.title["en"]; // default to en, maybe empty depending on the work_function profile
    }
    if (!func_title) {
        func_title = i18n.translate(
            `app.things.` + work_function.name + `.title`
        );
    }
    return func_title;
}

export function get_function_summary(work_function) {
    let func_summary = "";
    let cur_lang = i18n.get_lang();
    if (work_function.profile?.summary) {
        if (typeof work_function.profile.summary === "string") {
            return work_function.profile.summary;
        }
        func_summary = work_function.profile.summary[cur_lang]
            ? work_function.profile.summary[cur_lang]
            : work_function.profile.summary["en"];
    }
    if (!func_summary) {
        func_summary = i18n.translate(
            `app.things.` + work_function.name + `.summary`
        );
    }
    return func_summary;
}
