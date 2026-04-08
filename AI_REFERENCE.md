# Freebird 故事格式 — AI 参考手册

> 本文档是给 AI（如 Claude、GPT、Gemini 等）的结构化参考，用于理解和编写 Freebird 故事格式的内容。

## 核心概念

Freebird 是一个轻量级互动叙事格式，运行在浏览器中。故事由多个 **passage（场景）** 组成，玩家通过点击链接在场景间跳转。每个 passage 的内容就是 HTML + Freebird 模板语法。

## 语法速查

### 文本

- 纯文本自动按空行分段（包裹 `<p>`）
- 包含块级 HTML 标签（`div`、`table`、`section` 等）时，**不做自动分段**，完全按原始 HTML 处理
- 可在同一个故事中混用两种模式

### 变量

三种作用域：

| 前缀 | 作用域 | 生命周期 | 用法示例 |
|------|--------|---------|---------|
| 无前缀 / `g.` | 全局 | 整个游戏 | `$gold$` 或 `$g.gold$` |
| `l.` | 局部 | 当前 passage | `$l.bonus$` |
| `p.` | 传递 | 由上一个 passage 传入 | `$p.quest$` |

两种分隔符等价：`$gold$` = `#gold#`

### 表达式输出

支持默认的 JS 表达式，以及通过前缀 `py ` 声明的 Python 表达式：

```
{{ g.gold + 100 }}
{{ g.name.toUpperCase() }}
{{ py g["gold"] + 100 }}
{{ py g["name"].upper() }}
```

### 代码块

代码块是 **自包含** 的。用 `print()` 输出内容到页面。

分为默认的 **JavaScript** 块，和带有 `py ` 前缀的 **Python** 块两种。
两种语言环境内均可直接访问 `g` (全局), `l` (局部), `p` (传递) 变量以及调用 `print` 方法。

**JavaScript 示例:**
```javascript
{%
  if (g.gold > 50) {
    print("你很富有！");
    print('<strong>买装备吧</strong>');
  } else {
    print("你需要更多金币。");
  }
%}

{%
  for (var item of g.inventory) {
    print("<li>" + item.name + " x" + item.count + "</li>");
  }
%}
```
赋值：
```javascript
{% g.gold = 100 %}
{% l.temp = g.gold * 2 %}
```

**Python 示例 (Skulpt 支持):**
> 运行时：[Skulpt](https://skulpt.org/) (~1.5MB)，按需加载，初始化 <100ms。
> `g`、`l`、`p` 在 Python 中作为普通 dict 可读可写，修改会自动同步回 JS 引擎。
```python
{% py:
if g["gold"] > 50:
    print("你很富有！")
    print('<strong>买装备吧</strong>')
else:
    print("你需要更多金币。")
%}

{% py: g["gold"] = 100 %}
```

> [!NOTE]
> Skulpt 支持大部分 Python 3 语法（if/for/while/def/class/列表推导等），但不支持 `import json`、`import numpy` 等第三方库。内置模块 `math`、`random`、`string` 等可正常使用。

### 场景跳转

```
[[城堡大厅]]                          基本链接
[[进入城堡->城堡大厅]]                  显示文本 → 目标
[[城堡大厅<-进入城堡]]                  目标 ← 显示文本
[[进入->城堡大厅|{ quest: "rescue" }]]  带参数跳转（传入 p 变量）
```

### API

在代码块中可调用：

```javascript
Freebird.goto("场景名")              // 跳转
Freebird.goto("场景名", { k: v })    // 带参跳转
Freebird.back()                      // 返回上一场景
Freebird.restart()                   // 重新开始
Freebird.save("slot1")               // 存档
Freebird.load("slot1")               // 读档
Freebird.listSaves()                 // 列出存档
Freebird.deleteSave("slot1")         // 删除存档
Freebird.visited("场景名")            // 是否去过
Freebird.visitCount("场景名")         // 去过几次
Freebird.passage                     // 当前场景名
Freebird.passageList                 // 所有场景名数组
```

### CSS 自定义

在 Story Stylesheet 中覆盖：

```css
:root {
  --fb-bg: #1a1a2e;                  /* 背景色 */
  --fb-color: #eee;                  /* 文字色 */
  --fb-font-family: 'LXGW WenKai';  /* 字体 */
  --fb-font-size: 18px;              /* 字号 */
  --fb-line-height: 1.8;             /* 行高 */
  --fb-max-width: 700px;             /* 最大宽度 */
  --fb-link-color: #4e7fff;          /* 链接色 */
  --fb-padding: 2rem;                /* 内边距 */
}
```

---

## 项目模式（文件夹结构）

Freebird 支持将故事拆成文件夹结构，方便 AI 读写单个场景文件。

### 结构

```
my-story/
├── freebird.json        # 总纲
├── global.js            # 全局 JavaScript
├── global.css           # 全局 CSS
├── 开始.md              # 起始场景
├── 城堡/
│   ├── 大厅.md
│   └── 地牢.md
├── 森林/
│   └── 入口.md
└── dist/
    └── story.html       # 构建输出
```

### freebird.json

```json
{
  "name": "故事名称",
  "ifid": "UUID",
  "start": "开始",
  "format": "Freebird",
  "formatVersion": "1.0.0",
  "globals": {
    "playerName": "勇者",
    "gold": 0,
    "hp": 100
  },
  "tags": {}
}
```

### passage 文件（.md）

```markdown
---
tags: [城堡, 重要]
---
你站在城堡大厅的中央。

{%
  if (!g.castleVisited) {
    g.castleVisited = true;
    print("<em>第一次来到这里。</em>");
  }
%}

[[探索地牢->城堡/地牢]]
[[离开->森林/入口]]
```

规则：
- 文件名 = passage 名称（不含 `.md`）
- 文件夹路径 = 名称前缀（`城堡/大厅.md` → passage 名 `城堡/大厅`）
- 可选 YAML frontmatter 定义 tags

### CLI 命令

```bash
node freebird-cli.js build [目录]           # 文件夹 → 单文件 HTML
node freebird-cli.js unpack <HTML> [输出]    # 单文件 → 文件夹
node freebird-cli.js twee [目录]             # 导出 Twee 格式
```

---

## AI 工作流建议

1. **读取** `freebird.json` 了解故事结构和全局变量
2. **浏览** 文件夹列出所有场景
3. **编辑** 单个 `.md` 文件修改场景内容
4. **新建** 在对应文件夹创建 `.md` 文件添加新场景
5. **构建** `node freebird-cli.js build` 打包测试
6. **不要** 修改 `format.js`，它是运行时引擎

### 编写场景时的注意事项

- 每个场景都应该有至少一个 `[[链接]]` 指向其他场景（否则玩家会卡住）
- 全局变量 `g` 在场景间持久保存，用于追踪游戏状态
- 局部变量 `l` 每次进入场景时重置
- 传递变量 `p` 通过 `[[链接->目标|{ key: val }]]` 语法传入
- `print()` 的输出是 HTML，可以包含标签
- 代码块中可以用任何合法的 JavaScript
- Python 代码块中 `g`/`l`/`p` 是 Python dict，修改后自动回写到引擎
- Python 环境仅在故事包含 `py:` 或 `py ` 前缀的代码块时才会加载，纯 JS 故事零开销

### 构建与开发

- `engine.html` 是运行时核心，修改后需执行 `node build-format.js` 同步到 `format.js`
- 开发模式下 Vite 的 `freebird-sync` 插件会在 `npm run start` 时自动执行同步
- **不要手动编辑 `format.js`**，它由 `build-format.js` 自动生成
