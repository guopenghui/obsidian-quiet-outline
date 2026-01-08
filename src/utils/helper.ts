/** Try to parse a JSON string, returning a default value if parsing fails. */
export function tryParseJson<Data>(jsonString: string, defaultData: Data): Data {
    try {
        return JSON.parse(jsonString);
    } catch {
        return defaultData;
    }
}

/** no-op, for type narrowing only */
/* oxlint-disable-next-line no-unused-vars */
export function assertType<T>(value: unknown): asserts value is T {}
