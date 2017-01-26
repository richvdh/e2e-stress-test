"use strict";

window.onload = function () {
    document.getElementById('entryform').onsubmit = function(e) {
        e.preventDefault();

        clearOutput();
        clearErrors();
        createClient(
            document.getElementById('input-user-id').value,
            document.getElementById('input-password').value,
            document.getElementById('input-server').value
        );

        return false;
    }

    if (localStorage["creds"] && localStorage["hs"]) {
        var creds = JSON.parse(localStorage["creds"]);
        document.getElementById('input-user-id').value = creds.user_id;
        document.getElementById('input-server').value = localStorage["hs"];
        createClientFromCreds(localStorage["hs"], creds);
    }
};

var matrixClient;

function createClient(user, pass, srv) {
    if (matrixClient) {
        matrixClient.stopClient();
        matrixClient = null;
    }
    
    var tmpClient = matrixcs.createClient({
        baseUrl: srv,
    });

    tmpClient.loginWithPassword(user, pass).then((r) => {
        localStorage["hs"] = srv;
        localStorage["creds"] = JSON.stringify(r);
        createClientFromCreds(srv, r);
    }).catch(showError).done();
}

function createClientFromCreds(srv, creds) {
    matrixClient = matrixcs.createClient({
        baseUrl: srv,
        accessToken: creds.access_token,
        userId: creds.user_id,
        deviceId: creds.device_id,
    });

    matrixClient.on("Room.timeline", onRoomEvent);
    matrixClient.startClient();
}

function onRoomEvent(ev, room, toStartOfTimeline) {
    console.log("room event", arguments);
    if (ev.getType() == "m.room.message") {
        addOutput(room.name + ": " + ev.getContent().body);
    }
}

function addOutput(msg) {
  var newDiv = document.createElement("div"); 
  var newContent = document.createTextNode(msg); 
  newDiv.appendChild(newContent); //add the text node to the newly created div. 

  // add the newly created element and its content into the DOM 
  document.getElementById("results").appendChild(newDiv); 
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