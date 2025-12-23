import { store } from '@/store';
import { computed, reactive, ref, watchEffect } from 'vue';
import { darkTheme, GlobalThemeOverrides } from 'naive-ui';

type MakeRequired<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};

export function useOutlineTheme() {
    // toggle light/dark theme
    let theme: any = computed(() => {
        if (store.dark) {
            return darkTheme;
        }
        return null;
    });

    type ThemeOverrides = MakeRequired<
        GlobalThemeOverrides,
        "common" | "Slider" | "Tree"
    >;

    const lightThemeConfig = reactive<ThemeOverrides>({
        common: {
            primaryColor: "",
            primaryColorHover: "",
        },
        Slider: {
            handleSize: "10px",
            fillColor: "",
            fillColorHover: "",
            dotBorderActive: "",
        },
        Tree: {
            nodeTextColor: "var(--nav-item-color)",
        },
    });

    const darkThemeConfig = reactive<ThemeOverrides>({
        common: {
            primaryColor: "",
            primaryColorHover: "",
        },
        Slider: {
            handleSize: "10px",
            fillColor: "",
            fillColorHover: "",
            dotBorderActive: "",
        },
        Tree: {
            nodeTextColor: "var(--nav-item-color)",
        },
    });

    let iconColor = computed(() => {
        if (store.dark) {
            return { color: "var(--icon-color)" };
        }
        return { color: "var(--icon-color)" };
    });


    let locatedColor = ref(getDefaultColor());

    watchEffect(() => {
        if (store.patchColor) {
            lightThemeConfig.common.primaryColor =
                lightThemeConfig.common.primaryColorHover =
                // @ts-ignore type indication error
                lightThemeConfig.Slider.fillColor =
                // @ts-ignore type indication error
                lightThemeConfig.Slider.fillColorHover =
                store.primaryColorLight;
            // @ts-ignore type indication error
            lightThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorLight}`;

            darkThemeConfig.common.primaryColor =
                darkThemeConfig.common.primaryColorHover =
                // @ts-ignore type indication error
                darkThemeConfig.Slider.fillColor =
                // @ts-ignore type indication error
                darkThemeConfig.Slider.fillColorHover =
                store.primaryColorDark;
            // @ts-ignore type indication error
            darkThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorDark}`;
            return;
        }
        // when css changed, recompute
        if (store.cssChange === store.cssChange) {
            let color = getDefaultColor();
            lightThemeConfig.common.primaryColor =
                lightThemeConfig.common.primaryColorHover =
                // @ts-ignore type indication error
                lightThemeConfig.Slider.fillColor =
                // @ts-ignore type indication error
                lightThemeConfig.Slider.fillColorHover =
                darkThemeConfig.common.primaryColor =
                darkThemeConfig.common.primaryColorHover =
                // @ts-ignore type indication error
                darkThemeConfig.Slider.fillColor =
                // @ts-ignore type indication error
                darkThemeConfig.Slider.fillColorHover =
                color;
            // @ts-ignore type indication error
            lightThemeConfig.Slider.dotBorderActive =
                // @ts-ignore type indication error
                darkThemeConfig.Slider.dotBorderActive = `2px solid ${color}`;
            locatedColor.value = color;
        }
    });

    let rainbowColor1 = ref("");
    let rainbowColor2 = ref("");
    let rainbowColor3 = ref("");
    let rainbowColor4 = ref("");
    let rainbowColor5 = ref("");

    watchEffect(() => {
        if (store.rainbowLine) {
            rainbowColor1.value = `rgba(${hexToRGB(store.rainbowColor1)}, 0.6)`;
            rainbowColor2.value = `rgba(${hexToRGB(store.rainbowColor2)}, 0.6)`;
            rainbowColor3.value = `rgba(${hexToRGB(store.rainbowColor3)}, 0.6)`;
            rainbowColor4.value = `rgba(${hexToRGB(store.rainbowColor4)}, 0.6)`;
            rainbowColor5.value = `rgba(${hexToRGB(store.rainbowColor5)}, 0.6)`;
            return;
        }
        if (store.cssChange === store.cssChange) {
            rainbowColor1.value =
                rainbowColor2.value =
                rainbowColor3.value =
                rainbowColor4.value =
                rainbowColor5.value =
                "var(--nav-indentation-guide-color)";
        }
    });

    let containerStyle = computed(() => {
        const style: Record<string, string> = {};

        if (store.fontSize) {
            style['--custom-font-size'] = store.fontSize;
        }
        if (store.fontFamily) {
            style['--custom-font-family'] = store.fontFamily;
        }
        if (store.fontWeight) {
            style['--custom-font-weight'] = store.fontWeight;
        }
        if (store.lineHeight) {
            style['--custom-line-height'] = store.lineHeight;
        }
        if (store.lineGap) {
            style['--custom-line-gap'] = store.lineGap;
        }

        // Font color settings
        if (store.customFontColor) {
            if (store.h1Color) {
                style['--h1-color'] = store.h1Color;
            }
            if (store.h2Color) {
                style['--h2-color'] = store.h2Color;
            }
            if (store.h3Color) {
                style['--h3-color'] = store.h3Color;
            }
            if (store.h4Color) {
                style['--h4-color'] = store.h4Color;
            }
            if (store.h5Color) {
                style['--h5-color'] = store.h5Color;
            }
            if (store.h6Color) {
                style['--h6-color'] = store.h6Color;
            }
        }

        return style;
    });

    // RTL
    let biDi = ref("");
    watchEffect(() => {
        biDi.value =
            store.textDirectionDecideBy === "text" ? "plaintext" : "isolate";
    });

    return {
        theme,
        lightThemeConfig,
        darkThemeConfig,
        iconColor,
        locatedColor,
        rainbowColor1,
        rainbowColor2,
        rainbowColor3,
        rainbowColor4,
        rainbowColor5,
        containerStyle,
        biDi,
    };
}

function getDefaultColor() {
    let button = document.body.createEl("button", {
        cls: "mod-cta",
        attr: { style: "width: 0px; height: 0px;" },
    });
    let color = getComputedStyle(button, null).getPropertyValue(
        "background-color",
    );
    button.remove();
    return color;
}

function hexToRGB(hex: string) {
    return (
        `${parseInt(hex.slice(1, 3), 16)},` +
        `${parseInt(hex.slice(3, 5), 16)},` +
        `${parseInt(hex.slice(5, 7), 16)}`
    );
}
