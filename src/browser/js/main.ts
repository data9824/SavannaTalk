/// <reference path="../../../typings/index.d.ts" />
/// <reference path="../../../node_modules/vue-class-component/index.d.ts" />

import * as Vue from 'vue';
import * as VueRouter from 'vue-router';
import VueComponent from 'vue-class-component';
import * as $ from 'jquery';
import * as electron from 'electron';
import IpcRenderer = Electron.IpcRenderer;
declare var componentHandler: any;
let dateFormat: Function = require('dateformat');

Vue.use(VueRouter);
let appRouter: any = new VueRouter();
let ipcRenderer: IpcRenderer = electron.ipcRenderer;
let clipboard: Electron.Clipboard = electron.clipboard;

const MESSAGE_TYPE_MESSAGE: number = 1;
const MESSAGE_TYPE_BALLOON: number = 2;
const MESSAGE_TYPE_ANNOUNCE: number = 3;
const MESSAGE_TYPE_LIKES: number = 4;
const MESSAGE_TYPE_VIEWER: number = 5;
const scrollDuration: number = 100;

interface IMessage {
	channelId: number;
	timestamp: number;
	type: number;
	message: string;
	nickname: string;
	userId: number;
}

interface IStatus {
	viewers: number;
	likes: number;
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

function getChannelIdFromUrl(url: string): number {
	'use strict';
	let channelId: number = undefined;
	let match: RegExpMatchArray = url.match(/(\d+)#?.*$/);
	if (match) {
		channelId = parseInt(match[1], 10);
	}
	return channelId;
}

@VueComponent({
	template: `
		<div class="urlBar">
			<div class="urlText mdl-textfield mdl-js-textfield">
				<input class="mdl-textfield__input" type="text" placeholder="放送のURL" id="channelUrl" v-model="channelUrl" v-on:change="changeConfig">
				<label class="mdl-textfield__label" for="channelUrl"></label>
			</div>
			<button class="mdl-button mdl-js-button mdl-js-ripple-effect" v-on:click="onPaste"><i class="fa fa-clipboard"></i> 貼り付け</button>
			<button class="mdl-button mdl-js-button mdl-js-ripple-effect" v-on:click="inputUrl">OK</button>
			<label class="readChat mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="readChat">
				<input type="checkbox" id="readChat" class="mdl-checkbox__input" v-model="readChat" v-on:change="changeConfig">
				<span class="mdl-checkbox__label">読み上げ</span>
			</label>
		</div>

		<div class="mainTab mdl-tabs mdl-js-tabs mdl-js-ripple-effect">
			<div class="mainTabBar mdl-tabs__tab-bar">
				<a href="#broadcast-panel" class="mdl-tabs__tab is-active">放送</a>
				<a href="#chat-panel" class="mdl-tabs__tab">チャット</a>
				<a href="#settings-panel" class="mdl-tabs__tab">設定</a>
			</div>

			<div class="mdl-tabs__panel is-active" id="broadcast-panel">
				<webview v-el:webview plugins nodeintegration></webview>
			</div>
			<div class="mdl-tabs__panel" id="chat-panel">
				<div class="chatLogs" v-el:chatlogs>
				</div>
				<div class="postForm">
					<form v-on:submit.prevent="onPost">
						<div class="postText mdl-textfield mdl-js-textfield">
							<input class="mdl-textfield__input" type="text" placeholder="投稿内容" id="post" v-model="post">
							<label class="mdl-textfield__label" for="post"></label>
						</div>
						<input type="submit" value="投稿" class="mdl-button mdl-js-button mdl-js-ripple-effect">
						<label class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect" for="autoScrollCheck" id="autoScrollCheckLabel">
							<input type="checkbox" id="autoScrollCheck" class="mdl-icon-toggle__input" checked v-model="autoScroll">
							<i class="mdl-icon-toggle__label material-icons">play_arrow</i>
						</label>
						<div class="mdl-tooltip mdl-tooltip--top" for="autoScrollCheckLabel">自動スクロール</div>
					</form>
				</div>
			</div>
			<div class="mdl-tabs__panel" id="settings-panel">
				<div>バージョン 20160929</div>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="showViewer">
					<input type="checkbox" id="showViewer" class="mdl-checkbox__input" v-model="showViewer" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">入退場を表示する</span>
				</label>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="showLikes">
					<input type="checkbox" id="showLikes" class="mdl-checkbox__input" v-model="showLikes" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">いいねを表示する</span>
				</label>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="readMessage">
					<input type="checkbox" id="readMessage" class="mdl-checkbox__input" v-model="readMessage" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">チャットを読む</span>
				</label>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="readBalloon">
					<input type="checkbox" id="readBalloon" class="mdl-checkbox__input" v-model="readBalloon" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">星風船を読む</span>
				</label>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="readAnnounce">
					<input type="checkbox" id="readAnnounce" class="mdl-checkbox__input" v-model="readAnnounce" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">アナウンスを読む</span>
				</label>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="readViewer">
					<input type="checkbox" id="readViewer" class="mdl-checkbox__input" v-model="readViewer" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">入退場を読む</span>
				</label>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="readNickname">
					<input type="checkbox" id="readNickname" class="mdl-checkbox__input" v-model="readNickname" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">ニックネームを読む</span>
				</label>
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="readLikes">
					<input type="checkbox" id="readLikes" class="mdl-checkbox__input" v-model="readLikes" v-on:change="changeConfig">
					<span class="mdl-checkbox__label">いいねを読む</span>
				</label>
				<div>文字サイズ</div>
				<div class="mdl-textfield mdl-js-textfield">
					<input class="mdl-textfield__input" type="text" placeholder="文字サイズ" id="fontSize" v-model="fontSize" v-on:change="changeConfig">
					<label class="mdl-textfield__label" for="fontSize"></label>
				</div>
			</div>
		</div>
		<div id="toastContainer" class="mdl-js-snackbar mdl-snackbar">
			<div class="mdl-snackbar__text"></div>
			<button class="mdl-snackbar__action" type="button"></button>
		</div>
	`,
})
class LoginView extends Vue {
	private channelUrl: string;
	private readChat: boolean;
	private readMessage: boolean;
	private readBalloon: boolean;
	private readAnnounce: boolean;
	private readViewer: boolean;
	private readNickname: boolean;
	private readLikes: boolean;
	private showViewer: boolean;
	private showLikes: boolean;
	private fontSize: number;
	private post: string;
	private autoScroll: boolean;
	private scrollStartTime: number;
	private scrollStartPosition: number;
	private scrollEndTime: number;
	private scrollEndPosition: number;
	private scrollTimerId: number = undefined;
	private errorTimerId: number = undefined;
	public data(): any {
		return {
			channelUrl: '',
			readChat: false,
			readMessage: false,
			readBalloon: false,
			readAnnounce: false,
			readViewer: false,
			readNickname: false,
			readLikes: false,
			showViewer: false,
			showLikes: false,
			fontSize: 0,
			post: "",
			autoScroll: true,
		};
	}
	public onPaste(): void {
		this.channelUrl = clipboard.readText("selection").trim();
		this.changeConfig();
	}
	public changeConfig(): void {
		let config: IConfig = {
			version: 1,
			channelUrl: this.channelUrl,
			readChat: this.readChat,
			readMessage: this.readMessage,
			readBalloon: this.readBalloon,
			readAnnounce: this.readAnnounce,
			readViewer: this.readViewer,
			readNickname: this.readNickname,
			readLikes: this.readLikes,
			showViewer: this.showViewer,
			showLikes: this.showLikes,
			fontSize: this.fontSize,
		};
		ipcRenderer.send("setConfig", JSON.stringify(config));
		this.updateView();
	}
	public inputUrl(): void {
		this.changeConfig();
		let webview: any = this.$els['webview'];
		webview.executeJavaScript(`
			window.removeEventListener("beforeunload", onBeforeUnload);
		`);
		webview.setAttribute("src", 'webview.html?' + encodeURIComponent(this.channelUrl));
	}
	public onPost(): void {
		let webview: any = this.$els['webview'];
		if (this.post === "") {
			return;
		}
		let guestJs: string = `
			(function() {
				var iframe = document.getElementById("iframe").contentWindow.document.getElementById('frameChat');
				if (!iframe) {
					window.alert("frameChatが見つかりません。");
					return;
				}
				var input = iframe.contentWindow.document.getElementById("input");
				if (!input) {
					window.alert("inputが見つかりません。");
					return;
				}
				input.textContent = "` + this.escapeJs(this.post) + `";
				var event = {
					preventDefault: function() {}
				};
				iframe.contentWindow.chatInterface.onsubmit(event);
			})();
		`;
		webview.executeJavaScript(guestJs);
		this.post = "";
	}
	public attached(): void {
		componentHandler.upgradeDom();
		ipcRenderer.on("getConfig", (e: any, arg: string) => {
			let config: IConfig = JSON.parse(arg);
			this.channelUrl = config.channelUrl;
			this.readChat = config.readChat;
			this.readMessage = config.readMessage;
			this.readBalloon = config.readBalloon;
			this.readAnnounce = config.readAnnounce;
			this.readViewer = config.readViewer;
			this.readNickname = config.readNickname;
			this.readLikes = config.readLikes;
			this.showViewer = config.showViewer;
			this.showLikes = config.showLikes;
			this.fontSize = config.fontSize;
			this.updateCheck(document.getElementById("readChat"), this.readChat);
			this.updateCheck(document.getElementById("readMessage"), this.readMessage);
			this.updateCheck(document.getElementById("readBalloon"), this.readBalloon);
			this.updateCheck(document.getElementById("readAnnounce"), this.readAnnounce);
			this.updateCheck(document.getElementById("readViewer"), this.readViewer);
			this.updateCheck(document.getElementById("readNickname"), this.readNickname);
			this.updateCheck(document.getElementById("readLikes"), this.readLikes);
			this.updateCheck(document.getElementById("showViewer"), this.showViewer);
			this.updateCheck(document.getElementById("showLikes"), this.showLikes);
			this.updateView();
		});
		ipcRenderer.on("getChatLogs", (e: any, arg: string) => {
			let message: IMessage = JSON.parse(arg);
			// TODO: check channel
			this.addMessageLog(message);
		});
		ipcRenderer.on("error", (e: any, arg: string) => {
			this.showErrorMessage(arg);
		});
		ipcRenderer.send("getConfig");
		let webview: any = this.$els['webview'];
		webview.addEventListener('ipc-message', (event: any) => {
			if (event.channel === "message") {
				let messages: IMessage[] = JSON.parse(event.args[0]);
				messages.forEach((message: IMessage) => {
					this.addMessageLog(message);
				});
				ipcRenderer.send("message", event.args[0]);
			} else if (event.channel === "status") {
				let status: IStatus = JSON.parse(event.args[0]);
				document.title = "SavannaTalk 来場者数(" + status.viewers + ") いいね(" + status.likes + ")";
			}
		});
		webview.addEventListener("did-finish-load", () => {
			// webview.openDevTools();
			this.updateChatLogs(webview.getURL());
			let guestJs: string = `
function getLikes() {
	var likecnt = document.getElementById("iframe").contentWindow.document.getElementById('like_cnt');
	if (likecnt) {
		var result = parseInt(likecnt.textContent.replace(/[^0-9]/g, ""));
		return isNaN(result) ? 0 : result;
	} else {
		return 0;
	}
}
function getViewers() {
	var liveViewer = document.getElementById("iframe").contentWindow.document.getElementById("live_viewer");
	if (liveViewer) {
		var result = parseInt(liveViewer.textContent.replace(/[^0-9]/g, ""));
		return isNaN(result) ? 0 : result;
	} else {
		return 0;
	}
}
function difference(x, y) {
	var result = {};
	Object.keys(x).forEach((key) => {
		if (!(key in y)) {
			result[key] = x[key];
		}
	});
	return result;
}
var savannaTalkIpcRenderer = require('electron').ipcRenderer;
var savannaTalkMessages = [];
var savannaTalkLikes = getLikes();
var savannaTalkViewers = {};
var savannaTalkLastViewerCheckTime = Date.now();
window.setInterval(function() {
	var now = Date.now();
	var iframe = document.getElementById("iframe").contentWindow.document.getElementById('frameChat');
	if (iframe === null) {
		return;
	}
	var messages = [];
	var chatOutput = iframe.contentWindow.document.querySelector("#chatOutput");
	if (chatOutput === null) {
		return;
	}
	var children = chatOutput.children;
	for (var i = 1; i < children.length; ++i) { // starts from 1 to skip the first welcome message
		if (children.item(i).tagName.toLowerCase() === "dl") {
			var dd = children.item(i).querySelector("dd");
			var dta = children.item(i).querySelector("dt a");
			messages.push({
				type: ` + MESSAGE_TYPE_MESSAGE + `,
				message: (dd === null) ? "コメントを読めません。" : dd.textContent,
				nickname: (dta === null) ? "ニックネームを読めません。" : dta.textContent,
				userId: (dta === null || !dta.hasAttribute("data-id")) ? undefined : parseInt(dta.getAttribute("data-id"), 10),
			});
		} else if (children.item(i).getAttribute("class") === "balloon_area") {
			var text = children.item(i).querySelector(".bal_txt");
			var strong = children.item(i).querySelector("strong");
			if (text === null || strong === null) {
				messages.push({
					type: ` + MESSAGE_TYPE_BALLOON + `,
					message: "星風船を読めません。",
					nickname: "",
					userId: undefined,
				});
			} else {
				messages.push({
					type: ` + MESSAGE_TYPE_BALLOON + `,
					message: text.textContent,
					nickname: strong.textContent.replace(/\\(\\d+\\)$/, ""),
					userId: parseInt(strong.textContent.match(/\\((\\d+)\\)$/)[1], 10),
				});
			}
		} else if (children.item(i).getAttribute("class") === "run_area") {
			var box = children.item(i).querySelector(".box");
			messages.push({
				type: ` + MESSAGE_TYPE_ANNOUNCE + `,
				message: (box === null) ? "メッセージを読めません。" : box.textContent,
				nickname: "",
				userId: undefined,
			});
		}
	}
	if (savannaTalkMessages.length > messages.length) {
		// 放送が再開された場合は、コメント欄がクリアされるので、 savannaTalkMessages もクリアする。
		savannaTalkMessages.length = 0;
	}
	var channelId = undefined;
	var match = location.href.match(/(\\d+)#?.*$/);
	if (match) {
		channelId = parseInt(match[1], 10);
	}
	var newMessages = [];
	for (var i = savannaTalkMessages.length; i < messages.length; ++i) {
		messages[i].channelId = channelId;
		messages[i].timestamp = now;
		newMessages.push(messages[i]);
	}
	var specialMessages = [];
	var newLikes = getLikes();
	if (savannaTalkLikes < newLikes) {
		specialMessages.push({
			channelId: channelId,
			timestamp: now,
			type: ` + MESSAGE_TYPE_LIKES + `,
			message: "いいねされました。",
			nickname: "",
			userId: undefined,
		});
	}
	if (now - savannaTalkLastViewerCheckTime > 1000) {
		savannaTalkLastViewerCheckTime = now;
		var list = iframe.contentWindow.chatInterface.send({channel: {cmd:"userList"}});
		if (list !== null) {
			var viewers = {};
			Object.keys(list.channel.data).forEach((key) => {
				list.channel.data[key].forEach((user) => {
					viewers[parseInt(user.id.match(/^(\\d+)/)[1], 10)] = user.nickname;
				});
			});
			if (Object.keys(savannaTalkViewers).length !== 0) {
				var enteredViewers = difference(viewers, savannaTalkViewers);
				var leftViewers = difference(savannaTalkViewers, viewers);
				Object.keys(enteredViewers).forEach((key) => {
					specialMessages.push({
						channelId: channelId,
						timestamp: now,
						type: ` + MESSAGE_TYPE_VIEWER + `,
						message: "チャットに入場しました。",
						nickname: enteredViewers[key],
						userId: key,
					});
				});
				Object.keys(leftViewers).forEach((key) => {
					specialMessages.push({
						channelId: channelId,
						timestamp: now,
						type: ` + MESSAGE_TYPE_VIEWER + `,
						message: "チャットから退場しました。",
						nickname: leftViewers[key],
						userId: key,
					});
				});
			}
			savannaTalkViewers = viewers;
		}
	}
	savannaTalkLikes = newLikes;
	savannaTalkIpcRenderer.sendToHost("message", JSON.stringify(newMessages.concat(specialMessages)));
	savannaTalkMessages = savannaTalkMessages.concat(newMessages);
	savannaTalkIpcRenderer.sendToHost("status", JSON.stringify({
		likes: getLikes(),
		viewers: getViewers(),
	}));
}, 100);
`;
			webview.executeJavaScript(guestJs);
			if (this.errorTimerId !== undefined) {
				clearTimeout(this.errorTimerId);
				this.errorTimerId = undefined;
			}
		});
	}
	public detached(): void {
	}
	private updateUrl(url: string): void {
		this.channelUrl = url;
		this.changeConfig();
		if (this.errorTimerId !== undefined) {
			clearTimeout(this.errorTimerId);
			this.errorTimerId = undefined;
		}
		this.errorTimerId = setTimeout(this.showLoadError.bind(this), 5000);
	}
	private updateView(): void {
		let chatLogs: HTMLDivElement = this.$els["chatlogs"];
		chatLogs.style.fontSize = this.fontSize + "pt";
	}
	private updateChatLogs(url: string): void {
		let chatLogs: HTMLDivElement = this.$els["chatlogs"];
		chatLogs.innerHTML = "";
		let channelId: number = getChannelIdFromUrl(url);
		if (channelId === undefined) {
			return;
		}
		ipcRenderer.send("acquireChannelWriteLock", JSON.stringify({channelId: channelId}));
		ipcRenderer.send("getChatLogs", JSON.stringify({channelId: channelId}));
	}
	private showLoadError(): void {
		this.showErrorMessage("チャットを読み込めません。OKボタンを押してリロードしてみてください。");
	}
	private showErrorMessage(text: string): void {
		let snackbarContainer: any = document.getElementById("toastContainer");
		if (snackbarContainer.MaterialSnackbar.queuedNotifications_.length === 0) {
			snackbarContainer.MaterialSnackbar.showSnackbar({
				message: text,
				timeout: 5000,
			});
		}
	}
	private updateCheck(element: HTMLElement, checked: boolean): void {
		(element.parentElement as any).MaterialCheckbox[checked ? "check" : "uncheck"]();
	}
	private escapeJs(str: string): string {
		return str
			.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'")
			.replace(/"/g, '\\"')
			.replace(/\//g, '\\/')
			.replace(/</g, '\\x3c')
			.replace(/>/g, '\\x3e')
			.replace(/(0x0D)/g, '\r')
			.replace(/(0x0A)/g, '\n');
	};
	private getDefaultIconUrl(): string {
		return "images/transparent.png";
	}
	private addMessageLog(message: IMessage): void {
		if (!this.showViewer && message.type === MESSAGE_TYPE_VIEWER) {
			return;
		}
		if (!this.showLikes && message.type === MESSAGE_TYPE_LIKES) {
			return;
		}
		let chatLogs: HTMLDivElement = this.$els["chatlogs"];
		let chatLog: HTMLDivElement = document.createElement("div");
		if (message.type === MESSAGE_TYPE_MESSAGE) {
			chatLog.setAttribute("class", "chatLog");
		} else {
			chatLog.setAttribute("class", "chatLog chatSystemLog");
		}
		let timestamp: HTMLDivElement = document.createElement("div");
		timestamp.setAttribute("class", "timestamp");
		timestamp.appendChild(document.createTextNode(dateFormat(new Date(message.timestamp), "HH:MM:ss")));
		chatLog.appendChild(timestamp);
		let img: HTMLImageElement = document.createElement("img");
		img.setAttribute("class", "image");
		if (message.userId !== undefined) {
			img.addEventListener("error", () => {
				img.src = this.getDefaultIconUrl();
			});
			let dir: number = ~~Math.floor(message.userId / 1000000);
			img.src = "http://usercontents.afreecatv.jp/LOGO/channel/"
				+ dir + "/" + message.userId + "/" + message.userId + ".jpg";
		} else {
			img.src = this.getDefaultIconUrl();
		}
		chatLog.appendChild(img);
		let nickname: HTMLDivElement = document.createElement("div");
		nickname.setAttribute("class", "nickname");
		nickname.appendChild(document.createTextNode(message.nickname));
		chatLog.appendChild(nickname);
		let messageEl: HTMLDivElement = document.createElement("div");
		messageEl.setAttribute("class", "message");
		let text: string = message.message;
		while (text.length > 0) {
			(function() {
				let match: RegExpMatchArray = text.match(/https?:\/\/[\-_\.!~*'\(\)a-zA-Z0-9;/\?:@&=\+\$,%#]+/);
				if (match === null) {
					messageEl.appendChild(document.createTextNode(text));
					text = "";
				} else {
					messageEl.appendChild(document.createTextNode(text.substr(0, match.index)));
					let span: HTMLSpanElement = document.createElement("span");
					span.setAttribute("class", "chatLogUrl");
					span.appendChild(document.createTextNode(match[0]));
					span.addEventListener("click", (event: MouseEvent) => {
						event.preventDefault();
						let menu: Electron.Menu = new electron.remote.Menu();
						menu.append(new electron.remote.MenuItem({
							label: "コピー",
							click: () => {
								electron.clipboard.writeText(match[0], "selection");
							},
						}));
						menu.popup(electron.remote.getCurrentWindow());
					});
					messageEl.appendChild(span);
					text = text.substr(match.index + match[0].length);
				}
			})();
		}
		chatLog.appendChild(messageEl);
		chatLogs.appendChild(chatLog);
		if (this.autoScroll) {
			let now: number = Date.now();
			this.scrollStartTime = now;
			this.scrollStartPosition = chatLogs.scrollTop;
			this.scrollEndTime = now + scrollDuration;
			this.scrollEndPosition = chatLogs.scrollHeight - chatLogs.clientHeight;
			if (this.scrollTimerId === undefined) {
				this.scrollTimerId = window.setTimeout(this.onScroll.bind(this), 10);
			}
		}
	}
	private onScroll(): void {
		let chatLogs: HTMLDivElement = this.$els["chatlogs"];
		let now: number = Date.now();
		let elapsed: number = Math.max(0, Math.min(now - this.scrollStartTime, scrollDuration));
		let currentPosition: number = this.scrollStartPosition
			+ ~~((this.scrollEndPosition - this.scrollStartPosition) * elapsed / scrollDuration);
		chatLogs.scrollTop = currentPosition;
		if (elapsed < scrollDuration) {
			this.scrollTimerId = window.setTimeout(this.onScroll.bind(this), 10);
		} else {
			this.scrollTimerId = undefined;
		}
	}
}
@VueComponent({})
class App extends Vue {
}

appRouter.map({
	'/': {
		component: LoginView,
	},
});

$(function() {
	appRouter.start(App, '#content');
});
