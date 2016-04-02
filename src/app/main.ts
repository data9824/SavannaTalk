/// <reference path="../../typings/browser.d.ts" />
import BrowserWindow = Electron.BrowserWindow;

import * as electron from 'electron';
import IPCMain = Electron.IPCMain;
import IPCMainEvent = Electron.IPCMainEvent;
import {Socket} from "net";
import {Stats} from "fs";
import {parse} from "querystring";
let net: any = require('net');
let fs: any = require('fs');

let app: Electron.App = electron.app;
let dialog: Electron.Dialog = electron.dialog;
let mainWindow: BrowserWindow = undefined;

function createWindow() {
	'use strict';
	let browserWindowOptions: Electron.BrowserWindowOptions = {
		width: 800,
		height: 600,
		webPreferences: {
			plugins: true,
		}
	};
	mainWindow = new electron.BrowserWindow(browserWindowOptions);
	mainWindow.setMenu(null);
	mainWindow.loadURL('file://' + __dirname + '/../browser/index.html');
//	mainWindow.webContents.openDevTools();
	mainWindow.on('closed', () => {
		mainWindow = undefined;
	});
}

function findFile(dir: string, fileName: string): string {
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

let flashPlayerDll: string = findFile("C:/Program Files (x86)/Google/Chrome", "pepflashplayer.dll");
if (flashPlayerDll === undefined) {
	dialog.showErrorBox("エラー", "pepflashplayer.dll が C:/Program Files (x86)/Google/Chrome 以下に見つかりません。")
	app.quit();
}
let manifestJson: string = flashPlayerDll.replace(/[^\\/]+$/, "manifest.json");
let manifest: any = JSON.parse(fs.readFileSync(manifestJson, "utf8"));
if (manifest["x-ppapi-arch"] !== "x64") {
	dialog.showErrorBox("エラー", "64ビット版のChromeがインストールされていません。")
	app.quit();
}
app.commandLine.appendSwitch('ppapi-flash-path', flashPlayerDll);
app.commandLine.appendSwitch('ppapi-flash-version', manifest["version"]);
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
interface IMessage {
	message: string;
	nickname: string;
}
interface ISettings {
	readNickname: boolean,
}
let settings: ISettings = {
	readNickname: false,
};
let ipcMain: IPCMain = require('electron').ipcMain;
ipcMain.on("message", (event: IPCMainEvent, arg: string) => {
	let messages: IMessage[] = JSON.parse(arg);
	messages.forEach((message: IMessage) => {
		let client: Socket = new net.Socket();
		client.setEncoding('binary');
		client.connect(50001, "localhost", () => {
			let text: string = message.message;
			if (settings.readNickname) {
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
ipcMain.on("settings", (event: IPCMainEvent, arg: string) => {
	settings = JSON.parse(arg);
});
