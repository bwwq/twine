var _svg = function(d, c) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="' + c + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'
  );
};
var _B = 'M4 2h5a3 3 0 0 1 0 6H4zm0 6h6a3 3 0 0 1 0 6H4z';
var _I = 'M6 2h4M6 14h4M10 2L6 14';
var _S = 'M5 3c-1 0-3 1-2 3s3 2 5 2s4 1 3 3s-2 3-4 2"/><line x1="2" y1="8" x2="14" y2="8';
var _H = 'M3 2v12M13 2v12M3 8h10';
var _LK = 'M7 4H4a2 2 0 0 0 0 4h2M9 4h3a2 2 0 0 1 0 4h-2M5 8h6';
var _LI = 'M6 3h8M6 8h6M6 13h8"/><circle cx="3" cy="3" r="1" fill="#xxx"/><circle cx="3" cy="8" r="1" fill="#xxx"/><circle cx="3" cy="13" r="1" fill="#xxx';
var _TB = '<rect x="1" y="3" width="14" height="10" rx="1"/><path d="M1 7h14M6 7v6M11 7v6';
var _IM = '<rect x="1" y="3" width="14" height="10" rx="2"/><circle cx="5" cy="7" r="1.5"/><path d="M1 11l4-3 3 2 3-2 3 3';
var _HR = 'M2 8h12';
var _VA = 'M2 3l3 10M7 3L4 13"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="8" x2="12" y2="13';
var _CD = 'M5 4L2 8l3 4M11 4l3 4-3 4M9 2L7 14';
var _HT = 'M3 2h10M8 2v12M5 14h6';

this.editorExtensions = {
  twine: {
    "^2.4.0": {
      codeMirror: {
        mode: function() {
          return {
            startState: function() { return { ic: false, ie: false, il: false } },
            token: function(s, st) {
              if (st.ic) { if (s.match("%}")) { st.ic = false; return "meta" } s.next(); return "meta" }
              if (st.ie) { if (s.match("}}")) { st.ie = false; return "variable" } s.next(); return "variable" }
              if (st.il) { if (s.match("]]")) { st.il = false; return "link" } s.next(); return "link" }
              if (s.match("{%")) { st.ic = true; return "meta" }
              if (s.match("{{")) { st.ie = true; return "variable" }
              if (s.match("[[")) { st.il = true; return "link" }
              if (s.match(/\$[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?\$/)) { return "variable-2" }
              if (s.match(/#[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?#/)) { return "variable-2" }
              if (s.match(/<\/?[a-zA-Z][a-zA-Z0-9]*/)) { s.match(/[^>]*/); s.match(">"); return "tag" }
              s.next(); return null
            }
          }
        },
        commands: {
          fbBold: function(e) { var s = e.getSelection() || "文本"; e.replaceSelection("<strong>" + s + "</strong>") },
          fbItalic: function(e) { var s = e.getSelection() || "文本"; e.replaceSelection("<em>" + s + "</em>") },
          fbStrike: function(e) { var s = e.getSelection() || "文本"; e.replaceSelection("<del>" + s + "</del>") },
          fbH1: function(e) { e.replaceSelection("<h1>" + (e.getSelection() || "标题") + "</h1>") },
          fbH2: function(e) { e.replaceSelection("<h2>" + (e.getSelection() || "标题") + "</h2>") },
          fbH3: function(e) { e.replaceSelection("<h3>" + (e.getSelection() || "标题") + "</h3>") },
          fbH4: function(e) { e.replaceSelection("<h4>" + (e.getSelection() || "标题") + "</h4>") },
          fbLinkBasic: function(e) { var s = e.getSelection(); e.replaceSelection(s ? "[[" + s + "]]" : "[[场景名]]") },
          fbLinkArrow: function(e) { var s = e.getSelection() || "显示文本"; e.replaceSelection("[[" + s + "->目标场景]]") },
          fbLinkVars: function(e) { var s = e.getSelection() || "显示文本"; e.replaceSelection("[[" + s + "->目标|{ key: value }]]") },
          fbUL: function(e) { var s = e.getSelection(); if (s) { var t = s.split("\n").map(function(l) { return "  <li>" + l.trim() + "</li>" }).join("\n"); e.replaceSelection("<ul>\n" + t + "\n</ul>") } else { e.replaceSelection("<ul>\n  <li>项目</li>\n  <li>项目</li>\n</ul>") } },
          fbOL: function(e) { var s = e.getSelection(); if (s) { var t = s.split("\n").map(function(l) { return "  <li>" + l.trim() + "</li>" }).join("\n"); e.replaceSelection("<ol>\n" + t + "\n</ol>") } else { e.replaceSelection("<ol>\n  <li>项目</li>\n  <li>项目</li>\n</ol>") } },
          fbTable: function(e) { e.replaceSelection("<table>\n  <tr><th>列1</th><th>列2</th></tr>\n  <tr><td>数据</td><td>数据</td></tr>\n</table>") },
          fbImg: function(e) { e.replaceSelection('<img src="地址" alt="描述">') },
          fbHR: function(e) { e.replaceSelection("\n<hr>\n") },
          fbVarShowG: function(e) { var s = e.getSelection() || "变量名"; e.replaceSelection("$" + s + "$") },
          fbVarShowL: function(e) { var s = e.getSelection() || "变量名"; e.replaceSelection("$l." + s + "$") },
          fbVarShowP: function(e) { var s = e.getSelection() || "变量名"; e.replaceSelection("$p." + s + "$") },
          fbVarSetG: function(e) { var s = e.getSelection() || "变量名"; e.replaceSelection("{% g." + s + " = 值 %}") },
          fbVarSetL: function(e) { var s = e.getSelection() || "变量名"; e.replaceSelection("{% l." + s + " = 值 %}") },
          fbExpr: function(e) { var s = e.getSelection() || "g.变量"; e.replaceSelection("{{ " + s + " }}") },
          fbCondition: function(e) { e.replaceSelection("{% \n  if (g.条件) {\n    print(\"内容\");\n  } else {\n    print(\"其他\");\n  }\n%}") },
          fbLoop: function(e) { e.replaceSelection("{% \n  for (var item of g.列表) {\n    print(\"<li>\" + item + \"</li>\");\n  }\n%}") },
          fbCodeBlock: function(e) { var s = e.getSelection(); if (s) { e.replaceSelection("{% \n" + s + "\n%}") } else { e.replaceSelection("{% \n  // JavaScript\n%}") } },
          fbPrint: function(e) { var s = e.getSelection(); e.replaceSelection(s ? '{% print("' + s + '") %}' : '{% print("内容") %}') },
          fbGoto: function(e) { e.replaceSelection('{% Freebird.goto("场景名") %}') },
          fbSave: function(e) { e.replaceSelection('{% Freebird.save("slot1") %}') },
          fbDiv: function(e) { var s = e.getSelection() || "内容"; e.replaceSelection("<div>\n  " + s + "\n</div>") },
          fbSpan: function(e) { var s = e.getSelection() || "内容"; e.replaceSelection("<span>" + s + "</span>") },
          fbP: function(e) { var s = e.getSelection() || "内容"; e.replaceSelection("<p>" + s + "</p>") },
          fbCustomTag: function(e) { var s = e.getSelection() || "内容"; e.replaceSelection("<标签>" + s + "</标签>") }
        },
        toolbar: function(editor, env) {
          var c = (env && env.appTheme === 'dark') ? '#eee' : ((env && env.foregroundColor) ? env.foregroundColor : '#333');
          var b = _svg(_B, c);
          var i = _svg(_I, c);
          var s = _svg(_S, c);
          var h = _svg(_H, c);
          var lk = _svg(_LK, '#6ea8fe');
          var li = _svg(_LI.replace(/#xxx/g, c), c);
          var tb = _svg(_TB, c);
          var im = _svg(_IM, c);
          var hr = _svg(_HR, c);
          var va = _svg(_VA, '#c084fc');
          var cd = _svg(_CD, '#fb923c');
          var ht = _svg(_HT, c);

          return [
            { type: "menu", icon: b, label: "样式", iconOnly: true, items: [{ type: "button", command: "fbBold", label: "加粗" }, { type: "button", command: "fbItalic", label: "斜体" }, { type: "button", command: "fbStrike", label: "删除线" }, { type: "separator" }, { type: "button", command: "fbHR", label: "分隔线" }] },
            { type: "menu", icon: h, label: "标题", iconOnly: true, items: [{ type: "button", command: "fbH1", label: "H1 一级标题" }, { type: "button", command: "fbH2", label: "H2 二级标题" }, { type: "button", command: "fbH3", label: "H3 三级标题" }, { type: "button", command: "fbH4", label: "H4 四级标题" }] },
            { type: "menu", icon: lk, label: "链接", iconOnly: true, items: [{ type: "button", command: "fbLinkBasic", label: "基本链接 [[名]]" }, { type: "button", command: "fbLinkArrow", label: "箭头 [[文->目标]]" }, { type: "button", command: "fbLinkVars", label: "带参 [[...|{vars}]]" }] },
            { type: "menu", icon: tb, label: "元素", iconOnly: true, items: [{ type: "button", command: "fbUL", label: "无序列表 <ul>" }, { type: "button", command: "fbOL", label: "有序列表 <ol>" }, { type: "separator" }, { type: "button", command: "fbTable", label: "插入表格" }, { type: "button", command: "fbImg", label: "插入图片" }] },
            { type: "menu", icon: va, label: "变量", iconOnly: true, items: [{ type: "button", command: "fbVarShowG", label: "显示全局 $name$" }, { type: "button", command: "fbVarShowL", label: "显示局部 $l.name$" }, { type: "button", command: "fbVarShowP", label: "显示传递 $p.name$" }, { type: "separator" }, { type: "button", command: "fbVarSetG", label: "设置全局变量" }, { type: "button", command: "fbVarSetL", label: "设置局部变量" }, { type: "separator" }, { type: "button", command: "fbExpr", label: "表达式 {{ }}" }] },
            { type: "menu", icon: cd, label: "代码", iconOnly: true, items: [{ type: "button", command: "fbCodeBlock", label: "JS 代码块 {% %}" }, { type: "button", command: "fbCondition", label: "条件 if/else" }, { type: "button", command: "fbLoop", label: "循环 for" }, { type: "button", command: "fbPrint", label: "输出 print()" }, { type: "separator" }, { type: "button", command: "fbGoto", label: "跳转 goto()" }, { type: "button", command: "fbSave", label: "存档 save()" }] },
            { type: "menu", icon: ht, label: "HTML", iconOnly: true, items: [{ type: "button", command: "fbDiv", label: "容器 <div>" }, { type: "button", command: "fbSpan", label: "行内 <span>" }, { type: "button", command: "fbP", label: "段落 <p>" }, { type: "separator" }, { type: "button", command: "fbCustomTag", label: "自定义标签" }] }
          ];
        }
      },
      references: {
        parsePassageText: function(text) {
          var links = [];
          var re = /\[\[(.*?)\]\]/g;
          var m;
          while ((m = re.exec(text)) !== null) {
            var c = m[1];
            var pi = c.lastIndexOf("|");
            if (pi > -1) {
              var ap = c.substring(pi + 1).trim();
              if (ap.charAt(0) === "{") c = c.substring(0, pi).trim()
            }
            var ai = c.indexOf("->");
            if (ai > -1) { links.push(c.substring(ai + 2).trim()) } else {
              ai = c.indexOf("<-");
              if (ai > -1) { links.push(c.substring(0, ai).trim()) } else { links.push(c.trim()) }
            }
          }
          return links
        }
      }
    }
  }
};
