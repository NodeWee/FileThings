import i18n from "./i18n";

export function get_translation_from_object_node(obj_node) {
    // obj_node is an object {en, zh, ...} or a string
    if (!obj_node) {
        return "";
    }
    if (typeof obj_node === "string") {
        return obj_node;
    } else {
        return (
            obj_node[i18n.get_lang()] ||
            obj_node["en"] ||
            Object.values(obj_node)[0]
        );
    }
}

export function human_readable_byte_size(size, si = true) {
    //  International System of Units (SI) , 1000
    //  Binary System, 1024
    const unit = si ? 1000 : 1024;

    if (!size || isNaN(size) || size === "0" || size === "undefined")
        return "0 B";

    const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(unit));
    let result =
        (size / Math.pow(unit, i)).toFixed(1) * 1 +
        " " +
        ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][i];

    result = si ? result : result.replace(/B/, "iB");
    return result;
}

export function dict_value_to_string(dict) {
    var new_dic = {};
    for (var key in dict) {
        var value = dict[key];
        var type = Object.prototype.toString.call(value);
        switch (type) {
            case "[object Boolean]":
                new_dic[key] = value ? "true" : "false";
                break;
            case "[object Array]":
                new_dic[key] = value.join("\n");
                break;
            case "[object Set]":
                new_dic[key] = Array.from(value).join("\n");
                break;
            case "[object Object]":
                new_dic[key] = JSON.stringify(value);
                break;
            case "[object Null]":
                new_dic[key] = "null";
                break;
            case "[object Undefined]":
                new_dic[key] = "undefined";
                break;
            default:
                new_dic[key] = value.toString();
        }
    }

    return new_dic;
}

function variable_to_string(value) {
    var type = Object.prototype.toString.call(value);
    switch (type) {
        case "[object Boolean]":
            return value ? "true" : "false";
        case "[object Array]":
            return value.join("\n");
        case "[object Set]":
            return Array.from(value).join("\n");
        case "[object Object]":
            return JSON.stringify(value);
        case "[object Null]":
            return "null";
        case "[object Undefined]":
            return "undefined";
        default:
            return value.toString();
    }
}

export function get_variable_type(value) {
    return Object.prototype.toString.call(value);
}
