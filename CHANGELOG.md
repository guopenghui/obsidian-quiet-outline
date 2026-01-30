# Changelog

> This file is auto-generated from GitHub Releases. Do not edit by hand.

## 0.5.9 - 2026-01-20

### Fix
+ collapse button not align with indent line.
+ wrong located index in hierarchically discontinuous headings (#278 )
+ button style on mobile

---

### 修复
+ 折叠按钮与缩进线未对齐。
+ 在标题层级不连续时，当前标题的索引位置错误（#278）
+ 移动设备上的按钮样式

## 0.5.8 - 2026-01-12

Switched the build tool to vite.
### Feature
+ option to customize heading color per theme (light/dark mode) #276

---
将构建工具转换到了 vite 
### 功能
+ 增加了可按主题（明亮/暗黑模式）自定义标题颜色的选项 #276

## 0.5.7 - 2026-01-06

### Fix
+ `file` field of `MarkdownView` is null when loading a workspace
+ improve `getDefaultColor` logic to deal with CSS color values not supported by ui library (like oklch). 
+ error with loading and saving `markdown-states.json` file

---

### 修复
- 修复加载工作区时 `MarkdownView` 的 `file` 字段为空的问题
- 优化 `getDefaultColor` 逻辑，以兼容 UI 库不支持的 CSS 颜色值 (如 oklch）
- 修复 `markdown-states.json` 文件加载和保存时出现的错误

## 0.5.6 - 2025-12-30

fix: renaming heading failed (#270)

---

修复：重命名标题失败 （#270）

## 0.5.5 - 2025-12-29

+ feat: Add heading level change option in context menu (#251)
+ fix: Located heading gets invisible (#269)

---

+ 新功能：在右键菜单中添加标题级别更改选项（#251）
+ 修复：某些主题下当前所在的标题变得不可见（#269）

## 0.5.4 - 2025-12-26

### Feat
+ Support deleting markdown headings with context menu #153
+ Add Canvas settings tab with node type filters #252
+ Add heading truncate length setting in canvas headings #252

---
### 功能
+ 支持通过右键菜单在面板中直接删除markdown标题 #153
+ 增加了设置项，从而选择在面板中展示的 canvas 节点种类 #252
+ 增加设置项，控制canvas节点标题的截断长度 #252

## 0.5.3 - 2025-12-07

feat: Added canvas outline sorting options and translation. Thanks for @YouYunyinqv

---

新增功能：添加了canvas 大纲按名字排序选项及翻译。感谢 @YouYunyinqv

## 0.5.2 - 2025-11-28

### Fix
+ fix: Heading expansion state is reset to empty when panel setup #259
+ fix: Cursor always jumps back to the first line #258

---

### 修复
+ 在新打开大纲面板时，当前笔记的标题展开状态会被覆盖为空
+ 从阅读模式回到预览模式时，光标位置被错误设置到开头

## 0.5.1 - 2025-11-23

feat: add menu item to collapse sibling headings and descendant headings (#209 #256)

<img width="345" height="358" alt="image" src="https://github.com/user-attachments/assets/a0168586-3ff1-4dfa-a535-0223be2e1a29" />

---

功能：增加右键菜单选项，折叠/展开 同级标题，以及递归展开/折叠 标题和其子标题

## 0.5.0 - 2025-11-20

### Feature
+ support persist/restore markdown cursor/scroll position, and heading (data is stored inside plugin folder) #117 #155
+ auto update links of a heading in other files when this heading is changed #28

### Fix
+ web link are not highlighted #244
+ link tab doesn't stay linked #144

### Note
**Persist Markdown** is enabled by default, which means you can get `remember cursor/scroll position` function when quiet-outline is enabled.
If this feature is not needed, it can be turned off in the settings panel.

---

### 功能更新
+ 支持持久化 Markdown 光标/滚动位置（数据保存在插件目录下的文件中，因此即使重启 obsidian 仍然可以恢复位置） #117 #155
+ 当标题内容被修改时（通过菜单选项），自动更新其他文件中指向该标题的链接 #28 

### 修复
+ 修复了网页链接无法高亮显示的问题 #244
+ 修复了链接标签页无法保持关联状态的问题 #144

持久化 Markdown 功能是默认启用的——也就是说只需要打开 quiet-outline，就会自动获得「记忆光标/滚动位置」的功能。
如果不需要该功能，可以在设置面板中关闭。

## 0.4.5 - 2025-11-18

### Features
+ Add styles setting options #228 #253
+ Support rename heading via contenxt menu #28 #56

---
+ 添加了样式相关的设置项 #228 #253
+ 支持通过右键菜单来直接修改标题 #28 #56

<img width="870" height="748" alt="image" src="https://github.com/user-attachments/assets/253a4e9a-85e3-4f17-8d9c-47c31d9b61ac" />
<img width="338" height="221" alt="image" src="https://github.com/user-attachments/assets/17f380ac-38fd-4b0f-baad-9edac48ee5e9" />

## 0.4.4 - 2025-11-14

fix: focus editor when click heading https://github.com/guopenghui/obsidian-quiet-outline/issues/250

## 0.4.3 - 2025-09-03

### Fix
+ "auto scroll heading into view" not work #245 

### Performance
+ impove heading seach performance

## 0.4.2 - 2025-08-14

+ Style: remove pending color on heading in outline panel.
+ Fix: new created canvas text node doesn't show in outline panel.
+ Feat: Potimize search logic to search content cross markdown/html syntax.
+ Fix: Panel becomes empty after switching to core outline/back-links panel (FileViews)

---

+ 去除了  pending 状态的节点背景色
+ 修复了新创建了 canvas 文本节点不会显示在面板的问题
+ 功能：优化了搜索逻辑，现在可以跨越 markdown/html 语法来搜索内容
+ 修复了从核心大纲/反向链接面板切换回来时，面板变为空的问题

![](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/cross_syntax.png)

## 0.4.1 - 2025-07-06

+ Feat: support vim-like keymap in canvas
    + `J` `K` `H` `L` to move to next node
    + `I` to edit a file/text node
    + `Z Z` to zoom in a node
    + `Z A` to zoom out
+ Style: use built-in icons for canvas node
+ Fix: wrong content when switching canvas file

---

+ 在 Canvas 中增加类 vim 快捷键
    + `J` `K` `H` `L` 来移动到下一个节点
    + `I` 来编辑一个 file/text 节点
    + `Z Z` 来放大一个节点
    + `Z A` 来缩小
+ 将 canvas node 图标换成 obsidian 内置图标，与其一致
+ 修复切换 canvas 文件时，面板内容与实际不对应的问题

https://github.com/user-attachments/assets/babf3d56-9d66-4cbd-9bb8-8a41269fc332

## 0.4.0 - 2025-07-02

### Feat: Vim-Like keymap
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

---

#### Vim-Like 快捷键
+ 当聚焦于标题树时:
    + `J` `K` (以及下方向键、上方向键) 来上下移动
    + `H` `L` (以及左方向键、右方向键) 来折叠、展开标题 
    + `/` 来聚焦到搜索框
    + `Z Z` 使得当前选中标题居中
    + `G G` 跳转到最上面的标题
    + `Shift G` 跳转到最底部的标题
    + `Space` 控制笔记跳转，但不进入笔记 （因此可以连续进行跳转预览）
    + `Enter` 控制笔记跳转，并进入笔记，同时清空搜索框内容
    + `Escape` 退出面板，返回原先笔记
+ 当聚焦于搜索框时:
    + `Escape` 清除搜索框内容
    + `Enter` 聚焦到标题树

https://github.com/user-attachments/assets/a321c9a8-af27-495f-8822-5824ee453af2

## 0.3.49 - 2025-06-29

fix: switching problem indroduced in 0.3.48 #242

## 0.3.48 - 2025-06-27

Fix: clicking heading resets level-switcher state

---

修复点击标题时，层级控制器会重置的问题

## 0.3.47 - 2025-06-20

+ Fix can not fold heading after 0.3.46 #237

---

+ 修复0.3.46中导致的无法折叠标题的问题 #237

## 0.3.46 - 2025-06-17

+ Fix tooltip direction setting not work #236
+ Setting: make auto-scroll-into-heading an option now
+ Support context menu on heading to copy text

![image](https://github.com/user-attachments/assets/81d0167f-2c5a-4320-ab44-475e6a60582f)

---

+ 修复了在省略模式下，完整标题 tooltip 出现位置的设置项无效的问题 #236 
+ 将 “跟随页面自动滚动面板中的标题" 设置为可设置项。 从而在某些情况下可以关闭，减少干扰。
+ 支持了对标题的右键菜单，目前有的功能为复制标题、内容、子标题和同级标题。

## 0.3.45 - 2025-05-02

+ Add a setting to control rtl behavior. (#203)
+ Fix conflic with banner plugin when scrolling in preview mode. (#233)

## 0.3.44 - 2025-04-28

+ Add drag preview element. Now you can drag a heading into a note and make it an internal link.
  <img src="https://github.com/user-attachments/assets/cd7c4695-d987-4d71-af20-d80bd15445fb" width=600>
+ Fix conflict with homepage plugin (#229)
+ Fix problem with list-like format in heading (1. xxxx, + xxxx, - xxx and so on)
+ Setting: make keeping search input when switching between notes an option now.

## 0.3.43 - 2025-04-15

+ Fix drag and drop bug
+ Refactor code

## 0.3.42 - 2025-03-12

+ Fix footnote rendering error #219 
+ Fix ellipsis error #203

---

+ 修复脚注渲染错误 #219
+ 修复省略长标题时的样式问题 #203

## 0.3.41 - 2025-03-10

+ Improve "drag and drop". Now it supports moving heading into a leaf heading.
+ Remove `!` when there is `![[xxx]]` format in outline. #211 
+ Clear the outline window when note is closed #206 
+ Fix display error with dash+space in title #208

---

+ 改进了拖拽标题的功能，现在支持拖拽标题到叶标题（没有子标题的标题）中
+ 移除了渲染`![[xxx]]`时多余的 `!` 符号
+ 当笔记关闭时，清空大纲面板
+ 解决了标题以 `-` + ` ` 开头时的渲染错误

## 0.3.40 - 2025-01-16

### Fix
+ Highlight problem when writing a new line #205 
+ highlight heading location not right #204

## 0.3.39 - 2025-01-07

+ Remove footnote in heading (`^[xxx]`) #87 
+ Remove padding-bottom #191 
+ Support rtl language #203

## 0.3.38 - 2024-12-22

### New
+ Add hotkeys to jump to prev/next heading relative to current cursor position.

---

### 新增
+ 增加了快捷键命令，从而可以从当前光标位置跳转到 上一个/下一个 标题处，从而实现在标题间快速跳转。

## 0.3.37 - 2024-10-20

_No release notes._

## 0.3.36 - 2024-07-06

Fix #184

## 0.3.35 - 2024-06-26

### Fix
Problem described in #179 

**Reminders**
This improvement will take effect in the "next" update! (because in this update, plugin to be unloaded is the previous version(0.3.34), so improvement in 0.3.25 doesn't be included. in next update, changes in 0.3.35 will take effect.
And you need to reopen outline panel manually for once (use command "quiet outline")

### Fix
解决 #179 中描述的，更新插件时会把面板重置到右边的问题。

**注意**
这次更新的效果，要到**下次**更新时才会起效。 因为本次更新时，被卸载的版本是之前的 0.3.34，所以 0.3.35 里面的修改没有效果。
而且注意：这次更新后面板会被关闭，你需要手动打开它一次（用quiet outline这个命令）

## 0.3.34 - 2024-06-26

_No release notes._

## 0.3.33 - 2024-06-23

### Fix
+ multiple window problem #168

### New
+ support custom default level per file with `qo-default-level` front-matter

![recording](https://github.com/guopenghui/obsidian-quiet-outline/assets/13451866/3237b6fc-498d-4d33-a887-d1894045aa4e)

## 0.3.32 - 2024-06-15

### New Feature
Now you can use a template string to customize output text of your headings.

For template `{bullet} {num-nest[.]} [{title}]({path})`, you can get heading text like `- 1.2 [heading title](#heading%20title)`. So you can generate a TOC of your note.
![image](https://github.com/guopenghui/obsidian-quiet-outline/assets/13451866/48c96b59-afec-484e-932e-8097eb08ab18)

#### Usage steps:
1. Edit you template string in setting panel
2. Open a note
3. Run command "Copy Current Headings As Text"
4. Paste text from clipboard to your note.

#### Syntax
+ `title`: content of your heading, like `heading`
+ `path`: like `#heading`, used to generate link to this heading
+ `num`: like `1`、`2`
+ `num-nest[-]`: like `1-2-3`
+ `bullet`: just `-`, used to generate list

#### Limit
Obsidian will replace spaces in heading to `%20`, however, github replaces space to `-` instead. So maybe generated TOC can not be used directly.

eg. For `Heading Content`:
+ obsidian: `#Heading%20Content`
+ github: `#heading-content`

You can find discussions here:
+ [Obsidian using %20% instead of dashes for blank spaces](https://forum.obsidian.md/t/obsidian-using-20-instead-of-dashes-for-blank-spaces/52067/4)
+ [Heading link compatibility](https://forum.obsidian.md/t/heading-link-compatibility/46988)

### 新功能
现在你可以通过模板来自定义导出的标题格式
比如`{bullet} {num-nest[.]} [{title}]({path})`, 可以得到 `- 1.2 [heading title](#heading%20title)`. 所以可以通过这个来生成 TOC

#### 使用步骤
1. 在设置面板中编辑模板字符串
2. 打开一个笔记
3. 运行命令“Copy Current Headings As Text”
4. 内容被写到了剪贴板，手动粘贴到笔记中

#### 模板语法
+ `title`: 标题的内容 `heading`
+ `path`: 在内容前面加一个 `#`, 比如 `#heading`, 用来生成对标题的链接
+ `num`: 编号 `1`、`2`
+ `num-nest[-]`: 嵌套的编号 `1-2-3`
+ `bullet`: 仅仅是一个 `-`, 用来生成列表

#### 限制
Obsidian 会把标题中的空格替换成 `%20`，而 github 则是替换成 `-`。所以可能生成的TOC没办法直接在github之类的地方使用

比如对于标题 `Heading Content`
+ obsidian: `#Heading%20Content`
+ github: `#heading-content`

对于这个问题，论坛里面有讨论:
+ [Obsidian using %20% instead of dashes for blank spaces](https://forum.obsidian.md/t/obsidian-using-20-instead-of-dashes-for-blank-spaces/52067/4)
+ [Heading link compatibility](https://forum.obsidian.md/t/heading-link-compatibility/46988)

## 0.3.31 - 2024-05-25

### Fix 
+ heading locating not work in preview mode #174

## 0.3.30 - 2024-05-23

### Fix
+ current heading highlighting is more accurate #88 #152
+ auto srolling heading into view not work since last update #173

## 0.3.29 - 2024-05-18

### Fix
+ Clicking heading will highlight the right heading.
+ Fix conflict of scroll/cursor-based auto-expand.
+ Newly added heading will be expanded by default from now.
+ Expand states memorizing is no longer broken

## 0.3.28 - 2024-05-05

_No release notes._

## 0.3.27 - 2024-05-05

+ Add option to decide whether to collapse rest heaings when triggering auto expand. #172

## 0.3.26 - 2024-04-15

_No release notes._

## 0.3.25 - 2024-03-21

+ Support navigate in canvas view #161

![nav_in_canvas](https://github.com/guopenghui/obsidian-quiet-outline/assets/13451866/7680706c-58a9-48c6-87cc-a9db024cf9b0)

## 0.3.24 - 2024-02-12

Support for memorizing the expanded title state when switching between open notes.

![PixPin_2024-02-12_17-25-24](https://github.com/guopenghui/obsidian-quiet-outline/assets/13451866/86762377-2a73-4a94-87c0-34a8fac329e2)

## 0.3.23 - 2024-02-05

_No release notes._

## 0.3.22 - 2024-02-05

_No release notes._

## 0.3.21 - 2024-02-05

_No release notes._

## 0.3.20 - 2024-01-26

+ fix format like `\d)` rendered as ordered list in heading. #150 
+ support functional key customization of pop-over. #150

## 0.3.19 - 2023-12-21

+ support popover window to show note content when hovering on heading.

![PixPin_2023-12-21_18-40-54](https://github.com/guopenghui/obsidian-quiet-outline/assets/13451866/c5790ff1-3707-41b2-9bd1-29f140591be7)

## 0.3.18 - 2023-12-21

+ add setting to support "locate by cursor", while the highlighted heading is decided by your cursor position.
+ highlight father heading when you current located heading is under a collapsed father heading.

![PixPin_2023-12-21_12-38-02](https://github.com/guopenghui/obsidian-quiet-outline/assets/13451866/05b91623-a988-4229-8495-7fcb162f6afc)

## 0.3.17 - 2023-10-14

+ remove list rendering (like in `+ xxx`/`* xxx`/`- xxx`, `+/-/*` will be reserved) in heading #134 
+ fix auto-expand problem (conflict with outliner) #133 #128 
+ support navigating in kanban by clicking heading #130 
+ stop rendering content when in canvas #127

## 0.3.16 - 2023-09-27

### Fix

+ Hide block identifiers #131 
+ LaTeX not render after a certain obsidian update #122, #129

## 0.3.15 - 2023-02-19

+ add a to-bottom button
+ add color to current located heading https://github.com/guopenghui/obsidian-quiet-outline/issues/92 https://github.com/guopenghui/obsidian-quiet-outline/issues/97

---

+ fix issue with tag on head of line
+ fix #82 #83 
+ fix wrong regex cause outline crash #89

## 0.3.14 - 2022-12-21

Finally, this plugin has supported custom color settings.
这个插件终于支持了颜色设置

<img src="https://user-images.githubusercontent.com/13451866/208841263-21b3615e-eecb-4225-882a-3000ac80cddd.png" width=400>

Default color setting will follow `--interactive-accent`
默认颜色将跟随系统`--interactive-accent`配色

<img src="https://user-images.githubusercontent.com/13451866/208842122-71e5707a-6972-4016-aacf-64d84f9463de.png" width=400>

## 0.3.13 - 2022-12-14

+ add tooltip to show full heading content in ellipsis mode
![](https://user-images.githubusercontent.com/13451866/207550177-efa6a91a-8790-4831-b4e0-5af15899425c.png)

+ fix setting problem since `0.3.12`

## 0.3.12 - 2022-12-12

+ support drag heading to modify note

<img src="https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/drag.gif" width=600px>

## 0.3.11 - 2022-12-02

_No release notes._

## 0.3.10 - 2022-12-02

_No release notes._

## 0.3.9 - 2022-12-02

add zh-TW language support. Thanks to @emisjerry

## 0.3.8 - 2022-11-27

+ Emergency fix: Sometings rendering wrong headings when switching between notes.
---
+ 紧急修复：在切换笔记时，某些标题显示错误

## 0.3.7 - 2022-11-26

+ fix click problem in standalone window
+ adjust styles
+ show heading content when hovering,（when enable ellipsis option)

---

+ 在独立窗口中无法点击的问题得到解决
+ 调整部分样式
+ 当启用省略长标题功能时，鼠标悬停在标题上会显示完整的标题内容

## 0.3.6 - 2022-11-08

+ 解决了切换明暗模式时样式不自动更新的问题 #64 
+ 解决了首次打开时标题不展开到设置的默认层级的问题 #70 
+ 支持移动端 #53 
+ 支持tag的渲染（`#tag`） #68 
---
+ Solved problem in switching between light/dark mode #64 
+ Headings will expand to default level at the time you just open obsidian app #70 
+ Support mobile version #53 
+ Support rendering tags (`#tag`) #68 

---
![image](https://user-images.githubusercontent.com/13451866/200600633-bea00766-79a6-4dbc-9997-2b24fe54b283.png)

## 0.3.5 - 2022-11-04

+ 修复开启长标题省略后无法上下滚动的问题
---
+ fix problem with ellipsis mode

## 0.3.4 - 2022-11-04

+ 支持`==`高亮的渲染 #62 
+ 增加了隐藏长标题为省略号的选项 #66 
+ 改变了一些样式设置以适应不同的主题 #64 
---
+ Support `==` rendering #62 
+ Add setting to config to collapse long heading to ellipsis #66 
+ Change some style setting to fit different themes #64 
---
![image](https://user-images.githubusercontent.com/13451866/199881833-9d0541da-c06f-4bac-a88c-b466838e0a22.png)

![image](https://user-images.githubusercontent.com/13451866/199882138-0349e69b-afd7-4a0b-8441-20f45d921ddd.png)

![image](https://user-images.githubusercontent.com/13451866/199882186-05b718e8-d4d6-43ad-b3f0-60e4310302bc.png)

## 0.3.3 - 2022-10-14

+ 添加了"Focus on input" 命令，方便快速切换到标题搜索栏进行搜索 #44 
+ 添加了"Copy as plain text" 命令，将大纲导出到剪贴板 #57 
+ 修复了Default level失效的问题 #47 
+ 修复了`1.0.0`版本后reset按钮颜色问题 
+ 去除了笔记没有标题时的"no data"图片（用css去除） #48 

---

+ Add "Focus on input" command to easily switch to search area #44 
+ Add "Copy as plain text" command to export outline as text to clipboard #57 
+ Fix bug with Default level #47 
+ Fix reset button color problem after obsidian `1.0.0`
+ Remove "no data" sign when there is no heading in note #48

## 0.3.2 - 2022-07-15

+ Fix jumping problem after Obsidian `0.15.6`.
+ Functional bar is fixed on the top.
+ Support Chinese in setting panel.
+ Search area can be hided now.
+ Add a command `reset expanding level` to do the same as reset button. You can set a shortcut key on it.

+ 解决了0.15.6更新之后的跳转问题
+ 搜索栏会永远固定在顶部，不会随滚动而移动
+ 设置菜单支持了中文
+ 搜索栏现在可以在设置中隐藏
+ 添加了一个命令`reset expanding level`，功能和搜索栏旁边的重置按钮是一样的，不过这样你就能设置一个快捷键，从而用快捷键来重置标题层级了

---
### Problem:

+ **New `Pop-out window` feature after `0.15.6` is not stable on this plugin. Sometimes it behaves wierd. Future updates may fix this**.

+ **0.15.6中的新功能`多窗口`目前在这个插件上是不稳定的，有时行为会很古怪(比如拖新窗口后，原来的所有东西都不能点击，或者得等个几十秒后又能点了. )。也许在未来的某次更新中会解决这个问题**

## 0.3.1 - 2022-05-13

+ fix non-regex search bug in `0.3.0`.

## 0.3.0 - 2022-05-13

+ regex search support
+ show heading count, search result count
![image](https://user-images.githubusercontent.com/13451866/168219364-bdd1ca2d-b4f7-4ca8-be63-6305c24fb4ec.png) 
![image](https://user-images.githubusercontent.com/13451866/168219429-3699c6a9-3f6e-4b3a-b516-6c32178c3b86.png)

+ auto scroll heading with note
+ bug fix:
  + Error when change note with search text.

## 0.2.4 - 2022-05-07

+ add auto-expand and show-where-you-are
+ support hide irrelevant search results
+ add a clear button on search area：
![image](https://user-images.githubusercontent.com/13451866/167258402-4da97929-c6a6-44e4-b3a1-449d82a5f2c4.png)

## 0.2.3 - 2022-04-06

+ Fix bugs with `<` and `>` in markdown-rendering.
+ Other fixes.

## 0.2.2 - 2022-04-02

+ Highlight line after jumping to heading
+ Support `1. xxx` format in heading markdown-rendering

## 0.2.1 - 2022-03-31

+ Fix some unlogical behavior
+ Add `Default Level` setting option

## 0.2.0 - 2022-03-30

+ Add vertical line
+ Add level switch
+ Add `class=level-[1-6]` to headings of different level for customizing. eg. tree-node for h1 has class of `level-1`
+ Support alias in internal link. eg. `[[A complex path|simple]]` will be rendered as `simple`

## 0.1.2 - 2022-03-22

+ Improve performance
+ better security check

## 0.1.1 - 2022-03-19

+ Improve performance
+ Add security check

## 0.1.0 - 2022-03-18

+ preview mode jumping supported

## 0.0.1 - 2022-03-17

+ Basic functions in **Edit Mode**
+ Search support
+ Markdown rendering support

---

_Generated from releases in `guopenghui/obsidian-quiet-outline`._
