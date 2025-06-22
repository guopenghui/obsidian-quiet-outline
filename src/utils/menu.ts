import { Menu } from "obsidian";

export type MenuItemConfig =
    | {
          title: string;
          type: "normal";
          fn: () => void;
      }
    | {
          title: string;
          type: "parent";
          subMenu: MenuItemConfig[];
      }
    | {
          type: "separator";
      };

export function setupMenu(menu: Menu, menuConfig: MenuItemConfig[]) {
    function addItem(parent: Menu, itemConfig: MenuItemConfig) {
        switch (itemConfig.type) {
            case "normal":
                parent.addItem((item) =>
                    item.setTitle(itemConfig.title).onClick(itemConfig.fn),
                );
                break;
            case "parent":
                parent.addItem((item) => {
                    item.setTitle(itemConfig.title);
                    const subMenu = item.setSubmenu().setNoIcon();
                    setupMenu(subMenu, itemConfig.subMenu);
                });
                break;
            case "separator":
                parent.addSeparator();
                break;
        }
    }

    menuConfig.forEach((itemConfig) => {
        addItem(menu, itemConfig);
    });
}

export function normal(title: string, fn: () => void): MenuItemConfig {
    return {
        type: "normal",
        title,
        fn,
    };
}

export function parent(
    title: string,
    subMenu: MenuItemConfig[],
): MenuItemConfig {
    return {
        type: "parent",
        title,
        subMenu,
    };
}

export function separator(): MenuItemConfig {
    return {
        type: "separator",
    };
}
