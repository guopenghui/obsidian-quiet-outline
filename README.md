# Obsidian Quiet Outline

An outline plugin makes headings easier to read.

## Features

### No auto-expand when editing

Default Outline: 

![系统自带大纲](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/notquiet.gif)

Quiet Outline: 

![安静大纲](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/quiet.gif)


### Search support

![支持搜索](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/search.gif)


### Markdown render support

![渲染markdown](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/markdown.gif)


### Level Switch Bar

![切换展开级别](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/switch.gif)


### Default level
![默认级别](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/default-level.gif)


### Toggle light/dark mode

![切换模式](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/theme.gif)



## Problems Now

+ [x] ~~Only support jumping in edit mode (no in preview mode).~~



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