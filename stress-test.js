"use strict";

window.onload = function () {
    document.getElementById('entryform').onsubmit = function(e) {
        e.preventDefault();

        try {
            clearOutput();
            clearErrors();
            createClient(
                document.getElementById('input-user-id').value,
                document.getElementById('input-password').value,
                document.getElementById('input-server').value,
                document.getElementById('input-room').value
            );
        } catch (e) {
            showError(e);
        }

        return false;
    }

    if (localStorage["creds"] && localStorage["hs"] && localStorage["room_id"]) {
        var creds = JSON.parse(localStorage["creds"]);
        document.getElementById('input-user-id').value = creds.user_id;
        document.getElementById('input-server').value = localStorage["hs"];
        document.getElementById('input-room').value = localStorage["room_id"];
        createClientFromCreds(localStorage["hs"], creds, localStorage["room_id"]);
    }
};

var clientInstance = null;
function createClient(user, pass, srv, room_id) {
    if (clientInstance) {
        clientInstance.stop();
        clientInstance = null;
    }

    var tmpClient = matrixcs.createClient({
        baseUrl: srv,
    });

    tmpClient.loginWithPassword(user, pass).then((r) => {
        addOutput("Logged in as " + r.user_id + ":" + r.device_id);
        localStorage["hs"] = srv;
        localStorage["creds"] = JSON.stringify(r);
        localStorage["room_id"] = room_id;
        createClientFromCreds(srv, r, room_id);
    }).catch(showError).done();
}

function createClientFromCreds(srv, creds, room_id) {
    var matrixClient = matrixcs.createClient({
        baseUrl: srv,
        accessToken: creds.access_token,
        userId: creds.user_id,
        deviceId: creds.device_id,
    });

    clientInstance = new ClientInstance(matrixClient, room_id);
    clientInstance.start();
}

class ClientInstance {
    constructor(matrixClient, roomId) {
        this._matrixClient = matrixClient;
        this._sendCallback = null;
        this._roomId = roomId;
        this._msgCounter = 0;
        this.doSend = this.doSend.bind(this);
    }

    start() {
        var syncState;
        this._matrixClient.on("sync", function(newstate) {
            if (newstate != syncState) {
                addOutput("** SYNC STATE *: " + newstate);
                syncState = newstate;
            }
        });
        this._matrixClient.on("Room.timeline",
            this.onRoomEvent.bind(this));
        this._matrixClient.startClient();
        this.startSending();
    }

    stopClient() {
        this._matrixClient.stopClient();
        this._matrixClient = null;
        this.startSending();
        setButtonAction("button-start", null);
        setButtonAction("button-stop", null);
    }

    startSending() {
        this._sendCallback = window.setTimeout(this.doSend, 10);

        setButtonAction("button-start", null);
        setButtonAction("button-stop", () => this.stopSending());
    }

    stopSending() {
        if (this._sendCallback !== null) {
            window.clearTimeout(this._sendCallback);
            this._sendCallback = null;
        }
        setButtonAction("button-start", () => this.startSending());
        setButtonAction("button-stop", null);
    }


    onRoomEvent(ev, room, toStartOfTimeline) {
        console.log("room event", arguments);
        if (ev.getType() == "m.room.message") {
            addOutput(room.name + ": " + ev.getContent().body);
        }
    }

    doSend() {
        this._sendCallback = null;
        console.log("send");
        this._matrixClient.sendTextMessage(this._roomId,
            "test " + (this._msgCounter++)
        ).catch(showError).done();

        this._sendCallback = window.setTimeout(
            this.doSend, Math.random() * 1000
        );
    }
}

function addOutput(msg) {
    var newDiv = document.createElement("div");
    var newContent = document.createTextNode(msg);
    newDiv.appendChild(newContent);

    var resultsDiv = document.getElementById("results");

    var atBottom = (
        resultsDiv.scrollHeight - resultsDiv.scrollTop - resultsDiv.clientHeight
    ) < 2;

    // add the newly created element and its content into the DOM
    resultsDiv.appendChild(newDiv);

    // scroll
    if (atBottom) {
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    }
}

function clearOutput() {
    var node = document.getElementById("results");
    while (node.hasChildNodes()) {
        node.removeChild(node.lastChild);
    }
}

function showError(e) {
    console.error(e);
    document.getElementById('errors').value = e.toString();
}

function clearErrors() {
    document.getElementById('errors').value = "";
}

function setButtonAction(id, callback) {
    var button = document.getElementById(id);
    button.disabled = !callback;
    button.onclick = callback;
}