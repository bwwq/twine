# Twine · Freebird 定制版

基于 [Twine](https://twinery.org) 二次开发，集成自研 **Freebird** 故事格式。面向开发者和 AI 协作场景，追求简洁、直觉、零学习成本。

## 与原版的区别

| | 原版 Twine + Harlowe | 本版 + Freebird |
|---|---|---|
| 代码风格 | 特殊宏语法 `(if:)` `(set:)` | 标准 JS + Python 双语言 + `print()` |
| 变量 | `$var` 全局唯一 | `g`/`l`/`p` 三级作用域 |
| HTML | 受限，需转义 | 原生直写，自动识别 |
| 编辑器工具栏 | 英文，功能有限 | 中文，31 个命令 |
| 项目管理 | 单文件 | 支持文件夹结构 + CLI 构建 |
| AI 友好 | 差 | 专门设计，附 AI 参考手册 |

## 快速开始

```bash
npm install
npm start          # 启动开发服务器 http://localhost:5173
```

1. 创建新故事
2. 故事详情 → 故事格式 → 选择 **Freebird 1.0.0**
3. 编辑 passage，享受中文工具栏

## Freebird 语法

### 文本
纯文本自动分段。含 `<div>` 等块级标签时切换为 HTML 直出模式。

### 变量显示
```
你有 $gold$ 个金币          全局变量
奖励: $l.bonus$             局部变量
任务: $p.quest$             传递变量
```

`$name$` 和 `#name#` 两种分隔符等价。

### 表达式
```
{{ g.gold + 100 }}
{{ g.name.toUpperCase() }}
```

### 代码块
```
{%
  if (g.gold > 50) {
    print("你很富有！");
  } else {
    print("继续努力。");
  }
%}
```

所有逻辑在 `{% %}` 内部完成，通过 `print()` 输出。默认 JavaScript，加 `py` 前缀切换 Python：

```
{% py:
if g["gold"] > 50:
    print("你很富有！")
else:
    print("继续努力。")
%}
```

> Python 由 [Skulpt](https://skulpt.org/) (~1.5MB) 驱动，按需加载，初始化 <100ms。纯 JS 故事不加载任何额外依赖。

### 链接
```
[[城堡大厅]]                          基本跳转
[[进入城堡->城堡大厅]]                  带显示文本
[[进入->城堡|{ gold: 50 }]]           带参数传递
```

### API（代码块内调用）
```javascript
Freebird.goto("目标")      // 跳转
Freebird.back()            // 返回
Freebird.save("slot1")     // 存档
Freebird.load("slot1")     // 读档
```

完整 API 见 [AI_REFERENCE.md](AI_REFERENCE.md)。

## 编辑器工具栏

12 个工具（含子菜单），全部中文标签，纯 SVG 矢量图标：

**加粗** · **斜体** · **删除线** · **标题** H1-H4 · **链接** 基本/箭头/带参 · **列表** 有序/无序 · **表格** · **图片** · **分隔线** · **变量** 显示/设置/表达式 · **代码** 代码块/条件/循环/print/goto/save · **HTML** div/span/p/自定义

## 项目模式（AI Vibe）

支持文件夹组织场景，每个 passage 一个 `.md` 文件：

```
my-story/
├── freebird.json      # 总纲
├── global.js          # 全局脚本
├── global.css         # 全局样式
├── 开始.md
├── 城堡/
│   ├── 大厅.md
│   └── 地牢.md
└── dist/story.html    # 构建输出
```

### CLI 工具

```bash
# 位于 public/story-formats/freebird-1.0.0/freebird-cli.js

node freebird-cli.js build              # 文件夹 → 单文件 HTML
node freebird-cli.js unpack story.html  # 单文件 → 文件夹
node freebird-cli.js twee               # 导出 Twee 格式
```

## CSS 自定义

在 Story Stylesheet 中覆盖 CSS 变量：

```css
:root {
  --fb-bg: #000000;
  --fb-color: #ffffff;
  --fb-font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  --fb-font-size: 24px;
  --fb-line-height: 1.5;
  --fb-max-width: 800px;
  --fb-link-color: #4169E1;
  --fb-link-hover: #00bfff;
}
```

支持 `@import` Google Fonts、`@font-face` 自定义字体。

## AI 协作

**→ 详细参考手册：[AI_REFERENCE.md](AI_REFERENCE.md)**

AI 可以：
- 直接读写 `.md` 场景文件
- 通过 `freebird.json` 了解故事全貌
- 用 `freebird-cli.js build` 构建测试
- 无需理解 Twine 内部结构

## 文件结构

```
public/story-formats/freebird-1.0.0/
├── engine.html        # 运行时核心源码
├── format.js          # 构建产物（运行时 + 编辑器扩展，勿手动编辑）
├── build-format.js    # 将 engine.html 嵌入 format.js 的构建脚本
├── icon.svg           # 格式图标
└── freebird-cli.js    # CLI 工具

src/store/story-formats/defaults.ts   # 格式注册
vite.config.mts                       # 含 freebird-sync 自动同步插件
```

## 构建与开发

```bash
npm install            # 安装依赖
npm start              # 开发服务器（自动同步 engine.html → format.js）
npm run build          # 生产构建
npm test               # 运行测试
```

> 修改 `engine.html` 后，手动同步运行 `node public/story-formats/freebird-1.0.0/build-format.js`，
> 或启动 `npm start` 由 Vite 插件自动完成。

## 致谢

基于 [Twine](https://github.com/klembot/twinejs) by Chris Klimas 等。
内置故事格式：[Harlowe](https://foss.heptapod.net/games/harlowe/)、[Snowman](https://github.com/klembot/snowman)、[SugarCube](https://github.com/tmedwards/sugarcube-2)。