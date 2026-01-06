/** Try to parse a JSON string, returning a default value if parsing fails. */
export function tryParseJson<Data>(jsonString: string, defaultData: Data): Data {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return defaultData;
    }
}
