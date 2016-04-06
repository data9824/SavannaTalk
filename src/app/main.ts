/// <reference path="../../typings/browser.d.ts" />
import BrowserWindow = Electron.BrowserWindow;

import * as electron from "electron";
import * as _ from "lodash";
import IPCMain = Electron.IPCMain;
import IPCMainEvent = Electron.IPCMainEvent;
import {Socket} from "net";
import {Stats} from "fs";
import * as net from "net";
import * as fs from "fs";

let app: Electron.App = electron.app;
let dialog: Electron.Dialog = electron.dialog;
let mainWindow: BrowserWindow = undefined;

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

function getConfigFileName(): string {
	'use strict';
	return app.getPath('userData') + "/config.json";
}

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

app.on('ready', createWindow);
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
app.on('activate', () => {
	if (mainWindow === undefined) {
		createWindow();
	}
});
const MESSAGE_TYPE_MESSAGE: string = "message";
const MESSAGE_TYPE_BALLOON: string = "balloon";
const MESSAGE_TYPE_ANNOUNCE: string = "announce";
const MESSAGE_TYPE_LIKES: string = "likes";
interface IMessage {
	type: string;
	message: string;
	nickname: string;
	id: number;
	timestamp: number;
}
interface IConfig {
	version: number;
	channelUrl: string;
	readChat: boolean;
	readMessage: boolean;
	readBalloon: boolean;
	readAnnounce: boolean;
	readNickname: boolean;
	readLikes: boolean;
}
let config: IConfig;
let ipcMain: IPCMain = electron.ipcMain;
ipcMain.on("message", (event: IPCMainEvent, arg: string) => {
	let messages: IMessage[] = JSON.parse(arg);
	messages.forEach((message: IMessage) => {
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
			if (config.readNickname) {
				text += " " + message.nickname;
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
ipcMain.on("setConfig", (event: IPCMainEvent, arg: string) => {
	config = JSON.parse(arg);
	config.version = 1;
	fs.writeFileSync(getConfigFileName(), JSON.stringify(config));
});
ipcMain.on("getConfig", (event: IPCMainEvent) => {
	event.sender.send("getConfig", JSON.stringify(config));
});
const defaultConfig: IConfig = {
	version: 1,
	channelUrl: "",
	readChat: true,
	readMessage: true,
	readBalloon: true,
	readAnnounce: true,
	readNickname: false,
	readLikes: true,
};
try {
	let configText: string = fs.readFileSync(getConfigFileName(), "utf8");
	config = _.defaults<IConfig, IConfig>(JSON.parse(configText), defaultConfig);
} catch (e) {
	config = defaultConfig;
}
