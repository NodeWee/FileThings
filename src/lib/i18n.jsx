function get_val_by_key_path(obj, key_path, key_is_nested_path) {
    if (!obj || !key_path) {
        return "";
    }

    if (typeof key_path !== "string") {
        console.error("key_path is not string", key_path);
        return "";
    }

    if (!key_is_nested_path) {
        // 明确标识 key 为整条语言文字, 不要将其拆分为多个 key
        return obj[key_path] || "";
    }

    // else, key_is_nested_path = true
    // key_path is like "common.ok". if not found, return empty string
    let keys = key_path.split(".");
    let val = obj;
    for (var i = 0; i < keys.length; i++) {
        val = val[keys[i]];
        if (!val) {
            return "";
        }
    }
    return val;
}

const i18n = {
    get_lang: function () {
        var lang;
        if (!window) {
            // before window is ready
            return "en";
        }

        // get lang from ui config
        if (window.app?.config?.ui?.lang) {
            lang = window.app.config.ui.lang;
        }

        // get lang from url query (at first priority)
        if (window.location && window.location.search) {
            var urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("lang")) {
                lang = urlParams.get("lang");
            }
        }

        // get lang from <html> lang attribute
        if (!lang && document && document.documentElement) {
            lang = document.documentElement.lang;
        }

        // get lang from navigator
        if (!lang && navigator && navigator.language) {
            lang = navigator.language;
        }

        if (!lang) {
            lang = "en"; // default lang
        }

        lang = lang.toLowerCase();
        return lang.slice(0, 2);
    },
    set_lang: function (lang) {
        if (lang) {
            document.documentElement.lang = lang;
        }
    },
    translate: function (key, vars = [], key_is_nested_path = true) {
        if (!window?.app?.translation) {
            // before window.app.translation is ready
            return "";
        }

        if (!key) {
            return "";
        }

        let text = get_val_by_key_path(
            window.app.translation,
            key,
            key_is_nested_path
        );

        if (!text) {
            // try to get text from translation.raw (raw text)
            text = get_val_by_key_path(window.app.translation.raw, key, false);
        }
        text = text || key; // if not found, use key as text

        // if vars is array
        if (Array.isArray(vars)) {
            // replace vars in text
            for (var i = 0; i < vars.length; i++) {
                text = text.replace(new RegExp(`\\{${i}\\}`, "g"), vars[i]);
            }
        }

        // if text is not string, return empty string
        if (typeof text !== "string") {
            return "";
        }
        return text;
    },
};

export default i18n;
