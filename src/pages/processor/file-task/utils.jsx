export function file_function_variable_when_matches(variable, thingArgs) {
    if (!variable.when_matches && !variable.when_not_matches) {
        return true; // as matched
    }
    // when_matches struct: { "variable name": ["val1","val2"], ... }
    // when_not_matches struct: { "variable name": ["!val1","!val2"], ... }

    // validate variable.when_matches structure
    if (variable.when_matches) {
        if (typeof variable.when_matches !== "object") {
            throw new Error(`Invalid ${variable.name}.when_matches structure`);
        }
        if (Object.keys(variable.when_matches).length === 0) {
            throw new Error(`Invalid ${variable.name}.when_matches structure`);
        }
        if (
            Object.values(variable.when_matches).some((v) => !Array.isArray(v))
        ) {
            throw new Error(`Invalid ${variable.name}.when_matches structure`);
        }
    }
    // validate variable.when_not_matches structure
    if (variable.when_not_matches) {
        if (typeof variable.when_not_matches !== "object") {
            throw new Error(
                `Invalid ${variable.name}.when_not_matches structure`
            );
        }
        if (Object.keys(variable.when_not_matches).length === 0) {
            throw new Error(
                `Invalid ${variable.name}.when_not_matches structure`
            );
        }
        if (
            Object.values(variable.when_not_matches).some(
                (v) => !Array.isArray(v)
            )
        ) {
            throw new Error(
                `Invalid ${variable.name}.when_not_matches structure`
            );
        }
    }

    // check if all when_matches conditions are met
    if (variable.when_matches) {
        for (let [key, values] of Object.entries(variable.when_matches)) {
            if (!thingArgs[key]) {
                return false; // no this key in thingArgs, as not matched
            }
            const arg_val = thingArgs[key];
            if (!Array.isArray(arg_val)) {
                // if arg_val is single value, when value not in condition values,
                // then current arg not shown (not matched)
                if (!values.includes(arg_val)) {
                    return false; // not matched
                }
            } else {
                // if arg_val is array, when none of its values in condition values,
                // then current arg not shown (not matched)
                let no_matched = arg_val.every((v) => !values.includes(v));
                if (no_matched) {
                    return false; // not matched
                }
            }
        }
    }

    if (variable.when_not_matches) {
        // check if all when_not_matches conditions are met
        for (let [key, values] of Object.entries(variable.when_not_matches)) {
            if (values.includes(thingArgs[key])) {
                return false; // not matched
            }
            const var_val = thingArgs[key];
            // if var_val is not an array, match directly
            if (!Array.isArray(var_val)) {
                if (values.includes(var_val)) {
                    return false; // not matched
                }
            } else {
                if (values.some((v) => var_val.includes(v))) {
                    return false; // not matched
                }
            }
        }
    }

    return true; // all conditions are met, as matched
}
