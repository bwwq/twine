// 重建 format.js：图标颜色改亮 + 所有按钮显示文字
var fs = require('fs');
var path = require('path');

var formatPath = path.join(__dirname, 'public/story-formats/freebird-1.0.0/format.js');
var content = fs.readFileSync(formatPath, 'utf8');

// 提取 source
var sourceStart = content.indexOf('"source": "') + 11;
var i = sourceStart;
while (i < content.length) {
  if (content[i] === '\\') { i += 2; continue; }
  if (content[i] === '"') break;
  i++;
}
var sourceValue = JSON.parse('"' + content.substring(sourceStart, i) + '"');
console.log('Source extracted, length:', sourceValue.length);

// 生成图标 — 颜色改为 #bbb（亮灰，深浅背景均可见）
var svg = function(d, c) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="' + (c || '%23bbb') + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'
  );
};

var icons = {
  B: svg('<path d="M4 2h5a3 3 0 0 1 0 6H4zm0 6h6a3 3 0 0 1 0 6H4z" fill="%23bbb"/>'),
  I: svg('<path d="M6 2h4M6 14h4M10 2L6 14"/>'),
  S: svg('<path d="M5 3c-1 0-3 1-2 3s3 2 5 2s4 1 3 3s-2 3-4 2"/><line x1="2" y1="8" x2="14" y2="8"/>'),
  H: svg('<path d="M3 2v12M13 2v12M3 8h10"/>'),
  LK: svg('<path d="M7 4H4a2 2 0 0 0 0 4h2M9 4h3a2 2 0 0 1 0 4h-2M5 8h6"/>', '%236ea8fe'),
  LI: svg('<path d="M6 3h8M6 8h6M6 13h8"/><circle cx="3" cy="3" r="1" fill="%23bbb"/><circle cx="3" cy="8" r="1" fill="%23bbb"/><circle cx="3" cy="13" r="1" fill="%23bbb"/>'),
  TB: svg('<rect x="1" y="3" width="14" height="10" rx="1"/><path d="M1 7h14M6 7v6M11 7v6"/>'),
  IM: svg('<rect x="1" y="3" width="14" height="10" rx="2"/><circle cx="5" cy="7" r="1.5"/><path d="M1 11l4-3 3 2 3-2 3 3"/>'),
  HR: svg('<line x1="2" y1="8" x2="14" y2="8"/>'),
  VA: svg('<path d="M2 3l3 10M7 3L4 13"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="8" x2="12" y2="13"/>', '%23c084fc'),
  CD: svg('<path d="M5 4L2 8l3 4M11 4l3 4-3 4M9 2L7 14"/>', '%23fb923c'),
  HT: svg('<path d="M3 2h10M8 2v12M5 14h6"/>')
};

// 读取 hydrate 源码并替换图标占位符
var hydrateSrc = fs.readFileSync(path.join(__dirname, '_hydrate_src.js'), 'utf8');
Object.keys(icons).forEach(function(k) {
  hydrateSrc = hydrateSrc.replace(new RegExp('"%%' + k + '%%"', 'g'), JSON.stringify(icons[k]));
});

// 验证 hydrate
try {
  var r = {};
  (new Function(hydrateSrc)).call(r);
  var ext = r.editorExtensions.twine['^2.4.0'];
  console.log('Hydrate OK:', Object.keys(ext.codeMirror.commands).length, 'commands,', ext.codeMirror.toolbar().length, 'toolbar items');
  // 检查所有按钮是否都有 label 且没有 iconOnly:true
  ext.codeMirror.toolbar().forEach(function(t) {
    if (t.iconOnly) console.warn('WARNING: iconOnly on', t.label);
  });
} catch(e) {
  console.error('Hydrate FAIL:', e.message);
  process.exit(1);
}

// 组装 format.js
var formatData = {
  name: "Freebird",
  version: "1.0.0",
  author: "Custom",
  description: "\u81ea\u7531\u8f7b\u91cf\u7684\u6545\u4e8b\u683c\u5f0f\u3002\u652f\u6301\u539f\u751f HTML\u3001JavaScript \u4ee3\u7801\u5757\u3001\u53d8\u91cf\u4f5c\u7528\u57df\u7cfb\u7edf\u3001\u4e2d\u6587\u7f16\u8f91\u5668\u5de5\u5177\u680f\u3002",
  proofing: false,
  image: "icon.svg",
  source: sourceValue,
  hydrate: hydrateSrc
};

var output = 'window.storyFormat(' + JSON.stringify(formatData, null, '\t') + ');\n';
fs.writeFileSync(formatPath, output, 'utf8');
console.log('format.js rebuilt! (' + output.length + ' bytes)');

// 最终验证
global.window = { storyFormat: function(d) {
  var r2 = {};
  (new Function(d.hydrate)).call(r2);
  console.log('Final validation: OK');
}};
eval(fs.readFileSync(formatPath, 'utf8'));

// 清理
fs.unlinkSync(path.join(__dirname, '_hydrate_src.js'));
console.log('Cleaned up _hydrate_src.js');
console.log('\n=== ALL DONE ===');
