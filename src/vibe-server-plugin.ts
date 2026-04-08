/**
 * VIBEstory Vite Server Plugin
 * 
 * 扫描 VIBEstory/ 下的所有子项目（每个子目录含 freebird.json），
 * 通过 REST API 将其暴露给 Twine 前端编辑器，实现双向文件同步。
 */

import fs from 'fs';
import path from 'path';
import type {Plugin} from 'vite';
import {v4 as uuid} from '@lukeed/uuid';

const VIBE_DIR = 'VIBEstory';

interface FreebirdConfig {
	name: string;
	ifid: string;
	start: string;
	format: string;
	formatVersion: string;
	globals: Record<string, unknown>;
	tags: Record<string, string>;
}

interface VibePassage {
	id: string;
	name: string;
	text: string;
	tags: string[];
	story: string;
	left: number;
	top: number;
	width: number;
	height: number;
	highlighted: boolean;
	selected: boolean;
}

interface VibeStory {
	id: string;
	ifid: string;
	name: string;
	passages: VibePassage[];
	script: string;
	stylesheet: string;
	startPassage: string;
	storyFormat: string;
	storyFormatVersion: string;
	lastUpdate: string;
	snapToGrid: boolean;
	selected: boolean;
	tags: string[];
	tagColors: Record<string, string>;
	zoom: number;
	_vibeProject: string; // 子目录名
}

/**
 * 递归扫描目录下的 .md 文件
 */
function scanPassageFiles(
	baseDir: string,
	currentDir: string,
	results: {name: string; text: string; tags: string[]}[]
) {
	const entries = fs.readdirSync(currentDir, {withFileTypes: true});
	for (const entry of entries) {
		const fullPath = path.join(currentDir, entry.name);
		if (entry.isDirectory()) {
			if (['dist', 'node_modules', '.git'].includes(entry.name)) continue;
			scanPassageFiles(baseDir, fullPath, results);
		} else if (entry.name.endsWith('.md')) {
			const raw = fs.readFileSync(fullPath, 'utf-8');
			let text = raw;
			let tags: string[] = [];

			const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
			if (fmMatch) {
				const fm = fmMatch[1];
				text = fmMatch[2];
				const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/);
				if (tagsMatch) {
					tags = tagsMatch[1]
						.split(',')
						.map(t => t.trim())
						.filter(Boolean);
				}
			}

			const relPath = path.relative(baseDir, fullPath);
			const name = relPath.replace(/\.md$/, '').replace(/\\/g, '/');
			results.push({name, text: text.trim(), tags});
		}
	}
}

/**
 * 从一个项目目录加载为 VibeStory
 */
function loadProject(vibeRoot: string, projectDirName: string): VibeStory | null {
	const projectDir = path.join(vibeRoot, projectDirName);
	const configPath = path.join(projectDir, 'freebird.json');
	if (!fs.existsSync(configPath)) return null;

	const config: FreebirdConfig = JSON.parse(
		fs.readFileSync(configPath, 'utf-8')
	);

	// 扫描 passages
	const rawPassages: {name: string; text: string; tags: string[]}[] = [];
	scanPassageFiles(projectDir, projectDir, rawPassages);

	// 生成稳定 ID（基于项目名 hash）
	const storyId = 'vibe-' + simpleHash(projectDirName);

	// 为 passages 分配 ID 并计算网格布局
	const passages: VibePassage[] = rawPassages.map((p, i) => ({
		id: 'vibe-p-' + simpleHash(projectDirName + '/' + p.name),
		name: p.name,
		text: p.text,
		tags: p.tags,
		story: storyId,
		left: (i % 5) * 175 + 50,
		top: Math.floor(i / 5) * 150 + 50,
		width: 100,
		height: 100,
		highlighted: false,
		selected: false
	}));

	// 找到 startPassage ID
	const startPassageName = config.start || '开始';
	const startP = passages.find(p => p.name === startPassageName);

	// 读取 global.js / global.css
	const globalJs = readFileOr(path.join(projectDir, 'global.js'), '');
	const globalCss = readFileOr(path.join(projectDir, 'global.css'), '');

	// 构建初始化脚本（从 globals）
	let initScript = '';
	if (config.globals && Object.keys(config.globals).length > 0) {
		initScript =
			'// Auto-generated from freebird.json globals\n' +
			Object.entries(config.globals)
				.map(([k, v]) => `g["${k}"] = ${JSON.stringify(v)};`)
				.join('\n') +
			'\n';
	}

	return {
		id: storyId,
		ifid: config.ifid || '',
		name: config.name || projectDirName,
		passages,
		script: initScript + globalJs,
		stylesheet: globalCss,
		startPassage: startP?.id || '',
		storyFormat: 'Freebird',
		storyFormatVersion: config.formatVersion || '1.0.0',
		lastUpdate: new Date().toISOString(),
		snapToGrid: true,
		selected: false,
		tags: [],
		tagColors: config.tags || {},
		zoom: 1,
		_vibeProject: projectDirName
	};
}

/**
 * 将 Story 数据写回文件夹
 */
function saveProject(vibeRoot: string, story: VibeStory) {
	const projectDir = path.join(vibeRoot, story._vibeProject);
	if (!fs.existsSync(projectDir)) {
		fs.mkdirSync(projectDir, {recursive: true});
	}

	// 从 script 中尝试恢复 globals
	const globals: Record<string, unknown> = {};
	const globalLines = story.script.match(/g\["(\w+)"\]\s*=\s*(.+);/g);
	let userJs = story.script;
	if (globalLines) {
		for (const line of globalLines) {
			const m = line.match(/g\["(\w+)"\]\s*=\s*(.+);/);
			if (m) {
				try {
					globals[m[1]] = JSON.parse(m[2]);
				} catch {
					globals[m[1]] = m[2];
				}
			}
		}
		// 去掉 auto-generated 部分
		userJs = userJs
			.replace(/\/\/ Auto-generated from freebird\.json globals\n[\s\S]*?\n(?=\n|$)/, '')
			.trim();
	}

	// 找到 startPassage 名称
	const startPassage = story.passages.find(p => p.id === story.startPassage);

	// 写 freebird.json
	const config: FreebirdConfig = {
		name: story.name,
		ifid: story.ifid,
		start: startPassage?.name || '开始',
		format: 'Freebird',
		formatVersion: story.storyFormatVersion || '1.0.0',
		globals,
		tags: story.tagColors || {}
	};
	fs.writeFileSync(
		path.join(projectDir, 'freebird.json'),
		JSON.stringify(config, null, 2),
		'utf-8'
	);

	// 写 global.css
	if (story.stylesheet.trim()) {
		fs.writeFileSync(
			path.join(projectDir, 'global.css'),
			story.stylesheet,
			'utf-8'
		);
	}

	// 写 global.js（用户自定义部分）
	if (userJs.trim()) {
		fs.writeFileSync(
			path.join(projectDir, 'global.js'),
			userJs,
			'utf-8'
		);
	}

	// 写 passage 文件
	for (const p of story.passages) {
		const filePath = path.join(
			projectDir,
			p.name.replace(/\//g, path.sep) + '.md'
		);
		const fileDir = path.dirname(filePath);
		if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, {recursive: true});

		let content = '';
		if (p.tags.length > 0) {
			content += '---\ntags: [' + p.tags.join(', ') + ']\n---\n';
		}
		content += p.text;
		fs.writeFileSync(filePath, content, 'utf-8');
	}
}

function readFileOr(filePath: string, defaultVal: string): string {
	try {
		return fs.readFileSync(filePath, 'utf-8');
	} catch {
		return defaultVal;
	}
}

function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		hash = ((hash << 5) - hash + ch) | 0;
	}
	return Math.abs(hash).toString(36).padStart(8, '0');
}

export function vibeServerPlugin(): Plugin {
	const vibeRoot = path.resolve(process.cwd(), VIBE_DIR);

	return {
		name: 'vibe-story-sync',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith('/__vibe/')) return next();

				// GET /__vibe/stories — 列出所有项目
				if (req.method === 'GET' && req.url === '/__vibe/stories') {
					if (!fs.existsSync(vibeRoot)) {
						res.writeHead(200, {'Content-Type': 'application/json'});
						res.end('[]');
						return;
					}

					const stories: VibeStory[] = [];
					const entries = fs.readdirSync(vibeRoot, {withFileTypes: true});
					for (const entry of entries) {
						if (!entry.isDirectory()) continue;
						const story = loadProject(vibeRoot, entry.name);
						if (story) stories.push(story);
					}

					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(JSON.stringify(stories));
					return;
				}

				// POST /__vibe/save — 保存项目
				if (req.method === 'POST' && req.url === '/__vibe/save') {
					let body = '';
					req.on('data', chunk => (body += chunk));
					req.on('end', () => {
						try {
							const story: VibeStory = JSON.parse(body);
							saveProject(vibeRoot, story);
							res.writeHead(200, {'Content-Type': 'application/json'});
							res.end('{"ok":true}');
						} catch (e: any) {
							res.writeHead(500, {'Content-Type': 'application/json'});
							res.end(JSON.stringify({error: e.message}));
						}
					});
					return;
				}

				next();
			});
		}
	};
}
