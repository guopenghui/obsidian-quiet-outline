# Obsidian Quiet Outline

一个让大纲更好用的插件

## Features
+ [编辑文档时，标题不再自动展开](#在编辑的时候标题不再自动展开)
+ [支持搜索](#支持搜索)
+ [支持渲染丰富的markdown元素](#支持渲染丰富的markdown元素)
+ [随着页面滚动，自动展开和折叠标题](#随着页面滚动自动展开和折叠标题)
+ [批量修改标题的展开层级](#批量修改标题的展开层级)
+ [默认层级，即打开每个笔记时标题展开到几级](#默认层级即打开每个笔记时标题展开到几级)
+ [拖拽标题调整文档结构](#拖拽标题调整文档结构)
+ [在 Canvas 中导航](#在-canvas-中导航)
+ [在 Kanban 中导航](#在-kanban-中导航)
+ [鼠标悬浮显示预览窗口](#鼠标悬浮显示预览窗口)
+ [记忆展开状态](#记忆展开状态)
+ [Vim-Like 键盘操作](#vim-like-键盘操作)
+ [一些快捷键](#一些快捷键)


### 在编辑的时候，标题不再自动展开

核心大纲插件: 

![系统自带大纲](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/notquiet.gif)

Quiet Outline: 

![安静大纲](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/quiet.gif)


### 支持搜索

![支持搜索](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/search.gif)

隐藏无关结果：
![隐藏结果](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/hide_irrelevant.gif)

使用正则表达式来过滤:
![正则搜索](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/regex_search.gif)

支持穿透Markdown/HTML语法来搜索内容：
![支持搜索](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/cross_syntax.png)

### 支持渲染丰富的markdown元素

![渲染markdown](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/markdown.gif)

### 随着页面滚动，自动展开和折叠标题

![自动展开/折叠](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/auto_expand.gif)

### 批量修改标题的展开层级

![切换展开级别](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/switch.gif)


### 默认层级，即打开每个笔记时标题展开到几级
![默认级别](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/default-level.gif)

你可以给每一篇笔记单独指定默认展开层级，见发布信息: [0.3.33](https://github.com/guopenghui/obsidian-quiet-outline/releases/tag/0.3.33) 

### 拖拽标题调整文档结构 
![拖拽](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/drag.gif)


### 在 Canvas 中导航
![Canvas](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/nav_in_canvas.gif)

### 在 Kanban 中导航

### 鼠标悬浮显示预览窗口
![Popover](https://raw.githubusercontent.com/guopenghui/obsidian-quiet-outline/master/public/popover.gif)


### 记忆展开状态
在切换已打开的笔记时，展开状态会被记录和恢复

### Vim-Like 键盘操作
https://github.com/user-attachments/assets/a321c9a8-af27-495f-8822-5824ee453af2

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
    
同时也支持操作 Canvas

https://github.com/user-attachments/assets/babf3d56-9d66-4cbd-9bb8-8a41269fc332

+ `J` `K` `H` `L` 来移动到下一个节点
+ `I` 来编辑一个 file/text 节点
+ `Z Z` 来放大一个节点
+ `Z A` 来缩小

### 一些快捷键
+ 提高/降低展开层级
+ 跳转到上一个/下一个标题
+ 复制所有标题到剪贴板(见[0.3.32](https://github.com/guopenghui/obsidian-quiet-outline/releases/tag/0.3.32))

## 局限
+ 由于内置编辑器的懒加载策略(只加载你当前在窗口中能看到的东西。如果你滚动地太快，可以看见有些文本来不及被渲染成相应的元素，如公式、表格、图片)，有时只点一下没办法跳转到你想要的位置，尤其是第一次打开这个笔记的时候。 Obsidian内置的核心大纲插件也存在这个问题。  解决方法很简单：**再点一次**。

+ 不支持跨层级的标题，比如你可以按`h1->h2->h3`来组织标题，但是不允许`h1->h3->h4`，在这种情况下`h3`和`h4`会被按`h2`和`h3`来处理。

+ 一些obsidian自己拓展的markdown语法可能是不被支持的(因此大纲中有些标题可能无法渲染成想要的样子)。但是这些都可以通过添加解析器来拓展，如果你觉得某个不被支持的语法很常用很重要，那就提一个issue，我们来讨论要不要实现它。



## 使用

打开命令面板输入`Quiet Outline`，然后回车，就可以打开大纲面板。

其他详细功能在设置中查看




## 安装

**从obsidian的插件商店安装**(推荐)

**从github下载**
   + 下载最新的 release. 
   + 把 (`main.js`, `style.css`, `manifest.json`) 移动到文件夹 `{{obsidian_vault}}/.obsidian/plugins/obsidian-quiet-outline`.


## Buy me a coffee
If you enjoy this plugin, feel free to buy me a coffee.
<a href="https://www.buymeacoffee.com/thtree"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=thtree&button_colour=40DCA5&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00" /></a>
