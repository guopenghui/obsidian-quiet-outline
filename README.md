# Obsidian Quiet Outline

An outline plugin makes headings easier to read.

[中文文档](https://github.com/guopenghui/obsidian-quiet-outline/blob/master/README-CN.md)

## Features
+ [No auto-expand when editing](#no-auto-expand-when-editing)
+ [Search support](#search-support)
+ [Markdown render support](#markdown-render-support)
+ [Auto expand and collapse](#auto-expand-and-collapse)
+ [Default level](#default-level)
+ [Level Switch Bar](#level-switch-bar)
+ [Drag and modify note](#drag-and-modify-note)
+ [Navigation in Canvas](#navigate-in-canvas)
+ [Navigation in Kanban](#navigate-in-kanban)
+ [Hover preview](#show-content-when-hovering-on-heading)
+ [Remember expand state](#remember-state)
+ [Vim-Like keymap](#vim-like-keymap)
+ [Some hotkeys](#hotkeys)

### No auto-expand when editing

Default Outline: 

![系统自带大纲](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/notquiet.gif)

Quiet Outline: 

![安静大纲](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/quiet.gif)


### Search support

![支持搜索](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/search.gif)

hide irrelevant results：
![隐藏结果](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/hide_irrelevant.gif)

use regex:
![正则搜索](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/regex_search.gif)


### Markdown render support

![渲染markdown](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/markdown.gif)

### Auto expand and collapse

![自动展开/折叠](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/auto_expand.gif)

### Level Switch Bar

![切换展开级别](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/switch.gif)


### Default level
![默认级别](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/default-level.gif)

You can customize the default level per note. See release note in [0.3.33](https://github.com/guopenghui/obsidian-quiet-outline/releases/tag/0.3.33) 

### Drag and modify note
![拖拽](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/drag.gif)


### Navigate in Canvas
![Canvas](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/nav_in_canvas.gif)

### Navigate in Kanban

### Show content when hovering on heading
![Popover](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/popover.gif)


### Remember State
Memorizing the expanded title state when switching between open notes

### Vim-Like keymap
https://github.com/user-attachments/assets/a321c9a8-af27-495f-8822-5824ee453af2

+ Focus heading tree:
    + `J` `K` (and ArrowUP ArrowDown) to move down/up
    + `H` `L` (and ArrowLeft ArrowRight) to collapse/expand 
    + `/` to focus search input area
    + `Z Z` to center the heading
    + `G G` to go to top
    + `Shift G` to go to bottom
    + `Space` to jump in note without to focus into it
    + `Enter` to jump and focus into note, clear search input 
    + `Escape` to focus back to note
+ Focus search area:
    + `Escape` to clear search input
    + `Enter` to focus heading tree

Also support to operate canvas:
https://github.com/user-attachments/assets/babf3d56-9d66-4cbd-9bb8-8a41269fc332

+ `J` `K` `H` `L` to move to next node
+ `I` to edit a file/text node
+ `Z Z` to zoom in a node
+ `Z A` to zoom out


### Hotkeys
+ Increase/Decrease level
+ Jump to prev/next heading
+ Copy all headings to clipboard(See in [0.3.32](https://github.com/guopenghui/obsidian-quiet-outline/releases/tag/0.3.32))

## Limitations

+ Due to the lazy-rendering strategy of built-in editor (Only text showed in the current window is rendered. If scrolling too fast, you will see some text is not ready to be rendered and  the editor stutters), sometimes you can't jump to the place you want by one click **in edit mode**，especially when the note is opened for the first time since you open obsidian app.    Outline core plugin has the same issue.  Solution: **Just click again**.

+ Cross-level is not supported, which means you can use `h1->h2->h3`，but not `h1->h3->h4`, while `h3` and `h4` will be treated as `h2` and `h3`. 

+ Some extented grammars in obsidian are not supported by default. But we can extend the markdown-parser to fix it! If you believe any grammar is frequently used and should be implemented, create an issue to discuss about it.


## Usage

Open command panel and input `Quiet Outline` ，then press `Enter` . 

For markdown-rendering, open `Markdown Render` option in setting panel.



## Install

**Download from github**
   + Download the latest release. 
   + Extract and put the three files (`main.js`, `style.css`, `manifest.json`) to folder `{{obsidian_vault}}/.obsidian/plugins/obsidian-quiet-outline`.

**Install from Plugin Store**
+ Open Settings > Third-party plugin
+ Click Browse community plugins
+ Search for "Quiet Outline"
+ Click Install

## Buy me a coffee
If you enjoy this plugin, feel free to buy me a coffee.
<a href="https://www.buymeacoffee.com/thtree"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=thtree&button_colour=40DCA5&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00" /></a>
