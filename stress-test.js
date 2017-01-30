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
        localStorage.clear();
        localStorage["hs"] = srv;
        localStorage["creds"] = JSON.stringify(r);
        localStorage["room_id"] = room_id;
        createClientFromCreds(srv, r, room_id);
    }).catch(showError).done();
}

function createClientFromCreds(srv, creds, room_id) {
    var sessionStore = new matrixcs.WebStorageSessionStore(localStorage);
    var matrixClient = matrixcs.createClient({
        baseUrl: srv,
        accessToken: creds.access_token,
        userId: creds.user_id,
        deviceId: creds.device_id,
        sessionStore: sessionStore,
    });

    clientInstance = new ClientInstance(matrixClient, room_id);
    clientInstance.start();
}

class ClientInstance {
    constructor(matrixClient, roomId) {
        this._matrixClient = matrixClient;
        this._stopSending = null;
        this._roomId = roomId;
        this._msgCounter = 0;
    }

    start() {
        var syncState;
        var initialSynced = false;

        this._matrixClient.on("sync", (newstate) => {
            if (newstate == syncState) {
                return;
            }

            addOutput("** SYNC STATE: " + newstate);
            syncState = newstate;
            if (syncState === "PREPARED" && !initialSynced) {
                initialSynced = true;
                this.startSending();
            }
        });
        this._matrixClient.on("Room.timeline",
            this.onRoomEvent.bind(this));
        this._matrixClient.startClient({
            pendingEventOrdering: "detached",
        });
    }

    stop() {
        this.stopSending();
        this._matrixClient.stopClient();
        this._matrixClient = null;
        setButtonAction("button-start", null);
        setButtonAction("button-stop", null);
    }

    startSending() {
        if(!this._stopSending) {
            this.doSend();
        }

        setButtonAction("button-start", null);
        setButtonAction("button-stop", () => this.stopSending());
    }

    stopSending() {
        if (this._stopSending) {
            this._stopSending();
        }

        setButtonAction("button-start", () => this.startSending());
        setButtonAction("button-stop", null);
    }


    onRoomEvent(ev, room, toStartOfTimeline, removed, data) {
        console.log("room event", arguments);
        if (removed || toStartOfTimeline) {
            return;
        }
        if (ev.getType() == "m.room.message") {
            addOutput(room.name + ": " + ev.sender.name + ": " +
                ev.getContent().body);
        }
    }

    doSend() {
        var stopped = false;
        this._stopSending = function() {
            stopped = true;
            this._stopSending = null;
        }

        console.log("send");
        this._matrixClient.sendTextMessage(this._roomId,
            "test " + (this._msgCounter++)
        ).catch(showError).then(() => {
            // reload once every 10 messages
            if (Math.random() < 0.1) {
                console.log("reload");
                window.location.reload(false);
                return;
            }
        }).delay(Math.random() * 10000).then(() => {
            if (stopped) { return; }
            this.doSend();
        }).done();
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
