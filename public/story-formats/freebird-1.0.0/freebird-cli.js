#!/usr/bin/env node
/**
 * Freebird CLI - 项目模式工具
 * 
 * 用法:
 *   node freebird-cli.js build [项目目录] [输出文件]
 *   node freebird-cli.js unpack <HTML文件> [输出目录]
 *   node freebird-cli.js twee [项目目录]
 */

const fs = require('fs');
const path = require('path');

// ============ BUILD: 文件夹 → 单文件 HTML ============

function build(projectDir, outputFile) {
	projectDir = path.resolve(projectDir || '.');
	outputFile = outputFile || path.join(projectDir, 'dist', 'story.html');

	const configPath = path.join(projectDir, 'freebird.json');
	if (!fs.existsSync(configPath)) {
		console.error('错误: 找不到 freebird.json，请确认项目目录正确');
		process.exit(1);
	}

	const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
	console.log('构建故事: ' + config.name);

	// 扫描所有 .md 文件
	const passages = [];
	scanDir(projectDir, projectDir, passages);
	console.log('找到 ' + passages.length + ' 个 passage');

	// 读取全局 JS 和 CSS
	const globalJs = readFileOr(path.join(projectDir, 'global.js'), '');
	const globalCss = readFileOr(path.join(projectDir, 'global.css'), '');

	// 找到起始 passage
	const startName = config.start || '开始';
	let startPid = null;

	// 构建 passage data
	let passageData = '';
	passages.forEach(function(p, index) {
		const pid = index + 1;
		if (p.name === startName) startPid = pid;

		const tagsAttr = p.tags.length > 0 ? p.tags.join(' ') : '';
		passageData += '<tw-passagedata pid="' + pid + '" ' +
			'name="' + escapeHtml(p.name) + '" ' +
			'tags="' + escapeHtml(tagsAttr) + '" ' +
			'position="0,0" size="100,100">' +
			escapeHtml(p.text) + '</tw-passagedata>';
	});

	// 构建 tag 颜色数据
	let tagData = '';
	if (config.tags) {
		Object.keys(config.tags).forEach(function(tag) {
			tagData += '<tw-tag name="' + escapeHtml(tag) + '" color="' + escapeHtml(config.tags[tag]) + '"></tw-tag>';
		});
	}

	// 构建 storydata
	const ifid = config.ifid || generateIFID();
	const storyData = '<tw-storydata name="' + escapeHtml(config.name) + '" ' +
		'startnode="' + (startPid || 1) + '" ' +
		'creator="Freebird CLI" creator-version="1.0.0" ' +
		'format="Freebird" format-version="1.0.0" ' +
		'ifid="' + escapeHtml(ifid) + '" options="" tags="" zoom="1" hidden>' +
		'<style role="stylesheet" id="twine-user-stylesheet" type="text/twine-css">' +
		globalCss +
		'</style>' +
		'<script role="script" id="twine-user-script" type="text/twine-javascript">' +
		buildInitScript(config.globals) + globalJs +
		'</script>' +
		tagData + passageData +
		'</tw-storydata>';

	// 读取 format source 并注入 story data
	const formatPath = path.join(__dirname, 'format.js');
	const formatRaw = fs.readFileSync(formatPath, 'utf-8');
	const sourceMatch = formatRaw.match(/"source"\s*:\s*"([\s\S]*?)(?<!\\)"\s*[,}]/);
	if (!sourceMatch) {
		console.error('错误: 无法从 format.js 提取 source');
		process.exit(1);
	}

	let source = sourceMatch[1]
		.replace(/\\([\\"n])/g, function(m, ch) {
			if (ch === 'n') return '\n';
			if (ch === '"') return '"';
			if (ch === '\\') return '\\';
			return m;
		});

	let output = source
		.replace(/\{\{STORY_NAME\}\}/g, escapeHtml(config.name))
		.replace(/\{\{STORY_DATA\}\}/g, storyData);

	// 确保输出目录存在
	const outDir = path.dirname(outputFile);
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

	fs.writeFileSync(outputFile, output, 'utf-8');
	console.log('构建完成: ' + outputFile);
}

// ============ UNPACK: 单文件 HTML → 文件夹 ============

function unpack(htmlFile, outputDir) {
	htmlFile = path.resolve(htmlFile);
	outputDir = outputDir || path.join(path.dirname(htmlFile), 'unpacked');

	if (!fs.existsSync(htmlFile)) {
		console.error('错误: 找不到文件 ' + htmlFile);
		process.exit(1);
	}

	const html = fs.readFileSync(htmlFile, 'utf-8');

	// 提取 storydata
	const storyMatch = html.match(/<tw-storydata\s([^>]*)>([\s\S]*?)<\/tw-storydata>/);
	if (!storyMatch) {
		console.error('错误: HTML 中找不到 <tw-storydata>');
		process.exit(1);
	}

	const storyAttrs = storyMatch[1];
	const storyContent = storyMatch[2];

	const name = extractAttr(storyAttrs, 'name') || 'Untitled';
	const ifid = extractAttr(storyAttrs, 'ifid') || generateIFID();
	const startNode = extractAttr(storyAttrs, 'startnode') || '1';

	// 提取 CSS 和 JS
	const cssMatch = storyContent.match(/<style[^>]*type="text\/twine-css"[^>]*>([\s\S]*?)<\/style>/);
	const jsMatch = storyContent.match(/<script[^>]*type="text\/twine-javascript"[^>]*>([\s\S]*?)<\/script>/);
	const globalCss = cssMatch ? cssMatch[1] : '';
	const globalJs = jsMatch ? jsMatch[1] : '';

	// 提取所有 passage
	const passageRe = /<tw-passagedata\s([^>]*)>([\s\S]*?)<\/tw-passagedata>/g;
	var passages = [];
	var pMatch;
	var startPassageName = '';

	while ((pMatch = passageRe.exec(storyContent)) !== null) {
		const attrs = pMatch[1];
		const text = unescapeHtml(pMatch[2]);
		const pName = extractAttr(attrs, 'name') || 'untitled';
		const pid = extractAttr(attrs, 'pid') || '';
		const tags = (extractAttr(attrs, 'tags') || '').split(/\s+/).filter(Boolean);

		passages.push({ name: pName, text: text, tags: tags, pid: pid });
		if (pid === startNode) startPassageName = pName;
	}

	console.log('解包故事: ' + name + ' (' + passages.length + ' passages)');

	// 创建目录
	if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

	// 提取标签颜色
	const tagColors = {};
	const tagRe = /<tw-tag\s+name="([^"]*)"\s+color="([^"]*)"/g;
	var tMatch;
	while ((tMatch = tagRe.exec(storyContent)) !== null) {
		tagColors[unescapeHtml(tMatch[1])] = unescapeHtml(tMatch[2]);
	}

	// 写 freebird.json
	const config = {
		name: name,
		ifid: ifid,
		start: startPassageName,
		format: 'Freebird',
		formatVersion: '1.0.0',
		globals: {},
		tags: tagColors
	};
	fs.writeFileSync(path.join(outputDir, 'freebird.json'), JSON.stringify(config, null, 2), 'utf-8');

	// 写全局文件
	if (globalCss.trim()) fs.writeFileSync(path.join(outputDir, 'global.css'), globalCss, 'utf-8');
	if (globalJs.trim()) fs.writeFileSync(path.join(outputDir, 'global.js'), globalJs, 'utf-8');

	// 写 passage 文件
	passages.forEach(function(p) {
		// 使用 passage 名称作为文件路径
		const filePath = path.join(outputDir, p.name.replace(/\//g, path.sep) + '.md');
		const fileDir = path.dirname(filePath);
		if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

		let content = '';
		if (p.tags.length > 0) {
			content += '---\ntags: [' + p.tags.join(', ') + ']\n---\n';
		}
		content += p.text;

		fs.writeFileSync(filePath, content, 'utf-8');
	});

	console.log('解包完成: ' + outputDir);
}

// ============ TWEE: 项目 → Twee 格式 ============

function twee(projectDir) {
	projectDir = path.resolve(projectDir || '.');
	const configPath = path.join(projectDir, 'freebird.json');
	if (!fs.existsSync(configPath)) {
		console.error('错误: 找不到 freebird.json');
		process.exit(1);
	}

	const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
	const passages = [];
	scanDir(projectDir, projectDir, passages);

	let output = '';

	// Script passage
	const globalJs = readFileOr(path.join(projectDir, 'global.js'), '');
	if (globalJs.trim()) {
		output += ':: StoryScript [script]\n' + globalJs + '\n\n';
	}

	// Stylesheet passage
	const globalCss = readFileOr(path.join(projectDir, 'global.css'), '');
	if (globalCss.trim()) {
		output += ':: StoryStylesheet [stylesheet]\n' + globalCss + '\n\n';
	}

	// Passages
	passages.forEach(function(p) {
		const tags = p.tags.length > 0 ? ' [' + p.tags.join(' ') + ']' : '';
		output += ':: ' + p.name + tags + '\n' + p.text + '\n\n';
	});

	const outputFile = path.join(projectDir, config.name + '.twee');
	fs.writeFileSync(outputFile, output, 'utf-8');
	console.log('Twee 导出完成: ' + outputFile);
}

// ============ 工具函数 ============

function scanDir(baseDir, currentDir, passages) {
	const entries = fs.readdirSync(currentDir, { withFileTypes: true });
	entries.forEach(function(entry) {
		const fullPath = path.join(currentDir, entry.name);

		if (entry.isDirectory()) {
			// 跳过特殊目录
			if (['dist', 'node_modules', '.git'].includes(entry.name)) return;
			scanDir(baseDir, fullPath, passages);
		} else if (entry.name.endsWith('.md')) {
			const raw = fs.readFileSync(fullPath, 'utf-8');
			let text = raw;
			let tags = [];

			// 解析 YAML frontmatter
			const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
			if (fmMatch) {
				const fm = fmMatch[1];
				text = fmMatch[2];
				const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/);
				if (tagsMatch) {
					tags = tagsMatch[1].split(',').map(function(t) { return t.trim(); }).filter(Boolean);
				}
			}

			// 从文件路径推导 passage 名称
			const relPath = path.relative(baseDir, fullPath);
			const name = relPath.replace(/\.md$/, '').replace(/\\/g, '/');

			passages.push({ name: name, text: text.trim(), tags: tags });
		}
	});
}

function readFileOr(filePath, defaultVal) {
	try { return fs.readFileSync(filePath, 'utf-8'); } catch (e) { return defaultVal; }
}

function buildInitScript(globals) {
	if (!globals || Object.keys(globals).length === 0) return '';
	let script = '// Auto-generated from freebird.json globals\n';
	Object.keys(globals).forEach(function(key) {
		script += 'g["' + key + '"] = ' + JSON.stringify(globals[key]) + ';\n';
	});
	return script;
}

function escapeHtml(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unescapeHtml(s) {
	return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function extractAttr(attrsStr, name) {
	var re = new RegExp(name + '="([^"]*)"');
	var m = re.exec(attrsStr);
	return m ? unescapeHtml(m[1]) : null;
}

function generateIFID() {
	var hex = '0123456789ABCDEF';
	var result = '';
	for (var i = 0; i < 36; i++) {
		if (i === 8 || i === 13 || i === 18 || i === 23) { result += '-'; }
		else if (i === 14) { result += '4'; }
		else { result += hex[Math.floor(Math.random() * 16)]; }
	}
	return result;
}

// ============ CLI 入口 ============

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
	case 'build':
		build(args[1], args[2]);
		break;
	case 'unpack':
		if (!args[1]) { console.error('用法: freebird-cli.js unpack <HTML文件> [输出目录]'); process.exit(1); }
		unpack(args[1], args[2]);
		break;
	case 'twee':
		twee(args[1]);
		break;
	default:
		console.log('Freebird CLI v1.0.0');
		console.log('');
		console.log('用法:');
		console.log('  node freebird-cli.js build [项目目录] [输出文件]  - 构建为单文件 HTML');
		console.log('  node freebird-cli.js unpack <HTML文件> [输出目录] - 拆解为文件夹项目');
		console.log('  node freebird-cli.js twee [项目目录]             - 导出为 Twee 格式');
		break;
}
