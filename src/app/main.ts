/// <reference path="../../typings/browser.d.ts" />
import BrowserWindow = Electron.BrowserWindow;

import * as electron from "electron";
import * as _ from "lodash";
import * as sqlite3 from "sqlite3";
import IPCMain = Electron.IPCMain;
import IPCMainEvent = Electron.IPCMainEvent;
import {Socket} from "net";
import {Stats} from "fs";
import * as net from "net";
import * as fs from "fs";

interface IMessage {
	channelId: number;
	timestamp: number;
	type: number;
	message: string;
	nickname: string;
	userId: number;
}

interface IConfig {
	version: number;
	channelUrl: string;
	readChat: boolean;
	readMessage: boolean;
	readBalloon: boolean;
	readAnnounce: boolean;
	readViewer: boolean;
	readNickname: boolean;
	readLikes: boolean;
	showViewer: boolean;
	showLikes: boolean;
	fontSize: number;
}

interface IGetChatLogsParam {
	channelId: number;
}

const MESSAGE_TYPE_MESSAGE: number = 1;
const MESSAGE_TYPE_BALLOON: number = 2;
const MESSAGE_TYPE_ANNOUNCE: number = 3;
const MESSAGE_TYPE_LIKES: number = 4;
const MESSAGE_TYPE_VIEWER: number = 5;
const defaultConfig: IConfig = {
	version: 1,
	channelUrl: "",
	readChat: true,
	readMessage: true,
	readBalloon: true,
	readAnnounce: true,
	readViewer: false,
	readNickname: false,
	readLikes: true,
	showViewer: true,
	showLikes: true,
	fontSize: 10.5,
};
let app: Electron.App = electron.app;
let dialog: Electron.Dialog = electron.dialog;
let ipcMain: IPCMain = electron.ipcMain;
let mainWindow: BrowserWindow = undefined;
let config: IConfig;
let channelLockFileDescriptor: number = undefined;

function createWindow() {
	'use strict';
	let browserWindowOptions: Electron.BrowserWindowOptions = {
		width: 1000,
		height: 600,
		webPreferences: {
			plugins: true,
		},
	};
	mainWindow = new electron.BrowserWindow(browserWindowOptions);
	mainWindow.setMenu(null);
	mainWindow.loadURL('file://' + __dirname + '/../browser/index.html');
	// mainWindow.webContents.openDevTools();
	mainWindow.on('closed', () => {
		mainWindow = undefined;
	});
}

function findFile(dir: string, fileName: string): string {
	'use strict';
	let children: string[] = fs.readdirSync(dir);
	for (let i: number = 0; i < children.length; ++i) {
		let path: string = dir + '/' + children[i];
		let stat: Stats = fs.statSync(path);
		if (stat.isFile()) {
			if (children[i] === fileName) {
				return path;
			}
		} else if (stat.isDirectory()) {
			let result: string = findFile(path, fileName);
			if (result) {
				return result;
			}
		}
	}
	return undefined;
}

function unlockChannelLock(): void {
	'use strict';
	if (channelLockFileDescriptor !== undefined) {
		fs.closeSync(channelLockFileDescriptor);
		channelLockFileDescriptor = undefined;
	}
}

function getConfigFileName(): string {
	'use strict';
	return app.getPath('userData') + "/config.json";
}

function getDatabaseFileName(): string {
	'use strict';
	return app.getPath('userData') + "/db.sqlite";
}

function getChannelLockFilePath(channelId: number): string {
	'use strict';
	if ("number" !== typeof channelId) {
		return undefined;
	}
	return app.getPath('userData') + "/channel." + channelId.toString() +  ".lock";
}

sqlite3.verbose();
if (process.platform === "darwin") {
	let flashPlayerDll: string = findFile("/Applications//Google Chrome.app/Contents/Versions", "PepperFlashPlayer");
	if (flashPlayerDll === undefined) {
		dialog.showErrorBox("エラー", "PepperFlashPlayer が /Applications//Google Chrome.app/Contents/Versions 以下に見つかりません。");
		app.quit();
	}
	app.commandLine.appendSwitch('ppapi-flash-path', flashPlayerDll);
} else {
	let flashPlayerDll: string = findFile("C:/Program Files (x86)/Google/Chrome", "pepflashplayer.dll");
	if (flashPlayerDll === undefined) {
		dialog.showErrorBox("エラー", "pepflashplayer.dll が C:/Program Files (x86)/Google/Chrome 以下に見つかりません。");
		app.quit();
	}
	let manifestJson: string = flashPlayerDll.replace(/[^\\/]+$/, "manifest.json");
	let manifest: any = JSON.parse(fs.readFileSync(manifestJson, "utf8"));
	if (manifest["x-ppapi-arch"] !== "x64") {
		dialog.showErrorBox("エラー", "64ビット版のChromeがインストールされていません。");
		app.quit();
	}
	app.commandLine.appendSwitch('ppapi-flash-path', flashPlayerDll);
	app.commandLine.appendSwitch('ppapi-flash-version', manifest["version"]);
}
let db: sqlite3.Database = new sqlite3.Database(getDatabaseFileName(), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err: Error) => {
	if (err !== null) {
		dialog.showErrorBox("エラー", "データベースを開けません。:" + err.name + " " + err.message);
		app.quit();
	}
});
db.serialize(() => {
	db.run(
		`CREATE TABLE IF NOT EXISTS chat (
		id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
		channel_id INTEGER NOT NULL,
		timestamp INTEGER NOT NULL,
		type INTEGER NOT NULL,
		nickname TEXT,
		user_id INTEGER,
		message TEXT
		)`,
		(err: Error) => {
			if (err !== null) {
				dialog.showErrorBox("エラー", "テーブルを作成できません。:" + err.name + " " + err.message);
				app.quit();
			}
		});
});
app.on('ready', createWindow);
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		unlockChannelLock();
		app.quit();
	}
});
app.on('activate', () => {
	if (mainWindow === undefined) {
		createWindow();
	}
});
app.on("quit", () => {
	unlockChannelLock();
});
ipcMain.on("message", (event: IPCMainEvent, arg: string) => {
	let messages: IMessage[] = JSON.parse(arg);
	messages.forEach((message: IMessage) => {
		if (channelLockFileDescriptor !== undefined) {
			db.serialize(() => {
				db.run(
					"INSERT INTO chat (channel_id, timestamp, type, nickname, user_id, message) VALUES(?, ?, ?, ?, ?, ?)",
					message.channelId, message.timestamp, message.type, message.nickname, message.userId, message.message,
					(err: Error) => {
						if (err !== null) {
							mainWindow.webContents.send("error", "チャットを記録できません。:" + err.name + " " + err.message);
						}
					}
				);
			});
		}
		if (!config.readChat) {
			return;
		}
		if ((!config.readMessage) && message.type === MESSAGE_TYPE_MESSAGE) {
			return;
		}
		if ((!config.readBalloon) && message.type === MESSAGE_TYPE_BALLOON) {
			return;
		}
		if ((!config.readAnnounce) && message.type === MESSAGE_TYPE_ANNOUNCE) {
			return;
		}
		if ((!config.readViewer) && message.type === MESSAGE_TYPE_VIEWER) {
			return;
		}
		if ((!config.readLikes) && message.type === MESSAGE_TYPE_LIKES) {
			return;
		}
		let client: Socket = new net.Socket();
		client.setEncoding('binary');
		client.on("error", () => {
			mainWindow.webContents.send("error", "棒読みちゃんに接続できません。棒読みちゃんが起動していることを確認してください。");
		});
		client.connect(50001, "localhost", () => {
			let text: string = message.message;
			if (message.type === MESSAGE_TYPE_LIKES) {
				text = "Eねされました。";
			} else {
				text = text.replace(/https?:\/\/[\-_\.!~*'\(\)a-zA-Z0-9;/\?:@&=\+\$,%#]+/g, "(URL省略)");
			}
			if (config.readNickname ||
				message.type === MESSAGE_TYPE_VIEWER ||
				message.type === MESSAGE_TYPE_BALLOON) {
				text = text.replace(/。$/, "") + " " + message.nickname;
			}
			let textBuffer: Buffer = new Buffer(text, 'utf8');
			let headerBuffer: Buffer = new Buffer(15);
			headerBuffer.writeUInt16LE(0x0001, 0); // command
			headerBuffer.writeUInt16LE(0xFFFF, 2); // speed
			headerBuffer.writeUInt16LE(0xFFFF, 4); // tone
			headerBuffer.writeUInt16LE(0xFFFF, 6); // volume
			headerBuffer.writeUInt16LE(0x0000, 8); // voice
			headerBuffer.writeUInt8(0x00, 10); // charset
			headerBuffer.writeUInt32LE(textBuffer.length, 11); // length
			client.write(headerBuffer.toString('binary') + textBuffer.toString('binary'), 'binary', () => {
				client.destroy();
			});
		});
	});
});
ipcMain.on("acquireChannelWriteLock", (event: IPCMainEvent, arg: string) => {
	let param: IGetChatLogsParam = JSON.parse(arg);
	unlockChannelLock();
	let path: string = getChannelLockFilePath(param.channelId);
	if (path === undefined) {
		return;
	}
	fs.open(path, "wx", (err: NodeJS.ErrnoException, fd: number) => {
		if (err === null) {
			channelLockFileDescriptor = fd;
			fs.unlinkSync(path);
		} else {
			mainWindow.webContents.send("error", "チャットを記録できません。このアプリを二重に起動して同じチャンネルを開いていないか確認してください。");
		}
	});
});
ipcMain.on("getChatLogs", (event: IPCMainEvent, arg: string) => {
	let param: IGetChatLogsParam = JSON.parse(arg);
	db.serialize(() => {
		db.each(
			"SELECT channel_id, timestamp, type, nickname, user_id, message FROM chat WHERE channel_id=? AND timestamp>=? ORDER BY id",
			param.channelId,
			Date.now() - 1000 * 60 * 60 * 24 * 7,
			(err: Error, row: any) => {
				if (err === null) {
					let message: IMessage = {
						channelId: row.channel_id,
						timestamp: row.timestamp,
						type: row.type,
						message: row.message,
						nickname: row.nickname,
						userId: row.user_id,
					};
					event.sender.send("getChatLogs", JSON.stringify(message));
				} else {
					console.log(err);
				}
			}
			);
	});
});
ipcMain.on("setConfig", (event: IPCMainEvent, arg: string) => {
	config = JSON.parse(arg);
	config.version = 1;
	fs.writeFileSync(getConfigFileName(), JSON.stringify(config));
});
ipcMain.on("getConfig", (event: IPCMainEvent) => {
	event.sender.send("getConfig", JSON.stringify(config));
});
try {
	let configText: string = fs.readFileSync(getConfigFileName(), "utf8");
	config = _.defaults<IConfig, IConfig>(JSON.parse(configText), defaultConfig);
} catch (e) {
	config = defaultConfig;
}
