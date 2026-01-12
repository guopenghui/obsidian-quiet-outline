import { store } from '@/store';
import { computed, reactive, ref, watchEffect } from 'vue';
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui';

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
        if (store.theme.patchColor) {
            lightThemeConfig.common.primaryColor =
                lightThemeConfig.common.primaryColorHover =
                // @ts-ignore type indication error
                lightThemeConfig.Slider.fillColor =
                // @ts-ignore type indication error
                lightThemeConfig.Slider.fillColorHover =
                store.theme.primaryColorLight;
            // @ts-ignore type indication error
            lightThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorLight}`;

            darkThemeConfig.common.primaryColor =
                darkThemeConfig.common.primaryColorHover =
                // @ts-ignore type indication error
                darkThemeConfig.Slider.fillColor =
                // @ts-ignore type indication error
                darkThemeConfig.Slider.fillColorHover =
                store.theme.primaryColorDark;
            // @ts-ignore type indication error
            darkThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorDark}`;
            locatedColor.value = store.dark ? store.theme.primaryColorDark : store.theme.primaryColorLight;
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
        if (store.theme.rainbowLine) {
            rainbowColor1.value = `rgba(${hexToRGB(store.theme.rainbowColor1)}, 0.6)`;
            rainbowColor2.value = `rgba(${hexToRGB(store.theme.rainbowColor2)}, 0.6)`;
            rainbowColor3.value = `rgba(${hexToRGB(store.theme.rainbowColor3)}, 0.6)`;
            rainbowColor4.value = `rgba(${hexToRGB(store.theme.rainbowColor4)}, 0.6)`;
            rainbowColor5.value = `rgba(${hexToRGB(store.theme.rainbowColor5)}, 0.6)`;
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

        style['--custom-font-size'] = store.theme.fontSize;
        style['--custom-font-family'] = store.theme.fontFamily;
        style['--custom-font-weight'] = store.theme.fontWeight;
        style['--custom-line-height'] = store.theme.lineHeight;
        style['--custom-line-gap'] = store.theme.lineGap;

        // Font color settings
        if (store.theme.customFontColor) {
            let h1Color = store.dark ? store.theme.h1ColorDark : store.theme.h1ColorLight;
            let h2Color = store.dark ? store.theme.h2ColorDark : store.theme.h2ColorLight;
            let h3Color = store.dark ? store.theme.h3ColorDark : store.theme.h3ColorLight;
            let h4Color = store.dark ? store.theme.h4ColorDark : store.theme.h4ColorLight;
            let h5Color = store.dark ? store.theme.h5ColorDark : store.theme.h5ColorLight;
            let h6Color = store.dark ? store.theme.h6ColorDark : store.theme.h6ColorLight;

            style['--h1-color'] = h1Color;
            style['--h2-color'] = h2Color;
            style['--h3-color'] = h3Color;
            style['--h4-color'] = h4Color;
            style['--h5-color'] = h5Color;
            style['--h6-color'] = h6Color;
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
    const el = document.body.createEl("div", {
        attr: { style: "width: 0px; height: 0px; background-color: var(--interactive-accent);" },
    });
    let color = getComputedStyle(el, null).getPropertyValue("background-color");
    el.remove();

    // for compatibility
    return cssColorToRgba(color);
}

function cssColorToRgba(color: string) {
  if (!CSS.supports('color', color)) return "rgba(0, 0, 0, 0)";

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  const [r, g, b, a255] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${a255 / 255})`;
}

function hexToRGB(hex: string) {
    return (
        `${parseInt(hex.slice(1, 3), 16)},` +
        `${parseInt(hex.slice(3, 5), 16)},` +
        `${parseInt(hex.slice(5, 7), 16)}`
    );
}
