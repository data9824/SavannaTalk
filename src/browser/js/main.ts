/// <reference path="../../../typings/browser.d.ts" />
/// <reference path="../../../node_modules/vue-class-component/index.d.ts" />

import * as Vue from 'vue';
import * as VueRouter from 'vue-router';
import VueComponent from 'vue-class-component';
import * as $ from 'jquery';
import * as electron from 'electron';
import IpcRenderer = Electron.IpcRenderer;

Vue.use(VueRouter);
let appRouter: any = new VueRouter();
let ipcRenderer: IpcRenderer = require('electron').ipcRenderer;
let clipboard: Electron.Clipboard = require('electron').clipboard;

@VueComponent({
	template: `
		<div>
			<input type="button" v-on:click="onPaste" value="貼り付け">
			<input class="urlText" type="text" placeholder="放送のURL" v-model="url">
			<input type="button" v-on:click="inputUrl" value="OK">
			<label><input type="checkbox" v-model="readNickname" v-on:change="changeSettings">ニックネームを読む</label>
			<label><input type="checkbox" v-model="readLikes" v-on:change="changeSettings">いいねを読む</label>
		</div>
		<webview v-el:webview plugins nodeintegration></webview>
	`,
})
class LoginView extends Vue {
	private url: string;
	private readNickname: boolean;
	private readLikes: boolean;
	public data(): any {
		return {
			url: '',
			readNickname: false,
			readLikes: false,
		};
	}
	public onPaste(): void {
		this.url = clipboard.readText("selection");
	}
	public changeSettings(): void {
		ipcRenderer.send("settings", JSON.stringify({
			readNickname: this.readNickname,
			readLikes: this.readLikes,
		}));
	}
	public inputUrl(): void {
		let webview: any = this.$els['webview'];
		webview.setAttribute("src", this.url);
	}
	public attached(): void {
		let webview: any = this.$els['webview'];
		webview.addEventListener('ipc-message', function(event: any) {
			ipcRenderer.send("message", event.channel);
		});
		webview.addEventListener("did-stop-loading", () => {
			// webview.openDevTools();
			let guestJs: string = `
function getLikes() {
	var likecnt = document.getElementById('likecnt');
	if (likecnt) {
		return likecnt.textContent.replace(/[^0-9]/g, "");
	} else {
		return 0;
	}
}
var savannaTalkIpcRenderer = require('electron').ipcRenderer;
var savannaTalkMessages = [];
var savannaTalkLikes = getLikes();
window.setInterval(function() {
	var iframe = document.getElementById('frameChat');
	var messages = [];
	var chatOutput = iframe.contentWindow.document.querySelector("#chatOutput");
	var children = chatOutput.children;
	for (var i = 1; i < children.length; ++i) { // starts from 1 to skip the first welcome message
		if (children.item(i).tagName.toLowerCase() === "dl") {
			var dd = children.item(i).querySelector(".ps1");
			var dta = children.item(i).querySelector("dt a");
			messages.push({
				message: dd.innerText,
				nickname: dta.innerText,
			});
		} else if (children.item(i).getAttribute("class") === "balloon_area") {
			var text = children.item(i).querySelector(".bal_txt");
			var strong = children.item(i).querySelector("strong");
			messages.push({
				message: text.textContent + ' ' + strong.textContent.replace(/\\(\\d+\\)$/, ""),
				nickname: "",
			});
		} else if (children.item(i).getAttribute("class") === "run_area") {
			var box = children.item(i).querySelector(".box");
			messages.push({
				message: box.textContent,
				nickname: "",
			});
		}
	}
	var newMessages = [];
	for (var i = savannaTalkMessages.length; i < messages.length; ++i) {
		newMessages.push(messages[i]);
	}
	var specialMessages = [];
	var newLikes = getLikes();
	if (savannaTalkLikes < newLikes) {
		savannaTalkLikes = newLikes;
		specialMessages.push({
			message: "Eねされました。",
			nickname: "",
		});
	}
	savannaTalkIpcRenderer.sendToHost(JSON.stringify(newMessages.concat(specialMessages)));
	savannaTalkMessages = savannaTalkMessages.concat(newMessages);
}, 200);
`;
			webview.executeJavaScript(guestJs);
		});
	}
	public detached(): void {

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
