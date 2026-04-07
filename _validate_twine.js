var fs = require('fs');
var path = require('path');

console.log('--- STARTING VALIDATION ---');

// 1. 模拟 Twine 浏览器环境
var globalStore = {};
global.window = {
  storyFormat: function(data) {
    globalStore.format = data;
    console.log('✅ storyFormat function called with version:', data.version);
  }
};

// 2. 加载 format.js
var formatPath = path.join(__dirname, 'public/story-formats/freebird-1.0.0/format.js');
var content = fs.readFileSync(formatPath, 'utf8');

try {
  eval(content);
  console.log('✅ format.js cleanly parsed and evaluated.');
} catch (e) {
  console.error('❌ FATAL: format.js parsing failed:', e);
  process.exit(1);
}

// 3. 校验传入的 formatData
var fmt = globalStore.format;
if (!fmt) {
  console.error('❌ FATAL: globalStore.format is undefined.');
  process.exit(1);
}

if (!fmt.hydrate) {
  console.error('❌ FATAL: hydrate string missing in format data.');
  process.exit(1);
}
console.log('✅ hydrate string found, length:', fmt.hydrate.length);

// 4. 模拟 Twine 执行 hydrate (从 JSON 字符串直接通过 new Function)
// Twine 源码: new Function(format.hydrate).apply(target)
try {
  var hydrateObj = {};
  var hydrateFn = new Function(fmt.hydrate);
  hydrateFn.apply(hydrateObj);
  console.log('✅ hydrate new Function compiled and executed safely.');
} catch (e) {
  console.error('❌ FATAL: hydrate Function error:', e);
  process.exit(1);
}

// 5. 校验 editorExtensions 规范
var ext = hydrateObj.editorExtensions;
if (!ext || !ext.twine || !ext.twine['^2.4.0']) {
  console.error('❌ FATAL: Twine 2.4.0 extension API definition missing.');
  process.exit(1);
}
var api = ext.twine['^2.4.0'];
console.log('✅ Extension API found.');

// 6. 校验 CodeMirror
var cm = api.codeMirror;
if (!cm || !cm.commands || !cm.toolbar) {
  console.error('❌ FATAL: CodeMirror config missing.', typeof cm.commands, typeof cm.toolbar);
  process.exit(1);
}
console.log('✅ CodeMirror commands and toolbar definitions found.');

// 7. 模拟 Twine 获取 Toolbar
// useFormatCodeMirrorToolbar.ts 执行: editorExtensions.codeMirror.toolbar(editor, {appTheme, ...})
try {
  var mockEditor = {
    getSelection: function() { return ''; },
    replaceSelection: function(txt) {}
  };
  var mockEnvLight = { appTheme: 'light', foregroundColor: '#000' };
  var toolbarLight = cm.toolbar(mockEditor, mockEnvLight);
  console.log('✅ Toolbar function executed with LIGHT theme, returned items:', toolbarLight.length);

  var mockEnvDark = { appTheme: 'dark', foregroundColor: '#fff' };
  var toolbarDark = cm.toolbar(mockEditor, mockEnvDark);
  console.log('✅ Toolbar function executed with DARK theme, returned items:', toolbarDark.length);

} catch (e) {
  console.error('❌ FATAL: Toolbar generation error:', e);
  process.exit(1);
}

console.log('--- ALL VALIDATION PASSED IMMEDIATELY ---');
