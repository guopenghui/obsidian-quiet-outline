import type { Heading } from "@/store";

export function stringifyHeaders(headers: Heading[], export_format: string) {
    function merge(arr1: string[], arr2: string[]) {
        return Array(arr1.length + arr2.length)
            .fill("")
            .map((_, i) => (i % 2 === 0 ? arr1[i / 2] : arr2[(i - 1) / 2]));
    }

    const parts = export_format.split(/\{.*?\}/);
    const keys = export_format.match(/(?<={)(.*?)(?=})/g) || [];

    function transform(h: Heading) {
        const num = nums[h.level - 1];
        const fields = keys.map((key) => {
            switch (key) {
                case "title": {
                    return h.heading;
                }
                case "path": {
                    return "#" + h.heading.replace(/ /g, "%20");
                }
                case "bullet": {
                    return "-";
                }
                case "num": {
                    return num.toString();
                }
                case "num-nest": {
                    return num.toString();
                }
            }
            const match = key.match(/num-nest\[(.*?)\]/);

            if (match) {
                const sep = match[1];
                return nums.slice(0, h.level).join(sep);
            }

            return "";
        });

        return merge(parts, fields).join("");
    }

    const nums = [0, 0, 0, 0, 0, 0];
    const resultHeaders: string[] = [];
    headers.forEach((h) => {
        nums.forEach((_, i) => {
            if (i > h.level - 1) {
                nums[i] = 0;
            }
        });
        nums[h.level - 1]++;

        const text = "\t".repeat(h.level - 1) + transform(h);
        resultHeaders.push(text);
    });

    return resultHeaders;
}
