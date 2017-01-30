(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var matrixcs = require("./lib/matrix");
matrixcs.request(require("browser-request"));
module.exports = matrixcs; // keep export for browserify package deps
global.matrixcs = matrixcs;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./lib/matrix":17,"browser-request":39}],2:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * This is an internal module. MatrixBaseApis is currently only meant to be used
 * by {@link client~MatrixClient}.
 *
 * @module base-apis
 */

var httpApi = require("./http-api");
var utils = require("./utils");

/**
 * Low-level wrappers for the Matrix APIs
 *
 * @constructor
 *
 * @param {Object} opts Configuration options
 *
 * @param {string} opts.baseUrl Required. The base URL to the client-server
 * HTTP API.
 *
 * @param {string} opts.idBaseUrl Optional. The base identity server URL for
 * identity server requests.
 *
 * @param {Function} opts.request Required. The function to invoke for HTTP
 * requests. The value of this property is typically <code>require("request")
 * </code> as it returns a function which meets the required interface. See
 * {@link requestFunction} for more information.
 *
 * @param {string} opts.accessToken The access_token for this user.
 *
 * @param {Number=} opts.localTimeoutMs Optional. The default maximum amount of
 * time to wait before timing out HTTP requests. If not specified, there is no
 * timeout.
 *
 * @param {Object} opts.queryParams Optional. Extra query parameters to append
 * to all requests with this client. Useful for application services which require
 * <code>?user_id=</code>.
 *
 */
function MatrixBaseApis(opts) {
    utils.checkObjectHasKeys(opts, ["baseUrl", "request"]);

    this.baseUrl = opts.baseUrl;
    this.idBaseUrl = opts.idBaseUrl;

    var httpOpts = {
        baseUrl: opts.baseUrl,
        idBaseUrl: opts.idBaseUrl,
        accessToken: opts.accessToken,
        request: opts.request,
        prefix: httpApi.PREFIX_R0,
        onlyData: true,
        extraParams: opts.queryParams,
        localTimeoutMs: opts.localTimeoutMs
    };
    this._http = new httpApi.MatrixHttpApi(this, httpOpts);

    this._txnCtr = 0;
}

/**
 * Get the Homeserver URL of this client
 * @return {string} Homeserver URL of this client
 */
MatrixBaseApis.prototype.getHomeserverUrl = function () {
    return this.baseUrl;
};

/**
 * Get the Identity Server URL of this client
 * @return {string} Identity Server URL of this client
 */
MatrixBaseApis.prototype.getIdentityServerUrl = function () {
    return this.idBaseUrl;
};

/**
 * Get the access token associated with this account.
 * @return {?String} The access_token or null
 */
MatrixBaseApis.prototype.getAccessToken = function () {
    return this._http.opts.accessToken || null;
};

/**
 * @return {boolean} true if there is a valid access_token for this client.
 */
MatrixBaseApis.prototype.isLoggedIn = function () {
    return this._http.opts.accessToken !== undefined;
};

/**
 * Make up a new transaction id
 *
 * @return {string} a new, unique, transaction id
 */
MatrixBaseApis.prototype.makeTxnId = function () {
    return "m" + new Date().getTime() + "." + this._txnCtr++;
};

// Registration/Login operations
// =============================

/**
 * @param {string} username
 * @param {string} password
 * @param {string} sessionId
 * @param {Object} auth
 * @param {boolean} bindEmail
 * @param {string} guestAccessToken
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.register = function (username, password, sessionId, auth, bindEmail, guestAccessToken, callback) {
    if (auth === undefined) {
        auth = {};
    }
    if (sessionId) {
        auth.session = sessionId;
    }

    var params = {
        auth: auth
    };
    if (username !== undefined && username !== null) {
        params.username = username;
    }
    if (password !== undefined && password !== null) {
        params.password = password;
    }
    if (bindEmail !== undefined && bindEmail !== null) {
        params.bind_email = bindEmail;
    }
    if (guestAccessToken !== undefined && guestAccessToken !== null) {
        params.guest_access_token = guestAccessToken;
    }

    return this.registerRequest(params, undefined, callback);
};

/**
 * Register a guest account.
 * @param {Object=} opts Registration options
 * @param {Object} opts.body JSON HTTP body to provide.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.registerGuest = function (opts, callback) {
    opts = opts || {};
    opts.body = opts.body || {};
    return this.registerRequest(opts.body, "guest", callback);
};

/**
 * @param {Object} data   parameters for registration request
 * @param {string=} kind  type of user to register. may be "guest"
 * @param {module:client.callback=} callback
 * @return {module:client.Promise} Resolves: to the /register response
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.registerRequest = function (data, kind, callback) {
    var params = {};
    if (kind) {
        params.kind = kind;
    }

    return this._http.request(callback, "POST", "/register", params, data);
};

/**
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.loginFlows = function (callback) {
    return this._http.request(callback, "GET", "/login");
};

/**
 * @param {string} loginType
 * @param {Object} data
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.login = function (loginType, data, callback) {
    var login_data = {
        type: loginType
    };

    // merge data into login_data
    utils.extend(login_data, data);

    return this._http.authedRequest(callback, "POST", "/login", undefined, login_data);
};

/**
 * @param {string} user
 * @param {string} password
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.loginWithPassword = function (user, password, callback) {
    return this.login("m.login.password", {
        user: user,
        password: password
    }, callback);
};

/**
 * @param {string} relayState URL Callback after SAML2 Authentication
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.loginWithSAML2 = function (relayState, callback) {
    return this.login("m.login.saml2", {
        relay_state: relayState
    }, callback);
};

/**
 * @param {string} redirectUrl The URL to redirect to after the HS
 * authenticates with CAS.
 * @return {string} The HS URL to hit to begin the CAS login process.
 */
MatrixBaseApis.prototype.getCasLoginUrl = function (redirectUrl) {
    return this._http.getUrl("/login/cas/redirect", {
        "redirectUrl": redirectUrl
    }, httpApi.PREFIX_UNSTABLE);
};

/**
 * @param {string} token Login token previously received from homeserver
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.loginWithToken = function (token, callback) {
    return this.login("m.login.token", {
        token: token
    }, callback);
};

/**
 * Logs out the current session.
 * Obviously, further calls that require authorisation should fail after this
 * method is called. The state of the MatrixClient object is not affected:
 * it is up to the caller to either reset or destroy the MatrixClient after
 * this method succeeds.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: On success, the empty object
 */
MatrixBaseApis.prototype.logout = function (callback) {
    return this._http.authedRequest(callback, "POST", '/logout');
};

/**
 * Deactivates the logged-in account.
 * Obviously, further calls that require authorisation should fail after this
 * method is called. The state of the MatrixClient object is not affected:
 * it is up to the caller to either reset or destroy the MatrixClient after
 * this method succeeds.
 * @param {object} auth Optional. Auth data to supply for User-Interactive auth.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: On success, the empty object
 */
MatrixBaseApis.prototype.deactivateAccount = function (auth, callback) {
    var body = {};
    if (auth) {
        body = {
            auth: auth
        };
    }
    return this._http.authedRequestWithPrefix(callback, "POST", '/account/deactivate', undefined, body, httpApi.PREFIX_UNSTABLE);
};

/**
 * Get the fallback URL to use for unknown interactive-auth stages.
 *
 * @param {string} loginType     the type of stage being attempted
 * @param {string} authSessionId the auth session ID provided by the homeserver
 *
 * @return {string} HS URL to hit to for the fallback interface
 */
MatrixBaseApis.prototype.getFallbackAuthUrl = function (loginType, authSessionId) {
    var path = utils.encodeUri("/auth/$loginType/fallback/web", {
        $loginType: loginType
    });

    return this._http.getUrl(path, {
        session: authSessionId
    }, httpApi.PREFIX_R0);
};

// Room operations
// ===============

/**
 * Create a new room.
 * @param {Object} options a list of options to pass to the /createRoom API.
 * @param {string} options.room_alias_name The alias localpart to assign to
 * this room.
 * @param {string} options.visibility Either 'public' or 'private'.
 * @param {string[]} options.invite A list of user IDs to invite to this room.
 * @param {string} options.name The name to give this room.
 * @param {string} options.topic The topic to give this room.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: <code>{room_id: {string},
 * room_alias: {string(opt)}}</code>
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.createRoom = function (options, callback) {
    // valid options include: room_alias_name, visibility, invite
    return this._http.authedRequest(callback, "POST", "/createRoom", undefined, options);
};

/**
 * @param {string} roomId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.roomState = function (roomId, callback) {
    var path = utils.encodeUri("/rooms/$roomId/state", { $roomId: roomId });
    return this._http.authedRequest(callback, "GET", path);
};

/**
 * Retrieve a state event.
 * @param {string} roomId
 * @param {string} eventType
 * @param {string} stateKey
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getStateEvent = function (roomId, eventType, stateKey, callback) {
    var pathParams = {
        $roomId: roomId,
        $eventType: eventType,
        $stateKey: stateKey
    };
    var path = utils.encodeUri("/rooms/$roomId/state/$eventType", pathParams);
    if (stateKey !== undefined) {
        path = utils.encodeUri(path + "/$stateKey", pathParams);
    }
    return this._http.authedRequest(callback, "GET", path);
};

/**
 * @param {string} roomId
 * @param {string} eventType
 * @param {Object} content
 * @param {string} stateKey
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.sendStateEvent = function (roomId, eventType, content, stateKey, callback) {
    var pathParams = {
        $roomId: roomId,
        $eventType: eventType,
        $stateKey: stateKey
    };
    var path = utils.encodeUri("/rooms/$roomId/state/$eventType", pathParams);
    if (stateKey !== undefined) {
        path = utils.encodeUri(path + "/$stateKey", pathParams);
    }
    return this._http.authedRequest(callback, "PUT", path, undefined, content);
};

/**
 * @param {string} roomId
 * @param {string} eventId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.redactEvent = function (roomId, eventId, callback) {
    var path = utils.encodeUri("/rooms/$roomId/redact/$eventId", {
        $roomId: roomId,
        $eventId: eventId
    });
    return this._http.authedRequest(callback, "POST", path, undefined, {});
};

/**
 * @param {string} roomId
 * @param {Number} limit
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.roomInitialSync = function (roomId, limit, callback) {
    if (utils.isFunction(limit)) {
        callback = limit;limit = undefined;
    }
    var path = utils.encodeUri("/rooms/$roomId/initialSync", { $roomId: roomId });
    if (!limit) {
        limit = 30;
    }
    return this._http.authedRequest(callback, "GET", path, { limit: limit });
};

// Room Directory operations
// =========================

/**
 * @param {Object} options Options for this request
 * @param {string} options.server The remote server to query for the room list.
 *                                Optional. If unspecified, get the local home
 *                                server's public room list.
 * @param {number} options.limit Maximum number of entries to return
 * @param {string} options.since Token to paginate from
 * @param {object} options.filter Filter parameters
 * @param {string} options.filter.generic_search_term String to search for
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.publicRooms = function (options, callback) {
    if (typeof options == 'function') {
        callback = options;
        options = {};
    }
    if (options === undefined) {
        options = {};
    }

    var query_params = {};
    if (options.server) {
        query_params.server = options.server;
        delete options.server;
    }

    if (Object.keys(options).length === 0 && Object.keys(query_params).length === 0) {
        return this._http.authedRequest(callback, "GET", "/publicRooms");
    } else {
        return this._http.authedRequest(callback, "POST", "/publicRooms", query_params, options);
    }
};

/**
 * Create an alias to room ID mapping.
 * @param {string} alias The room alias to create.
 * @param {string} roomId The room ID to link the alias to.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.createAlias = function (alias, roomId, callback) {
    var path = utils.encodeUri("/directory/room/$alias", {
        $alias: alias
    });
    var data = {
        room_id: roomId
    };
    return this._http.authedRequest(callback, "PUT", path, undefined, data);
};

/**
 * Delete an alias to room ID mapping.  This alias must be on your local server
 * and you must have sufficient access to do this operation.
 * @param {string} alias The room alias to delete.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.deleteAlias = function (alias, callback) {
    var path = utils.encodeUri("/directory/room/$alias", {
        $alias: alias
    });
    return this._http.authedRequest(callback, "DELETE", path, undefined, undefined);
};

/**
 * Get room info for the given alias.
 * @param {string} alias The room alias to resolve.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: Object with room_id and servers.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getRoomIdForAlias = function (alias, callback) {
    // TODO: deprecate this or resolveRoomAlias
    var path = utils.encodeUri("/directory/room/$alias", {
        $alias: alias
    });
    return this._http.authedRequest(callback, "GET", path);
};

/**
 * @param {string} roomAlias
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.resolveRoomAlias = function (roomAlias, callback) {
    // TODO: deprecate this or getRoomIdForAlias
    var path = utils.encodeUri("/directory/room/$alias", { $alias: roomAlias });
    return this._http.request(callback, "GET", path);
};

/**
 * Get the visibility of a room in the current HS's room directory
 * @param {string} roomId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getRoomDirectoryVisibility = function (roomId, callback) {
    var path = utils.encodeUri("/directory/list/room/$roomId", {
        $roomId: roomId
    });
    return this._http.authedRequest(callback, "GET", path);
};

/**
 * Set the visbility of a room in the current HS's room directory
 * @param {string} roomId
 * @param {string} visibility "public" to make the room visible
 *                 in the public directory, or "private" to make
 *                 it invisible.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.setRoomDirectoryVisibility = function (roomId, visibility, callback) {
    var path = utils.encodeUri("/directory/list/room/$roomId", {
        $roomId: roomId
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, { "visibility": visibility });
};

/**
 * Set the visbility of a room bridged to a 3rd party network in
 * the current HS's room directory.
 * @param {string} networkId the network ID of the 3rd party
 *                 instance under which this room is published under.
 * @param {string} roomId
 * @param {string} visibility "public" to make the room visible
 *                 in the public directory, or "private" to make
 *                 it invisible.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.setRoomDirectoryVisibilityAppService = function (networkId, roomId, visibility, callback) {
    var path = utils.encodeUri("/directory/list/appservice/$networkId/$roomId", {
        $networkId: networkId,
        $roomId: roomId
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, { "visibility": visibility });
};

// Media operations
// ================

/**
 * Upload a file to the media repository on the home server.
 *
 * @param {object} file The object to upload. On a browser, something that
 *   can be sent to XMLHttpRequest.send (typically a File).  Under node.js,
 *   a a Buffer, String or ReadStream.
 *
 * @param {object} opts  options object
 *
 * @param {string=} opts.name   Name to give the file on the server. Defaults
 *   to <tt>file.name</tt>.
 *
 * @param {string=} opts.type   Content-type for the upload. Defaults to
 *   <tt>file.type</tt>, or <tt>applicaton/octet-stream</tt>.
 *
 * @param {boolean=} opts.rawResponse Return the raw body, rather than
 *   parsing the JSON. Defaults to false (except on node.js, where it
 *   defaults to true for backwards compatibility).
 *
 * @param {boolean=} opts.onlyContentUri Just return the content URI,
 *   rather than the whole body. Defaults to false (except on browsers,
 *   where it defaults to true for backwards compatibility). Ignored if
 *   opts.rawResponse is true.
 *
 * @param {Function=} opts.callback Deprecated. Optional. The callback to
 *    invoke on success/failure. See the promise return values for more
 *    information.
 *
 * @return {module:client.Promise} Resolves to response object, as
 *    determined by this.opts.onlyData, opts.rawResponse, and
 *    opts.onlyContentUri.  Rejects with an error (usually a MatrixError).
 */
MatrixBaseApis.prototype.uploadContent = function (file, opts) {
    return this._http.uploadContent(file, opts);
};

/**
 * Cancel a file upload in progress
 * @param {module:client.Promise} promise The promise returned from uploadContent
 * @return {boolean} true if canceled, otherwise false
 */
MatrixBaseApis.prototype.cancelUpload = function (promise) {
    return this._http.cancelUpload(promise);
};

/**
 * Get a list of all file uploads in progress
 * @return {array} Array of objects representing current uploads.
 * Currently in progress is element 0. Keys:
 *  - promise: The promise associated with the upload
 *  - loaded: Number of bytes uploaded
 *  - total: Total number of bytes to upload
 */
MatrixBaseApis.prototype.getCurrentUploads = function () {
    return this._http.getCurrentUploads();
};

// Profile operations
// ==================

/**
 * @param {string} userId
 * @param {string} info The kind of info to retrieve (e.g. 'displayname',
 * 'avatar_url').
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getProfileInfo = function (userId, info, callback) {
    if (utils.isFunction(info)) {
        callback = info;info = undefined;
    }

    var path = info ? utils.encodeUri("/profile/$userId/$info", { $userId: userId, $info: info }) : utils.encodeUri("/profile/$userId", { $userId: userId });
    return this._http.authedRequest(callback, "GET", path);
};

// Account operations
// ==================

/**
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getThreePids = function (callback) {
    var path = "/account/3pid";
    return this._http.authedRequest(callback, "GET", path, undefined, undefined);
};

/**
 * @param {Object} creds
 * @param {boolean} bind
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.addThreePid = function (creds, bind, callback) {
    var path = "/account/3pid";
    var data = {
        'threePidCreds': creds,
        'bind': bind
    };
    return this._http.authedRequest(callback, "POST", path, null, data);
};

/**
 * @param {string} medium The threepid medium (eg. 'email')
 * @param {string} address The threepid address (eg. 'bob@example.com')
 *        this must be as returned by getThreePids.
 * @return {module:client.Promise} Resolves: The server response on success
 *     (generally the empty JSON object)
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.deleteThreePid = function (medium, address) {
    var path = "/account/3pid/delete";
    var data = {
        'medium': medium,
        'address': address
    };
    return this._http.authedRequestWithPrefix(undefined, "POST", path, null, data, httpApi.PREFIX_UNSTABLE);
};

/**
 * Make a request to change your password.
 * @param {Object} authDict
 * @param {string} newPassword The new desired password.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.setPassword = function (authDict, newPassword, callback) {
    var path = "/account/password";
    var data = {
        'auth': authDict,
        'new_password': newPassword
    };

    return this._http.authedRequest(callback, "POST", path, null, data);
};

// Device operations
// =================

/**
 * Gets all devices recorded for the logged-in user
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getDevices = function () {
    var path = "/devices";
    return this._http.authedRequestWithPrefix(undefined, "GET", path, undefined, undefined, httpApi.PREFIX_UNSTABLE);
};

/**
 * Update the given device
 *
 * @param {string} device_id  device to update
 * @param {Object} body       body of request
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.setDeviceDetails = function (device_id, body) {
    var path = utils.encodeUri("/devices/$device_id", {
        $device_id: device_id
    });

    return this._http.authedRequestWithPrefix(undefined, "PUT", path, undefined, body, httpApi.PREFIX_UNSTABLE);
};

/**
 * Delete the given device
 *
 * @param {string} device_id  device to delete
 * @param {object} auth Optional. Auth data to supply for User-Interactive auth.
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.deleteDevice = function (device_id, auth) {
    var path = utils.encodeUri("/devices/$device_id", {
        $device_id: device_id
    });

    var body = {};

    if (auth) {
        body.auth = auth;
    }

    return this._http.authedRequestWithPrefix(undefined, "DELETE", path, undefined, body, httpApi.PREFIX_UNSTABLE);
};

// Push operations
// ===============

/**
 * Gets all pushers registered for the logged-in user
 *
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: Array of objects representing pushers
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getPushers = function (callback) {
    var path = "/pushers";
    return this._http.authedRequest(callback, "GET", path, undefined, undefined);
};

/**
 * Adds a new pusher or updates an existing pusher
 *
 * @param {Object} pusher Object representing a pusher
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: Empty json object on success
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.setPusher = function (pusher, callback) {
    var path = "/pushers/set";
    return this._http.authedRequest(callback, "POST", path, null, pusher);
};

/**
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.getPushRules = function (callback) {
    return this._http.authedRequest(callback, "GET", "/pushrules/");
};

/**
 * @param {string} scope
 * @param {string} kind
 * @param {string} ruleId
 * @param {Object} body
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.addPushRule = function (scope, kind, ruleId, body, callback) {
    // NB. Scope not uri encoded because devices need the '/'
    var path = utils.encodeUri("/pushrules/" + scope + "/$kind/$ruleId", {
        $kind: kind,
        $ruleId: ruleId
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, body);
};

/**
 * @param {string} scope
 * @param {string} kind
 * @param {string} ruleId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.deletePushRule = function (scope, kind, ruleId, callback) {
    // NB. Scope not uri encoded because devices need the '/'
    var path = utils.encodeUri("/pushrules/" + scope + "/$kind/$ruleId", {
        $kind: kind,
        $ruleId: ruleId
    });
    return this._http.authedRequest(callback, "DELETE", path);
};

/**
 * Enable or disable a push notification rule.
 * @param {string} scope
 * @param {string} kind
 * @param {string} ruleId
 * @param {boolean} enabled
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.setPushRuleEnabled = function (scope, kind, ruleId, enabled, callback) {
    var path = utils.encodeUri("/pushrules/" + scope + "/$kind/$ruleId/enabled", {
        $kind: kind,
        $ruleId: ruleId
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, { "enabled": enabled });
};

/**
 * Set the actions for a push notification rule.
 * @param {string} scope
 * @param {string} kind
 * @param {string} ruleId
 * @param {array} actions
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.setPushRuleActions = function (scope, kind, ruleId, actions, callback) {
    var path = utils.encodeUri("/pushrules/" + scope + "/$kind/$ruleId/actions", {
        $kind: kind,
        $ruleId: ruleId
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, { "actions": actions });
};

// Search
// ======

/**
 * Perform a server-side search.
 * @param {Object} opts
 * @param {string} opts.next_batch the batch token to pass in the query string
 * @param {Object} opts.body the JSON object to pass to the request body.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.search = function (opts, callback) {
    var queryparams = {};
    if (opts.next_batch) {
        queryparams.next_batch = opts.next_batch;
    }
    return this._http.authedRequest(callback, "POST", "/search", queryparams, opts.body);
};

// Crypto
// ======

/**
 * Upload keys
 *
 * @param {Object} content  body of upload request
 *
 * @param {Object=} opts
 *
 * @param {string=} opts.device_id  explicit device_id to use for upload
 *    (default is to use the same as that used during auth).
 *
 * @param {module:client.callback=} callback
 *
 * @return {module:client.Promise} Resolves: result object. Rejects: with
 *     an error response ({@link module:http-api.MatrixError}).
 */
MatrixBaseApis.prototype.uploadKeysRequest = function (content, opts, callback) {
    opts = opts || {};
    var deviceId = opts.device_id;
    var path = void 0;
    if (deviceId) {
        path = utils.encodeUri("/keys/upload/$deviceId", {
            $deviceId: deviceId
        });
    } else {
        path = "/keys/upload";
    }
    return this._http.authedRequestWithPrefix(callback, "POST", path, undefined, content, httpApi.PREFIX_UNSTABLE);
};

/**
 * Download device keys
 *
 * @param {string[]} userIds  list of users to get keys for
 *
 * @param {module:client.callback=} callback
 *
 * @return {module:client.Promise} Resolves: result object. Rejects: with
 *     an error response ({@link module:http-api.MatrixError}).
 */
MatrixBaseApis.prototype.downloadKeysForUsers = function (userIds, callback) {
    var downloadQuery = {};

    for (var i = 0; i < userIds.length; ++i) {
        downloadQuery[userIds[i]] = {};
    }
    var content = { device_keys: downloadQuery };
    return this._http.authedRequestWithPrefix(callback, "POST", "/keys/query", undefined, content, httpApi.PREFIX_UNSTABLE);
};

/**
 * Claim one-time keys
 *
 * @param {string[]} devices  a list of [userId, deviceId] pairs
 *
 * @param {string} [key_algorithm = signed_curve25519]  desired key type
 *
 * @return {module:client.Promise} Resolves: result object. Rejects: with
 *     an error response ({@link module:http-api.MatrixError}).
 */
MatrixBaseApis.prototype.claimOneTimeKeys = function (devices, key_algorithm) {
    var queries = {};

    if (key_algorithm === undefined) {
        key_algorithm = "signed_curve25519";
    }

    for (var i = 0; i < devices.length; ++i) {
        var userId = devices[i][0];
        var deviceId = devices[i][1];
        var query = queries[userId] || {};
        queries[userId] = query;
        query[deviceId] = key_algorithm;
    }
    var content = { one_time_keys: queries };
    return this._http.authedRequestWithPrefix(undefined, "POST", "/keys/claim", undefined, content, httpApi.PREFIX_UNSTABLE);
};

// Identity Server Operations
// ==========================

/**
 * Requests an email verification token directly from an Identity Server.
 *
 * Note that the Home Server offers APIs to proxy this API for specific
 * situations, allowing for better feedback to the user.
 *
 * @param {string} email The email address to request a token for
 * @param {string} clientSecret A secret binary string generated by the client.
 *                 It is recommended this be around 16 ASCII characters.
 * @param {number} sendAttempt If an identity server sees a duplicate request
 *                 with the same sendAttempt, it will not send another email.
 *                 To request another email to be sent, use a larger value for
 *                 the sendAttempt param as was used in the previous request.
 * @param {string} nextLink Optional If specified, the client will be redirected
 *                 to this link after validation.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 * @throws Error if No ID server is set
 */
MatrixBaseApis.prototype.requestEmailToken = function (email, clientSecret, sendAttempt, nextLink, callback) {
    var params = {
        client_secret: clientSecret,
        email: email,
        send_attempt: sendAttempt,
        next_link: nextLink
    };
    return this._http.idServerRequest(callback, "POST", "/validate/email/requestToken", params, httpApi.PREFIX_IDENTITY_V1);
};

/**
 * Looks up the public Matrix ID mapping for a given 3rd party
 * identifier from the Identity Server
 * @param {string} medium The medium of the threepid, eg. 'email'
 * @param {string} address The textual address of the threepid
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: A threepid mapping
 *                                 object or the empty object if no mapping
 *                                 exists
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixBaseApis.prototype.lookupThreePid = function (medium, address, callback) {
    var params = {
        medium: medium,
        address: address
    };
    return this._http.idServerRequest(callback, "GET", "/lookup", params, httpApi.PREFIX_IDENTITY_V1);
};

// Direct-to-device messaging
// ==========================

/**
 * Send an event to a specific list of devices
 *
 * @param {string} eventType  type of event to send
 * @param {Object.<string, Object<string, Object>>} contentMap
 *    content to send. Map from user_id to device_id to content object.
 * @param {string=} txnId     transaction id. One will be made up if not
 *    supplied.
 * @return {module:client.Promise} Resolves to the result object
 */
MatrixBaseApis.prototype.sendToDevice = function (eventType, contentMap, txnId) {
    var path = utils.encodeUri("/sendToDevice/$eventType/$txnId", {
        $eventType: eventType,
        $txnId: txnId ? txnId : this.makeTxnId()
    });

    var body = {
        messages: contentMap
    };

    return this._http.authedRequestWithPrefix(undefined, "PUT", path, undefined, body, httpApi.PREFIX_UNSTABLE);
};

// Third party Lookup API
// ======================

/**
 * Get the third party protocols that can be reached using
 * this HS
 * @return {module:client.Promise} Resolves to the result object
 */
MatrixBaseApis.prototype.getThirdpartyProtocols = function () {
    return this._http.authedRequestWithPrefix(undefined, "GET", "/thirdparty/protocols", undefined, undefined, httpApi.PREFIX_UNSTABLE);
};

/**
 * Get information on how a specific place on a third party protocol
 * may be reached.
 * @param {string} protocol The protocol given in getThirdpartyProtocols()
 * @param {object} params Protocol-specific parameters, as given in th
 *                        response to getThirdpartyProtocols()
 * @return {module:client.Promise} Resolves to the result object
 */
MatrixBaseApis.prototype.getThirdpartyLocation = function (protocol, params) {
    var path = utils.encodeUri("/thirdparty/location/$protocol", {
        $protocol: protocol
    });

    return this._http.authedRequestWithPrefix(undefined, "GET", path, params, undefined, httpApi.PREFIX_UNSTABLE);
};

/**
 * MatrixBaseApis object
 */
module.exports = MatrixBaseApis;

},{"./http-api":15,"./utils":36}],3:[function(require,module,exports){
(function (global){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var PushProcessor = require('./pushprocessor');

/**
 * This is an internal module. See {@link MatrixClient} for the public class.
 * @module client
 */
var EventEmitter = require("events").EventEmitter;
var q = require("q");
var url = require('url');

var httpApi = require("./http-api");
var MatrixEvent = require("./models/event").MatrixEvent;
var EventStatus = require("./models/event").EventStatus;
var EventTimeline = require("./models/event-timeline");
var SearchResult = require("./models/search-result");
var StubStore = require("./store/stub");
var webRtcCall = require("./webrtc/call");
var utils = require("./utils");
var contentRepo = require("./content-repo");
var Filter = require("./filter");
var SyncApi = require("./sync");
var MatrixBaseApis = require("./base-apis");
var MatrixError = httpApi.MatrixError;

var SCROLLBACK_DELAY_MS = 3000;
var CRYPTO_ENABLED = false;

try {
    var Crypto = require("./crypto");
    CRYPTO_ENABLED = true;
} catch (e) {
    console.error("olm load error", e);
    // Olm not installed.
}

/**
 * Construct a Matrix Client. Only directly construct this if you want to use
 * custom modules. Normally, {@link createClient} should be used
 * as it specifies 'sensible' defaults for these modules.
 * @constructor
 * @extends {external:EventEmitter}
 * @extends {module:base-apis~MatrixBaseApis}
 *
 * @param {Object} opts The configuration options for this client.
 * @param {string} opts.baseUrl Required. The base URL to the client-server
 * HTTP API.
 * @param {string} opts.idBaseUrl Optional. The base identity server URL for
 * identity server requests.
 * @param {Function} opts.request Required. The function to invoke for HTTP
 * requests. The value of this property is typically <code>require("request")
 * </code> as it returns a function which meets the required interface. See
 * {@link requestFunction} for more information.
 *
 * @param {string} opts.accessToken The access_token for this user.
 *
 * @param {string} opts.userId The user ID for this user.
 *
 * @param {Object=} opts.store The data store to use. If not specified,
 * this client will not store any HTTP responses.
 *
 * @param {string=} opts.deviceId A unique identifier for this device; used for
 *    tracking things like crypto keys and access tokens.  If not specified,
 *    end-to-end crypto will be disabled.
 *
 * @param {Object=} opts.sessionStore A store to be used for end-to-end crypto
 *    session data. This should be a {@link
 *    module:store/session/webstorage~WebStorageSessionStore|WebStorageSessionStore},
 *    or an object implementing the same interface. If not specified,
 *    end-to-end crypto will be disabled.
 *
 * @param {Object} opts.scheduler Optional. The scheduler to use. If not
 * specified, this client will not retry requests on failure. This client
 * will supply its own processing function to
 * {@link module:scheduler~MatrixScheduler#setProcessFunction}.
 *
 * @param {Object} opts.queryParams Optional. Extra query parameters to append
 * to all requests with this client. Useful for application services which require
 * <code>?user_id=</code>.
 *
 * @param {Number=} opts.localTimeoutMs Optional. The default maximum amount of
 * time to wait before timing out HTTP requests. If not specified, there is no timeout.
 *
 * @param {boolean} [opts.timelineSupport = false] Set to true to enable
 * improved timeline support ({@link
 * module:client~MatrixClient#getEventTimeline getEventTimeline}). It is
 * disabled by default for compatibility with older clients - in particular to
 * maintain support for back-paginating the live timeline after a '/sync'
 * result with a gap.
 */
function MatrixClient(opts) {
    var _this = this;

    MatrixBaseApis.call(this, opts);

    this.store = opts.store || new StubStore();

    this.deviceId = opts.deviceId || null;

    var userId = opts.userId || null;
    this.credentials = {
        userId: userId
    };

    this.scheduler = opts.scheduler;
    if (this.scheduler) {
        (function () {
            var self = _this;
            _this.scheduler.setProcessFunction(function (eventToSend) {
                var room = self.getRoom(eventToSend.getRoomId());
                if (eventToSend.status !== EventStatus.SENDING) {
                    _updatePendingEventStatus(room, eventToSend, EventStatus.SENDING);
                }
                return _sendEventHttpRequest(self, eventToSend);
            });
        })();
    }
    this.clientRunning = false;

    this.callList = {
        // callId: MatrixCall
    };

    // try constructing a MatrixCall to see if we are running in an environment
    // which has WebRTC. If we are, listen for and handle m.call.* events.
    var call = webRtcCall.createNewMatrixCall(this);
    this._supportsVoip = false;
    if (call) {
        setupCallEventHandler(this);
        this._supportsVoip = true;
    }
    this._syncingRetry = null;
    this._syncApi = null;
    this._peekSync = null;
    this._isGuest = false;
    this._ongoingScrollbacks = {};
    this.timelineSupport = Boolean(opts.timelineSupport);
    this.urlPreviewCache = {};
    this._notifTimelineSet = null;

    this._crypto = null;
    if (CRYPTO_ENABLED && Boolean(opts.sessionStore) && userId !== null && this.deviceId !== null) {
        this._crypto = new Crypto(this, this, opts.sessionStore, userId, this.deviceId);

        this.olmVersion = Crypto.getOlmVersion();
    }
}
utils.inherits(MatrixClient, EventEmitter);
utils.extend(MatrixClient.prototype, MatrixBaseApis.prototype);

/**
 * Get the domain for this client's MXID
 * @return {?string} Domain of this MXID
 */
MatrixClient.prototype.getDomain = function () {
    if (this.credentials && this.credentials.userId) {
        return this.credentials.userId.replace(/^.*?:/, '');
    }
    return null;
};

/**
 * Get the local part of the current user ID e.g. "foo" in "@foo:bar".
 * @return {?string} The user ID localpart or null.
 */
MatrixClient.prototype.getUserIdLocalpart = function () {
    if (this.credentials && this.credentials.userId) {
        return this.credentials.userId.split(":")[0].substring(1);
    }
    return null;
};

/**
 * Get the device ID of this client
 * @return {?string} device ID
 */
MatrixClient.prototype.getDeviceId = function () {
    return this.deviceId;
};

/**
 * Check if the runtime environment supports VoIP calling.
 * @return {boolean} True if VoIP is supported.
 */
MatrixClient.prototype.supportsVoip = function () {
    return this._supportsVoip;
};

/**
 * Get the current sync state.
 * @return {?string} the sync state, which may be null.
 * @see module:client~MatrixClient#event:"sync"
 */
MatrixClient.prototype.getSyncState = function () {
    if (!this._syncApi) {
        return null;
    }
    return this._syncApi.getSyncState();
};

/**
 * Return whether the client is configured for a guest account.
 * @return {boolean} True if this is a guest access_token (or no token is supplied).
 */
MatrixClient.prototype.isGuest = function () {
    return this._isGuest;
};

/**
 * Return the provided scheduler, if any.
 * @return {?module:scheduler~MatrixScheduler} The scheduler or null
 */
MatrixClient.prototype.getScheduler = function () {
    return this.scheduler;
};

/**
 * Set whether this client is a guest account. <b>This method is experimental
 * and may change without warning.</b>
 * @param {boolean} isGuest True if this is a guest account.
 */
MatrixClient.prototype.setGuest = function (isGuest) {
    // EXPERIMENTAL:
    // If the token is a macaroon, it should be encoded in it that it is a 'guest'
    // access token, which means that the SDK can determine this entirely without
    // the dev manually flipping this flag.
    this._isGuest = isGuest;
};

/**
 * Retry a backed off syncing request immediately. This should only be used when
 * the user <b>explicitly</b> attempts to retry their lost connection.
 * @return {boolean} True if this resulted in a request being retried.
 */
MatrixClient.prototype.retryImmediately = function () {
    return this._syncApi.retryImmediately();
};

/**
 * Return the global notification EventTimelineSet, if any
 *
 * @return {EventTimelineSet} the globl notification EventTimelineSet
 */
MatrixClient.prototype.getNotifTimelineSet = function () {
    return this._notifTimelineSet;
};

/**
 * Set the global notification EventTimelineSet
 *
 * @param {EventTimelineSet} notifTimelineSet
 */
MatrixClient.prototype.setNotifTimelineSet = function (notifTimelineSet) {
    this._notifTimelineSet = notifTimelineSet;
};

// Crypto bits
// ===========

/**
 * Is end-to-end crypto enabled for this client.
 * @return {boolean} True if end-to-end is enabled.
 */
MatrixClient.prototype.isCryptoEnabled = function () {
    return this._crypto !== null;
};

/**
 * Get the Ed25519 key for this device
 *
 * @return {?string} base64-encoded ed25519 key. Null if crypto is
 *    disabled.
 */
MatrixClient.prototype.getDeviceEd25519Key = function () {
    if (!this._crypto) {
        return null;
    }
    return this._crypto.getDeviceEd25519Key();
};

/**
 * Upload the device keys to the homeserver and ensure that the
 * homeserver has enough one-time keys.
 * @param {number} maxKeys The maximum number of keys to generate
 * @return {object} A promise that will resolve when the keys are uploaded.
 */
MatrixClient.prototype.uploadKeys = function (maxKeys) {
    if (this._crypto === null) {
        throw new Error("End-to-end encryption disabled");
    }

    return this._crypto.uploadKeys(maxKeys);
};

/**
 * Download the keys for a list of users and stores the keys in the session
 * store.
 * @param {Array} userIds The users to fetch.
 * @param {bool} forceDownload Always download the keys even if cached.
 *
 * @return {Promise} A promise which resolves to a map userId->deviceId->{@link
 * module:crypto~DeviceInfo|DeviceInfo}.
 */
MatrixClient.prototype.downloadKeys = function (userIds, forceDownload) {
    if (this._crypto === null) {
        return q.reject(new Error("End-to-end encryption disabled"));
    }
    return this._crypto.downloadKeys(userIds, forceDownload);
};

/**
 * List the stored device keys for a user id
 *
 * @deprecated prefer {@link module:client#getStoredDevicesForUser}
 *
 * @param {string} userId the user to list keys for.
 *
 * @return {object[]} list of devices with "id", "verified", "blocked",
 *    "key", and "display_name" parameters.
 */
MatrixClient.prototype.listDeviceKeys = function (userId) {
    if (this._crypto === null) {
        throw new Error("End-to-end encryption disabled");
    }
    return this._crypto.listDeviceKeys(userId);
};

/**
 * Get the stored device keys for a user id
 *
 * @param {string} userId the user to list keys for.
 *
 * @return {module:crypto-deviceinfo[]} list of devices
 */
MatrixClient.prototype.getStoredDevicesForUser = function (userId) {
    if (this._crypto === null) {
        throw new Error("End-to-end encryption disabled");
    }
    return this._crypto.getStoredDevicesForUser(userId) || [];
};

/**
 * Mark the given device as verified
 *
 * @param {string} userId owner of the device
 * @param {string} deviceId unique identifier for the device
 *
 * @param {boolean=} verified whether to mark the device as verified. defaults
 *   to 'true'.
 *
 * @fires module:client~event:MatrixClient"deviceVerificationChanged"
 */
MatrixClient.prototype.setDeviceVerified = function (userId, deviceId, verified) {
    if (verified === undefined) {
        verified = true;
    }
    _setDeviceVerification(this, userId, deviceId, verified, null);
};

/**
 * Mark the given device as blocked/unblocked
 *
 * @param {string} userId owner of the device
 * @param {string} deviceId unique identifier for the device
 *
 * @param {boolean=} blocked whether to mark the device as blocked. defaults
 *   to 'true'.
 *
 * @fires module:client~event:MatrixClient"deviceVerificationChanged"
 */
MatrixClient.prototype.setDeviceBlocked = function (userId, deviceId, blocked) {
    if (blocked === undefined) {
        blocked = true;
    }
    _setDeviceVerification(this, userId, deviceId, null, blocked);
};

function _setDeviceVerification(client, userId, deviceId, verified, blocked) {
    if (!client._crypto) {
        throw new Error("End-to-End encryption disabled");
    }
    client._crypto.setDeviceVerification(userId, deviceId, verified, blocked);
    client.emit("deviceVerificationChanged", userId, deviceId);
}

/**
 * Get e2e information on the device that sent an event
 *
 * @param {MatrixEvent} event event to be checked
 *
 * @return {module:crypto/deviceinfo?}
 */
MatrixClient.prototype.getEventSenderDeviceInfo = function (event) {
    if (!this._crypto) {
        return null;
    }

    return this._crypto.getEventSenderDeviceInfo(event);
};

/**
 * Check if the sender of an event is verified
 *
 * @param {MatrixEvent} event event to be checked
 *
 * @return {boolean} true if the sender of this event has been verified using
 * {@link module:client~MatrixClient#setDeviceVerified|setDeviceVerified}.
 */
MatrixClient.prototype.isEventSenderVerified = function (event) {
    var device = this.getEventSenderDeviceInfo(event);
    if (!device) {
        return false;
    }
    return device.isVerified();
};

/**
 * Enable end-to-end encryption for a room.
 * @param {string} roomId The room ID to enable encryption in.
 * @param {object} config The encryption config for the room.
 * @return {Object} A promise that will resolve when encryption is setup.
 */
MatrixClient.prototype.setRoomEncryption = function (roomId, config) {
    if (!this._crypto) {
        throw new Error("End-to-End encryption disabled");
    }
    this._crypto.setRoomEncryption(roomId, config);
    return q();
};

/**
 * Whether encryption is enabled for a room.
 * @param {string} roomId the room id to query.
 * @return {bool} whether encryption is enabled.
 */
MatrixClient.prototype.isRoomEncrypted = function (roomId) {
    if (!this._crypto) {
        return false;
    }

    return this._crypto.isRoomEncrypted(roomId);
};

/**
 * Get a list containing all of the room keys
 *
 * This should be encrypted before returning it to the user.
 *
 * @return {module:client.Promise} a promise which resolves to a list of
 *    session export objects
 */
MatrixClient.prototype.exportRoomKeys = function () {
    if (!this._crypto) {
        return q.reject(new Error("End-to-end encryption disabled"));
    }
    return this._crypto.exportRoomKeys();
};

/**
 * Import a list of room keys previously exported by exportRoomKeys
 *
 * @param {Object[]} keys a list of session export objects
 */
MatrixClient.prototype.importRoomKeys = function (keys) {
    if (!this._crypto) {
        throw new Error("End-to-end encryption disabled");
    }
    this._crypto.importRoomKeys(keys);
};

/**
 * Decrypt a received event according to the algorithm specified in the event.
 *
 * @param {MatrixClient} client
 * @param {MatrixEvent} event
 */
function _decryptEvent(client, event) {
    if (!client._crypto) {
        _badEncryptedMessage(event, "Encryption not enabled");
        return;
    }

    try {
        client._crypto.decryptEvent(event);
    } catch (e) {
        if (!(e instanceof Crypto.DecryptionError)) {
            throw e;
        }
        _badEncryptedMessage(event, e.message);
        return;
    }
}

function _badEncryptedMessage(event, reason) {
    event.setClearData({
        type: "m.room.message",
        content: {
            msgtype: "m.bad.encrypted",
            body: "** Unable to decrypt: " + reason + " **"
        }
    });
}

// Room ops
// ========

/**
 * Get the room for the given room ID.
 * This function will return a valid room for any room for which a Room event
 * has been emitted. Note in particular that other events, eg. RoomState.members
 * will be emitted for a room before this function will return the given room.
 * @param {string} roomId The room ID
 * @return {Room} The Room or null if it doesn't exist or there is no data store.
 */
MatrixClient.prototype.getRoom = function (roomId) {
    return this.store.getRoom(roomId);
};

/**
 * Retrieve all known rooms.
 * @return {Room[]} A list of rooms, or an empty list if there is no data store.
 */
MatrixClient.prototype.getRooms = function () {
    return this.store.getRooms();
};

/**
 * Retrieve a user.
 * @param {string} userId The user ID to retrieve.
 * @return {?User} A user or null if there is no data store or the user does
 * not exist.
 */
MatrixClient.prototype.getUser = function (userId) {
    return this.store.getUser(userId);
};

/**
 * Retrieve all known users.
 * @return {User[]} A list of users, or an empty list if there is no data store.
 */
MatrixClient.prototype.getUsers = function () {
    return this.store.getUsers();
};

// User Account Data operations
// ============================

/**
 * Set account data event for the current user.
 * @param {string} eventType The event type
 * @param {Object} contents the contents object for the event
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setAccountData = function (eventType, contents, callback) {
    var path = utils.encodeUri("/user/$userId/account_data/$type", {
        $userId: this.credentials.userId,
        $type: eventType
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, contents);
};

/**
 * Get account data event of given type for the current user.
 * @param {string} eventType The event type
 * @param {module:client.callback} callback Optional.
 * @return {?object} The contents of the given account data event
 */
MatrixClient.prototype.getAccountData = function (eventType) {
    return this.store.getAccountData(eventType);
};

// Room operations
// ===============

/**
 * Join a room. If you have already joined the room, this will no-op.
 * @param {string} roomIdOrAlias The room ID or room alias to join.
 * @param {Object} opts Options when joining the room.
 * @param {boolean} opts.syncRoom True to do a room initial sync on the resulting
 * room. If false, the <strong>returned Room object will have no current state.
 * </strong> Default: true.
 * @param {boolean} opts.inviteSignUrl If the caller has a keypair 3pid invite,
 *                                     the signing URL is passed in this parameter.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: Room object.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.joinRoom = function (roomIdOrAlias, opts, callback) {
    // to help people when upgrading..
    if (utils.isFunction(opts)) {
        throw new Error("Expected 'opts' object, got function.");
    }
    opts = opts || {};
    if (opts.syncRoom === undefined) {
        opts.syncRoom = true;
    }

    var room = this.getRoom(roomIdOrAlias);
    if (room && room.hasMembershipState(this.credentials.userId, "join")) {
        return q(room);
    }

    var sign_promise = q();

    if (opts.inviteSignUrl) {
        sign_promise = this._http.requestOtherUrl(undefined, 'POST', opts.inviteSignUrl, { mxid: this.credentials.userId });
    }

    var defer = q.defer();

    var self = this;
    sign_promise.then(function (signed_invite_object) {
        var data = {};
        if (signed_invite_object) {
            data.third_party_signed = signed_invite_object;
        }

        var path = utils.encodeUri("/join/$roomid", { $roomid: roomIdOrAlias });
        return self._http.authedRequest(undefined, "POST", path, undefined, data);
    }).then(function (res) {
        var roomId = res.room_id;
        var syncApi = new SyncApi(self, self._clientOpts);
        var room = syncApi.createRoom(roomId);
        if (opts.syncRoom) {
            // v2 will do this for us
            // return syncApi.syncRoom(room);
        }
        return q(room);
    }).done(function (room) {
        _resolve(callback, defer, room);
    }, function (err) {
        _reject(callback, defer, err);
    });
    return defer.promise;
};

/**
 * Resend an event.
 * @param {MatrixEvent} event The event to resend.
 * @param {Room} room Optional. The room the event is in. Will update the
 * timeline entry if provided.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.resendEvent = function (event, room) {
    _updatePendingEventStatus(room, event, EventStatus.SENDING);
    return _sendEvent(this, room, event);
};

/**
 * Cancel a queued or unsent event.
 *
 * @param {MatrixEvent} event   Event to cancel
 * @throws Error if the event is not in QUEUED or NOT_SENT state
 */
MatrixClient.prototype.cancelPendingEvent = function (event) {
    if ([EventStatus.QUEUED, EventStatus.NOT_SENT].indexOf(event.status) < 0) {
        throw new Error("cannot cancel an event with status " + event.status);
    }

    // first tell the scheduler to forget about it, if it's queued
    if (this.scheduler) {
        this.scheduler.removeEventFromQueue(event);
    }

    // then tell the room about the change of state, which will remove it
    // from the room's list of pending events.
    var room = this.getRoom(event.getRoomId());
    _updatePendingEventStatus(room, event, EventStatus.CANCELLED);
};

/**
 * @param {string} roomId
 * @param {string} name
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setRoomName = function (roomId, name, callback) {
    return this.sendStateEvent(roomId, "m.room.name", { name: name }, undefined, callback);
};

/**
 * @param {string} roomId
 * @param {string} topic
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setRoomTopic = function (roomId, topic, callback) {
    return this.sendStateEvent(roomId, "m.room.topic", { topic: topic }, undefined, callback);
};

/**
 * @param {string} roomId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.getRoomTags = function (roomId, callback) {
    var path = utils.encodeUri("/user/$userId/rooms/$roomId/tags/", {
        $userId: this.credentials.userId,
        $roomId: roomId
    });
    return this._http.authedRequest(callback, "GET", path, undefined);
};

/**
 * @param {string} roomId
 * @param {string} tagName name of room tag to be set
 * @param {object} metadata associated with that tag to be stored
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setRoomTag = function (roomId, tagName, metadata, callback) {
    var path = utils.encodeUri("/user/$userId/rooms/$roomId/tags/$tag", {
        $userId: this.credentials.userId,
        $roomId: roomId,
        $tag: tagName
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, metadata);
};

/**
 * @param {string} roomId
 * @param {string} tagName name of room tag to be removed
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.deleteRoomTag = function (roomId, tagName, callback) {
    var path = utils.encodeUri("/user/$userId/rooms/$roomId/tags/$tag", {
        $userId: this.credentials.userId,
        $roomId: roomId,
        $tag: tagName
    });
    return this._http.authedRequest(callback, "DELETE", path, undefined, undefined);
};

/**
 * @param {string} roomId
 * @param {string} eventType event type to be set
 * @param {object} content event content
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setRoomAccountData = function (roomId, eventType, content, callback) {
    var path = utils.encodeUri("/user/$userId/rooms/$roomId/account_data/$type", {
        $userId: this.credentials.userId,
        $roomId: roomId,
        $type: eventType
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, content);
};

/**
 * Set a user's power level.
 * @param {string} roomId
 * @param {string} userId
 * @param {Number} powerLevel
 * @param {MatrixEvent} event
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setPowerLevel = function (roomId, userId, powerLevel, event, callback) {
    var content = {
        users: {}
    };
    if (event && event.getType() === "m.room.power_levels") {
        // take a copy of the content to ensure we don't corrupt
        // existing client state with a failed power level change
        content = utils.deepCopy(event.getContent());
    }
    content.users[userId] = powerLevel;
    var path = utils.encodeUri("/rooms/$roomId/state/m.room.power_levels", {
        $roomId: roomId
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, content);
};

/**
 * @param {string} roomId
 * @param {string} eventType
 * @param {Object} content
 * @param {string} txnId Optional.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendEvent = function (roomId, eventType, content, txnId, callback) {
    if (utils.isFunction(txnId)) {
        callback = txnId;txnId = undefined;
    }

    if (!txnId) {
        txnId = this.makeTxnId();
    }

    // we always construct a MatrixEvent when sending because the store and
    // scheduler use them. We'll extract the params back out if it turns out
    // the client has no scheduler or store.
    var room = this.getRoom(roomId);
    var localEvent = new MatrixEvent({
        event_id: "~" + roomId + ":" + txnId,
        user_id: this.credentials.userId,
        room_id: roomId,
        type: eventType,
        origin_server_ts: new Date().getTime(),
        content: content
    });
    localEvent._txnId = txnId;
    localEvent.status = EventStatus.SENDING;

    // add this event immediately to the local store as 'sending'.
    if (room) {
        room.addPendingEvent(localEvent, txnId);
    }

    return _sendEvent(this, room, localEvent, callback);
};

// encrypts the event if necessary
// adds the event to the queue, or sends it
// marks the event as sent/unsent
// returns a promise which resolves with the result of the send request
function _sendEvent(client, room, event, callback) {
    // Add an extra q() to turn synchronous exceptions into promise rejections,
    // so that we can handle synchronous and asynchronous exceptions with the
    // same code path.
    return q().then(function () {
        var encryptionPromise = null;
        if (client._crypto) {
            encryptionPromise = client._crypto.encryptEventIfNeeded(event, room);
        }
        if (encryptionPromise) {
            _updatePendingEventStatus(room, event, EventStatus.ENCRYPTING);
            encryptionPromise = encryptionPromise.then(function () {
                _updatePendingEventStatus(room, event, EventStatus.SENDING);
            });
        }
        return encryptionPromise;
    }).then(function () {
        var promise = void 0;
        // this event may be queued
        if (client.scheduler) {
            // if this returns a promsie then the scheduler has control now and will
            // resolve/reject when it is done. Internally, the scheduler will invoke
            // processFn which is set to this._sendEventHttpRequest so the same code
            // path is executed regardless.
            promise = client.scheduler.queueEvent(event);
            if (promise && client.scheduler.getQueueForEvent(event).length > 1) {
                // event is processed FIFO so if the length is 2 or more we know
                // this event is stuck behind an earlier event.
                _updatePendingEventStatus(room, event, EventStatus.QUEUED);
            }
        }

        if (!promise) {
            promise = _sendEventHttpRequest(client, event);
        }
        return promise;
    }).then(function (res) {
        // the request was sent OK
        if (room) {
            room.updatePendingEvent(event, EventStatus.SENT, res.event_id);
        }
        if (callback) {
            callback(null, res);
        }
        return res;
    }, function (err) {
        // the request failed to send.
        console.error("Error sending event", err.stack || err);

        try {
            _updatePendingEventStatus(room, event, EventStatus.NOT_SENT);

            if (callback) {
                callback(err);
            }
        } catch (err2) {
            console.error("Exception in error handler!", err2.stack || err);
        }
        throw err;
    });
}

function _updatePendingEventStatus(room, event, newStatus) {
    if (room) {
        room.updatePendingEvent(event, newStatus);
    } else {
        event.status = newStatus;
    }
}

function _sendEventHttpRequest(client, event) {
    var txnId = event._txnId ? event._txnId : client.makeTxnId();

    var pathParams = {
        $roomId: event.getRoomId(),
        $eventType: event.getWireType(),
        $stateKey: event.getStateKey(),
        $txnId: txnId
    };

    var path = void 0;

    if (event.isState()) {
        var pathTemplate = "/rooms/$roomId/state/$eventType";
        if (event.getStateKey() && event.getStateKey().length > 0) {
            pathTemplate = "/rooms/$roomId/state/$eventType/$stateKey";
        }
        path = utils.encodeUri(pathTemplate, pathParams);
    } else {
        path = utils.encodeUri("/rooms/$roomId/send/$eventType/$txnId", pathParams);
    }

    return client._http.authedRequest(undefined, "PUT", path, undefined, event.getWireContent());
}

/**
 * @param {string} roomId
 * @param {Object} content
 * @param {string} txnId Optional.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendMessage = function (roomId, content, txnId, callback) {
    if (utils.isFunction(txnId)) {
        callback = txnId;txnId = undefined;
    }
    return this.sendEvent(roomId, "m.room.message", content, txnId, callback);
};

/**
 * @param {string} roomId
 * @param {string} body
 * @param {string} txnId Optional.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendTextMessage = function (roomId, body, txnId, callback) {
    var content = {
        msgtype: "m.text",
        body: body
    };
    return this.sendMessage(roomId, content, txnId, callback);
};

/**
 * @param {string} roomId
 * @param {string} body
 * @param {string} txnId Optional.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendNotice = function (roomId, body, txnId, callback) {
    var content = {
        msgtype: "m.notice",
        body: body
    };
    return this.sendMessage(roomId, content, txnId, callback);
};

/**
 * @param {string} roomId
 * @param {string} body
 * @param {string} txnId Optional.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendEmoteMessage = function (roomId, body, txnId, callback) {
    var content = {
        msgtype: "m.emote",
        body: body
    };
    return this.sendMessage(roomId, content, txnId, callback);
};

/**
 * @param {string} roomId
 * @param {string} url
 * @param {Object} info
 * @param {string} text
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendImageMessage = function (roomId, url, info, text, callback) {
    if (utils.isFunction(text)) {
        callback = text;text = undefined;
    }
    if (!text) {
        text = "Image";
    }
    var content = {
        msgtype: "m.image",
        url: url,
        info: info,
        body: text
    };
    return this.sendMessage(roomId, content, callback);
};

/**
 * @param {string} roomId
 * @param {string} body
 * @param {string} htmlBody
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendHtmlMessage = function (roomId, body, htmlBody, callback) {
    var content = {
        msgtype: "m.text",
        format: "org.matrix.custom.html",
        body: body,
        formatted_body: htmlBody
    };
    return this.sendMessage(roomId, content, callback);
};

/**
 * @param {string} roomId
 * @param {string} body
 * @param {string} htmlBody
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendHtmlNotice = function (roomId, body, htmlBody, callback) {
    var content = {
        msgtype: "m.notice",
        format: "org.matrix.custom.html",
        body: body,
        formatted_body: htmlBody
    };
    return this.sendMessage(roomId, content, callback);
};

/**
 * @param {string} roomId
 * @param {string} body
 * @param {string} htmlBody
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendHtmlEmote = function (roomId, body, htmlBody, callback) {
    var content = {
        msgtype: "m.emote",
        format: "org.matrix.custom.html",
        body: body,
        formatted_body: htmlBody
    };
    return this.sendMessage(roomId, content, callback);
};

/**
 * Send a receipt.
 * @param {Event} event The event being acknowledged
 * @param {string} receiptType The kind of receipt e.g. "m.read"
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendReceipt = function (event, receiptType, callback) {
    if (this.isGuest()) {
        return q({}); // guests cannot send receipts so don't bother.
    }

    var path = utils.encodeUri("/rooms/$roomId/receipt/$receiptType/$eventId", {
        $roomId: event.getRoomId(),
        $receiptType: receiptType,
        $eventId: event.getId()
    });
    var promise = this._http.authedRequest(callback, "POST", path, undefined, {});

    var room = this.getRoom(event.getRoomId());
    if (room) {
        room._addLocalEchoReceipt(this.credentials.userId, event, receiptType);
    }
    return promise;
};

/**
 * Send a read receipt.
 * @param {Event} event The event that has been read.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendReadReceipt = function (event, callback) {
    return this.sendReceipt(event, "m.read", callback);
};

/**
 * Get a preview of the given URL as of (roughly) the given point in time,
 * described as an object with OpenGraph keys and associated values.
 * Attributes may be synthesized where actual OG metadata is lacking.
 * Caches results to prevent hammering the server.
 * @param {string} url The URL to get preview data for
 * @param {Number} ts The preferred point in time that the preview should
 * describe (ms since epoch).  The preview returned will either be the most
 * recent one preceding this timestamp if available, or failing that the next
 * most recent available preview.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: Object of OG metadata.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 * May return synthesized attributes if the URL lacked OG meta.
 */
MatrixClient.prototype.getUrlPreview = function (url, ts, callback) {
    var key = ts + "_" + url;
    var og = this.urlPreviewCache[key];
    if (og) {
        return q(og);
    }

    var self = this;
    return this._http.authedRequestWithPrefix(callback, "GET", "/preview_url", {
        url: url,
        ts: ts
    }, undefined, httpApi.PREFIX_MEDIA_R0).then(function (response) {
        // TODO: expire cache occasionally
        self.urlPreviewCache[key] = response;
        return response;
    });
};

/**
 * @param {string} roomId
 * @param {boolean} isTyping
 * @param {Number} timeoutMs
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.sendTyping = function (roomId, isTyping, timeoutMs, callback) {
    if (this.isGuest()) {
        return q({}); // guests cannot send typing notifications so don't bother.
    }

    var path = utils.encodeUri("/rooms/$roomId/typing/$userId", {
        $roomId: roomId,
        $userId: this.credentials.userId
    });
    var data = {
        typing: isTyping
    };
    if (isTyping) {
        data.timeout = timeoutMs ? timeoutMs : 20000;
    }
    return this._http.authedRequest(callback, "PUT", path, undefined, data);
};

/**
 * @param {string} roomId
 * @param {string} userId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.invite = function (roomId, userId, callback) {
    return _membershipChange(this, roomId, userId, "invite", undefined, callback);
};

/**
 * Invite a user to a room based on their email address.
 * @param {string} roomId The room to invite the user to.
 * @param {string} email The email address to invite.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.inviteByEmail = function (roomId, email, callback) {
    return this.inviteByThreePid(roomId, "email", email, callback);
};

/**
 * Invite a user to a room based on a third-party identifier.
 * @param {string} roomId The room to invite the user to.
 * @param {string} medium The medium to invite the user e.g. "email".
 * @param {string} address The address for the specified medium.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.inviteByThreePid = function (roomId, medium, address, callback) {
    var path = utils.encodeUri("/rooms/$roomId/invite", { $roomId: roomId });

    var identityServerUrl = this.getIdentityServerUrl();
    if (!identityServerUrl) {
        return q.reject(new MatrixError({
            error: "No supplied identity server URL",
            errcode: "ORG.MATRIX.JSSDK_MISSING_PARAM"
        }));
    }
    if (identityServerUrl.indexOf("http://") === 0 || identityServerUrl.indexOf("https://") === 0) {
        // this request must not have the protocol part because reasons
        identityServerUrl = identityServerUrl.split("://")[1];
    }

    return this._http.authedRequest(callback, "POST", path, undefined, {
        id_server: identityServerUrl,
        medium: medium,
        address: address
    });
};

/**
 * @param {string} roomId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.leave = function (roomId, callback) {
    return _membershipChange(this, roomId, undefined, "leave", undefined, callback);
};

/**
 * @param {string} roomId
 * @param {string} userId
 * @param {string} reason Optional.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.ban = function (roomId, userId, reason, callback) {
    return _membershipChange(this, roomId, userId, "ban", reason, callback);
};

/**
 * @param {string} roomId
 * @param {boolean} deleteRoom True to delete the room from the store on success.
 * Default: true.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.forget = function (roomId, deleteRoom, callback) {
    if (deleteRoom === undefined) {
        deleteRoom = true;
    }
    var promise = _membershipChange(this, roomId, undefined, "forget", undefined, callback);
    if (!deleteRoom) {
        return promise;
    }
    var self = this;
    return promise.then(function (response) {
        self.store.removeRoom(roomId);
        self.emit("deleteRoom", roomId);
        return response;
    });
};

/**
 * @param {string} roomId
 * @param {string} userId
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.unban = function (roomId, userId, callback) {
    // unbanning = set their state to leave
    return _setMembershipState(this, roomId, userId, "leave", undefined, callback);
};

/**
 * @param {string} roomId
 * @param {string} userId
 * @param {string} reason Optional.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.kick = function (roomId, userId, reason, callback) {
    return _setMembershipState(this, roomId, userId, "leave", reason, callback);
};

/**
 * This is an internal method.
 * @param {MatrixClient} client
 * @param {string} roomId
 * @param {string} userId
 * @param {string} membershipValue
 * @param {string} reason
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
function _setMembershipState(client, roomId, userId, membershipValue, reason, callback) {
    if (utils.isFunction(reason)) {
        callback = reason;reason = undefined;
    }

    var path = utils.encodeUri("/rooms/$roomId/state/m.room.member/$userId", { $roomId: roomId, $userId: userId });

    return client._http.authedRequest(callback, "PUT", path, undefined, {
        membership: membershipValue,
        reason: reason
    });
}

/**
 * This is an internal method.
 * @param {MatrixClient} client
 * @param {string} roomId
 * @param {string} userId
 * @param {string} membership
 * @param {string} reason
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
function _membershipChange(client, roomId, userId, membership, reason, callback) {
    if (utils.isFunction(reason)) {
        callback = reason;reason = undefined;
    }

    var path = utils.encodeUri("/rooms/$room_id/$membership", {
        $room_id: roomId,
        $membership: membership
    });
    return client._http.authedRequest(callback, "POST", path, undefined, {
        user_id: userId, // may be undefined e.g. on leave
        reason: reason
    });
}

/**
 * Obtain a dict of actions which should be performed for this event according
 * to the push rules for this user.  Caches the dict on the event.
 * @param {MatrixEvent} event The event to get push actions for.
 * @return {module:pushprocessor~PushAction} A dict of actions to perform.
 */
MatrixClient.prototype.getPushActionsForEvent = function (event) {
    if (!event.getPushActions()) {
        var pushProcessor = new PushProcessor(this);
        event.setPushActions(pushProcessor.actionsForEvent(event));
    }
    return event.getPushActions();
};

// Profile operations
// ==================

/**
 * @param {string} info The kind of info to set (e.g. 'avatar_url')
 * @param {Object} data The JSON object to set.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setProfileInfo = function (info, data, callback) {
    var path = utils.encodeUri("/profile/$userId/$info", {
        $userId: this.credentials.userId,
        $info: info
    });
    return this._http.authedRequest(callback, "PUT", path, undefined, data);
};

/**
 * @param {string} name
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setDisplayName = function (name, callback) {
    return this.setProfileInfo("displayname", { displayname: name }, callback);
};

/**
 * @param {string} url
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setAvatarUrl = function (url, callback) {
    return this.setProfileInfo("avatar_url", { avatar_url: url }, callback);
};

/**
 * Turn an MXC URL into an HTTP one. <strong>This method is experimental and
 * may change.</strong>
 * @param {string} mxcUrl The MXC URL
 * @param {Number} width The desired width of the thumbnail.
 * @param {Number} height The desired height of the thumbnail.
 * @param {string} resizeMethod The thumbnail resize method to use, either
 * "crop" or "scale".
 * @param {Boolean} allowDirectLinks If true, return any non-mxc URLs
 * directly. Fetching such URLs will leak information about the user to
 * anyone they share a room with. If false, will return null for such URLs.
 * @return {?string} the avatar URL or null.
 */
MatrixClient.prototype.mxcUrlToHttp = function (mxcUrl, width, height, resizeMethod, allowDirectLinks) {
    return contentRepo.getHttpUriForMxc(this.baseUrl, mxcUrl, width, height, resizeMethod, allowDirectLinks);
};

/**
 * @param {Object} opts Options to apply
 * @param {string} opts.presence One of "online", "offline" or "unavailable"
 * @param {string} opts.status_msg The status message to attach.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 * @throws If 'presence' isn't a valid presence enum value.
 */
MatrixClient.prototype.setPresence = function (opts, callback) {
    var path = utils.encodeUri("/presence/$userId/status", {
        $userId: this.credentials.userId
    });

    if (typeof opts === "string") {
        opts = { presence: opts };
    }

    var validStates = ["offline", "online", "unavailable"];
    if (validStates.indexOf(opts.presence) == -1) {
        throw new Error("Bad presence value: " + opts.presence);
    }
    return this._http.authedRequest(callback, "PUT", path, undefined, opts);
};

function _presenceList(callback, client, opts, method) {
    var path = utils.encodeUri("/presence/list/$userId", {
        $userId: client.credentials.userId
    });
    return client._http.authedRequest(callback, method, path, undefined, opts);
}

/**
* Retrieve current user presence list.
* @param {module:client.callback} callback Optional.
* @return {module:client.Promise} Resolves: TODO
* @return {module:http-api.MatrixError} Rejects: with an error response.
*/
MatrixClient.prototype.getPresenceList = function (callback) {
    return _presenceList(callback, this, undefined, "GET");
};

/**
* Add users to the current user presence list.
* @param {module:client.callback} callback Optional.
* @param {string[]} userIds
* @return {module:client.Promise} Resolves: TODO
* @return {module:http-api.MatrixError} Rejects: with an error response.
*/
MatrixClient.prototype.inviteToPresenceList = function (callback, userIds) {
    var opts = { "invite": userIds };
    return _presenceList(callback, this, opts, "POST");
};

/**
* Drop users from the current user presence list.
* @param {module:client.callback} callback Optional.
* @param {string[]} userIds
* @return {module:client.Promise} Resolves: TODO
* @return {module:http-api.MatrixError} Rejects: with an error response.
**/
MatrixClient.prototype.dropFromPresenceList = function (callback, userIds) {
    var opts = { "drop": userIds };
    return _presenceList(callback, this, opts, "POST");
};

/**
 * Retrieve older messages from the given room and put them in the timeline.
 *
 * If this is called multiple times whilst a request is ongoing, the <i>same</i>
 * Promise will be returned. If there was a problem requesting scrollback, there
 * will be a small delay before another request can be made (to prevent tight-looping
 * when there is no connection).
 *
 * @param {Room} room The room to get older messages in.
 * @param {Integer} limit Optional. The maximum number of previous events to
 * pull in. Default: 30.
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: Room. If you are at the beginning
 * of the timeline, <code>Room.oldState.paginationToken</code> will be
 * <code>null</code>.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.scrollback = function (room, limit, callback) {
    if (utils.isFunction(limit)) {
        callback = limit;limit = undefined;
    }
    limit = limit || 30;
    var timeToWaitMs = 0;

    var info = this._ongoingScrollbacks[room.roomId] || {};
    if (info.promise) {
        return info.promise;
    } else if (info.errorTs) {
        var timeWaitedMs = Date.now() - info.errorTs;
        timeToWaitMs = Math.max(SCROLLBACK_DELAY_MS - timeWaitedMs, 0);
    }

    if (room.oldState.paginationToken === null) {
        return q(room); // already at the start.
    }
    // attempt to grab more events from the store first
    var numAdded = this.store.scrollback(room, limit).length;
    if (numAdded === limit) {
        // store contained everything we needed.
        return q(room);
    }
    // reduce the required number of events appropriately
    limit = limit - numAdded;

    var path = utils.encodeUri("/rooms/$roomId/messages", { $roomId: room.roomId });
    var params = {
        from: room.oldState.paginationToken,
        limit: limit,
        dir: 'b'
    };
    var defer = q.defer();
    info = {
        promise: defer.promise,
        errorTs: null
    };
    var self = this;
    // wait for a time before doing this request
    // (which may be 0 in order not to special case the code paths)
    q.delay(timeToWaitMs).then(function () {
        return self._http.authedRequest(callback, "GET", path, params);
    }).done(function (res) {
        var matrixEvents = utils.map(res.chunk, _PojoToMatrixEventMapper(self));
        room.addEventsToTimeline(matrixEvents, true, room.getLiveTimeline());
        room.oldState.paginationToken = res.end;
        if (res.chunk.length === 0) {
            room.oldState.paginationToken = null;
        }
        self.store.storeEvents(room, matrixEvents, res.end, true);
        self._ongoingScrollbacks[room.roomId] = null;
        _resolve(callback, defer, room);
    }, function (err) {
        self._ongoingScrollbacks[room.roomId] = {
            errorTs: Date.now()
        };
        _reject(callback, defer, err);
    });
    this._ongoingScrollbacks[room.roomId] = info;
    return defer.promise;
};

/**
 * Take an EventContext, and back/forward-fill results.
 *
 * @param {module:models/event-context.EventContext} eventContext  context
 *    object to be updated
 * @param {Object}  opts
 * @param {boolean} opts.backwards  true to fill backwards, false to go forwards
 * @param {boolean} opts.limit      number of events to request
 *
 * @return {module:client.Promise} Resolves: updated EventContext object
 * @return {Error} Rejects: with an error response.
 */
MatrixClient.prototype.paginateEventContext = function (eventContext, opts) {
    // TODO: we should implement a backoff (as per scrollback()) to deal more
    // nicely with HTTP errors.
    opts = opts || {};
    var backwards = opts.backwards || false;

    var token = eventContext.getPaginateToken(backwards);
    if (!token) {
        // no more results.
        return q.reject(new Error("No paginate token"));
    }

    var dir = backwards ? 'b' : 'f';
    var pendingRequest = eventContext._paginateRequests[dir];

    if (pendingRequest) {
        // already a request in progress - return the existing promise
        return pendingRequest;
    }

    var path = utils.encodeUri("/rooms/$roomId/messages", { $roomId: eventContext.getEvent().getRoomId() });
    var params = {
        from: token,
        limit: 'limit' in opts ? opts.limit : 30,
        dir: dir
    };

    var self = this;
    var promise = self._http.authedRequest(undefined, "GET", path, params).then(function (res) {
        var token = res.end;
        if (res.chunk.length === 0) {
            token = null;
        } else {
            var matrixEvents = utils.map(res.chunk, self.getEventMapper());
            if (backwards) {
                // eventContext expects the events in timeline order, but
                // back-pagination returns them in reverse order.
                matrixEvents.reverse();
            }
            eventContext.addEvents(matrixEvents, backwards);
        }
        eventContext.setPaginateToken(token, backwards);
        return eventContext;
    }).finally(function () {
        eventContext._paginateRequests[dir] = null;
    });
    eventContext._paginateRequests[dir] = promise;

    return promise;
};

/**
 * Get an EventTimeline for the given event
 *
 * <p>If the EventTimelineSet object already has the given event in its store, the
 * corresponding timeline will be returned. Otherwise, a /context request is
 * made, and used to construct an EventTimeline.
 *
 * @param {EventTimelineSet} timelineSet  The timelineSet to look for the event in
 * @param {string} eventId  The ID of the event to look for
 *
 * @return {module:client.Promise} Resolves:
 *    {@link module:models/event-timeline~EventTimeline} including the given
 *    event
 */
MatrixClient.prototype.getEventTimeline = function (timelineSet, eventId) {
    // don't allow any timeline support unless it's been enabled.
    if (!this.timelineSupport) {
        throw new Error("timeline support is disabled. Set the 'timelineSupport'" + " parameter to true when creating MatrixClient to enable" + " it.");
    }

    if (timelineSet.getTimelineForEvent(eventId)) {
        return q(timelineSet.getTimelineForEvent(eventId));
    }

    var path = utils.encodeUri("/rooms/$roomId/context/$eventId", {
        $roomId: timelineSet.room.roomId,
        $eventId: eventId
    });

    // TODO: we should implement a backoff (as per scrollback()) to deal more
    // nicely with HTTP errors.
    var self = this;
    var promise = self._http.authedRequest(undefined, "GET", path).then(function (res) {
        if (!res.event) {
            throw new Error("'event' not in '/context' result - homeserver too old?");
        }

        // by the time the request completes, the event might have ended up in
        // the timeline.
        if (timelineSet.getTimelineForEvent(eventId)) {
            return timelineSet.getTimelineForEvent(eventId);
        }

        // we start with the last event, since that's the point at which we
        // have known state.
        // events_after is already backwards; events_before is forwards.
        res.events_after.reverse();
        var events = res.events_after.concat([res.event]).concat(res.events_before);
        var matrixEvents = utils.map(events, self.getEventMapper());

        var timeline = timelineSet.getTimelineForEvent(matrixEvents[0].getId());
        if (!timeline) {
            timeline = timelineSet.addTimeline();
            timeline.initialiseState(utils.map(res.state, self.getEventMapper()));
            timeline.getState(EventTimeline.FORWARDS).paginationToken = res.end;
        }
        timelineSet.addEventsToTimeline(matrixEvents, true, timeline, res.start);

        // there is no guarantee that the event ended up in "timeline" (we
        // might have switched to a neighbouring timeline) - so check the
        // room's index again. On the other hand, there's no guarantee the
        // event ended up anywhere, if it was later redacted, so we just
        // return the timeline we first thought of.
        var tl = timelineSet.getTimelineForEvent(eventId) || timeline;
        return tl;
    });
    return promise;
};

/**
 * Take an EventTimeline, and back/forward-fill results.
 *
 * @param {module:models/event-timeline~EventTimeline} eventTimeline timeline
 *    object to be updated
 * @param {Object}   [opts]
 * @param {bool}     [opts.backwards = false]  true to fill backwards,
 *    false to go forwards
 * @param {number}   [opts.limit = 30]         number of events to request
 *
 * @return {module:client.Promise} Resolves to a boolean: false if there are no
 *    events and we reached either end of the timeline; else true.
 */
MatrixClient.prototype.paginateEventTimeline = function (eventTimeline, opts) {
    var isNotifTimeline = eventTimeline.getTimelineSet() === this._notifTimelineSet;

    // TODO: we should implement a backoff (as per scrollback()) to deal more
    // nicely with HTTP errors.
    opts = opts || {};
    var backwards = opts.backwards || false;

    if (isNotifTimeline) {
        if (!backwards) {
            throw new Error("paginateNotifTimeline can only paginate backwards");
        }
    }

    var dir = backwards ? EventTimeline.BACKWARDS : EventTimeline.FORWARDS;

    var token = eventTimeline.getPaginationToken(dir);
    if (!token) {
        // no token - no results.
        return q(false);
    }

    var pendingRequest = eventTimeline._paginationRequests[dir];

    if (pendingRequest) {
        // already a request in progress - return the existing promise
        return pendingRequest;
    }

    var path = void 0,
        params = void 0,
        promise = void 0;
    var self = this;

    if (isNotifTimeline) {
        path = "/notifications";
        params = {
            limit: 'limit' in opts ? opts.limit : 30,
            only: 'highlight'
        };

        if (token && token !== "end") {
            params.from = token;
        }

        promise = this._http.authedRequestWithPrefix(undefined, "GET", path, params, undefined, httpApi.PREFIX_UNSTABLE).then(function (res) {
            var token = res.next_token;
            var matrixEvents = [];

            for (var i = 0; i < res.notifications.length; i++) {
                var notification = res.notifications[i];
                var event = self.getEventMapper()(notification.event);
                event.setPushActions(PushProcessor.actionListToActionsObject(notification.actions));
                event.event.room_id = notification.room_id; // XXX: gutwrenching
                matrixEvents[i] = event;
            }

            eventTimeline.getTimelineSet().addEventsToTimeline(matrixEvents, backwards, eventTimeline, token);

            // if we've hit the end of the timeline, we need to stop trying to
            // paginate. We need to keep the 'forwards' token though, to make sure
            // we can recover from gappy syncs.
            if (backwards && !res.next_token) {
                eventTimeline.setPaginationToken(null, dir);
            }
            return res.next_token ? true : false;
        }).finally(function () {
            eventTimeline._paginationRequests[dir] = null;
        });
        eventTimeline._paginationRequests[dir] = promise;
    } else {
        var room = this.getRoom(eventTimeline.getRoomId());
        if (!room) {
            throw new Error("Unknown room " + eventTimeline.getRoomId());
        }

        path = utils.encodeUri("/rooms/$roomId/messages", { $roomId: eventTimeline.getRoomId() });
        params = {
            from: token,
            limit: 'limit' in opts ? opts.limit : 30,
            dir: dir
        };

        var filter = eventTimeline.getFilter();
        if (filter) {
            // XXX: it's horrific that /messages' filter parameter doesn't match
            // /sync's one - see https://matrix.org/jira/browse/SPEC-451
            params.filter = JSON.stringify(filter.getRoomTimelineFilterComponent());
        }

        promise = this._http.authedRequest(undefined, "GET", path, params).then(function (res) {
            var token = res.end;
            var matrixEvents = utils.map(res.chunk, self.getEventMapper());
            eventTimeline.getTimelineSet().addEventsToTimeline(matrixEvents, backwards, eventTimeline, token);

            // if we've hit the end of the timeline, we need to stop trying to
            // paginate. We need to keep the 'forwards' token though, to make sure
            // we can recover from gappy syncs.
            if (backwards && res.end == res.start) {
                eventTimeline.setPaginationToken(null, dir);
            }
            return res.end != res.start;
        }).finally(function () {
            eventTimeline._paginationRequests[dir] = null;
        });
        eventTimeline._paginationRequests[dir] = promise;
    }

    return promise;
};

/**
 * Reset the notifTimelineSet entirely, paginating in some historical notifs as
 * a starting point for subsequent pagination.
 */
MatrixClient.prototype.resetNotifTimelineSet = function () {
    if (!this._notifTimelineSet) {
        return;
    }

    // FIXME: This thing is a total hack, and results in duplicate events being
    // added to the timeline both from /sync and /notifications, and lots of
    // slow and wasteful processing and pagination.  The correct solution is to
    // extend /messages or /search or something to filter on notifications.

    // use the fictitious token 'end'. in practice we would ideally give it
    // the oldest backwards pagination token from /sync, but /sync doesn't
    // know about /notifications, so we have no choice but to start paginating
    // from the current point in time.  This may well overlap with historical
    // notifs which are then inserted into the timeline by /sync responses.
    this._notifTimelineSet.resetLiveTimeline('end', true);

    // we could try to paginate a single event at this point in order to get
    // a more valid pagination token, but it just ends up with an out of order
    // timeline. given what a mess this is and given we're going to have duplicate
    // events anyway, just leave it with the dummy token for now.
    /*
    this.paginateNotifTimeline(this._notifTimelineSet.getLiveTimeline(), {
        backwards: true,
        limit: 1
    });
    */
};

/**
 * Peek into a room and receive updates about the room. This only works if the
 * history visibility for the room is world_readable.
 * @param {String} roomId The room to attempt to peek into.
 * @return {module:client.Promise} Resolves: Room object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.peekInRoom = function (roomId) {
    if (this._peekSync) {
        this._peekSync.stopPeeking();
    }
    this._peekSync = new SyncApi(this, this._clientOpts);
    return this._peekSync.peek(roomId);
};

/**
 * Stop any ongoing room peeking.
 */
MatrixClient.prototype.stopPeeking = function () {
    if (this._peekSync) {
        this._peekSync.stopPeeking();
        this._peekSync = null;
    }
};

/**
 * Set r/w flags for guest access in a room.
 * @param {string} roomId The room to configure guest access in.
 * @param {Object} opts Options
 * @param {boolean} opts.allowJoin True to allow guests to join this room. This
 * implicitly gives guests write access. If false or not given, guests are
 * explicitly forbidden from joining the room.
 * @param {boolean} opts.allowRead True to set history visibility to
 * be world_readable. This gives guests read access *from this point forward*.
 * If false or not given, history visibility is not modified.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setGuestAccess = function (roomId, opts) {
    var writePromise = this.sendStateEvent(roomId, "m.room.guest_access", {
        guest_access: opts.allowJoin ? "can_join" : "forbidden"
    });

    var readPromise = q();
    if (opts.allowRead) {
        readPromise = this.sendStateEvent(roomId, "m.room.history_visibility", {
            history_visibility: "world_readable"
        });
    }

    return q.all(readPromise, writePromise);
};

// Registration/Login operations
// =============================

/**
 * Requests an email verification token for the purposes of registration.
 * This API proxies the Identity Server /validate/email/requestToken API,
 * adding registration-specific behaviour. Specifically, if an account with
 * the given email address already exists, it will either send an email
 * to the address informing them of this or return M_THREEPID_IN_USE
 * (which one is up to the Home Server).
 *
 * requestEmailToken calls the equivalent API directly on the ID server,
 * therefore bypassing the registration-specific logic.
 *
 * Parameters and return value are as for requestEmailToken

 * @param {string} email As requestEmailToken
 * @param {string} clientSecret As requestEmailToken
 * @param {number} sendAttempt As requestEmailToken
 * @param {string} nextLink As requestEmailToken
 * @param {module:client.callback} callback Optional. As requestEmailToken
 * @return {module:client.Promise} Resolves: As requestEmailToken
 */
MatrixClient.prototype.requestRegisterEmailToken = function (email, clientSecret, sendAttempt, nextLink, callback) {
    return this._requestTokenFromEndpoint("/register/email/requestToken", email, clientSecret, sendAttempt, nextLink, callback);
};

/**
 * Requests an email verification token for the purposes of adding a
 * third party identifier to an account.
 * This API proxies the Identity Server /validate/email/requestToken API,
 * adding specific behaviour for the addition of email addresses to an
 * account. Specifically, if an account with
 * the given email address already exists, it will either send an email
 * to the address informing them of this or return M_THREEPID_IN_USE
 * (which one is up to the Home Server).
 *
 * requestEmailToken calls the equivalent API directly on the ID server,
 * therefore bypassing the email addition specific logic.
 *
 * @param {string} email As requestEmailToken
 * @param {string} clientSecret As requestEmailToken
 * @param {number} sendAttempt As requestEmailToken
 * @param {string} nextLink As requestEmailToken
 * @param {module:client.callback} callback Optional. As requestEmailToken
 * @return {module:client.Promise} Resolves: As requestEmailToken
 */
MatrixClient.prototype.requestAdd3pidEmailToken = function (email, clientSecret, sendAttempt, nextLink, callback) {
    return this._requestTokenFromEndpoint("/account/3pid/email/requestToken", email, clientSecret, sendAttempt, nextLink, callback);
};

/**
 * Requests an email verification token for the purposes of resetting
 * the password on an account.
 * This API proxies the Identity Server /validate/email/requestToken API,
 * adding specific behaviour for the password resetting. Specifically,
 * if no account with the given email address exists, it may either
 * return M_THREEPID_NOT_FOUND or send an email
 * to the address informing them of this (which one is up to the Home Server).
 *
 * requestEmailToken calls the equivalent API directly on the ID server,
 * therefore bypassing the password reset specific logic.
 *
 * @param {string} email As requestEmailToken
 * @param {string} clientSecret As requestEmailToken
 * @param {number} sendAttempt As requestEmailToken
 * @param {string} nextLink As requestEmailToken
 * @param {module:client.callback} callback Optional. As requestEmailToken
 * @return {module:client.Promise} Resolves: As requestEmailToken
 */
MatrixClient.prototype.requestPasswordEmailToken = function (email, clientSecret, sendAttempt, nextLink, callback) {
    return this._requestTokenFromEndpoint("/account/password/email/requestToken", email, clientSecret, sendAttempt, nextLink, callback);
};

/**
 * Internal utility function for requesting validation tokens from usage-specific
 * requestToken endpoints.
 *
 * @param {string} endpoint The endpoint to send the request to
 * @param {string} email As requestEmailToken
 * @param {string} clientSecret As requestEmailToken
 * @param {number} sendAttempt As requestEmailToken
 * @param {string} nextLink As requestEmailToken
 * @param {module:client.callback} callback Optional. As requestEmailToken
 * @return {module:client.Promise} Resolves: As requestEmailToken
 */
MatrixClient.prototype._requestTokenFromEndpoint = function (endpoint, email, clientSecret, sendAttempt, nextLink, callback) {
    var id_server_url = url.parse(this.idBaseUrl);
    if (id_server_url.host === null) {
        throw new Error("Invalid ID server URL: " + this.idBaseUrl);
    }

    var params = {
        client_secret: clientSecret,
        email: email,
        send_attempt: sendAttempt,
        next_link: nextLink,
        id_server: id_server_url.host
    };
    return this._http.request(callback, "POST", endpoint, undefined, params);
};

// Push operations
// ===============

/**
 * Get the room-kind push rule associated with a room.
 * @param {string} scope "global" or device-specific.
 * @param {string} roomId the id of the room.
 * @return {object} the rule or undefined.
 */
MatrixClient.prototype.getRoomPushRule = function (scope, roomId) {
    // There can be only room-kind push rule per room
    // and its id is the room id.
    if (this.pushRules) {
        for (var i = 0; i < this.pushRules[scope].room.length; i++) {
            var rule = this.pushRules[scope].room[i];
            if (rule.rule_id === roomId) {
                return rule;
            }
        }
    } else {
        throw new Error("SyncApi.sync() must be done before accessing to push rules.");
    }
};

/**
 * Set a room-kind muting push rule in a room.
 * The operation also updates MatrixClient.pushRules at the end.
 * @param {string} scope "global" or device-specific.
 * @param {string} roomId the id of the room.
 * @param {string} mute the mute state.
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.setRoomMutePushRule = function (scope, roomId, mute) {
    var self = this;
    var deferred = void 0,
        hasDontNotifyRule = void 0;

    // Get the existing room-kind push rule if any
    var roomPushRule = this.getRoomPushRule(scope, roomId);
    if (roomPushRule) {
        if (0 <= roomPushRule.actions.indexOf("dont_notify")) {
            hasDontNotifyRule = true;
        }
    }

    if (!mute) {
        // Remove the rule only if it is a muting rule
        if (hasDontNotifyRule) {
            deferred = this.deletePushRule(scope, "room", roomPushRule.rule_id);
        }
    } else {
        if (!roomPushRule) {
            deferred = this.addPushRule(scope, "room", roomId, {
                actions: ["dont_notify"]
            });
        } else if (!hasDontNotifyRule) {
            // Remove the existing one before setting the mute push rule
            // This is a workaround to SYN-590 (Push rule update fails)
            deferred = q.defer();
            this.deletePushRule(scope, "room", roomPushRule.rule_id).done(function () {
                self.addPushRule(scope, "room", roomId, {
                    actions: ["dont_notify"]
                }).done(function () {
                    deferred.resolve();
                }, function (err) {
                    deferred.reject(err);
                });
            }, function (err) {
                deferred.reject(err);
            });

            deferred = deferred.promise;
        }
    }

    if (deferred) {
        var _ret2 = function () {
            // Update this.pushRules when the operation completes
            var ruleRefreshDeferred = q.defer();
            deferred.done(function () {
                self.getPushRules().done(function (result) {
                    self.pushRules = result;
                    ruleRefreshDeferred.resolve();
                }, function (err) {
                    ruleRefreshDeferred.reject(err);
                });
            }, function (err) {
                // Update it even if the previous operation fails. This can help the
                // app to recover when push settings has been modifed from another client
                self.getPushRules().done(function (result) {
                    self.pushRules = result;
                    ruleRefreshDeferred.reject(err);
                }, function (err2) {
                    ruleRefreshDeferred.reject(err);
                });
            });
            return {
                v: ruleRefreshDeferred.promise
            };
        }();

        if ((typeof _ret2 === "undefined" ? "undefined" : _typeof(_ret2)) === "object") return _ret2.v;
    }
};

// Search
// ======

/**
 * Perform a server-side search for messages containing the given text.
 * @param {Object} opts Options for the search.
 * @param {string} opts.query The text to query.
 * @param {string=} opts.keys The keys to search on. Defaults to all keys. One
 * of "content.body", "content.name", "content.topic".
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.searchMessageText = function (opts, callback) {
    return this.search({
        body: {
            search_categories: {
                room_events: {
                    keys: opts.keys,
                    search_term: opts.query
                }
            }
        }
    }, callback);
};

/**
 * Perform a server-side search for room events.
 *
 * The returned promise resolves to an object containing the fields:
 *
 *  * {number}  count:       estimate of the number of results
 *  * {string}  next_batch:  token for back-pagination; if undefined, there are
 *                           no more results
 *  * {Array}   highlights:  a list of words to highlight from the stemming
 *                           algorithm
 *  * {Array}   results:     a list of results
 *
 * Each entry in the results list is a {module:models/search-result.SearchResult}.
 *
 * @param {Object} opts
 * @param {string} opts.term     the term to search for
 * @param {Object} opts.filter   a JSON filter object to pass in the request
 * @return {module:client.Promise} Resolves: result object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.searchRoomEvents = function (opts) {
    // TODO: support groups

    var body = {
        search_categories: {
            room_events: {
                search_term: opts.term,
                filter: opts.filter,
                order_by: "recent",
                event_context: {
                    before_limit: 1,
                    after_limit: 1,
                    include_profile: true
                }
            }
        }
    };

    var searchResults = {
        _query: body,
        results: [],
        highlights: []
    };

    return this.search({ body: body }).then(this._processRoomEventsSearch.bind(this, searchResults));
};

/**
 * Take a result from an earlier searchRoomEvents call, and backfill results.
 *
 * @param  {object} searchResults  the results object to be updated
 * @return {module:client.Promise} Resolves: updated result object
 * @return {Error} Rejects: with an error response.
 */
MatrixClient.prototype.backPaginateRoomEventsSearch = function (searchResults) {
    // TODO: we should implement a backoff (as per scrollback()) to deal more
    // nicely with HTTP errors.

    if (!searchResults.next_batch) {
        return q.reject(new Error("Cannot backpaginate event search any further"));
    }

    if (searchResults.pendingRequest) {
        // already a request in progress - return the existing promise
        return searchResults.pendingRequest;
    }

    var searchOpts = {
        body: searchResults._query,
        next_batch: searchResults.next_batch
    };

    var promise = this.search(searchOpts).then(this._processRoomEventsSearch.bind(this, searchResults)).finally(function () {
        searchResults.pendingRequest = null;
    });
    searchResults.pendingRequest = promise;

    return promise;
};

/**
 * helper for searchRoomEvents and backPaginateRoomEventsSearch. Processes the
 * response from the API call and updates the searchResults
 *
 * @param {Object} searchResults
 * @param {Object} response
 * @return {Object} searchResults
 * @private
 */
MatrixClient.prototype._processRoomEventsSearch = function (searchResults, response) {
    var room_events = response.search_categories.room_events;

    searchResults.count = room_events.count;
    searchResults.next_batch = room_events.next_batch;

    // combine the highlight list with our existing list; build an object
    // to avoid O(N^2) fail
    var highlights = {};
    room_events.highlights.forEach(function (hl) {
        highlights[hl] = 1;
    });
    searchResults.highlights.forEach(function (hl) {
        highlights[hl] = 1;
    });

    // turn it back into a list.
    searchResults.highlights = Object.keys(highlights);

    // append the new results to our existing results
    for (var i = 0; i < room_events.results.length; i++) {
        var sr = SearchResult.fromJson(room_events.results[i], this.getEventMapper());
        searchResults.results.push(sr);
    }
    return searchResults;
};

/**
 * Populate the store with rooms the user has left.
 * @return {module:client.Promise} Resolves: TODO - Resolved when the rooms have
 * been added to the data store.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.syncLeftRooms = function () {
    // Guard against multiple calls whilst ongoing and multiple calls post success
    if (this._syncedLeftRooms) {
        return q([]); // don't call syncRooms again if it succeeded.
    }
    if (this._syncLeftRoomsPromise) {
        return this._syncLeftRoomsPromise; // return the ongoing request
    }
    var self = this;
    var syncApi = new SyncApi(this, this._clientOpts);
    this._syncLeftRoomsPromise = syncApi.syncLeftRooms();

    // cleanup locks
    this._syncLeftRoomsPromise.then(function (res) {
        console.log("Marking success of sync left room request");
        self._syncedLeftRooms = true; // flip the bit on success
    }).finally(function () {
        self._syncLeftRoomsPromise = null; // cleanup ongoing request state
    });

    return this._syncLeftRoomsPromise;
};

// Filters
// =======

/**
 * Create a new filter.
 * @param {Object} content The HTTP body for the request
 * @return {Filter} Resolves to a Filter object.
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.createFilter = function (content) {
    var self = this;
    var path = utils.encodeUri("/user/$userId/filter", {
        $userId: this.credentials.userId
    });
    return this._http.authedRequest(undefined, "POST", path, undefined, content).then(function (response) {
        // persist the filter
        var filter = Filter.fromJson(self.credentials.userId, response.filter_id, content);
        self.store.storeFilter(filter);
        return filter;
    });
};

/**
 * Retrieve a filter.
 * @param {string} userId The user ID of the filter owner
 * @param {string} filterId The filter ID to retrieve
 * @param {boolean} allowCached True to allow cached filters to be returned.
 * Default: True.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.getFilter = function (userId, filterId, allowCached) {
    if (allowCached) {
        var filter = this.store.getFilter(userId, filterId);
        if (filter) {
            return q(filter);
        }
    }

    var self = this;
    var path = utils.encodeUri("/user/$userId/filter/$filterId", {
        $userId: userId,
        $filterId: filterId
    });

    return this._http.authedRequest(undefined, "GET", path, undefined, undefined).then(function (response) {
        // persist the filter
        var filter = Filter.fromJson(userId, filterId, response);
        self.store.storeFilter(filter);
        return filter;
    });
};

/**
 * @param {string} filterName
 * @param {Filter} filter
 * @return {Promise<String>} Filter ID
 */
MatrixClient.prototype.getOrCreateFilter = function (filterName, filter) {
    var filterId = this.store.getFilterIdByName(filterName);
    var promise = q();
    var self = this;

    if (filterId) {
        // check that the existing filter matches our expectations
        promise = self.getFilter(self.credentials.userId, filterId, true).then(function (existingFilter) {
            var oldDef = existingFilter.getDefinition();
            var newDef = filter.getDefinition();

            if (utils.deepCompare(oldDef, newDef)) {
                // super, just use that.
                // debuglog("Using existing filter ID %s: %s", filterId,
                //          JSON.stringify(oldDef));
                return q(filterId);
            }
            // debuglog("Existing filter ID %s: %s; new filter: %s",
            //          filterId, JSON.stringify(oldDef), JSON.stringify(newDef));
            self.store.setFilterIdByName(filterName, undefined);
            return undefined;
        }, function (error) {
            // Synapse currently returns the following when the filter cannot be found:
            // {
            //     errcode: "M_UNKNOWN",
            //     name: "M_UNKNOWN",
            //     message: "No row found",
            //     data: Object, httpStatus: 404
            // }
            if (error.httpStatus === 404 && (error.errcode === "M_UNKNOWN" || error.errcode === "M_NOT_FOUND")) {
                // Clear existing filterId from localStorage
                // if it no longer exists on the server
                self.store.setFilterIdByName(filterName, undefined);
                // Return a undefined value for existingId further down the promise chain
                return undefined;
            } else {
                throw error;
            }
        });
    }

    return promise.then(function (existingId) {
        if (existingId) {
            return existingId;
        }

        // create a new filter
        return self.createFilter(filter.getDefinition()).then(function (createdFilter) {
            // debuglog("Created new filter ID %s: %s", createdFilter.filterId,
            //          JSON.stringify(createdFilter.getDefinition()));
            self.store.setFilterIdByName(filterName, createdFilter.filterId);
            return createdFilter.filterId;
        });
    });
};

/**
 * Gets a bearer token from the Home Server that the user can
 * present to a third party in order to prove their ownership
 * of the Matrix account they are logged into.
 * @return {module:client.Promise} Resolves: Token object
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.getOpenIdToken = function () {
    var path = utils.encodeUri("/user/$userId/openid/request_token", {
        $userId: this.credentials.userId
    });

    return this._http.authedRequest(undefined, "POST", path, undefined, {});
};

// VoIP operations
// ===============

/**
 * @param {module:client.callback} callback Optional.
 * @return {module:client.Promise} Resolves: TODO
 * @return {module:http-api.MatrixError} Rejects: with an error response.
 */
MatrixClient.prototype.turnServer = function (callback) {
    return this._http.authedRequest(callback, "GET", "/voip/turnServer");
};

/**
 * Get the TURN servers for this home server.
 * @return {Array<Object>} The servers or an empty list.
 */
MatrixClient.prototype.getTurnServers = function () {
    return this._turnServers || [];
};

// Higher level APIs
// =================

// TODO: stuff to handle:
//   local echo
//   event dup suppression? - apparently we should still be doing this
//   tracking current display name / avatar per-message
//   pagination
//   re-sending (including persisting pending messages to be sent)
//   - Need a nice way to callback the app for arbitrary events like
//     displayname changes
//   due to ambiguity (or should this be on a chat-specific layer)?
//   reconnect after connectivity outages


/**
 * High level helper method to call initialSync, emit the resulting events,
 * and then start polling the eventStream for new events. To listen for these
 * events, add a listener for {@link module:client~MatrixClient#event:"event"}
 * via {@link module:client~MatrixClient#on}.
 * @param {Object=} opts Options to apply when syncing.
 * @param {Number=} opts.initialSyncLimit The event <code>limit=</code> to apply
 * to initial sync. Default: 8.
 * @param {Boolean=} opts.includeArchivedRooms True to put <code>archived=true</code>
 * on the <code>/initialSync</code> request. Default: false.
 * @param {Boolean=} opts.resolveInvitesToProfiles True to do /profile requests
 * on every invite event if the displayname/avatar_url is not known for this user ID.
 * Default: false.
 *
 * @param {String=} opts.pendingEventOrdering Controls where pending messages
 * appear in a room's timeline. If "<b>chronological</b>", messages will appear
 * in the timeline when the call to <code>sendEvent</code> was made. If
 * "<b>detached</b>", pending messages will appear in a separate list,
 * accessbile via {@link module:models/room#getPendingEvents}. Default:
 * "chronological".
 *
 * @param {Number=} opts.pollTimeout The number of milliseconds to wait on /events.
 * Default: 30000 (30 seconds).
 *
 * @param {Filter=} opts.filter The filter to apply to /sync calls. This will override
 * the opts.initialSyncLimit, which would normally result in a timeline limit filter.
 */
MatrixClient.prototype.startClient = function (opts) {
    var _this2 = this;

    if (this.clientRunning) {
        // client is already running.
        return;
    }
    this.clientRunning = true;
    // backwards compat for when 'opts' was 'historyLen'.
    if (typeof opts === "number") {
        opts = {
            initialSyncLimit: opts
        };
    }

    this._clientOpts = opts;

    if (this._crypto) {
        (function () {
            _this2._crypto.uploadKeys(5).done();
            var tenMinutes = 1000 * 60 * 10;
            var self = _this2;
            _this2._uploadIntervalID = global.setInterval(function () {
                self._crypto.uploadKeys(5).done();
            }, tenMinutes);
        })();
    }

    // periodically poll for turn servers if we support voip
    checkTurnServers(this);

    if (this._syncApi) {
        // This shouldn't happen since we thought the client was not running
        console.error("Still have sync object whilst not running: stopping old one");
        this._syncApi.stop();
    }
    this._syncApi = new SyncApi(this, opts);
    this._syncApi.sync();
};

/**
 * High level helper method to stop the client from polling and allow a
 * clean shutdown.
 */
MatrixClient.prototype.stopClient = function () {
    this.clientRunning = false;
    // TODO: f.e. Room => self.store.storeRoom(room) ?
    if (this._syncApi) {
        this._syncApi.stop();
        this._syncApi = null;
    }
    if (this._crypto) {
        global.clearInterval(this._uploadIntervalID);
    }
    global.clearTimeout(this._checkTurnServersTimeoutID);
};

function setupCallEventHandler(client) {
    var candidatesByCall = {
        // callId: [Candidate]
    };

    // Maintain a buffer of events before the client has synced for the first time.
    // This buffer will be inspected to see if we should send incoming call
    // notifications. It needs to be buffered to correctly determine if an
    // incoming call has had a matching answer/hangup.
    var callEventBuffer = [];
    var isClientPrepared = false;
    client.on("sync", function (state) {
        if (state === "PREPARED") {
            (function () {
                isClientPrepared = true;
                var ignoreCallIds = {}; // Set<String>
                // inspect the buffer and mark all calls which have been answered
                // or hung up before passing them to the call event handler.
                for (var i = callEventBuffer.length - 1; i >= 0; i--) {
                    var ev = callEventBuffer[i];
                    if (ev.getType() === "m.call.answer" || ev.getType() === "m.call.hangup") {
                        ignoreCallIds[ev.getContent().call_id] = "yep";
                    }
                }
                // now loop through the buffer chronologically and inject them
                callEventBuffer.forEach(function (e) {
                    if (ignoreCallIds[e.getContent().call_id]) {
                        return;
                    }
                    callEventHandler(e);
                });
                callEventBuffer = [];
            })();
        }
    });

    client.on("event", function (event) {
        if (!isClientPrepared) {
            if (event.getType().indexOf("m.call.") === 0) {
                callEventBuffer.push(event);
            }
            return;
        }
        callEventHandler(event);
    });

    function callEventHandler(event) {
        if (event.getType().indexOf("m.call.") !== 0) {
            return; // not a call event
        }
        var content = event.getContent();
        var call = content.call_id ? client.callList[content.call_id] : undefined;
        var i = void 0;
        //console.log("RECV %s content=%s", event.getType(), JSON.stringify(content));

        if (event.getType() === "m.call.invite") {
            if (event.getSender() === client.credentials.userId) {
                return; // ignore invites you send
            }

            if (event.getAge() > content.lifetime) {
                return; // expired call
            }

            if (call && call.state === "ended") {
                return; // stale/old invite event
            }
            if (call) {
                console.log("WARN: Already have a MatrixCall with id %s but got an " + "invite. Clobbering.", content.call_id);
            }

            call = webRtcCall.createNewMatrixCall(client, event.getRoomId());
            if (!call) {
                console.log("Incoming call ID " + content.call_id + " but this client " + "doesn't support WebRTC");
                // don't hang up the call: there could be other clients
                // connected that do support WebRTC and declining the
                // the call on their behalf would be really annoying.
                return;
            }

            call.callId = content.call_id;
            call._initWithInvite(event);
            client.callList[call.callId] = call;

            // if we stashed candidate events for that call ID, play them back now
            if (candidatesByCall[call.callId]) {
                for (i = 0; i < candidatesByCall[call.callId].length; i++) {
                    call._gotRemoteIceCandidate(candidatesByCall[call.callId][i]);
                }
            }

            // Were we trying to call that user (room)?
            var existingCall = void 0;
            var existingCalls = utils.values(client.callList);
            for (i = 0; i < existingCalls.length; ++i) {
                var thisCall = existingCalls[i];
                if (call.room_id === thisCall.room_id && thisCall.direction === 'outbound' && ["wait_local_media", "create_offer", "invite_sent"].indexOf(thisCall.state) !== -1) {
                    existingCall = thisCall;
                    break;
                }
            }

            if (existingCall) {
                // If we've only got to wait_local_media or create_offer and
                // we've got an invite, pick the incoming call because we know
                // we haven't sent our invite yet otherwise, pick whichever
                // call has the lowest call ID (by string comparison)
                if (existingCall.state === 'wait_local_media' || existingCall.state === 'create_offer' || existingCall.callId > call.callId) {
                    console.log("Glare detected: answering incoming call " + call.callId + " and canceling outgoing call " + existingCall.callId);
                    existingCall._replacedBy(call);
                    call.answer();
                } else {
                    console.log("Glare detected: rejecting incoming call " + call.callId + " and keeping outgoing call " + existingCall.callId);
                    call.hangup();
                }
            } else {
                client.emit("Call.incoming", call);
            }
        } else if (event.getType() === 'm.call.answer') {
            if (!call) {
                return;
            }
            if (event.getSender() === client.credentials.userId) {
                if (call.state === 'ringing') {
                    call._onAnsweredElsewhere(content);
                }
            } else {
                call._receivedAnswer(content);
            }
        } else if (event.getType() === 'm.call.candidates') {
            if (event.getSender() === client.credentials.userId) {
                return;
            }
            if (!call) {
                // store the candidates; we may get a call eventually.
                if (!candidatesByCall[content.call_id]) {
                    candidatesByCall[content.call_id] = [];
                }
                candidatesByCall[content.call_id] = candidatesByCall[content.call_id].concat(content.candidates);
            } else {
                for (i = 0; i < content.candidates.length; i++) {
                    call._gotRemoteIceCandidate(content.candidates[i]);
                }
            }
        } else if (event.getType() === 'm.call.hangup') {
            // Note that we also observe our own hangups here so we can see
            // if we've already rejected a call that would otherwise be valid
            if (!call) {
                // if not live, store the fact that the call has ended because
                // we're probably getting events backwards so
                // the hangup will come before the invite
                call = webRtcCall.createNewMatrixCall(client, event.getRoomId());
                if (call) {
                    call.callId = content.call_id;
                    call._initWithHangup(event);
                    client.callList[content.call_id] = call;
                }
            } else {
                if (call.state !== 'ended') {
                    call._onHangupReceived(content);
                    delete client.callList[content.call_id];
                }
            }
        }
    }
}

function checkTurnServers(client) {
    if (!client._supportsVoip) {
        return;
    }
    if (client.isGuest()) {
        return; // guests can't access TURN servers
    }

    client.turnServer().done(function (res) {
        if (res.uris) {
            console.log("Got TURN URIs: " + res.uris + " refresh in " + res.ttl + " secs");
            // map the response to a format that can be fed to
            // RTCPeerConnection
            var servers = {
                urls: res.uris,
                username: res.username,
                credential: res.password
            };
            client._turnServers = [servers];
            // re-fetch when we're about to reach the TTL
            client._checkTurnServersTimeoutID = setTimeout(function () {
                checkTurnServers(client);
            }, (res.ttl || 60 * 60) * 1000 * 0.9);
        }
    }, function (err) {
        console.error("Failed to get TURN URIs");
        client._checkTurnServersTimeoutID = setTimeout(function () {
            checkTurnServers(client);
        }, 60000);
    });
}

function _reject(callback, defer, err) {
    if (callback) {
        callback(err);
    }
    defer.reject(err);
}

function _resolve(callback, defer, res) {
    if (callback) {
        callback(null, res);
    }
    defer.resolve(res);
}

function _PojoToMatrixEventMapper(client) {
    function mapper(plainOldJsObject) {
        var event = new MatrixEvent(plainOldJsObject);
        if (event.isEncrypted()) {
            _decryptEvent(client, event);
        }
        return event;
    }
    return mapper;
}

/**
 * @return {Function}
 */
MatrixClient.prototype.getEventMapper = function () {
    return _PojoToMatrixEventMapper(this);
};

// Identity Server Operations
// ==========================

/**
 * Generates a random string suitable for use as a client secret. <strong>This
 * method is experimental and may change.</strong>
 * @return {string} A new client secret
 */
MatrixClient.prototype.generateClientSecret = function () {
    var ret = "";
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 32; i++) {
        ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return ret;
};

/** */
module.exports.MatrixClient = MatrixClient;
/** */
module.exports.CRYPTO_ENABLED = CRYPTO_ENABLED;

// MatrixClient Event JSDocs

/**
 * Fires whenever the SDK receives a new event.
 * <p>
 * This is only fired for live events received via /sync - it is not fired for
 * events received over context, search, or pagination APIs.
 *
 * @event module:client~MatrixClient#"event"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @example
 * matrixClient.on("event", function(event){
 *   var sender = event.getSender();
 * });
 */

/**
 * Fires whenever the SDK receives a new to-device event.
 * @event module:client~MatrixClient#"toDeviceEvent"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @example
 * matrixClient.on("toDeviceEvent", function(event){
 *   var sender = event.getSender();
 * });
 */

/**
 * Fires whenever the SDK's syncing state is updated. The state can be one of:
 * <ul>
 * <li>PREPARED : The client has synced with the server at least once and is
 * ready for methods to be called on it. This will be immediately followed by
 * a state of SYNCING. <i>This is the equivalent of "syncComplete" in the
 * previous API.</i></li>
 * <li>SYNCING : The client is currently polling for new events from the server.
 * This will be called <i>after</i> processing latest events from a sync.</li>
 * <li>ERROR : The client has had a problem syncing with the server. If this is
 * called <i>before</i> PREPARED then there was a problem performing the initial
 * sync. If this is called <i>after</i> PREPARED then there was a problem polling
 * the server for updates. This may be called multiple times even if the state is
 * already ERROR. <i>This is the equivalent of "syncError" in the previous
 * API.</i></li>
 * <li>RECONNECTING: The sync connedtion has dropped, but not in a way that should
 * be considered erroneous.
 * </li>
 * <li>STOPPED: The client has stopped syncing with server due to stopClient
 * being called.
 * </li>
 * </ul>
 * State transition diagram:
 * <pre>
 *                                          +---->STOPPED
 *                                          |
 *              +----->PREPARED -------> SYNCING <--+
 *              |        ^                  ^       |
 *              |        |                  |       |
 *              |        |                  V       |
 *   null ------+        |  +-RECONNECTING<-+       |
 *              |        |  V                       |
 *              +------->ERROR ---------------------+
 *
 * NB: 'null' will never be emitted by this event.
 * </pre>
 * Transitions:
 * <ul>
 * <li><code>null -> PREPARED</code> : Occurs when the initial sync is completed
 * first time. This involves setting up filters and obtaining push rules.
 * <li><code>null -> ERROR</code> : Occurs when the initial sync failed first time.
 * <li><code>ERROR -> PREPARED</code> : Occurs when the initial sync succeeds
 * after previously failing.
 * <li><code>PREPARED -> SYNCING</code> : Occurs immediately after transitioning
 * to PREPARED. Starts listening for live updates rather than catching up.
 * <li><code>SYNCING -> ERROR</code> : Occurs the first time a client cannot perform a
 * live update.
 * <li><code>ERROR -> SYNCING</code> : Occurs when the client has performed a
 * live update after having previously failed.
 * <li><code>ERROR -> ERROR</code> : Occurs when the client has failed to sync
 * for a second time or more.</li>
 * <li><code>SYNCING -> SYNCING</code> : Occurs when the client has performed a live
 * update. This is called <i>after</i> processing.</li>
 * <li><code>* -> STOPPED</code> : Occurs once the client has stopped syncing or
 * trying to sync after stopClient has been called.</li>
 * </ul>
 *
 * @event module:client~MatrixClient#"sync"
 * @param {string} state An enum representing the syncing state. One of "PREPARED",
 * "SYNCING", "ERROR", "STOPPED".
 * @param {?string} prevState An enum representing the previous syncing state.
 * One of "PREPARED", "SYNCING", "ERROR", "STOPPED" <b>or null</b>.
 * @param {?Object} data Data about this transition.
 * @param {MatrixError} data.err The matrix error if <code>state=ERROR</code>.
 * @example
 * matrixClient.on("sync", function(state, prevState, data) {
 *   switch (state) {
 *     case "ERROR":
 *       // update UI to say "Connection Lost"
 *       break;
 *     case "SYNCING":
 *       // update UI to remove any "Connection Lost" message
 *       break;
 *     case "PREPARED":
 *       // the client instance is ready to be queried.
 *       var rooms = matrixClient.getRooms();
 *       break;
 *   }
 * });
 */

/**
* Fires whenever a new Room is added. This will fire when you are invited to a
* room, as well as when you join a room. <strong>This event is experimental and
* may change.</strong>
* @event module:client~MatrixClient#"Room"
* @param {Room} room The newly created, fully populated room.
* @example
* matrixClient.on("Room", function(room){
*   var roomId = room.roomId;
* });
*/

/**
* Fires whenever a Room is removed. This will fire when you forget a room.
* <strong>This event is experimental and may change.</strong>
* @event module:client~MatrixClient#"deleteRoom"
* @param {string} roomId The deleted room ID.
* @example
* matrixClient.on("deleteRoom", function(roomId){
*   // update UI from getRooms()
* });
*/

/**
 * Fires whenever an incoming call arrives.
 * @event module:client~MatrixClient#"Call.incoming"
 * @param {module:webrtc/call~MatrixCall} call The incoming call.
 * @example
 * matrixClient.on("Call.incoming", function(call){
 *   call.answer(); // auto-answer
 * });
 */

/**
 * Fires whenever the login session the JS SDK is using is no
 * longer valid and the user must log in again.
 * NB. This only fires when action is required from the user, not
 * when then login session can be renewed by using a refresh token.
 * @event module:client~MatrixClient#"Session.logged_out"
 * @example
 * matrixClient.on("Session.logged_out", function(call){
 *   // show the login screen
 * });
 */

/**
 * Fires when a device is marked as verified/unverified/blocked/unblocked by
 * {@link module:client~MatrixClient#setDeviceVerified|MatrixClient.setDeviceVerified} or
 * {@link module:client~MatrixClient#setDeviceBlocked|MatrixClient.setDeviceBlocked}.
 *
 * @event module:client~MatrixClient#"deviceVerificationChanged"
 * @param {string} userId the owner of the verified device
 * @param {string} deviceId the id of the verified device
 */

/**
 * Fires whenever new user-scoped account_data is added.
 * @event module:client~MatrixClient#"Room"
 * @param {MatrixEvent} event The event describing the account_data just added
 * @example
 * matrixClient.on("accountData", function(event){
 *   myAccountData[event.type] = event.content;
 * });
 */

// EventEmitter JSDocs

/**
 * The {@link https://nodejs.org/api/events.html|EventEmitter} class.
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html}
 */

/**
 * Adds a listener to the end of the listeners array for the specified event.
 * No checks are made to see if the listener has already been added. Multiple
 * calls passing the same combination of event and listener will result in the
 * listener being added multiple times.
 * @function external:EventEmitter#on
 * @param {string} event The event to listen for.
 * @param {Function} listener The function to invoke.
 * @return {EventEmitter} for call chaining.
 */

/**
 * Alias for {@link external:EventEmitter#on}.
 * @function external:EventEmitter#addListener
 * @param {string} event The event to listen for.
 * @param {Function} listener The function to invoke.
 * @return {EventEmitter} for call chaining.
 */

/**
 * Adds a <b>one time</b> listener for the event. This listener is invoked only
 * the next time the event is fired, after which it is removed.
 * @function external:EventEmitter#once
 * @param {string} event The event to listen for.
 * @param {Function} listener The function to invoke.
 * @return {EventEmitter} for call chaining.
 */

/**
 * Remove a listener from the listener array for the specified event.
 * <b>Caution:</b> changes array indices in the listener array behind the
 * listener.
 * @function external:EventEmitter#removeListener
 * @param {string} event The event to listen for.
 * @param {Function} listener The function to invoke.
 * @return {EventEmitter} for call chaining.
 */

/**
 * Removes all listeners, or those of the specified event. It's not a good idea
 * to remove listeners that were added elsewhere in the code, especially when
 * it's on an emitter that you didn't create (e.g. sockets or file streams).
 * @function external:EventEmitter#removeAllListeners
 * @param {string} event Optional. The event to remove listeners for.
 * @return {EventEmitter} for call chaining.
 */

/**
 * Execute each of the listeners in order with the supplied arguments.
 * @function external:EventEmitter#emit
 * @param {string} event The event to emit.
 * @param {Function} listener The function to invoke.
 * @return {boolean} true if event had listeners, false otherwise.
 */

/**
 * By default EventEmitters will print a warning if more than 10 listeners are
 * added for a particular event. This is a useful default which helps finding
 * memory leaks. Obviously not all Emitters should be limited to 10. This
 * function allows that to be increased. Set to zero for unlimited.
 * @function external:EventEmitter#setMaxListeners
 * @param {Number} n The max number of listeners.
 * @return {EventEmitter} for call chaining.
 */

// MatrixClient Callback JSDocs

/**
 * The standard MatrixClient callback interface. Functions which accept this
 * will specify 2 return arguments. These arguments map to the 2 parameters
 * specified in this callback.
 * @callback module:client.callback
 * @param {Object} err The error value, the "rejected" value or null.
 * @param {Object} data The data returned, the "resolved" value.
 */

/**
 * {@link https://github.com/kriskowal/q|A promise implementation (Q)}. Functions
 * which return this will specify 2 return arguments. These arguments map to the
 * "onFulfilled" and "onRejected" values of the Promise.
 * @typedef {Object} Promise
 * @static
 * @property {Function} then promise.then(onFulfilled, onRejected, onProgress)
 * @property {Function} catch promise.catch(onRejected)
 * @property {Function} finally promise.finally(callback)
 * @property {Function} done promise.done(onFulfilled, onRejected, onProgress)
 */

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./base-apis":2,"./content-repo":4,"./crypto":11,"./filter":14,"./http-api":15,"./models/event":21,"./models/event-timeline":20,"./models/search-result":26,"./pushprocessor":28,"./store/stub":33,"./sync":34,"./utils":36,"./webrtc/call":37,"events":46,"q":42,"url":47}],4:[function(require,module,exports){
"use strict";

/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/**
 * @module content-repo
 */
var utils = require("./utils");

/** Content Repo utility functions */
module.exports = {
    /**
     * Get the HTTP URL for an MXC URI.
     * @param {string} baseUrl The base homeserver url which has a content repo.
     * @param {string} mxc The mxc:// URI.
     * @param {Number} width The desired width of the thumbnail.
     * @param {Number} height The desired height of the thumbnail.
     * @param {string} resizeMethod The thumbnail resize method to use, either
     * "crop" or "scale".
     * @param {Boolean} allowDirectLinks If true, return any non-mxc URLs
     * directly. Fetching such URLs will leak information about the user to
     * anyone they share a room with. If false, will return the emptry string
     * for such URLs.
     * @return {string} The complete URL to the content.
     */
    getHttpUriForMxc: function getHttpUriForMxc(baseUrl, mxc, width, height, resizeMethod, allowDirectLinks) {
        if (typeof mxc !== "string" || !mxc) {
            return '';
        }
        if (mxc.indexOf("mxc://") !== 0) {
            if (allowDirectLinks) {
                return mxc;
            } else {
                return '';
            }
        }
        var serverAndMediaId = mxc.slice(6); // strips mxc://
        var prefix = "/_matrix/media/v1/download/";
        var params = {};

        if (width) {
            params.width = width;
        }
        if (height) {
            params.height = height;
        }
        if (resizeMethod) {
            params.method = resizeMethod;
        }
        if (utils.keys(params).length > 0) {
            // these are thumbnailing params so they probably want the
            // thumbnailing API...
            prefix = "/_matrix/media/v1/thumbnail/";
        }

        var fragmentOffset = serverAndMediaId.indexOf("#");
        var fragment = "";
        if (fragmentOffset >= 0) {
            fragment = serverAndMediaId.substr(fragmentOffset);
            serverAndMediaId = serverAndMediaId.substr(0, fragmentOffset);
        }
        return baseUrl + prefix + serverAndMediaId + (utils.keys(params).length === 0 ? "" : "?" + utils.encodeParams(params)) + fragment;
    },

    /**
     * Get an identicon URL from an arbitrary string.
     * @param {string} baseUrl The base homeserver url which has a content repo.
     * @param {string} identiconString The string to create an identicon for.
     * @param {Number} width The desired width of the image in pixels. Default: 96.
     * @param {Number} height The desired height of the image in pixels. Default: 96.
     * @return {string} The complete URL to the identicon.
     */
    getIdenticonUri: function getIdenticonUri(baseUrl, identiconString, width, height) {
        if (!identiconString) {
            return null;
        }
        if (!width) {
            width = 96;
        }
        if (!height) {
            height = 96;
        }
        var params = {
            width: width,
            height: height
        };

        var path = utils.encodeUri("/_matrix/media/v1/identicon/$ident", {
            $ident: identiconString
        });
        return baseUrl + path + (utils.keys(params).length === 0 ? "" : "?" + utils.encodeParams(params));
    }
};

},{"./utils":36}],5:[function(require,module,exports){
(function (global){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * olm.js wrapper
 *
 * @module crypto/OlmDevice
 */

var Olm = (typeof window !== "undefined" ? window['Olm'] : typeof global !== "undefined" ? global['Olm'] : null);
if (!Olm) {
    // this happens if we were loaded via browserify and the Olm module was not
    // loaded.
    throw new Error("Olm is not defined");
}
var utils = require("../utils");

// The maximum size of an event is 65K, and we base64 the content, so this is a
// reasonable approximation to the biggest plaintext we can encrypt.
var MAX_PLAINTEXT_LENGTH = 65536 * 3 / 4;

function checkPayloadLength(payloadString) {
    if (payloadString === undefined) {
        throw new Error("payloadString undefined");
    }

    if (payloadString.length > MAX_PLAINTEXT_LENGTH) {
        // might as well fail early here rather than letting the olm library throw
        // a cryptic memory allocation error.
        //
        // Note that even if we manage to do the encryption, the message send may fail,
        // because by the time we've wrapped the ciphertext in the event object, it may
        // exceed 65K. But at least we won't just fail with "abort()" in that case.
        throw new Error("Message too long (" + payloadString.length + " bytes). " + "The maximum for an encrypted message is " + MAX_PLAINTEXT_LENGTH + " bytes.");
    }
}

/**
 * The type of object we use for importing and exporting megolm session data.
 *
 * @typedef {Object} module:crypto/OlmDevice.MegolmSessionData
 * @property {String} sender_key  Sender's Curve25519 device key
 * @property {Object<string, string>} sender_claimed_keys Other keys the sender claims.
 * @property {String} room_id     Room this session is used in
 * @property {String} session_id  Unique id for the session
 * @property {String} session_key Base64'ed key data
 */

/**
 * Manages the olm cryptography functions. Each OlmDevice has a single
 * OlmAccount and a number of OlmSessions.
 *
 * Accounts and sessions are kept pickled in a sessionStore.
 *
 * @constructor
 * @alias module:crypto/OlmDevice
 *
 * @param {Object} sessionStore A store to be used for data in end-to-end
 *    crypto
 *
 * @property {string} deviceCurve25519Key   Curve25519 key for the account
 * @property {string} deviceEd25519Key      Ed25519 key for the account
 */
function OlmDevice(sessionStore) {
    this._sessionStore = sessionStore;
    this._pickleKey = "DEFAULT_KEY";

    var e2eKeys = void 0;
    var account = new Olm.Account();
    try {
        _initialise_account(this._sessionStore, this._pickleKey, account);
        e2eKeys = JSON.parse(account.identity_keys());
    } finally {
        account.free();
    }

    this.deviceCurve25519Key = e2eKeys.curve25519;
    this.deviceEd25519Key = e2eKeys.ed25519;

    // we don't bother stashing outboundgroupsessions in the sessionstore -
    // instead we keep them here.
    this._outboundGroupSessionStore = {};

    // Store a set of decrypted message indexes for each group session.
    // This partially mitigates a replay attack where a MITM resends a group
    // message into the room.
    //
    // TODO: If we ever remove an event from memory we will also need to remove
    // it from this map. Otherwise if we download the event from the server we
    // will think that it is a duplicate.
    //
    // Keys are strings of form "<senderKey>|<session_id>|<message_index>"
    // Values are true.
    this._inboundGroupSessionMessageIndexes = {};
}

function _initialise_account(sessionStore, pickleKey, account) {
    var e2eAccount = sessionStore.getEndToEndAccount();
    if (e2eAccount !== null) {
        account.unpickle(pickleKey, e2eAccount);
        return;
    }

    account.create();
    var pickled = account.pickle(pickleKey);
    sessionStore.storeEndToEndAccount(pickled);
}

/**
 * @return {array} The version of Olm.
 */
OlmDevice.getOlmVersion = function () {
    return Olm.get_library_version();
};

/**
 * extract our OlmAccount from the session store and call the given function
 *
 * @param {function} func
 * @return {object} result of func
 * @private
 */
OlmDevice.prototype._getAccount = function (func) {
    var account = new Olm.Account();
    try {
        var pickledAccount = this._sessionStore.getEndToEndAccount();
        account.unpickle(this._pickleKey, pickledAccount);
        return func(account);
    } finally {
        account.free();
    }
};

/**
 * store our OlmAccount in the session store
 *
 * @param {OlmAccount} account
 * @private
 */
OlmDevice.prototype._saveAccount = function (account) {
    var pickledAccount = account.pickle(this._pickleKey);
    this._sessionStore.storeEndToEndAccount(pickledAccount);
};

/**
 * extract an OlmSession from the session store and call the given function
 *
 * @param {string} deviceKey
 * @param {string} sessionId
 * @param {function} func
 * @return {object} result of func
 * @private
 */
OlmDevice.prototype._getSession = function (deviceKey, sessionId, func) {
    var sessions = this._sessionStore.getEndToEndSessions(deviceKey);
    var pickledSession = sessions[sessionId];

    var session = new Olm.Session();
    try {
        session.unpickle(this._pickleKey, pickledSession);
        return func(session);
    } finally {
        session.free();
    }
};

/**
 * store our OlmSession in the session store
 *
 * @param {string} deviceKey
 * @param {OlmSession} session
 * @private
 */
OlmDevice.prototype._saveSession = function (deviceKey, session) {
    var pickledSession = session.pickle(this._pickleKey);
    this._sessionStore.storeEndToEndSession(deviceKey, session.session_id(), pickledSession);
};

/**
 * get an OlmUtility and call the given function
 *
 * @param {function} func
 * @return {object} result of func
 * @private
 */
OlmDevice.prototype._getUtility = function (func) {
    var utility = new Olm.Utility();
    try {
        return func(utility);
    } finally {
        utility.free();
    }
};

/**
 * Signs a message with the ed25519 key for this account.
 *
 * @param {string} message  message to be signed
 * @return {string} base64-encoded signature
 */
OlmDevice.prototype.sign = function (message) {
    return this._getAccount(function (account) {
        return account.sign(message);
    });
};

/**
 * Get the current (unused, unpublished) one-time keys for this account.
 *
 * @return {object} one time keys; an object with the single property
 * <tt>curve25519</tt>, which is itself an object mapping key id to Curve25519
 * key.
 */
OlmDevice.prototype.getOneTimeKeys = function () {
    return this._getAccount(function (account) {
        return JSON.parse(account.one_time_keys());
    });
};

/**
 * Get the maximum number of one-time keys we can store.
 *
 * @return {number} number of keys
 */
OlmDevice.prototype.maxNumberOfOneTimeKeys = function () {
    return this._getAccount(function (account) {
        return account.max_number_of_one_time_keys();
    });
};

/**
 * Marks all of the one-time keys as published.
 */
OlmDevice.prototype.markKeysAsPublished = function () {
    var self = this;
    this._getAccount(function (account) {
        account.mark_keys_as_published();
        self._saveAccount(account);
    });
};

/**
 * Generate some new one-time keys
 *
 * @param {number} numKeys number of keys to generate
 */
OlmDevice.prototype.generateOneTimeKeys = function (numKeys) {
    var self = this;
    this._getAccount(function (account) {
        account.generate_one_time_keys(numKeys);
        self._saveAccount(account);
    });
};

/**
 * Generate a new outbound session
 *
 * The new session will be stored in the sessionStore.
 *
 * @param {string} theirIdentityKey remote user's Curve25519 identity key
 * @param {string} theirOneTimeKey  remote user's one-time Curve25519 key
 * @return {string} sessionId for the outbound session.
 */
OlmDevice.prototype.createOutboundSession = function (theirIdentityKey, theirOneTimeKey) {
    var self = this;
    return this._getAccount(function (account) {
        var session = new Olm.Session();
        try {
            session.create_outbound(account, theirIdentityKey, theirOneTimeKey);
            self._saveSession(theirIdentityKey, session);
            return session.session_id();
        } finally {
            session.free();
        }
    });
};

/**
 * Generate a new inbound session, given an incoming message
 *
 * @param {string} theirDeviceIdentityKey remote user's Curve25519 identity key
 * @param {number} message_type  message_type field from the received message (must be 0)
 * @param {string} ciphertext base64-encoded body from the received message
 *
 * @return {{payload: string, session_id: string}} decrypted payload, and
 *     session id of new session
 *
 * @raises {Error} if the received message was not valid (for instance, it
 *     didn't use a valid one-time key).
 */
OlmDevice.prototype.createInboundSession = function (theirDeviceIdentityKey, message_type, ciphertext) {
    if (message_type !== 0) {
        throw new Error("Need message_type == 0 to create inbound session");
    }

    var self = this;
    return this._getAccount(function (account) {
        var session = new Olm.Session();
        try {
            session.create_inbound_from(account, theirDeviceIdentityKey, ciphertext);
            account.remove_one_time_keys(session);
            self._saveAccount(account);

            var payloadString = session.decrypt(message_type, ciphertext);

            self._saveSession(theirDeviceIdentityKey, session);

            return {
                payload: payloadString,
                session_id: session.session_id()
            };
        } finally {
            session.free();
        }
    });
};

/**
 * Get a list of known session IDs for the given device
 *
 * @param {string} theirDeviceIdentityKey Curve25519 identity key for the
 *     remote device
 * @return {string[]}  a list of known session ids for the device
 */
OlmDevice.prototype.getSessionIdsForDevice = function (theirDeviceIdentityKey) {
    var sessions = this._sessionStore.getEndToEndSessions(theirDeviceIdentityKey);
    return utils.keys(sessions);
};

/**
 * Get the right olm session id for encrypting messages to the given identity key
 *
 * @param {string} theirDeviceIdentityKey Curve25519 identity key for the
 *     remote device
 * @return {string?}  session id, or null if no established session
 */
OlmDevice.prototype.getSessionIdForDevice = function (theirDeviceIdentityKey) {
    var sessionIds = this.getSessionIdsForDevice(theirDeviceIdentityKey);
    if (sessionIds.length === 0) {
        return null;
    }
    // Use the session with the lowest ID.
    sessionIds.sort();
    return sessionIds[0];
};

/**
 * Get information on the active Olm sessions for a device.
 * <p>
 * Returns an array, with an entry for each active session. The first entry in
 * the result will be the one used for outgoing messages. Each entry contains
 * the keys 'hasReceivedMessage' (true if the session has received an incoming
 * message and is therefore past the pre-key stage), and 'sessionId'.
 *
 * @param {string} deviceIdentityKey Curve25519 identity key for the device
 * @return {Array.<{sessionId: string, hasReceivedMessage: Boolean}>}
 */
OlmDevice.prototype.getSessionInfoForDevice = function (deviceIdentityKey) {
    var sessionIds = this.getSessionIdsForDevice(deviceIdentityKey);
    sessionIds.sort();

    var info = [];

    function getSessionInfo(session) {
        return {
            hasReceivedMessage: session.has_received_message()
        };
    }

    for (var i = 0; i < sessionIds.length; i++) {
        var sessionId = sessionIds[i];
        var res = this._getSession(deviceIdentityKey, sessionId, getSessionInfo);
        res.sessionId = sessionId;
        info.push(res);
    }
    return info;
};

/**
 * Encrypt an outgoing message using an existing session
 *
 * @param {string} theirDeviceIdentityKey Curve25519 identity key for the
 *     remote device
 * @param {string} sessionId  the id of the active session
 * @param {string} payloadString  payload to be encrypted and sent
 *
 * @return {string} ciphertext
 */
OlmDevice.prototype.encryptMessage = function (theirDeviceIdentityKey, sessionId, payloadString) {
    var self = this;

    checkPayloadLength(payloadString);

    return this._getSession(theirDeviceIdentityKey, sessionId, function (session) {
        var res = session.encrypt(payloadString);
        self._saveSession(theirDeviceIdentityKey, session);
        return res;
    });
};

/**
 * Decrypt an incoming message using an existing session
 *
 * @param {string} theirDeviceIdentityKey Curve25519 identity key for the
 *     remote device
 * @param {string} sessionId  the id of the active session
 * @param {number} message_type  message_type field from the received message
 * @param {string} ciphertext base64-encoded body from the received message
 *
 * @return {string} decrypted payload.
 */
OlmDevice.prototype.decryptMessage = function (theirDeviceIdentityKey, sessionId, message_type, ciphertext) {
    var self = this;

    return this._getSession(theirDeviceIdentityKey, sessionId, function (session) {
        var payloadString = session.decrypt(message_type, ciphertext);
        self._saveSession(theirDeviceIdentityKey, session);

        return payloadString;
    });
};

/**
 * Determine if an incoming messages is a prekey message matching an existing session
 *
 * @param {string} theirDeviceIdentityKey Curve25519 identity key for the
 *     remote device
 * @param {string} sessionId  the id of the active session
 * @param {number} message_type  message_type field from the received message
 * @param {string} ciphertext base64-encoded body from the received message
 *
 * @return {boolean} true if the received message is a prekey message which matches
 *    the given session.
 */
OlmDevice.prototype.matchesSession = function (theirDeviceIdentityKey, sessionId, message_type, ciphertext) {
    if (message_type !== 0) {
        return false;
    }

    return this._getSession(theirDeviceIdentityKey, sessionId, function (session) {
        return session.matches_inbound(ciphertext);
    });
};

// Outbound group session
// ======================

/**
 * store an OutboundGroupSession in _outboundGroupSessionStore
 *
 * @param {Olm.OutboundGroupSession} session
 * @private
 */
OlmDevice.prototype._saveOutboundGroupSession = function (session) {
    var pickledSession = session.pickle(this._pickleKey);
    this._outboundGroupSessionStore[session.session_id()] = pickledSession;
};

/**
 * extract an OutboundGroupSession from _outboundGroupSessionStore and call the
 * given function
 *
 * @param {string} sessionId
 * @param {function} func
 * @return {object} result of func
 * @private
 */
OlmDevice.prototype._getOutboundGroupSession = function (sessionId, func) {
    var pickled = this._outboundGroupSessionStore[sessionId];
    if (pickled === null) {
        throw new Error("Unknown outbound group session " + sessionId);
    }

    var session = new Olm.OutboundGroupSession();
    try {
        session.unpickle(this._pickleKey, pickled);
        return func(session);
    } finally {
        session.free();
    }
};

/**
 * Generate a new outbound group session
 *
 * @return {string} sessionId for the outbound session.
 */
OlmDevice.prototype.createOutboundGroupSession = function () {
    var session = new Olm.OutboundGroupSession();
    try {
        session.create();
        this._saveOutboundGroupSession(session);
        return session.session_id();
    } finally {
        session.free();
    }
};

/**
 * Encrypt an outgoing message with an outbound group session
 *
 * @param {string} sessionId  the id of the outboundgroupsession
 * @param {string} payloadString  payload to be encrypted and sent
 *
 * @return {string} ciphertext
 */
OlmDevice.prototype.encryptGroupMessage = function (sessionId, payloadString) {
    var self = this;

    checkPayloadLength(payloadString);

    return this._getOutboundGroupSession(sessionId, function (session) {
        var res = session.encrypt(payloadString);
        self._saveOutboundGroupSession(session);
        return res;
    });
};

/**
 * Get the session keys for an outbound group session
 *
 * @param {string} sessionId  the id of the outbound group session
 *
 * @return {{chain_index: number, key: string}} current chain index, and
 *     base64-encoded secret key.
 */
OlmDevice.prototype.getOutboundGroupSessionKey = function (sessionId) {
    return this._getOutboundGroupSession(sessionId, function (session) {
        return {
            chain_index: session.message_index(),
            key: session.session_key()
        };
    });
};

// Inbound group session
// =====================

/**
 * store an InboundGroupSession in the session store
 *
 * @param {string} roomId
 * @param {string} senderCurve25519Key
 * @param {string} sessionId
 * @param {Olm.InboundGroupSession} session
 * @param {object} keysClaimed Other keys the sender claims.
 * @private
 */
OlmDevice.prototype._saveInboundGroupSession = function (roomId, senderCurve25519Key, sessionId, session, keysClaimed) {
    var r = {
        room_id: roomId,
        session: session.pickle(this._pickleKey),
        keysClaimed: keysClaimed
    };

    this._sessionStore.storeEndToEndInboundGroupSession(senderCurve25519Key, sessionId, JSON.stringify(r));
};

/**
 * extract an InboundGroupSession from the session store and call the given function
 *
 * @param {string} roomId
 * @param {string} senderKey
 * @param {string} sessionId
 * @param {function(Olm.InboundGroupSession, Object<string, string>): T} func
 *   function to call. Second argument is the map of keys claimed by the session.
 *
 * @return {null} the sessionId is unknown
 *
 * @return {T} result of func
 *
 * @private
 * @template {T}
 */
OlmDevice.prototype._getInboundGroupSession = function (roomId, senderKey, sessionId, func) {
    var r = this._sessionStore.getEndToEndInboundGroupSession(senderKey, sessionId);

    if (r === null) {
        return null;
    }

    r = JSON.parse(r);

    // check that the room id matches the original one for the session. This stops
    // the HS pretending a message was targeting a different room.
    if (roomId !== r.room_id) {
        throw new Error("Mismatched room_id for inbound group session (expected " + r.room_id + ", was " + roomId + ")");
    }

    var session = new Olm.InboundGroupSession();
    try {
        session.unpickle(this._pickleKey, r.session);
        return func(session, r.keysClaimed || {});
    } finally {
        session.free();
    }
};

/**
 * Add an inbound group session to the session store
 *
 * @param {string} roomId     room in which this session will be used
 * @param {string} senderKey  base64-encoded curve25519 key of the sender
 * @param {string} sessionId  session identifier
 * @param {string} sessionKey base64-encoded secret key
 * @param {Object<string, string>} keysClaimed Other keys the sender claims.
 */
OlmDevice.prototype.addInboundGroupSession = function (roomId, senderKey, sessionId, sessionKey, keysClaimed) {
    var self = this;

    /* if we already have this session, consider updating it */
    function updateSession(session) {
        console.log("Update for megolm session " + senderKey + "/" + sessionId);
        // for now we just ignore updates. TODO: implement something here

        return true;
    }

    var r = this._getInboundGroupSession(roomId, senderKey, sessionId, updateSession);

    if (r !== null) {
        return;
    }

    // new session.
    var session = new Olm.InboundGroupSession();
    try {
        session.create(sessionKey);
        if (sessionId != session.session_id()) {
            throw new Error("Mismatched group session ID from senderKey: " + senderKey);
        }
        self._saveInboundGroupSession(roomId, senderKey, sessionId, session, keysClaimed);
    } finally {
        session.free();
    }
};

/**
 * Add a previously-exported inbound group session to the session store
 *
 * @param {module:crypto/OlmDevice.MegolmSessionData} data  session data
 */
OlmDevice.prototype.importInboundGroupSession = function (data) {
    /* if we already have this session, consider updating it */
    function updateSession(session) {
        console.log("Update for megolm session " + data.sender_key + "|" + data.session_id);
        // for now we just ignore updates. TODO: implement something here

        return true;
    }

    var r = this._getInboundGroupSession(data.room_id, data.sender_key, data.session_id, updateSession);

    if (r !== null) {
        return;
    }

    // new session.
    var session = new Olm.InboundGroupSession();
    try {
        session.import_session(data.session_key);
        if (data.session_id != session.session_id()) {
            throw new Error("Mismatched group session ID from senderKey: " + data.sender_key);
        }
        this._saveInboundGroupSession(data.room_id, data.sender_key, data.session_id, session, data.sender_claimed_keys);
    } finally {
        session.free();
    }
};

/**
 * Decrypt a received message with an inbound group session
 *
 * @param {string} roomId    room in which the message was received
 * @param {string} senderKey base64-encoded curve25519 key of the sender
 * @param {string} sessionId session identifier
 * @param {string} body      base64-encoded body of the encrypted message
 *
 * @return {null} the sessionId is unknown
 *
 * @return {{result: string, keysProved: Object<string, string>, keysClaimed:
 *    Object<string, string>}} result
 */
OlmDevice.prototype.decryptGroupMessage = function (roomId, senderKey, sessionId, body) {
    var self = this;

    function decrypt(session, keysClaimed) {
        var res = session.decrypt(body);

        var plaintext = res.plaintext;
        if (plaintext === undefined) {
            // Compatibility for older olm versions.
            plaintext = res;
        } else {
            // Check if we have seen this message index before to detect replay attacks.
            var messageIndexKey = senderKey + "|" + sessionId + "|" + res.message_index;
            if (messageIndexKey in self._inboundGroupSessionMessageIndexes) {
                throw new Error("Duplicate message index, possible replay attack: " + messageIndexKey);
            }
            self._inboundGroupSessionMessageIndexes[messageIndexKey] = true;
        }

        // the sender must have had the senderKey to persuade us to save the
        // session.
        var keysProved = { curve25519: senderKey };

        self._saveInboundGroupSession(roomId, senderKey, sessionId, session, keysClaimed);
        return {
            result: plaintext,
            keysClaimed: keysClaimed,
            keysProved: keysProved
        };
    }

    return this._getInboundGroupSession(roomId, senderKey, sessionId, decrypt);
};

/**
 * Export an inbound group session
 *
 * @param {string} senderKey base64-encoded curve25519 key of the sender
 * @param {string} sessionId session identifier
 * @return {module:crypto/OlmDevice.MegolmSessionData} exported session data
 */
OlmDevice.prototype.exportInboundGroupSession = function (senderKey, sessionId) {
    var s = this._sessionStore.getEndToEndInboundGroupSession(senderKey, sessionId);

    if (s === null) {
        throw new Error("Unknown inbound group session [" + senderKey + "," + sessionId + "]");
    }
    var r = JSON.parse(s);

    var session = new Olm.InboundGroupSession();
    try {
        session.unpickle(this._pickleKey, r.session);

        var messageIndex = session.first_known_index();

        return {
            "sender_key": senderKey,
            "sender_claimed_keys": r.keysClaimed,
            "room_id": r.room_id,
            "session_id": sessionId,
            "session_key": session.export_session(messageIndex)
        };
    } finally {
        session.free();
    }
};

// Utilities
// =========

/**
 * Verify an ed25519 signature.
 *
 * @param {string} key ed25519 key
 * @param {string} message message which was signed
 * @param {string} signature base64-encoded signature to be checked
 *
 * @raises {Error} if there is a problem with the verification. If the key was
 * too small then the message will be "OLM.INVALID_BASE64". If the signature
 * was invalid then the message will be "OLM.BAD_MESSAGE_MAC".
 */
OlmDevice.prototype.verifySignature = function (key, message, signature) {
    this._getUtility(function (util) {
        util.ed25519_verify(key, message, signature);
    });
};

/** */
module.exports = OlmDevice;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../utils":36}],6:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * Internal module. Defines the base classes of the encryption implementations
 *
 * @module crypto/algorithms/base
 */

var utils = require("../../utils");

/**
 * map of registered encryption algorithm classes. A map from string to {@link
 * module:crypto/algorithms/base.EncryptionAlgorithm|EncryptionAlgorithm} class
 *
 * @type {Object.<string, function(new: module:crypto/algorithms/base.EncryptionAlgorithm)>}
 */
module.exports.ENCRYPTION_CLASSES = {};

/**
 * map of registered encryption algorithm classes. Map from string to {@link
 * module:crypto/algorithms/base.DecryptionAlgorithm|DecryptionAlgorithm} class
 *
 * @type {Object.<string, function(new: module:crypto/algorithms/base.DecryptionAlgorithm)>}
 */
module.exports.DECRYPTION_CLASSES = {};

/**
 * base type for encryption implementations
 *
 * @constructor
 * @alias module:crypto/algorithms/base.EncryptionAlgorithm
 *
 * @param {object} params parameters
 * @param {string} params.userId  The UserID for the local user
 * @param {string} params.deviceId The identifier for this device.
 * @param {module:crypto} params.crypto crypto core
 * @param {module:crypto/OlmDevice} params.olmDevice olm.js wrapper
 * @param {module:base-apis~MatrixBaseApis} baseApis base matrix api interface
 * @param {string} params.roomId  The ID of the room we will be sending to
 * @param {object} params.config  The body of the m.room.encryption event
 */
var EncryptionAlgorithm = function EncryptionAlgorithm(params) {
  this._userId = params.userId;
  this._deviceId = params.deviceId;
  this._crypto = params.crypto;
  this._olmDevice = params.olmDevice;
  this._baseApis = params.baseApis;
  this._roomId = params.roomId;
};
/** */
module.exports.EncryptionAlgorithm = EncryptionAlgorithm;

/**
 * Encrypt a message event
 *
 * @method module:crypto/algorithms/base.EncryptionAlgorithm#encryptMessage
 * @abstract
 *
 * @param {module:models/room} room
 * @param {string} eventType
 * @param {object} plaintext event content
 *
 * @return {module:client.Promise} Promise which resolves to the new event body
 */

/**
 * Called when the membership of a member of the room changes.
 *
 * @param {module:models/event.MatrixEvent} event  event causing the change
 * @param {module:models/room-member} member  user whose membership changed
 * @param {string=} oldMembership  previous membership
 */
EncryptionAlgorithm.prototype.onRoomMembership = function (event, member, oldMembership) {};

/**
 * base type for decryption implementations
 *
 * @constructor
 * @alias module:crypto/algorithms/base.DecryptionAlgorithm
 *
 * @param {object} params parameters
 * @param {string} params.userId  The UserID for the local user
 * @param {module:crypto} params.crypto crypto core
 * @param {module:crypto/OlmDevice} params.olmDevice olm.js wrapper
 * @param {string=} params.roomId The ID of the room we will be receiving
 *     from. Null for to-device events.
 */
var DecryptionAlgorithm = function DecryptionAlgorithm(params) {
  this._userId = params.userId;
  this._crypto = params.crypto;
  this._olmDevice = params.olmDevice;
  this._roomId = params.roomId;
};
/** */
module.exports.DecryptionAlgorithm = DecryptionAlgorithm;

/**
 * Decrypt an event
 *
 * @method module:crypto/algorithms/base.DecryptionAlgorithm#decryptEvent
 * @abstract
 *
 * @param {object} event raw event
 *
 * @return {null} if the event referred to an unknown megolm session
 * @return {module:crypto.DecryptionResult} decryption result
 *
 * @throws {module:crypto/algorithms/base.DecryptionError} if there is a
 *   problem decrypting the event
 */

/**
 * Handle a key event
 *
 * @method module:crypto/algorithms/base.DecryptionAlgorithm#onRoomKeyEvent
 *
 * @param {module:models/event.MatrixEvent} params event key event
 */
DecryptionAlgorithm.prototype.onRoomKeyEvent = function (params) {
  // ignore by default
};

/**
 * Import a room key
 *
 * @param {module:crypto/OlmDevice.MegolmSessionData} session
 */
DecryptionAlgorithm.prototype.importRoomKey = function (session) {
  // ignore by default
};

/**
 * Exception thrown when decryption fails
 *
 * @constructor
 * @param {string} msg message describing the problem
 * @extends Error
 */
module.exports.DecryptionError = function (msg) {
  this.message = msg;
};
utils.inherits(module.exports.DecryptionError, Error);

/**
 * Registers an encryption/decryption class for a particular algorithm
 *
 * @param {string} algorithm algorithm tag to register for
 *
 * @param {class} encryptor {@link
 *     module:crypto/algorithms/base.EncryptionAlgorithm|EncryptionAlgorithm}
 *     implementation
 *
 * @param {class} decryptor {@link
 *     module:crypto/algorithms/base.DecryptionAlgorithm|DecryptionAlgorithm}
 *     implementation
 */
module.exports.registerAlgorithm = function (algorithm, encryptor, decryptor) {
  module.exports.ENCRYPTION_CLASSES[algorithm] = encryptor;
  module.exports.DECRYPTION_CLASSES[algorithm] = decryptor;
};

},{"../../utils":36}],7:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * @module crypto/algorithms
 */

var base = require("./base");

require("./olm");
require("./megolm");

/**
 * @see module:crypto/algorithms/base.ENCRYPTION_CLASSES
 */
module.exports.ENCRYPTION_CLASSES = base.ENCRYPTION_CLASSES;

/**
 * @see module:crypto/algorithms/base.DECRYPTION_CLASSES
 */
module.exports.DECRYPTION_CLASSES = base.DECRYPTION_CLASSES;

/**
 * @see module:crypto/algorithms/base.DecryptionError
 */
module.exports.DecryptionError = base.DecryptionError;

},{"./base":6,"./megolm":8,"./olm":9}],8:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * Defines m.olm encryption/decryption
 *
 * @module crypto/algorithms/megolm
 */

var q = require("q");

var utils = require("../../utils");
var olmlib = require("../olmlib");
var base = require("./base");

/**
 * @private
 * @constructor
 *
 * @param {string} sessionId
 *
 * @property {string} sessionId
 * @property {Number} useCount     number of times this session has been used
 * @property {Number} creationTime when the session was created (ms since the epoch)
 *
 * @property {object} sharedWithDevices
 *    devices with which we have shared the session key
 *        userId -> {deviceId -> msgindex}
 */
function OutboundSessionInfo(sessionId) {
    this.sessionId = sessionId;
    this.useCount = 0;
    this.creationTime = new Date().getTime();
    this.sharedWithDevices = {};
}

/**
 * Check if it's time to rotate the session
 *
 * @param {Number} rotationPeriodMsgs
 * @param {Number} rotationPeriodMs
 * @return {Boolean}
 */
OutboundSessionInfo.prototype.needsRotation = function (rotationPeriodMsgs, rotationPeriodMs) {
    var sessionLifetime = new Date().getTime() - this.creationTime;

    if (this.useCount >= rotationPeriodMsgs || sessionLifetime >= rotationPeriodMs) {
        console.log("Rotating megolm session after " + this.useCount + " messages, " + sessionLifetime + "ms");
        return true;
    }

    return false;
};

/**
 * Determine if this session has been shared with devices which it shouldn't
 * have been.
 *
 * @param {Object} devicesInRoom userId -> {deviceId -> object}
 *   devices we should shared the session with.
 *
 * @return {Boolean} true if we have shared the session with devices which aren't
 * in devicesInRoom.
 */
OutboundSessionInfo.prototype.sharedWithTooManyDevices = function (devicesInRoom) {
    for (var userId in this.sharedWithDevices) {
        if (!this.sharedWithDevices.hasOwnProperty(userId)) {
            continue;
        }

        if (!devicesInRoom.hasOwnProperty(userId)) {
            console.log("Starting new session because we shared with " + userId);
            return true;
        }

        for (var deviceId in this.sharedWithDevices[userId]) {
            if (!this.sharedWithDevices[userId].hasOwnProperty(deviceId)) {
                continue;
            }

            if (!devicesInRoom[userId].hasOwnProperty(deviceId)) {
                console.log("Starting new session because we shared with " + userId + ":" + deviceId);
                return true;
            }
        }
    }
};

/**
 * Megolm encryption implementation
 *
 * @constructor
 * @extends {module:crypto/algorithms/base.EncryptionAlgorithm}
 *
 * @param {object} params parameters, as per
 *     {@link module:crypto/algorithms/base.EncryptionAlgorithm}
 */
function MegolmEncryption(params) {
    base.EncryptionAlgorithm.call(this, params);

    // the most recent attempt to set up a session. This is used to serialise
    // the session setups, so that we have a race-free view of which session we
    // are using, and which devices we have shared the keys with. It resolves
    // with an OutboundSessionInfo (or undefined, for the first message in the
    // room).
    this._setupPromise = q();

    // default rotation periods
    this._sessionRotationPeriodMsgs = 100;
    this._sessionRotationPeriodMs = 7 * 24 * 3600 * 1000;

    if (params.config.rotation_period_ms !== undefined) {
        this._sessionRotationPeriodMs = params.config.rotation_period_ms;
    }

    if (params.config.rotation_period_msgs !== undefined) {
        this._sessionRotationPeriodMsgs = params.config.rotation_period_msgs;
    }
}
utils.inherits(MegolmEncryption, base.EncryptionAlgorithm);

/**
 * @private
 *
 * @param {Object} devicesInRoom The devices in this room, indexed by user ID
 *
 * @return {module:client.Promise} Promise which resolves to the
 *    OutboundSessionInfo when setup is complete.
 */
MegolmEncryption.prototype._ensureOutboundSession = function (devicesInRoom) {
    var self = this;

    var session = void 0;

    // takes the previous OutboundSessionInfo, and considers whether to create
    // a new one. Also shares the key with any (new) devices in the room.
    // Updates `session` to hold the final OutboundSessionInfo.
    //
    // returns a promise which resolves once the keyshare is successful.
    function prepareSession(oldSession) {
        session = oldSession;

        // need to make a brand new session?
        if (session && session.needsRotation(self._sessionRotationPeriodMsgs, self._sessionRotationPeriodMs)) {
            console.log("Starting new megolm session because we need to rotate.");
            session = null;
        }

        // determine if we have shared with anyone we shouldn't have
        if (session && session.sharedWithTooManyDevices(devicesInRoom)) {
            session = null;
        }

        if (!session) {
            session = self._prepareNewSession();
        }

        // now check if we need to share with any devices
        var shareMap = {};

        for (var userId in devicesInRoom) {
            if (!devicesInRoom.hasOwnProperty(userId)) {
                continue;
            }

            var userDevices = devicesInRoom[userId];

            for (var deviceId in userDevices) {
                if (!userDevices.hasOwnProperty(deviceId)) {
                    continue;
                }

                var deviceInfo = userDevices[deviceId];

                var key = deviceInfo.getIdentityKey();
                if (key == self._olmDevice.deviceCurve25519Key) {
                    // don't bother sending to ourself
                    continue;
                }

                if (!session.sharedWithDevices[userId] || session.sharedWithDevices[userId][deviceId] === undefined) {
                    shareMap[userId] = shareMap[userId] || [];
                    shareMap[userId].push(deviceInfo);
                }
            }
        }

        return self._shareKeyWithDevices(session, shareMap);
    }

    // helper which returns the session prepared by prepareSession
    function returnSession() {
        return session;
    }

    // first wait for the previous share to complete
    var prom = this._setupPromise.then(prepareSession);

    // _setupPromise resolves to `session` whether or not the share succeeds
    this._setupPromise = prom.then(returnSession, returnSession);

    // but we return a promise which only resolves if the share was successful.
    return prom.then(returnSession);
};

/**
 * @private
 *
 * @return {module:crypto/algorithms/megolm.OutboundSessionInfo} session
 */
MegolmEncryption.prototype._prepareNewSession = function () {
    var session_id = this._olmDevice.createOutboundGroupSession();
    var key = this._olmDevice.getOutboundGroupSessionKey(session_id);

    this._olmDevice.addInboundGroupSession(this._roomId, this._olmDevice.deviceCurve25519Key, session_id, key.key, { ed25519: this._olmDevice.deviceEd25519Key });

    return new OutboundSessionInfo(session_id);
};

/**
 * @private
 *
 * @param {module:crypto/algorithms/megolm.OutboundSessionInfo} session
 *
 * @param {object<string, module:crypto/deviceinfo[]>} devicesByUser
 *    map from userid to list of devices
 *
 * @return {module:client.Promise} Promise which resolves once the key sharing
 *     message has been sent.
 */
MegolmEncryption.prototype._shareKeyWithDevices = function (session, devicesByUser) {
    var self = this;

    var key = this._olmDevice.getOutboundGroupSessionKey(session.sessionId);
    var payload = {
        type: "m.room_key",
        content: {
            algorithm: olmlib.MEGOLM_ALGORITHM,
            room_id: this._roomId,
            session_id: session.sessionId,
            session_key: key.key,
            chain_index: key.chain_index
        }
    };

    var contentMap = {};

    return olmlib.ensureOlmSessionsForDevices(this._olmDevice, this._baseApis, devicesByUser).then(function (devicemap) {
        var haveTargets = false;

        for (var userId in devicesByUser) {
            if (!devicesByUser.hasOwnProperty(userId)) {
                continue;
            }

            var devicesToShareWith = devicesByUser[userId];
            var sessionResults = devicemap[userId];

            for (var i = 0; i < devicesToShareWith.length; i++) {
                var deviceInfo = devicesToShareWith[i];
                var deviceId = deviceInfo.deviceId;

                var sessionResult = sessionResults[deviceId];
                if (!sessionResult.sessionId) {
                    // no session with this device, probably because there
                    // were no one-time keys.
                    //
                    // we could send them a to_device message anyway, as a
                    // signal that they have missed out on the key sharing
                    // message because of the lack of keys, but there's not
                    // much point in that really; it will mostly serve to clog
                    // up to_device inboxes.
                    //
                    // ensureOlmSessionsForUsers has already done the logging,
                    // so just skip it.
                    continue;
                }

                console.log("sharing keys with device " + userId + ":" + deviceId);

                var encryptedContent = {
                    algorithm: olmlib.OLM_ALGORITHM,
                    sender_key: self._olmDevice.deviceCurve25519Key,
                    ciphertext: {}
                };

                olmlib.encryptMessageForDevice(encryptedContent.ciphertext, self._userId, self._deviceId, self._olmDevice, userId, deviceInfo, payload);

                if (!contentMap[userId]) {
                    contentMap[userId] = {};
                }

                contentMap[userId][deviceId] = encryptedContent;
                haveTargets = true;
            }
        }

        if (!haveTargets) {
            return q();
        }

        // TODO: retries
        return self._baseApis.sendToDevice("m.room.encrypted", contentMap);
    }).then(function () {
        // Add the devices we have shared with to session.sharedWithDevices.
        //
        // we deliberately iterate over devicesByUser (ie, the devices we
        // attempted to share with) rather than the contentMap (those we did
        // share with), because we don't want to try to claim a one-time-key
        // for dead devices on every message.
        for (var userId in devicesByUser) {
            if (!devicesByUser.hasOwnProperty(userId)) {
                continue;
            }
            if (!session.sharedWithDevices[userId]) {
                session.sharedWithDevices[userId] = {};
            }
            var devicesToShareWith = devicesByUser[userId];
            for (var i = 0; i < devicesToShareWith.length; i++) {
                var deviceInfo = devicesToShareWith[i];
                session.sharedWithDevices[userId][deviceInfo.deviceId] = key.chain_index;
            }
        }
    });
};

/**
 * @inheritdoc
 *
 * @param {module:models/room} room
 * @param {string} eventType
 * @param {object} content plaintext event content
 *
 * @return {module:client.Promise} Promise which resolves to the new event body
 */
MegolmEncryption.prototype.encryptMessage = function (room, eventType, content) {
    var self = this;
    return this._getDevicesInRoom(room).then(function (devicesInRoom) {
        return self._ensureOutboundSession(devicesInRoom);
    }).then(function (session) {
        var payloadJson = {
            room_id: self._roomId,
            type: eventType,
            content: content
        };

        var ciphertext = self._olmDevice.encryptGroupMessage(session.sessionId, JSON.stringify(payloadJson));

        var encryptedContent = {
            algorithm: olmlib.MEGOLM_ALGORITHM,
            sender_key: self._olmDevice.deviceCurve25519Key,
            ciphertext: ciphertext,
            session_id: session.sessionId,
            // Include our device ID so that recipients can send us a
            // m.new_device message if they don't have our session key.
            device_id: self._deviceId
        };

        session.useCount++;
        return encryptedContent;
    });
};

/**
 * Get the list of unblocked devices for all users in the room
 *
 * @param {module:models/room} room
 *
 * @return {module:client.Promise} Promise which resolves to a map
 *     from userId to deviceId to deviceInfo
 */
MegolmEncryption.prototype._getDevicesInRoom = function (room) {
    // XXX what about rooms where invitees can see the content?
    var roomMembers = utils.map(room.getJoinedMembers(), function (u) {
        return u.userId;
    });

    // We are happy to use a cached version here: we assume that if we already
    // have a list of the user's devices, then we already share an e2e room
    // with them, which means that they will have announced any new devices via
    // an m.new_device.
    return this._crypto.downloadKeys(roomMembers, false).then(function (devices) {
        // remove any blocked devices
        for (var userId in devices) {
            if (!devices.hasOwnProperty(userId)) {
                continue;
            }

            var userDevices = devices[userId];
            for (var deviceId in userDevices) {
                if (!userDevices.hasOwnProperty(deviceId)) {
                    continue;
                }
                if (userDevices[deviceId].isBlocked()) {
                    delete userDevices[deviceId];
                }
            }
        }

        return devices;
    });
};

/**
 * Megolm decryption implementation
 *
 * @constructor
 * @extends {module:crypto/algorithms/base.DecryptionAlgorithm}
 *
 * @param {object} params parameters, as per
 *     {@link module:crypto/algorithms/base.DecryptionAlgorithm}
 */
function MegolmDecryption(params) {
    base.DecryptionAlgorithm.call(this, params);

    // events which we couldn't decrypt due to unknown sessions / indexes: map from
    // senderKey|sessionId to list of MatrixEvents
    this._pendingEvents = {};
}
utils.inherits(MegolmDecryption, base.DecryptionAlgorithm);

/**
 * @inheritdoc
 *
 * @param {MatrixEvent} event
 *
 * @throws {module:crypto/algorithms/base.DecryptionError} if there is a
 *   problem decrypting the event
 */
MegolmDecryption.prototype.decryptEvent = function (event) {
    var content = event.getWireContent();

    if (!content.sender_key || !content.session_id || !content.ciphertext) {
        throw new base.DecryptionError("Missing fields in input");
    }

    var res = void 0;
    try {
        res = this._olmDevice.decryptGroupMessage(event.getRoomId(), content.sender_key, content.session_id, content.ciphertext);
    } catch (e) {
        if (e.message === 'OLM.UNKNOWN_MESSAGE_INDEX') {
            this._addEventToPendingList(event);
        }
        throw new base.DecryptionError(e);
    }

    if (res === null) {
        // We've got a message for a session we don't have.
        this._addEventToPendingList(event);
        throw new base.DecryptionError("The sender's device has not sent us the keys for this message.");
    }

    var payload = JSON.parse(res.result);

    // belt-and-braces check that the room id matches that indicated by the HS
    // (this is somewhat redundant, since the megolm session is scoped to the
    // room, so neither the sender nor a MITM can lie about the room_id).
    if (payload.room_id !== event.getRoomId()) {
        throw new base.DecryptionError("Message intended for room " + payload.room_id);
    }

    event.setClearData(payload, res.keysProved, res.keysClaimed);
};

/**
 * Add an event to the list of those we couldn't decrypt the first time we
 * saw them.
 *
 * @private
 *
 * @param {module:models/event.MatrixEvent} event
 */
MegolmDecryption.prototype._addEventToPendingList = function (event) {
    var content = event.getWireContent();
    var k = content.sender_key + "|" + content.session_id;
    if (!this._pendingEvents[k]) {
        this._pendingEvents[k] = [];
    }
    this._pendingEvents[k].push(event);
};

/**
 * @inheritdoc
 *
 * @param {module:models/event.MatrixEvent} event key event
 */
MegolmDecryption.prototype.onRoomKeyEvent = function (event) {
    console.log("Adding key from ", event);
    var content = event.getContent();

    if (!content.room_id || !content.session_id || !content.session_key) {
        console.error("key event is missing fields");
        return;
    }

    this._olmDevice.addInboundGroupSession(content.room_id, event.getSenderKey(), content.session_id, content.session_key, event.getKeysClaimed());

    // have another go at decrypting events sent with this session.
    this._retryDecryption(event.getSenderKey, content.session_id);
};

/**
 * @inheritdoc
 *
 * @param {module:crypto/OlmDevice.MegolmSessionData} session
 */
MegolmDecryption.prototype.importRoomKey = function (session) {
    this._olmDevice.importInboundGroupSession(session);

    // have another go at decrypting events sent with this session.
    this._retryDecryption(session.sender_key, session.session_id);
};

/**
 * Have another go at decrypting events after we receive a key
 *
 * @private
 * @param {String} senderKey
 * @param {String} sessionId
 */
MegolmDecryption.prototype._retryDecryption = function (senderKey, sessionId) {
    var k = senderKey + "|" + sessionId;
    var pending = this._pendingEvents[k];
    if (!pending) {
        return;
    }

    delete this._pendingEvents[k];

    for (var i = 0; i < pending.length; i++) {
        try {
            this.decryptEvent(pending[i]);
            console.log("successful re-decryption of", pending[i]);
        } catch (e) {
            console.log("Still can't decrypt", pending[i], e.stack || e);
        }
    }
};

base.registerAlgorithm(olmlib.MEGOLM_ALGORITHM, MegolmEncryption, MegolmDecryption);

},{"../../utils":36,"../olmlib":12,"./base":6,"q":42}],9:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * Defines m.olm encryption/decryption
 *
 * @module crypto/algorithms/olm
 */

var q = require('q');

var utils = require("../../utils");
var olmlib = require("../olmlib");
var DeviceInfo = require("../deviceinfo");
var DeviceVerification = DeviceInfo.DeviceVerification;

var base = require("./base");

/**
 * Olm encryption implementation
 *
 * @constructor
 * @extends {module:crypto/algorithms/base.EncryptionAlgorithm}
 *
 * @param {object} params parameters, as per
 *     {@link module:crypto/algorithms/base.EncryptionAlgorithm}
 */
function OlmEncryption(params) {
    base.EncryptionAlgorithm.call(this, params);
    this._sessionPrepared = false;
    this._prepPromise = null;
}
utils.inherits(OlmEncryption, base.EncryptionAlgorithm);

/**
 * @private

 * @param {string[]} roomMembers list of currently-joined users in the room
 * @return {module:client.Promise} Promise which resolves when setup is complete
 */
OlmEncryption.prototype._ensureSession = function (roomMembers) {
    if (this._prepPromise) {
        // prep already in progress
        return this._prepPromise;
    }

    if (this._sessionPrepared) {
        // prep already done
        return q();
    }

    var self = this;
    this._prepPromise = self._crypto.downloadKeys(roomMembers, true).then(function (res) {
        return self._crypto.ensureOlmSessionsForUsers(roomMembers);
    }).then(function () {
        self._sessionPrepared = true;
    }).finally(function () {
        self._prepPromise = null;
    });
    return this._prepPromise;
};

/**
 * @inheritdoc
 *
 * @param {module:models/room} room
 * @param {string} eventType
 * @param {object} content plaintext event content
 *
 * @return {module:client.Promise} Promise which resolves to the new event body
 */
OlmEncryption.prototype.encryptMessage = function (room, eventType, content) {
    // pick the list of recipients based on the membership list.
    //
    // TODO: there is a race condition here! What if a new user turns up
    // just as you are sending a secret message?

    var users = utils.map(room.getJoinedMembers(), function (u) {
        return u.userId;
    });

    var self = this;
    return this._ensureSession(users).then(function () {
        var payloadFields = {
            room_id: room.roomId,
            type: eventType,
            content: content
        };

        var encryptedContent = {
            algorithm: olmlib.OLM_ALGORITHM,
            sender_key: self._olmDevice.deviceCurve25519Key,
            ciphertext: {}
        };

        for (var i = 0; i < users.length; ++i) {
            var userId = users[i];
            var devices = self._crypto.getStoredDevicesForUser(userId);

            for (var j = 0; j < devices.length; ++j) {
                var deviceInfo = devices[j];
                var key = deviceInfo.getIdentityKey();
                if (key == self._olmDevice.deviceCurve25519Key) {
                    // don't bother sending to ourself
                    continue;
                }
                if (deviceInfo.verified == DeviceVerification.BLOCKED) {
                    // don't bother setting up sessions with blocked users
                    continue;
                }

                olmlib.encryptMessageForDevice(encryptedContent.ciphertext, self._userId, self._deviceId, self._olmDevice, userId, deviceInfo, payloadFields);
            }
        }

        return encryptedContent;
    });
};

/**
 * Olm decryption implementation
 *
 * @constructor
 * @extends {module:crypto/algorithms/base.DecryptionAlgorithm}
 * @param {object} params parameters, as per
 *     {@link module:crypto/algorithms/base.DecryptionAlgorithm}
 */
function OlmDecryption(params) {
    base.DecryptionAlgorithm.call(this, params);
}
utils.inherits(OlmDecryption, base.DecryptionAlgorithm);

/**
 * @inheritdoc
 *
 * @param {MatrixEvent} event
 *
 * @throws {module:crypto/algorithms/base.DecryptionError} if there is a
 *   problem decrypting the event
 */
OlmDecryption.prototype.decryptEvent = function (event) {
    var content = event.getWireContent();
    var deviceKey = content.sender_key;
    var ciphertext = content.ciphertext;

    if (!ciphertext) {
        throw new base.DecryptionError("Missing ciphertext");
    }

    if (!(this._olmDevice.deviceCurve25519Key in ciphertext)) {
        throw new base.DecryptionError("Not included in recipients");
    }
    var message = ciphertext[this._olmDevice.deviceCurve25519Key];
    var payloadString = void 0;

    try {
        payloadString = this._decryptMessage(deviceKey, message);
    } catch (e) {
        console.warn("Failed to decrypt Olm event (id=" + event.getId() + ") from " + deviceKey + ": " + e.message);
        throw new base.DecryptionError("Bad Encrypted Message");
    }

    var payload = JSON.parse(payloadString);

    // check that we were the intended recipient, to avoid unknown-key attack
    // https://github.com/vector-im/vector-web/issues/2483
    if (payload.recipient != this._userId) {
        console.warn("Event " + event.getId() + ": Intended recipient " + payload.recipient + " does not match our id " + this._userId);
        throw new base.DecryptionError("Message was intented for " + payload.recipient);
    }

    if (payload.recipient_keys.ed25519 != this._olmDevice.deviceEd25519Key) {
        console.warn("Event " + event.getId() + ": Intended recipient ed25519 key " + payload.recipient_keys.ed25519 + " did not match ours");
        throw new base.DecryptionError("Message not intended for this device");
    }

    // check that the original sender matches what the homeserver told us, to
    // avoid people masquerading as others.
    // (this check is also provided via the sender's embedded ed25519 key,
    // which is checked elsewhere).
    if (payload.sender != event.getSender()) {
        console.warn("Event " + event.getId() + ": original sender " + payload.sender + " does not match reported sender " + event.getSender());
        throw new base.DecryptionError("Message forwarded from " + payload.sender);
    }

    // Olm events intended for a room have a room_id.
    if (payload.room_id !== event.getRoomId()) {
        console.warn("Event " + event.getId() + ": original room " + payload.room_id + " does not match reported room " + event.room_id);
        throw new base.DecryptionError("Message intended for room " + payload.room_id);
    }

    event.setClearData(payload, { curve25519: deviceKey }, payload.keys || {});
};

/**
 * Attempt to decrypt an Olm message
 *
 * @param {string} theirDeviceIdentityKey  Curve25519 identity key of the sender
 * @param {object} message  message object, with 'type' and 'body' fields
 *
 * @return {string} payload, if decrypted successfully.
 */
OlmDecryption.prototype._decryptMessage = function (theirDeviceIdentityKey, message) {
    var sessionIds = this._olmDevice.getSessionIdsForDevice(theirDeviceIdentityKey);

    // try each session in turn.
    var decryptionErrors = {};
    for (var i = 0; i < sessionIds.length; i++) {
        var sessionId = sessionIds[i];
        try {
            var payload = this._olmDevice.decryptMessage(theirDeviceIdentityKey, sessionId, message.type, message.body);
            console.log("Decrypted Olm message from " + theirDeviceIdentityKey + " with session " + sessionId);
            return payload;
        } catch (e) {
            var foundSession = this._olmDevice.matchesSession(theirDeviceIdentityKey, sessionId, message.type, message.body);

            if (foundSession) {
                // decryption failed, but it was a prekey message matching this
                // session, so it should have worked.
                throw new Error("Error decrypting prekey message with existing session id " + sessionId + ": " + e.message);
            }

            // otherwise it's probably a message for another session; carry on, but
            // keep a record of the error
            decryptionErrors[sessionId] = e.message;
        }
    }

    if (message.type !== 0) {
        // not a prekey message, so it should have matched an existing session, but it
        // didn't work.

        if (sessionIds.length === 0) {
            throw new Error("No existing sessions");
        }

        throw new Error("Error decrypting non-prekey message with existing sessions: " + JSON.stringify(decryptionErrors));
    }

    // prekey message which doesn't match any existing sessions: make a new
    // session.

    var res = void 0;
    try {
        res = this._olmDevice.createInboundSession(theirDeviceIdentityKey, message.type, message.body);
    } catch (e) {
        decryptionErrors["(new)"] = e.message;
        throw new Error("Error decrypting prekey message: " + JSON.stringify(decryptionErrors));
    }

    console.log("created new inbound Olm session ID " + res.session_id + " with " + theirDeviceIdentityKey);
    return res.payload;
};

base.registerAlgorithm(olmlib.OLM_ALGORITHM, OlmEncryption, OlmDecryption);

},{"../../utils":36,"../deviceinfo":10,"../olmlib":12,"./base":6,"q":42}],10:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * @module crypto/deviceinfo
 */

/**
  * Information about a user's device
  *
  * @constructor
  * @alias module:crypto/deviceinfo
  *
  * @property {string} deviceId the ID of this device
  *
  * @property {string[]} algorithms list of algorithms supported by this device
  *
  * @property {Object.<string,string>} keys a map from
  *      &lt;key type&gt;:&lt;id&gt; -> &lt;base64-encoded key&gt;>
  *
  * @property {module:crypto/deviceinfo.DeviceVerification} verified
  *     whether the device has been verified by the user
  *
  * @property {Object} unsigned  additional data from the homeserver
  *
  * @param {string} deviceId id of the device
  */

function DeviceInfo(deviceId) {
    // you can't change the deviceId
    Object.defineProperty(this, 'deviceId', {
        enumerable: true,
        value: deviceId
    });

    this.algorithms = [];
    this.keys = {};
    this.verified = DeviceVerification.UNVERIFIED;
    this.unsigned = {};
}

/**
 * rehydrate a DeviceInfo from the session store
 *
 * @param {object} obj  raw object from session store
 * @param {string} deviceId id of the device
 *
 * @return {module:crypto~DeviceInfo} new DeviceInfo
 */
DeviceInfo.fromStorage = function (obj, deviceId) {
    var res = new DeviceInfo(deviceId);
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            res[prop] = obj[prop];
        }
    }
    return res;
};

/**
 * Prepare a DeviceInfo for JSON serialisation in the session store
 *
 * @return {object} deviceinfo with non-serialised members removed
 */
DeviceInfo.prototype.toStorage = function () {
    return {
        algorithms: this.algorithms,
        keys: this.keys,
        verified: this.verified,
        unsigned: this.unsigned
    };
};

/**
 * Get the fingerprint for this device (ie, the Ed25519 key)
 *
 * @return {string} base64-encoded fingerprint of this device
 */
DeviceInfo.prototype.getFingerprint = function () {
    return this.keys["ed25519:" + this.deviceId];
};

/**
 * Get the identity key for this device (ie, the Curve25519 key)
 *
 * @return {string} base64-encoded identity key of this device
 */
DeviceInfo.prototype.getIdentityKey = function () {
    return this.keys["curve25519:" + this.deviceId];
};

/**
 * Get the configured display name for this device, if any
 *
 * @return {string?} displayname
 */
DeviceInfo.prototype.getDisplayName = function () {
    return this.unsigned.device_display_name || null;
};

/**
 * Returns true if this device is blocked
 *
 * @return {Boolean} true if blocked
 */
DeviceInfo.prototype.isBlocked = function () {
    return this.verified == DeviceVerification.BLOCKED;
};

/**
 * Returns true if this device is verified
 *
 * @return {Boolean} true if verified
 */
DeviceInfo.prototype.isVerified = function () {
    return this.verified == DeviceVerification.VERIFIED;
};

/**
 * @enum
 */
DeviceInfo.DeviceVerification = {
    VERIFIED: 1,
    UNVERIFIED: 0,
    BLOCKED: -1
};

var DeviceVerification = DeviceInfo.DeviceVerification;

/** */
module.exports = DeviceInfo;

},{}],11:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * @module crypto
 */

var anotherjson = require('another-json');
var q = require("q");

var utils = require("../utils");
var OlmDevice = require("./OlmDevice");
var olmlib = require("./olmlib");
var algorithms = require("./algorithms");
var DeviceInfo = require("./deviceinfo");
var DeviceVerification = DeviceInfo.DeviceVerification;

/**
 * Cryptography bits
 *
 * @constructor
 * @alias module:crypto
 *
 * @param {module:base-apis~MatrixBaseApis} baseApis base matrix api interface
 *
 * @param {external:EventEmitter} eventEmitter event source where we can register
 *    for event notifications
 *
 * @param {module:store/session/webstorage~WebStorageSessionStore} sessionStore
 *    Store to be used for end-to-end crypto session data
 *
 * @param {string} userId The user ID for the local user
 *
 * @param {string} deviceId The identifier for this device.
 */
function Crypto(baseApis, eventEmitter, sessionStore, userId, deviceId) {
    this._baseApis = baseApis;
    this._sessionStore = sessionStore;
    this._userId = userId;
    this._deviceId = deviceId;

    this._initialSyncCompleted = false;
    // userId -> true
    this._pendingUsersWithNewDevices = {};
    // userId -> [promise, ...]
    this._keyDownloadsInProgressByUser = {};

    this._olmDevice = new OlmDevice(sessionStore);

    // EncryptionAlgorithm instance for each room
    this._roomEncryptors = {};

    // map from algorithm to DecryptionAlgorithm instance, for each room
    this._roomDecryptors = {};

    this._supportedAlgorithms = utils.keys(algorithms.DECRYPTION_CLASSES);

    // build our device keys: these will later be uploaded
    this._deviceKeys = {};
    this._deviceKeys["ed25519:" + this._deviceId] = this._olmDevice.deviceEd25519Key;
    this._deviceKeys["curve25519:" + this._deviceId] = this._olmDevice.deviceCurve25519Key;

    var myDevices = this._sessionStore.getEndToEndDevicesForUser(this._userId);

    if (!myDevices) {
        // we don't yet have a list of our own devices; make sure we
        // get one when we flush the pendingUsersWithNewDevices.
        this._pendingUsersWithNewDevices[this._userId] = true;
        myDevices = {};
    }

    if (!myDevices[this._deviceId]) {
        // add our own deviceinfo to the sessionstore
        var deviceInfo = {
            keys: this._deviceKeys,
            algorithms: this._supportedAlgorithms,
            verified: DeviceVerification.VERIFIED
        };

        myDevices[this._deviceId] = deviceInfo;
        this._sessionStore.storeEndToEndDevicesForUser(this._userId, myDevices);
    }

    _registerEventHandlers(this, eventEmitter);
}

function _registerEventHandlers(crypto, eventEmitter) {
    eventEmitter.on("sync", function (syncState, oldState, data) {
        try {
            if (syncState == "PREPARED") {
                // XXX ugh. we're assuming the eventEmitter is a MatrixClient.
                // how can we avoid doing so?
                var rooms = eventEmitter.getRooms();
                crypto._onInitialSyncCompleted(rooms);
            }
        } catch (e) {
            console.error("Error handling sync", e);
        }
    });

    eventEmitter.on("RoomMember.membership", function (event, member, oldMembership) {
        try {
            crypto._onRoomMembership(event, member, oldMembership);
        } catch (e) {
            console.error("Error handling membership change:", e);
        }
    });

    eventEmitter.on("toDeviceEvent", function (event) {
        try {
            if (event.getType() == "m.room_key") {
                crypto._onRoomKeyEvent(event);
            } else if (event.getType() == "m.new_device") {
                crypto._onNewDeviceEvent(event);
            }
        } catch (e) {
            console.error("Error handling toDeviceEvent:", e);
        }
    });

    eventEmitter.on("event", function (event) {
        try {
            if (!event.isState() || event.getType() != "m.room.encryption") {
                return;
            }
            crypto._onCryptoEvent(event);
        } catch (e) {
            console.error("Error handling crypto event:", e);
        }
    });
}

/**
 * @return {string} The version of Olm.
 */
Crypto.getOlmVersion = function () {
    return OlmDevice.getOlmVersion();
};

/**
 * Get the Ed25519 key for this device
 *
 * @return {string} base64-encoded ed25519 key.
 */
Crypto.prototype.getDeviceEd25519Key = function () {
    return this._olmDevice.deviceEd25519Key;
};

/**
 * Upload the device keys to the homeserver and ensure that the
 * homeserver has enough one-time keys.
 * @param {number} maxKeys The maximum number of keys to generate
 * @return {object} A promise that will resolve when the keys are uploaded.
 */
Crypto.prototype.uploadKeys = function (maxKeys) {
    var self = this;
    return _uploadDeviceKeys(this).then(function (res) {
        // We need to keep a pool of one time public keys on the server so that
        // other devices can start conversations with us. But we can only store
        // a finite number of private keys in the olm Account object.
        // To complicate things further then can be a delay between a device
        // claiming a public one time key from the server and it sending us a
        // message. We need to keep the corresponding private key locally until
        // we receive the message.
        // But that message might never arrive leaving us stuck with duff
        // private keys clogging up our local storage.
        // So we need some kind of enginering compromise to balance all of
        // these factors.

        // We first find how many keys the server has for us.
        var keyCount = res.one_time_key_counts.signed_curve25519 || 0;
        // We then check how many keys we can store in the Account object.
        var maxOneTimeKeys = self._olmDevice.maxNumberOfOneTimeKeys();
        // Try to keep at most half that number on the server. This leaves the
        // rest of the slots free to hold keys that have been claimed from the
        // server but we haven't recevied a message for.
        // If we run out of slots when generating new keys then olm will
        // discard the oldest private keys first. This will eventually clean
        // out stale private keys that won't receive a message.
        var keyLimit = Math.floor(maxOneTimeKeys / 2);
        // We work out how many new keys we need to create to top up the server
        // If there are too many keys on the server then we don't need to
        // create any more keys.
        var numberToGenerate = Math.max(keyLimit - keyCount, 0);
        if (maxKeys !== undefined) {
            // Creating keys can be an expensive operation so we limit the
            // number we generate in one go to avoid blocking the application
            // for too long.
            numberToGenerate = Math.min(numberToGenerate, maxKeys);
        }

        if (numberToGenerate <= 0) {
            // If we don't need to generate any keys then we are done.
            return;
        }

        // Ask olm to generate new one time keys, then upload them to synapse.
        self._olmDevice.generateOneTimeKeys(numberToGenerate);
        return _uploadOneTimeKeys(self);
    });
};

// returns a promise which resolves to the response
function _uploadDeviceKeys(crypto) {
    var userId = crypto._userId;
    var deviceId = crypto._deviceId;

    var deviceKeys = {
        algorithms: crypto._supportedAlgorithms,
        device_id: deviceId,
        keys: crypto._deviceKeys,
        user_id: userId
    };
    crypto._signObject(deviceKeys);

    return crypto._baseApis.uploadKeysRequest({
        device_keys: deviceKeys
    }, {
        // for now, we set the device id explicitly, as we may not be using the
        // same one as used in login.
        device_id: deviceId
    });
}

// returns a promise which resolves to the response
function _uploadOneTimeKeys(crypto) {
    var oneTimeKeys = crypto._olmDevice.getOneTimeKeys();
    var oneTimeJson = {};

    for (var keyId in oneTimeKeys.curve25519) {
        if (oneTimeKeys.curve25519.hasOwnProperty(keyId)) {
            var k = {
                key: oneTimeKeys.curve25519[keyId]
            };
            crypto._signObject(k);
            oneTimeJson["signed_curve25519:" + keyId] = k;
        }
    }

    return crypto._baseApis.uploadKeysRequest({
        one_time_keys: oneTimeJson
    }, {
        // for now, we set the device id explicitly, as we may not be using the
        // same one as used in login.
        device_id: crypto._deviceId
    }).then(function (res) {
        crypto._olmDevice.markKeysAsPublished();
        return res;
    });
}

/**
 * Download the keys for a list of users and stores the keys in the session
 * store.
 * @param {Array} userIds The users to fetch.
 * @param {bool} forceDownload Always download the keys even if cached.
 *
 * @return {Promise} A promise which resolves to a map userId->deviceId->{@link
 * module:crypto/deviceinfo|DeviceInfo}.
 */
Crypto.prototype.downloadKeys = function (userIds, forceDownload) {
    var _this = this;

    var self = this;

    // promises we need to wait for while the download happens
    var promises = [];

    // list of userids we need to download keys for
    var downloadUsers = [];

    function perUserCatch(u) {
        return function (e) {
            console.warn('Error downloading keys for user ' + u + ':', e);
        };
    }

    if (forceDownload) {
        downloadUsers = userIds;
    } else {
        for (var i = 0; i < userIds.length; ++i) {
            var u = userIds[i];

            var inprogress = this._keyDownloadsInProgressByUser[u];
            if (inprogress) {
                // wait for the download to complete
                promises.push(q.any(inprogress).catch(perUserCatch(u)));
            } else if (!this.getStoredDevicesForUser(u)) {
                downloadUsers.push(u);
            }
        }
    }

    if (downloadUsers.length > 0) {
        (function () {
            var r = _this._doKeyDownloadForUsers(downloadUsers);
            downloadUsers.map(function (u) {
                promises.push(r[u].catch(perUserCatch(u)));
            });
        })();
    }

    return q.all(promises).then(function () {
        return self._getDevicesFromStore(userIds);
    });
};

/**
 * Get the stored device keys for a list of user ids
 *
 * @param {string[]} userIds the list of users to list keys for.
 *
 * @return {Object} userId->deviceId->{@link module:crypto/deviceinfo|DeviceInfo}.
 */
Crypto.prototype._getDevicesFromStore = function (userIds) {
    var stored = {};
    var self = this;
    userIds.map(function (u) {
        stored[u] = {};
        var devices = self.getStoredDevicesForUser(u) || [];
        devices.map(function (dev) {
            stored[u][dev.deviceId] = dev;
        });
    });
    return stored;
};

/**
 * @param {string[]} downloadUsers list of userIds
 *
 * @return {Object} a map from userId to a promise for a result for that user
 */
Crypto.prototype._doKeyDownloadForUsers = function (downloadUsers) {
    var self = this;

    console.log('Starting key download for ' + downloadUsers);

    var deferMap = {};
    var promiseMap = {};

    downloadUsers.map(function (u) {
        var deferred = q.defer();
        var promise = deferred.promise.finally(function () {
            var inProgress = self._keyDownloadsInProgressByUser[u];
            utils.removeElement(inProgress, function (e) {
                return e === promise;
            });
            if (inProgress.length === 0) {
                // no more downloads for this user; remove the element
                delete self._keyDownloadsInProgressByUser[u];
            }
        });

        if (!self._keyDownloadsInProgressByUser[u]) {
            self._keyDownloadsInProgressByUser[u] = [];
        }
        self._keyDownloadsInProgressByUser[u].push(promise);

        deferMap[u] = deferred;
        promiseMap[u] = promise;
    });

    this._baseApis.downloadKeysForUsers(downloadUsers).done(function (res) {
        var dk = res.device_keys || {};

        for (var i = 0; i < downloadUsers.length; ++i) {
            var userId = downloadUsers[i];
            var deviceId;

            console.log('got keys for ' + userId + ':', dk[userId]);

            if (!dk[userId]) {
                // no result for this user
                var err = 'Unknown';
                // TODO: do something with res.failures
                deferMap[userId].reject(err);
                continue;
            }

            // map from deviceid -> deviceinfo for this user
            var userStore = {};
            var devs = self._sessionStore.getEndToEndDevicesForUser(userId);
            if (devs) {
                for (deviceId in devs) {
                    if (devs.hasOwnProperty(deviceId)) {
                        var d = DeviceInfo.fromStorage(devs[deviceId], deviceId);
                        userStore[deviceId] = d;
                    }
                }
            }

            _updateStoredDeviceKeysForUser(self._olmDevice, userId, userStore, dk[userId]);

            // update the session store
            var storage = {};
            for (deviceId in userStore) {
                if (!userStore.hasOwnProperty(deviceId)) {
                    continue;
                }

                storage[deviceId] = userStore[deviceId].toStorage();
            }
            self._sessionStore.storeEndToEndDevicesForUser(userId, storage);

            deferMap[userId].resolve();
        }
    }, function (err) {
        downloadUsers.map(function (u) {
            deferMap[u].reject(err);
        });
    });

    return promiseMap;
};

function _updateStoredDeviceKeysForUser(_olmDevice, userId, userStore, userResult) {
    var updated = false;

    // remove any devices in the store which aren't in the response
    for (var deviceId in userStore) {
        if (!userStore.hasOwnProperty(deviceId)) {
            continue;
        }

        if (!(deviceId in userResult)) {
            console.log("Device " + userId + ":" + deviceId + " has been removed");
            delete userStore[deviceId];
            updated = true;
        }
    }

    for (deviceId in userResult) {
        if (!userResult.hasOwnProperty(deviceId)) {
            continue;
        }

        var deviceResult = userResult[deviceId];

        // check that the user_id and device_id in the response object are
        // correct
        if (deviceResult.user_id !== userId) {
            console.warn("Mismatched user_id " + deviceResult.user_id + " in keys from " + userId + ":" + deviceId);
            continue;
        }
        if (deviceResult.device_id !== deviceId) {
            console.warn("Mismatched device_id " + deviceResult.device_id + " in keys from " + userId + ":" + deviceId);
            continue;
        }

        if (_storeDeviceKeys(_olmDevice, userStore, deviceResult)) {
            updated = true;
        }
    }

    return updated;
}

/*
 * Process a device in a /query response, and add it to the userStore
 *
 * returns true if a change was made, else false
 */
function _storeDeviceKeys(_olmDevice, userStore, deviceResult) {
    if (!deviceResult.keys) {
        // no keys?
        return false;
    }

    var deviceId = deviceResult.device_id;
    var userId = deviceResult.user_id;

    var signKeyId = "ed25519:" + deviceId;
    var signKey = deviceResult.keys[signKeyId];
    if (!signKey) {
        console.log("Device " + userId + ":" + deviceId + " has no ed25519 key");
        return false;
    }

    var unsigned = deviceResult.unsigned || {};

    try {
        olmlib.verifySignature(_olmDevice, deviceResult, userId, deviceId, signKey);
    } catch (e) {
        console.log("Unable to verify signature on device " + userId + ":" + deviceId + ":", e);
        return false;
    }

    // DeviceInfo
    var deviceStore = void 0;

    if (deviceId in userStore) {
        // already have this device.
        deviceStore = userStore[deviceId];

        if (deviceStore.getFingerprint() != signKey) {
            // this should only happen if the list has been MITMed; we are
            // best off sticking with the original keys.
            //
            // Should we warn the user about it somehow?
            console.warn("Ed25519 key for device" + userId + ": " + deviceId + " has changed");
            return false;
        }
    } else {
        userStore[deviceId] = deviceStore = new DeviceInfo(deviceId);
    }

    deviceStore.keys = deviceResult.keys || {};
    deviceStore.algorithms = deviceResult.algorithms || [];
    deviceStore.unsigned = unsigned;
    return true;
}

/**
 * Get the stored device keys for a user id
 *
 * @param {string} userId the user to list keys for.
 *
 * @return {module:crypto/deviceinfo[]|null} list of devices, or null if we haven't
 * managed to get a list of devices for this user yet.
 */
Crypto.prototype.getStoredDevicesForUser = function (userId) {
    var devs = this._sessionStore.getEndToEndDevicesForUser(userId);
    if (!devs) {
        return null;
    }
    var res = [];
    for (var deviceId in devs) {
        if (devs.hasOwnProperty(deviceId)) {
            res.push(DeviceInfo.fromStorage(devs[deviceId], deviceId));
        }
    }
    return res;
};

/**
 * Get the stored keys for a single device
 *
 * @param {string} userId
 * @param {string} deviceId
 *
 * @return {module:crypto/deviceinfo?} list of devices, or undefined
 * if we don't know about this device
 */
Crypto.prototype.getStoredDevice = function (userId, deviceId) {
    var devs = this._sessionStore.getEndToEndDevicesForUser(userId);
    if (!devs || !devs[deviceId]) {
        return undefined;
    }
    return DeviceInfo.fromStorage(devs[deviceId], deviceId);
};

/**
 * List the stored device keys for a user id
 *
 * @deprecated prefer {@link module:crypto#getStoredDevicesForUser}
 *
 * @param {string} userId the user to list keys for.
 *
 * @return {object[]} list of devices with "id", "verified", "blocked",
 *    "key", and "display_name" parameters.
 */
Crypto.prototype.listDeviceKeys = function (userId) {
    var devices = this.getStoredDevicesForUser(userId) || [];

    var result = [];

    for (var i = 0; i < devices.length; ++i) {
        var device = devices[i];
        var ed25519Key = device.getFingerprint();
        if (ed25519Key) {
            result.push({
                id: device.deviceId,
                key: ed25519Key,
                verified: Boolean(device.isVerified()),
                blocked: Boolean(device.isBlocked()),
                display_name: device.getDisplayName()
            });
        }
    }

    // sort by deviceid
    result.sort(function (a, b) {
        if (a.deviceId < b.deviceId) {
            return -1;
        }
        if (a.deviceId > b.deviceId) {
            return 1;
        }
        return 0;
    });

    return result;
};

/**
 * Find a device by curve25519 identity key
 *
 * @param {string} userId     owner of the device
 * @param {string} algorithm  encryption algorithm
 * @param {string} sender_key curve25519 key to match
 *
 * @return {module:crypto/deviceinfo?}
 */
Crypto.prototype.getDeviceByIdentityKey = function (userId, algorithm, sender_key) {
    if (algorithm !== olmlib.OLM_ALGORITHM && algorithm !== olmlib.MEGOLM_ALGORITHM) {
        // we only deal in olm keys
        return null;
    }

    var devices = this._sessionStore.getEndToEndDevicesForUser(userId);
    if (!devices) {
        return null;
    }

    for (var deviceId in devices) {
        if (!devices.hasOwnProperty(deviceId)) {
            continue;
        }

        var device = devices[deviceId];
        for (var keyId in device.keys) {
            if (!device.keys.hasOwnProperty(keyId)) {
                continue;
            }
            if (keyId.indexOf("curve25519:") !== 0) {
                continue;
            }
            var deviceKey = device.keys[keyId];
            if (deviceKey == sender_key) {
                return DeviceInfo.fromStorage(device, deviceId);
            }
        }
    }

    // doesn't match a known device
    return null;
};

/**
 * Update the blocked/verified state of the given device
 *
 * @param {string} userId owner of the device
 * @param {string} deviceId unique identifier for the device
 *
 * @param {?boolean} verified whether to mark the device as verified. Null to
 *     leave unchanged.
 *
 * @param {?boolean} blocked whether to mark the device as blocked. Null to
 *      leave unchanged.
 */
Crypto.prototype.setDeviceVerification = function (userId, deviceId, verified, blocked) {
    var devices = this._sessionStore.getEndToEndDevicesForUser(userId);
    if (!devices || !devices[deviceId]) {
        throw new Error("Unknown device " + userId + ":" + deviceId);
    }

    var dev = devices[deviceId];
    var verificationStatus = dev.verified;

    if (verified) {
        verificationStatus = DeviceVerification.VERIFIED;
    } else if (verified !== null && verificationStatus == DeviceVerification.VERIFIED) {
        verificationStatus = DeviceVerification.UNVERIFIED;
    }

    if (blocked) {
        verificationStatus = DeviceVerification.BLOCKED;
    } else if (blocked !== null && verificationStatus == DeviceVerification.BLOCKED) {
        verificationStatus = DeviceVerification.UNVERIFIED;
    }

    if (dev.verified === verificationStatus) {
        return;
    }
    dev.verified = verificationStatus;
    this._sessionStore.storeEndToEndDevicesForUser(userId, devices);
};

/**
 * Get information on the active olm sessions with a user
 * <p>
 * Returns a map from device id to an object with keys 'deviceIdKey' (the
 * device's curve25519 identity key) and 'sessions' (an array of objects in the
 * same format as that returned by
 * {@link module:crypto/OlmDevice#getSessionInfoForDevice}).
 * <p>
 * This method is provided for debugging purposes.
 *
 * @param {string} userId id of user to inspect
 *
 * @return {Object.<string, {deviceIdKey: string, sessions: object[]}>}
 */
Crypto.prototype.getOlmSessionsForUser = function (userId) {
    var devices = this.getStoredDevicesForUser(userId) || [];
    var result = {};
    for (var j = 0; j < devices.length; ++j) {
        var device = devices[j];
        var deviceKey = device.getIdentityKey();
        var sessions = this._olmDevice.getSessionInfoForDevice(deviceKey);

        result[device.deviceId] = {
            deviceIdKey: deviceKey,
            sessions: sessions
        };
    }
    return result;
};

/**
 * Get the device which sent an event
 *
 * @param {module:models/event.MatrixEvent} event event to be checked
 *
 * @return {module:crypto/deviceinfo?}
 */
Crypto.prototype.getEventSenderDeviceInfo = function (event) {
    var sender_key = event.getSenderKey();
    var algorithm = event.getWireContent().algorithm;

    if (!sender_key || !algorithm) {
        return null;
    }

    // sender_key is the Curve25519 identity key of the device which the event
    // was sent from. In the case of Megolm, it's actually the Curve25519
    // identity key of the device which set up the Megolm session.

    var device = this.getDeviceByIdentityKey(event.getSender(), algorithm, sender_key);

    if (device === null) {
        // we haven't downloaded the details of this device yet.
        return null;
    }

    // so far so good, but now we need to check that the sender of this event
    // hadn't advertised someone else's Curve25519 key as their own. We do that
    // by checking the Ed25519 claimed by the event (or, in the case of megolm,
    // the event which set up the megolm session), to check that it matches the
    // fingerprint of the purported sending device.
    //
    // (see https://github.com/vector-im/vector-web/issues/2215)

    var claimedKey = event.getKeysClaimed().ed25519;
    if (!claimedKey) {
        console.warn("Event " + event.getId() + " claims no ed25519 key: " + "cannot verify sending device");
        return null;
    }

    if (claimedKey !== device.getFingerprint()) {
        console.warn("Event " + event.getId() + " claims ed25519 key " + claimedKey + "but sender device has key " + device.getFingerprint());
        return null;
    }

    return device;
};

/**
 * Configure a room to use encryption (ie, save a flag in the sessionstore).
 *
 * @param {string} roomId The room ID to enable encryption in.
 * @param {object} config The encryption config for the room.
 */
Crypto.prototype.setRoomEncryption = function (roomId, config) {
    // if we already have encryption in this room, we should ignore this event
    // (for now at least. maybe we should alert the user somehow?)
    var existingConfig = this._sessionStore.getEndToEndRoom(roomId);
    if (existingConfig) {
        if (JSON.stringify(existingConfig) != JSON.stringify(config)) {
            console.error("Ignoring m.room.encryption event which requests " + "a change of config in " + roomId);
            return;
        }
    }

    var AlgClass = algorithms.ENCRYPTION_CLASSES[config.algorithm];
    if (!AlgClass) {
        throw new Error("Unable to encrypt with " + config.algorithm);
    }

    this._sessionStore.storeEndToEndRoom(roomId, config);

    var alg = new AlgClass({
        userId: this._userId,
        deviceId: this._deviceId,
        crypto: this,
        olmDevice: this._olmDevice,
        baseApis: this._baseApis,
        roomId: roomId,
        config: config
    });
    this._roomEncryptors[roomId] = alg;
};

/**
 * @typedef {Object} module:crypto~OlmSessionResult
 * @property {module:crypto/deviceinfo} device  device info
 * @property {string?} sessionId base64 olm session id; null if no session
 *    could be established
 */

/**
 * Try to make sure we have established olm sessions for all known devices for
 * the given users.
 *
 * @param {string[]} users list of user ids
 *
 * @return {module:client.Promise} resolves once the sessions are complete, to
 *    an Object mapping from userId to deviceId to
 *    {@link module:crypto~OlmSessionResult}
 */
Crypto.prototype.ensureOlmSessionsForUsers = function (users) {
    var devicesByUser = {};

    for (var i = 0; i < users.length; ++i) {
        var userId = users[i];
        devicesByUser[userId] = [];

        var devices = this.getStoredDevicesForUser(userId) || [];
        for (var j = 0; j < devices.length; ++j) {
            var deviceInfo = devices[j];

            var key = deviceInfo.getIdentityKey();
            if (key == this._olmDevice.deviceCurve25519Key) {
                // don't bother setting up session to ourself
                continue;
            }
            if (deviceInfo.verified == DeviceVerification.BLOCKED) {
                // don't bother setting up sessions with blocked users
                continue;
            }

            devicesByUser[userId].push(deviceInfo);
        }
    }

    return olmlib.ensureOlmSessionsForDevices(this._olmDevice, this._baseApis, devicesByUser);
};

/**
 * Whether encryption is enabled for a room.
 * @param {string} roomId the room id to query.
 * @return {bool} whether encryption is enabled.
 */
Crypto.prototype.isRoomEncrypted = function (roomId) {
    return Boolean(this._roomEncryptors[roomId]);
};

/**
 * Get a list containing all of the room keys
 *
 * @return {module:client.Promise} a promise which resolves to a list of
 *    session export objects
 */
Crypto.prototype.exportRoomKeys = function () {
    var _this2 = this;

    return q(this._sessionStore.getAllEndToEndInboundGroupSessionKeys().map(function (s) {
        var sess = _this2._olmDevice.exportInboundGroupSession(s.senderKey, s.sessionId);

        sess.algorithm = olmlib.MEGOLM_ALGORITHM;
        return sess;
    }));
};

/**
 * Import a list of room keys previously exported by exportRoomKeys
 *
 * @param {Object[]} keys a list of session export objects
 */
Crypto.prototype.importRoomKeys = function (keys) {
    var _this3 = this;

    keys.map(function (session) {
        if (!session.room_id || !session.algorithm) {
            console.warn("ignoring session entry with missing fields", session);
            return;
        }

        var alg = _this3._getRoomDecryptor(session.room_id, session.algorithm);
        alg.importRoomKey(session);
    });
};

/**
 * Encrypt an event according to the configuration of the room, if necessary.
 *
 * @param {module:models/event.MatrixEvent} event  event to be sent
 *
 * @param {module:models/room?} room destination room. Null if the destination
 *     is not a room we have seen over the sync pipe.
 *
 * @return {module:client.Promise?} Promise which resolves when the event has been
 *     encrypted, or null if nothing was needed
 */
Crypto.prototype.encryptEventIfNeeded = function (event, room) {
    if (event.isEncrypted()) {
        // this event has already been encrypted; this happens if the
        // encryption step succeeded, but the send step failed on the first
        // attempt.
        return null;
    }

    if (!room) {
        throw new Error("Cannot send encrypted messages in unknown rooms");
    }

    var roomId = event.getRoomId();

    var alg = this._roomEncryptors[roomId];
    if (!alg) {
        // not encrypting messages in this room

        // check that the HS hasn't hidden the crypto event
        if (this._sessionStore.getEndToEndRoom(roomId)) {
            throw new Error("Room was previously configured to use encryption, but is " + "no longer. Perhaps the homeserver is hiding the " + "configuration event.");
        }
        return null;
    }

    // We can claim and prove ownership of all our device keys in the local
    // echo of the event since we know that all the local echos come from
    // this device.
    var myKeys = {
        curve25519: this._olmDevice.deviceCurve25519Key,
        ed25519: this._olmDevice.deviceEd25519Key
    };

    return alg.encryptMessage(room, event.getType(), event.getContent()).then(function (encryptedContent) {
        event.makeEncrypted("m.room.encrypted", encryptedContent, myKeys);
    });
};

/**
 * Decrypt a received event
 *
 * @param {MatrixEvent} event
 *
 * @raises {algorithms.DecryptionError} if there is a problem decrypting the event
 */
Crypto.prototype.decryptEvent = function (event) {
    var content = event.getWireContent();
    var alg = this._getRoomDecryptor(event.getRoomId(), content.algorithm);
    alg.decryptEvent(event);
};

/**
 * handle an m.room.encryption event
 *
 * @private
 * @param {module:models/event.MatrixEvent} event encryption event
 */
Crypto.prototype._onCryptoEvent = function (event) {
    var roomId = event.getRoomId();
    var content = event.getContent();

    try {
        this.setRoomEncryption(roomId, content);
    } catch (e) {
        console.error("Error configuring encryption in room " + roomId + ":", e);
    }
};

/**
 * handle the completion of the initial sync.
 *
 * Announces the new device.
 *
 * @private
 * @param {module:models/room[]} rooms list of rooms the client knows about
 */
Crypto.prototype._onInitialSyncCompleted = function (rooms) {
    this._initialSyncCompleted = true;

    // catch up on any m.new_device events which arrived during the initial sync.
    this._flushNewDeviceRequests();

    if (this._sessionStore.getDeviceAnnounced()) {
        return;
    }

    // we need to tell all the devices in all the rooms we are members of that
    // we have arrived.
    // build a list of rooms for each user.
    var roomsByUser = {};
    for (var i = 0; i < rooms.length; i++) {
        var room = rooms[i];

        // check for rooms with encryption enabled
        var alg = this._roomEncryptors[room.roomId];
        if (!alg) {
            continue;
        }

        // ignore any rooms which we have left
        var me = room.getMember(this._userId);
        if (!me || me.membership !== "join" && me.membership !== "invite") {
            continue;
        }

        var members = room.getJoinedMembers();
        for (var j = 0; j < members.length; j++) {
            var m = members[j];
            if (!roomsByUser[m.userId]) {
                roomsByUser[m.userId] = [];
            }
            roomsByUser[m.userId].push(room.roomId);
        }
    }

    // build a per-device message for each user
    var content = {};
    for (var userId in roomsByUser) {
        if (!roomsByUser.hasOwnProperty(userId)) {
            continue;
        }
        content[userId] = {
            "*": {
                device_id: this._deviceId,
                rooms: roomsByUser[userId]
            }
        };
    }

    var self = this;
    this._baseApis.sendToDevice("m.new_device", // OH HAI!
    content).done(function () {
        self._sessionStore.setDeviceAnnounced();
    });
};

/**
 * Handle a key event
 *
 * @private
 * @param {module:models/event.MatrixEvent} event key event
 */
Crypto.prototype._onRoomKeyEvent = function (event) {
    var content = event.getContent();

    if (!content.room_id || !content.algorithm) {
        console.error("key event is missing fields");
        return;
    }

    var alg = this._getRoomDecryptor(content.room_id, content.algorithm);
    alg.onRoomKeyEvent(event);
};

/**
 * Handle a change in the membership state of a member of a room
 *
 * @private
 * @param {module:models/event.MatrixEvent} event  event causing the change
 * @param {module:models/room-member} member  user whose membership changed
 * @param {string=} oldMembership  previous membership
 */
Crypto.prototype._onRoomMembership = function (event, member, oldMembership) {
    // this event handler is registered on the *client* (as opposed to the room
    // member itself), which means it is only called on changes to the *live*
    // membership state (ie, it is not called when we back-paginate, nor when
    // we load the state in the initialsync).
    //
    // Further, it is automatically registered and called when new members
    // arrive in the room.

    var roomId = member.roomId;

    var alg = this._roomEncryptors[roomId];
    if (!alg) {
        // not encrypting in this room
        return;
    }

    alg.onRoomMembership(event, member, oldMembership);
};

/**
 * Called when a new device announces itself
 *
 * @private
 * @param {module:models/event.MatrixEvent} event announcement event
 */
Crypto.prototype._onNewDeviceEvent = function (event) {
    var content = event.getContent();
    var userId = event.getSender();
    var deviceId = content.device_id;
    var rooms = content.rooms;

    if (!rooms || !deviceId) {
        console.warn("new_device event missing keys");
        return;
    }

    console.log("m.new_device event from " + userId + ":" + deviceId + " for rooms " + rooms);

    if (this.getStoredDevice(userId, deviceId)) {
        console.log("Known device; ignoring");
        return;
    }

    this._pendingUsersWithNewDevices[userId] = true;

    // we delay handling these until the intialsync has completed, so that we
    // can do all of them together.
    if (this._initialSyncCompleted) {
        this._flushNewDeviceRequests();
    }
};

/**
 * Start device queries for any users who sent us an m.new_device recently
 */
Crypto.prototype._flushNewDeviceRequests = function () {
    var self = this;

    var users = utils.keys(this._pendingUsersWithNewDevices);

    if (users.length === 0) {
        return;
    }

    var r = this._doKeyDownloadForUsers(users);

    // we've kicked off requests to these users: remove their
    // pending flag for now.
    this._pendingUsersWithNewDevices = {};

    users.map(function (u) {
        r[u] = r[u].catch(function (e) {
            console.error('Error updating device keys for user ' + u + ':', e);

            // reinstate the pending flags on any users which failed; this will
            // mean that we will do another download in the future, but won't
            // tight-loop.
            //
            self._pendingUsersWithNewDevices[u] = true;
        });
    });

    q.all(utils.values(r)).done();
};

/**
 * Get a decryptor for a given room and algorithm.
 *
 * If we already have a decryptor for the given room and algorithm, return
 * it. Otherwise try to instantiate it.
 *
 * @private
 *
 * @param {string?} roomId   room id for decryptor. If undefined, a temporary
 * decryptor is instantiated.
 *
 * @param {string} algorithm  crypto algorithm
 *
 * @return {module:crypto.algorithms.base.DecryptionAlgorithm}
 *
 * @raises {module:crypto.algorithms.DecryptionError} if the algorithm is
 * unknown
 */
Crypto.prototype._getRoomDecryptor = function (roomId, algorithm) {
    var decryptors = void 0;
    var alg = void 0;

    roomId = roomId || null;
    if (roomId) {
        decryptors = this._roomDecryptors[roomId];
        if (!decryptors) {
            this._roomDecryptors[roomId] = decryptors = {};
        }

        alg = decryptors[algorithm];
        if (alg) {
            return alg;
        }
    }

    var AlgClass = algorithms.DECRYPTION_CLASSES[algorithm];
    if (!AlgClass) {
        throw new algorithms.DecryptionError('Unknown encryption algorithm "' + algorithm + '".');
    }
    alg = new AlgClass({
        userId: this._userId,
        crypto: this,
        olmDevice: this._olmDevice,
        roomId: roomId
    });

    if (decryptors) {
        decryptors[algorithm] = alg;
    }
    return alg;
};

/**
 * sign the given object with our ed25519 key
 *
 * @param {Object} obj  Object to which we will add a 'signatures' property
 */
Crypto.prototype._signObject = function (obj) {
    var sigs = {};
    sigs[this._userId] = {};
    sigs[this._userId]["ed25519:" + this._deviceId] = this._olmDevice.sign(anotherjson.stringify(obj));
    obj.signatures = sigs;
};

/**
 * @see module:crypto/algorithms/base.DecryptionError
 */
Crypto.DecryptionError = algorithms.DecryptionError;

/** */
module.exports = Crypto;

},{"../utils":36,"./OlmDevice":5,"./algorithms":7,"./deviceinfo":10,"./olmlib":12,"another-json":38,"q":42}],12:[function(require,module,exports){
'use strict';

/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @module olmlib
 *
 * Utilities common to olm encryption algorithms
 */

var q = require('q');
var anotherjson = require('another-json');

var utils = require("../utils");

/**
 * matrix algorithm tag for olm
 */
module.exports.OLM_ALGORITHM = "m.olm.v1.curve25519-aes-sha2";

/**
 * matrix algorithm tag for megolm
 */
module.exports.MEGOLM_ALGORITHM = "m.megolm.v1.aes-sha2";

/**
 * Encrypt an event payload for an Olm device
 *
 * @param {Object<string, string>} resultsObject  The `ciphertext` property
 *   of the m.room.encrypted event to which to add our result
 *
 * @param {string} ourUserId
 * @param {string} ourDeviceId
 * @param {module:crypto/OlmDevice} olmDevice olm.js wrapper
 * @param {string} recipientUserId
 * @param {module:crypto/deviceinfo} recipientDevice
 * @param {object} payloadFields fields to include in the encrypted payload
 */
module.exports.encryptMessageForDevice = function (resultsObject, ourUserId, ourDeviceId, olmDevice, recipientUserId, recipientDevice, payloadFields) {
    var deviceKey = recipientDevice.getIdentityKey();
    var sessionId = olmDevice.getSessionIdForDevice(deviceKey);
    if (sessionId === null) {
        // If we don't have a session for a device then
        // we can't encrypt a message for it.
        return;
    }

    console.log("Using sessionid " + sessionId + " for device " + recipientUserId + ":" + recipientDevice.deviceId);

    var payload = {
        sender: ourUserId,
        sender_device: ourDeviceId,

        // Include the Ed25519 key so that the recipient knows what
        // device this message came from.
        // We don't need to include the curve25519 key since the
        // recipient will already know this from the olm headers.
        // When combined with the device keys retrieved from the
        // homeserver signed by the ed25519 key this proves that
        // the curve25519 key and the ed25519 key are owned by
        // the same device.
        keys: {
            "ed25519": olmDevice.deviceEd25519Key
        },

        // include the recipient device details in the payload,
        // to avoid unknown key attacks, per
        // https://github.com/vector-im/vector-web/issues/2483
        recipient: recipientUserId,
        recipient_keys: {
            "ed25519": recipientDevice.getFingerprint()
        }
    };

    // TODO: technically, a bunch of that stuff only needs to be included for
    // pre-key messages: after that, both sides know exactly which devices are
    // involved in the session. If we're looking to reduce data transfer in the
    // future, we could elide them for subsequent messages.

    utils.extend(payload, payloadFields);

    resultsObject[deviceKey] = olmDevice.encryptMessage(deviceKey, sessionId, JSON.stringify(payload));
};

/**
 * Try to make sure we have established olm sessions for the given devices.
 *
 * @param {module:crypto/OlmDevice} olmDevice
 *
 * @param {module:base-apis~MatrixBaseApis} baseApis
 *
 * @param {object<string, module:crypto/deviceinfo[]>} devicesByUser
 *    map from userid to list of devices
 *
 * @return {module:client.Promise} resolves once the sessions are complete, to
 *    an Object mapping from userId to deviceId to
 *    {@link module:crypto~OlmSessionResult}
 */
module.exports.ensureOlmSessionsForDevices = function (olmDevice, baseApis, devicesByUser) {
    var devicesWithoutSession = [
        // [userId, deviceId], ...
    ];
    var result = {};

    for (var userId in devicesByUser) {
        if (!devicesByUser.hasOwnProperty(userId)) {
            continue;
        }
        result[userId] = {};
        var devices = devicesByUser[userId];
        for (var j = 0; j < devices.length; j++) {
            var deviceInfo = devices[j];
            var deviceId = deviceInfo.deviceId;
            var key = deviceInfo.getIdentityKey();
            var sessionId = olmDevice.getSessionIdForDevice(key);
            if (sessionId === null) {
                devicesWithoutSession.push([userId, deviceId]);
            }
            result[userId][deviceId] = {
                device: deviceInfo,
                sessionId: sessionId
            };
        }
    }

    if (devicesWithoutSession.length === 0) {
        return q(result);
    }

    // TODO: this has a race condition - if we try to send another message
    // while we are claiming a key, we will end up claiming two and setting up
    // two sessions.
    //
    // That should eventually resolve itself, but it's poor form.

    var oneTimeKeyAlgorithm = "signed_curve25519";
    return baseApis.claimOneTimeKeys(devicesWithoutSession, oneTimeKeyAlgorithm).then(function (res) {
        var otk_res = res.one_time_keys || {};
        for (var _userId in devicesByUser) {
            if (!devicesByUser.hasOwnProperty(_userId)) {
                continue;
            }
            var userRes = otk_res[_userId] || {};
            var _devices = devicesByUser[_userId];
            for (var _j = 0; _j < _devices.length; _j++) {
                var _deviceInfo = _devices[_j];
                var _deviceId = _deviceInfo.deviceId;
                if (result[_userId][_deviceId].sessionId) {
                    // we already have a result for this device
                    continue;
                }

                var deviceRes = userRes[_deviceId] || {};
                var oneTimeKey = null;
                for (var keyId in deviceRes) {
                    if (keyId.indexOf(oneTimeKeyAlgorithm + ":") === 0) {
                        oneTimeKey = deviceRes[keyId];
                    }
                }

                if (!oneTimeKey) {
                    console.warn("No one-time keys (alg=" + oneTimeKeyAlgorithm + ") for device " + _userId + ":" + _deviceId);
                    continue;
                }

                var sid = _verifyKeyAndStartSession(olmDevice, oneTimeKey, _userId, _deviceInfo);
                result[_userId][_deviceId].sessionId = sid;
            }
        }
        return result;
    });
};

function _verifyKeyAndStartSession(olmDevice, oneTimeKey, userId, deviceInfo) {
    var deviceId = deviceInfo.deviceId;
    try {
        _verifySignature(olmDevice, oneTimeKey, userId, deviceId, deviceInfo.getFingerprint());
    } catch (e) {
        console.error("Unable to verify signature on one-time key for device " + userId + ":" + deviceId + ":", e);
        return null;
    }

    var sid = void 0;
    try {
        sid = olmDevice.createOutboundSession(deviceInfo.getIdentityKey(), oneTimeKey.key);
    } catch (e) {
        // possibly a bad key
        console.error("Error starting session with device " + userId + ":" + deviceId + ": " + e);
        return null;
    }

    console.log("Started new sessionid " + sid + " for device " + userId + ":" + deviceId);
    return sid;
}

/**
 * Verify the signature on an object
 *
 * @param {module:crypto/OlmDevice} olmDevice olm wrapper to use for verify op
 *
 * @param {Object} obj object to check signature on. Note that this will be
 * stripped of its 'signatures' and 'unsigned' properties.
 *
 * @param {string} signingUserId  ID of the user whose signature should be checked
 *
 * @param {string} signingDeviceId  ID of the device whose signature should be checked
 *
 * @param {string} signingKey   base64-ed ed25519 public key
 */
var _verifySignature = module.exports.verifySignature = function (olmDevice, obj, signingUserId, signingDeviceId, signingKey) {
    var signKeyId = "ed25519:" + signingDeviceId;
    var signatures = obj.signatures || {};
    var userSigs = signatures[signingUserId] || {};
    var signature = userSigs[signKeyId];
    if (!signature) {
        throw Error("No signature");
    }

    // prepare the canonical json: remove unsigned and signatures, and stringify with
    // anotherjson
    delete obj.unsigned;
    delete obj.signatures;
    var json = anotherjson.stringify(obj);

    olmDevice.verifySignature(signingKey, json, signature);
};

},{"../utils":36,"another-json":38,"q":42}],13:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module filter-component
 */

/**
 * Checks if a value matches a given field value, which may be a * terminated
 * wildcard pattern.
 * @param {String} actual_value  The value to be compared
 * @param {String} filter_value  The filter pattern to be compared
 * @return {bool} true if the actual_value matches the filter_value
 */

function _matches_wildcard(actual_value, filter_value) {
    if (filter_value.endsWith("*")) {
        var type_prefix = filter_value.slice(0, -1);
        return actual_value.substr(0, type_prefix.length) === type_prefix;
    } else {
        return actual_value === filter_value;
    }
}

/**
 * FilterComponent is a section of a Filter definition which defines the
 * types, rooms, senders filters etc to be applied to a particular type of resource.
 * This is all ported over from synapse's Filter object.
 *
 * N.B. that synapse refers to these as 'Filters', and what js-sdk refers to as
 * 'Filters' are referred to as 'FilterCollections'.
 *
 * @constructor
 * @param {Object} filter_json the definition of this filter JSON, e.g. { 'contains_url': true }
 */
function FilterComponent(filter_json) {
    this.filter_json = filter_json;

    this.types = filter_json.types || null;
    this.not_types = filter_json.not_types || [];

    this.rooms = filter_json.rooms || null;
    this.not_rooms = filter_json.not_rooms || [];

    this.senders = filter_json.senders || null;
    this.not_senders = filter_json.not_senders || [];

    this.contains_url = filter_json.contains_url || null;
}

/**
 * Checks with the filter component matches the given event
 * @param {MatrixEvent} event event to be checked against the filter
 * @return {bool} true if the event matches the filter
 */
FilterComponent.prototype.check = function (event) {
    return this._checkFields(event.getRoomId(), event.getSender(), event.getType(), event.getContent() ? event.getContent().url !== undefined : false);
};

/**
 * Checks whether the filter component matches the given event fields.
 * @param {String} room_id       the room_id for the event being checked
 * @param {String} sender        the sender of the event being checked
 * @param {String} event_type    the type of the event being checked
 * @param {String} contains_url  whether the event contains a content.url field
 * @return {bool} true if the event fields match the filter
 */
FilterComponent.prototype._checkFields = function (room_id, sender, event_type, contains_url) {
    var literal_keys = {
        "rooms": function rooms(v) {
            return room_id === v;
        },
        "senders": function senders(v) {
            return sender === v;
        },
        "types": function types(v) {
            return _matches_wildcard(event_type, v);
        }
    };

    var self = this;
    Object.keys(literal_keys).forEach(function (name) {
        var match_func = literal_keys[name];
        var not_name = "not_" + name;
        var disallowed_values = self[not_name];
        if (disallowed_values.map(match_func)) {
            return false;
        }

        var allowed_values = self[name];
        if (allowed_values) {
            if (!allowed_values.map(match_func)) {
                return false;
            }
        }
    });

    var contains_url_filter = this.filter_json.contains_url;
    if (contains_url_filter !== undefined) {
        if (contains_url_filter !== contains_url) {
            return false;
        }
    }

    return true;
};

/**
 * Filters a list of events down to those which match this filter component
 * @param {MatrixEvent[]} events  Events to be checked againt the filter component
 * @return {MatrixEvent[]} events which matched the filter component
 */
FilterComponent.prototype.filter = function (events) {
    return events.filter(this.check, this);
};

/**
 * Returns the limit field for a given filter component, providing a default of
 * 10 if none is otherwise specified.  Cargo-culted from Synapse.
 * @return {Number} the limit for this filter component.
 */
FilterComponent.prototype.limit = function () {
    return this.filter_json.limit !== undefined ? this.filter_json.limit : 10;
};

/** The FilterComponent class */
module.exports = FilterComponent;

},{}],14:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module filter
 */

var FilterComponent = require("./filter-component");

/**
 * @param {Object} obj
 * @param {string} keyNesting
 * @param {*} val
 */
function setProp(obj, keyNesting, val) {
    var nestedKeys = keyNesting.split(".");
    var currentObj = obj;
    for (var i = 0; i < nestedKeys.length - 1; i++) {
        if (!currentObj[nestedKeys[i]]) {
            currentObj[nestedKeys[i]] = {};
        }
        currentObj = currentObj[nestedKeys[i]];
    }
    currentObj[nestedKeys[nestedKeys.length - 1]] = val;
}

/**
 * Construct a new Filter.
 * @constructor
 * @param {string} userId The user ID for this filter.
 * @param {string=} filterId The filter ID if known.
 * @prop {string} userId The user ID of the filter
 * @prop {?string} filterId The filter ID
 */
function Filter(userId, filterId) {
    this.userId = userId;
    this.filterId = filterId;
    this.definition = {};
}

/**
 * Get the ID of this filter on your homeserver (if known)
 * @return {?Number} The filter ID
 */
Filter.prototype.getFilterId = function () {
    return this.filterId;
};

/**
 * Get the JSON body of the filter.
 * @return {Object} The filter definition
 */
Filter.prototype.getDefinition = function () {
    return this.definition;
};

/**
 * Set the JSON body of the filter
 * @param {Object} definition The filter definition
 */
Filter.prototype.setDefinition = function (definition) {
    this.definition = definition;

    // This is all ported from synapse's FilterCollection()

    // definitions look something like:
    // {
    //   "room": {
    //     "rooms": ["!abcde:example.com"],
    //     "not_rooms": ["!123456:example.com"],
    //     "state": {
    //       "types": ["m.room.*"],
    //       "not_rooms": ["!726s6s6q:example.com"],
    //     },
    //     "timeline": {
    //       "limit": 10,
    //       "types": ["m.room.message"],
    //       "not_rooms": ["!726s6s6q:example.com"],
    //       "not_senders": ["@spam:example.com"]
    //       "contains_url": true
    //     },
    //     "ephemeral": {
    //       "types": ["m.receipt", "m.typing"],
    //       "not_rooms": ["!726s6s6q:example.com"],
    //       "not_senders": ["@spam:example.com"]
    //     }
    //   },
    //   "presence": {
    //     "types": ["m.presence"],
    //     "not_senders": ["@alice:example.com"]
    //   },
    //   "event_format": "client",
    //   "event_fields": ["type", "content", "sender"]
    // }

    var room_filter_json = definition.room;

    // consider the top level rooms/not_rooms filter
    var room_filter_fields = {};
    if (room_filter_json) {
        if (room_filter_json.rooms) {
            room_filter_fields.rooms = room_filter_json.rooms;
        }
        if (room_filter_json.rooms) {
            room_filter_fields.not_rooms = room_filter_json.not_rooms;
        }

        this._include_leave = room_filter_json.include_leave || false;
    }

    this._room_filter = new FilterComponent(room_filter_fields);
    this._room_timeline_filter = new FilterComponent(room_filter_json ? room_filter_json.timeline || {} : {});

    // don't bother porting this from synapse yet:
    // this._room_state_filter =
    //     new FilterComponent(room_filter_json.state || {});
    // this._room_ephemeral_filter =
    //     new FilterComponent(room_filter_json.ephemeral || {});
    // this._room_account_data_filter =
    //     new FilterComponent(room_filter_json.account_data || {});
    // this._presence_filter =
    //     new FilterComponent(definition.presence || {});
    // this._account_data_filter =
    //     new FilterComponent(definition.account_data || {});
};

/**
 * Get the room.timeline filter component of the filter
 * @return {FilterComponent} room timeline filter component
 */
Filter.prototype.getRoomTimelineFilterComponent = function () {
    return this._room_timeline_filter;
};

/**
 * Filter the list of events based on whether they are allowed in a timeline
 * based on this filter
 * @param {MatrixEvent[]} events  the list of events being filtered
 * @return {MatrixEvent[]} the list of events which match the filter
 */
Filter.prototype.filterRoomTimeline = function (events) {
    return this._room_timeline_filter.filter(this._room_filter.filter(events));
};

/**
 * Set the max number of events to return for each room's timeline.
 * @param {Number} limit The max number of events to return for each room.
 */
Filter.prototype.setTimelineLimit = function (limit) {
    setProp(this.definition, "room.timeline.limit", limit);
};

/**
 * Control whether left rooms should be included in responses.
 * @param {boolean} includeLeave True to make rooms the user has left appear
 * in responses.
 */
Filter.prototype.setIncludeLeaveRooms = function (includeLeave) {
    setProp(this.definition, "room.include_leave", includeLeave);
};

/**
 * Create a filter from existing data.
 * @static
 * @param {string} userId
 * @param {string} filterId
 * @param {Object} jsonObj
 * @return {Filter}
 */
Filter.fromJson = function (userId, filterId, jsonObj) {
    var filter = new Filter(userId, filterId);
    filter.setDefinition(jsonObj);
    return filter;
};

/** The Filter class */
module.exports = Filter;

},{"./filter-component":13}],15:[function(require,module,exports){
(function (global){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * This is an internal module. See {@link MatrixHttpApi} for the public class.
 * @module http-api
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var q = require("q");
var utils = require("./utils");

// we use our own implementation of setTimeout, so that if we get suspended in
// the middle of a /sync, we cancel the sync as soon as we awake, rather than
// waiting for the delay to elapse.
var callbacks = require("./realtime-callbacks");

/*
TODO:
- CS: complete register function (doing stages)
- Identity server: linkEmail, authEmail, bindEmail, lookup3pid
*/

/**
 * A constant representing the URI path for release 0 of the Client-Server HTTP API.
 */
module.exports.PREFIX_R0 = "/_matrix/client/r0";

/**
 * A constant representing the URI path for as-yet unspecified Client-Server HTTP APIs.
 */
module.exports.PREFIX_UNSTABLE = "/_matrix/client/unstable";

/**
 * URI path for the identity API
 */
module.exports.PREFIX_IDENTITY_V1 = "/_matrix/identity/api/v1";

/**
 * URI path for the media repo API
 */
module.exports.PREFIX_MEDIA_R0 = "/_matrix/media/r0";

/**
 * Construct a MatrixHttpApi.
 * @constructor
 * @param {EventEmitter} event_emitter The event emitter to use for emitting events
 * @param {Object} opts The options to use for this HTTP API.
 * @param {string} opts.baseUrl Required. The base client-server URL e.g.
 * 'http://localhost:8008'.
 * @param {Function} opts.request Required. The function to call for HTTP
 * requests. This function must look like function(opts, callback){ ... }.
 * @param {string} opts.prefix Required. The matrix client prefix to use, e.g.
 * '/_matrix/client/r0'. See PREFIX_R0 and PREFIX_UNSTABLE for constants.
 *
 * @param {bool=} opts.onlyData True to return only the 'data' component of the
 * response (e.g. the parsed HTTP body). If false, requests will return an
 * object with the properties <tt>code</tt>, <tt>headers</tt> and <tt>data</tt>.
 *
 * @param {string} opts.accessToken The access_token to send with requests. Can be
 * null to not send an access token.
 * @param {Object=} opts.extraParams Optional. Extra query parameters to send on
 * requests.
 * @param {Number=} opts.localTimeoutMs The default maximum amount of time to wait
 * before timing out the request. If not specified, there is no timeout.
 */
module.exports.MatrixHttpApi = function MatrixHttpApi(event_emitter, opts) {
    utils.checkObjectHasKeys(opts, ["baseUrl", "request", "prefix"]);
    opts.onlyData = opts.onlyData || false;
    this.event_emitter = event_emitter;
    this.opts = opts;
    this.uploads = [];
};

module.exports.MatrixHttpApi.prototype = {

    /**
     * Get the content repository url with query parameters.
     * @return {Object} An object with a 'base', 'path' and 'params' for base URL,
     *          path and query parameters respectively.
     */
    getContentUri: function getContentUri() {
        var params = {
            access_token: this.opts.accessToken
        };
        return {
            base: this.opts.baseUrl,
            path: "/_matrix/media/v1/upload",
            params: params
        };
    },

    /**
     * Upload content to the Home Server
     *
     * @param {object} file The object to upload. On a browser, something that
     *   can be sent to XMLHttpRequest.send (typically a File).  Under node.js,
     *   a Buffer, String or ReadStream.
     *
     * @param {object} opts  options object
     *
     * @param {string=} opts.name   Name to give the file on the server. Defaults
     *   to <tt>file.name</tt>.
     *
     * @param {string=} opts.type   Content-type for the upload. Defaults to
     *   <tt>file.type</tt>, or <tt>applicaton/octet-stream</tt>.
     *
     * @param {boolean=} opts.rawResponse Return the raw body, rather than
     *   parsing the JSON. Defaults to false (except on node.js, where it
     *   defaults to true for backwards compatibility).
     *
     * @param {boolean=} opts.onlyContentUri Just return the content URI,
     *   rather than the whole body. Defaults to false (except on browsers,
     *   where it defaults to true for backwards compatibility). Ignored if
     *   opts.rawResponse is true.
     *
     * @param {Function=} opts.callback Deprecated. Optional. The callback to
     *    invoke on success/failure. See the promise return values for more
     *    information.
     *
     * @return {module:client.Promise} Resolves to response object, as
     *    determined by this.opts.onlyData, opts.rawResponse, and
     *    opts.onlyContentUri.  Rejects with an error (usually a MatrixError).
     */
    uploadContent: function uploadContent(file, opts) {
        var _this = this;

        if (utils.isFunction(opts)) {
            // opts used to be callback
            opts = {
                callback: opts
            };
        } else if (opts === undefined) {
            opts = {};
        }

        // if the file doesn't have a mime type, use a default since
        // the HS errors if we don't supply one.
        var contentType = opts.type || file.type || 'application/octet-stream';
        var fileName = opts.name || file.name;

        // we used to recommend setting file.stream to the thing to upload on
        // nodejs.
        var body = file.stream ? file.stream : file;

        // backwards-compatibility hacks where we used to do different things
        // between browser and node.
        var rawResponse = opts.rawResponse;
        if (rawResponse === undefined) {
            if (global.XMLHttpRequest) {
                rawResponse = false;
            } else {
                console.warn("Returning the raw JSON from uploadContent(). Future " + "versions of the js-sdk will change this default, to " + "return the parsed object. Set opts.rawResponse=false " + "to change this behaviour now.");
                rawResponse = true;
            }
        }

        var onlyContentUri = opts.onlyContentUri;
        if (!rawResponse && onlyContentUri === undefined) {
            if (global.XMLHttpRequest) {
                console.warn("Returning only the content-uri from uploadContent(). " + "Future versions of the js-sdk will change this " + "default, to return the whole response object. Set " + "opts.onlyContentUri=false to change this behaviour now.");
                onlyContentUri = true;
            } else {
                onlyContentUri = false;
            }
        }

        // browser-request doesn't support File objects because it deep-copies
        // the options using JSON.parse(JSON.stringify(options)). Instead of
        // loading the whole file into memory as a string and letting
        // browser-request base64 encode and then decode it again, we just
        // use XMLHttpRequest directly.
        // (browser-request doesn't support progress either, which is also kind
        // of important here)

        var upload = { loaded: 0, total: 0 };
        var promise = void 0;

        // XMLHttpRequest doesn't parse JSON for us. request normally does, but
        // we're setting opts.json=false so that it doesn't JSON-encode the
        // request, which also means it doesn't JSON-decode the response. Either
        // way, we have to JSON-parse the response ourselves.
        var bodyParser = null;
        if (!rawResponse) {
            bodyParser = function bodyParser(rawBody) {
                var body = JSON.parse(rawBody);
                if (onlyContentUri) {
                    body = body.content_uri;
                    if (body === undefined) {
                        throw Error('Bad response');
                    }
                }
                return body;
            };
        }

        if (global.XMLHttpRequest) {
            (function () {
                var defer = q.defer();
                var xhr = new global.XMLHttpRequest();
                upload.xhr = xhr;
                var cb = requestCallback(defer, opts.callback, _this.opts.onlyData);

                var timeout_fn = function timeout_fn() {
                    xhr.abort();
                    cb(new Error('Timeout'));
                };

                // set an initial timeout of 30s; we'll advance it each time we get
                // a progress notification
                xhr.timeout_timer = callbacks.setTimeout(timeout_fn, 30000);

                xhr.onreadystatechange = function () {
                    switch (xhr.readyState) {
                        case global.XMLHttpRequest.DONE:
                            callbacks.clearTimeout(xhr.timeout_timer);
                            var resp;
                            try {
                                if (!xhr.responseText) {
                                    throw new Error('No response body.');
                                }
                                resp = xhr.responseText;
                                if (bodyParser) {
                                    resp = bodyParser(resp);
                                }
                            } catch (err) {
                                err.http_status = xhr.status;
                                cb(err);
                                return;
                            }
                            cb(undefined, xhr, resp);
                            break;
                    }
                };
                xhr.upload.addEventListener("progress", function (ev) {
                    callbacks.clearTimeout(xhr.timeout_timer);
                    upload.loaded = ev.loaded;
                    upload.total = ev.total;
                    xhr.timeout_timer = callbacks.setTimeout(timeout_fn, 30000);
                    defer.notify(ev);
                });
                var url = _this.opts.baseUrl + "/_matrix/media/v1/upload";
                url += "?access_token=" + encodeURIComponent(_this.opts.accessToken);
                url += "&filename=" + encodeURIComponent(fileName);

                xhr.open("POST", url);
                xhr.setRequestHeader("Content-Type", contentType);
                xhr.send(body);
                promise = defer.promise;

                // dirty hack (as per _request) to allow the upload to be cancelled.
                promise.abort = xhr.abort.bind(xhr);
            })();
        } else {
            var queryParams = {
                filename: fileName
            };

            promise = this.authedRequest(opts.callback, "POST", "/upload", queryParams, body, {
                prefix: "/_matrix/media/v1",
                headers: { "Content-Type": contentType },
                json: false,
                bodyParser: bodyParser
            });
        }

        var self = this;

        // remove the upload from the list on completion
        var promise0 = promise.finally(function () {
            for (var i = 0; i < self.uploads.length; ++i) {
                if (self.uploads[i] === upload) {
                    self.uploads.splice(i, 1);
                    return;
                }
            }
        });

        // copy our dirty abort() method to the new promise
        promise0.abort = promise.abort;

        upload.promise = promise0;
        this.uploads.push(upload);

        return promise0;
    },

    cancelUpload: function cancelUpload(promise) {
        if (promise.abort) {
            promise.abort();
            return true;
        }
        return false;
    },

    getCurrentUploads: function getCurrentUploads() {
        return this.uploads;
    },

    idServerRequest: function idServerRequest(callback, method, path, params, prefix) {
        var fullUri = this.opts.idBaseUrl + prefix + path;

        if (callback !== undefined && !utils.isFunction(callback)) {
            throw Error("Expected callback to be a function but got " + (typeof callback === "undefined" ? "undefined" : _typeof(callback)));
        }

        var opts = {
            uri: fullUri,
            method: method,
            withCredentials: false,
            json: false,
            _matrix_opts: this.opts
        };
        if (method == 'GET') {
            opts.qs = params;
        } else {
            opts.form = params;
        }

        var defer = q.defer();
        this.opts.request(opts, requestCallback(defer, callback, this.opts.onlyData));
        // ID server does not always take JSON, so we can't use requests' 'json'
        // option as we do with the home server, but it does return JSON, so
        // parse it manually
        return defer.promise.then(function (response) {
            return JSON.parse(response);
        });
    },

    /**
     * Perform an authorised request to the homeserver.
     * @param {Function} callback Optional. The callback to invoke on
     * success/failure. See the promise return values for more information.
     * @param {string} method The HTTP method e.g. "GET".
     * @param {string} path The HTTP path <b>after</b> the supplied prefix e.g.
     * "/createRoom".
     *
     * @param {Object=} queryParams A dict of query params (these will NOT be
     * urlencoded). If unspecified, there will be no query params.
     *
     * @param {Object} data The HTTP JSON body.
     *
     * @param {Object=} opts additional options
     *
     * @param {Number=} opts.localTimeoutMs The maximum amount of time to wait before
     * timing out the request. If not specified, there is no timeout.
     *
     * @param {sting=} opts.prefix The full prefix to use e.g.
     * "/_matrix/client/v2_alpha". If not specified, uses this.opts.prefix.
     *
     * @param {Object=} opts.headers map of additional request headers
     *
     * @return {module:client.Promise} Resolves to <code>{data: {Object},
     * headers: {Object}, code: {Number}}</code>.
     * If <code>onlyData</code> is set, this will resolve to the <code>data</code>
     * object only.
     * @return {module:http-api.MatrixError} Rejects with an error if a problem
     * occurred. This includes network problems and Matrix-specific error JSON.
     */
    authedRequest: function authedRequest(callback, method, path, queryParams, data, opts) {
        if (!queryParams) {
            queryParams = {};
        }
        if (!queryParams.access_token) {
            queryParams.access_token = this.opts.accessToken;
        }

        var request_promise = this.request(callback, method, path, queryParams, data, opts);

        var self = this;
        request_promise.catch(function (err) {
            if (err.errcode == 'M_UNKNOWN_TOKEN') {
                self.event_emitter.emit("Session.logged_out");
            }
        });

        // return the original promise, otherwise tests break due to it having to
        // go around the event loop one more time to process the result of the request
        return request_promise;
    },

    /**
     * Perform a request to the homeserver without any credentials.
     * @param {Function} callback Optional. The callback to invoke on
     * success/failure. See the promise return values for more information.
     * @param {string} method The HTTP method e.g. "GET".
     * @param {string} path The HTTP path <b>after</b> the supplied prefix e.g.
     * "/createRoom".
     *
     * @param {Object=} queryParams A dict of query params (these will NOT be
     * urlencoded). If unspecified, there will be no query params.
     *
     * @param {Object} data The HTTP JSON body.
     *
     * @param {Object=} opts additional options
     *
     * @param {Number=} opts.localTimeoutMs The maximum amount of time to wait before
     * timing out the request. If not specified, there is no timeout.
     *
     * @param {sting=} opts.prefix The full prefix to use e.g.
     * "/_matrix/client/v2_alpha". If not specified, uses this.opts.prefix.
     *
     * @param {Object=} opts.headers map of additional request headers
     *
     * @return {module:client.Promise} Resolves to <code>{data: {Object},
     * headers: {Object}, code: {Number}}</code>.
     * If <code>onlyData</code> is set, this will resolve to the <code>data</code>
     * object only.
     * @return {module:http-api.MatrixError} Rejects with an error if a problem
     * occurred. This includes network problems and Matrix-specific error JSON.
     */
    request: function request(callback, method, path, queryParams, data, opts) {
        opts = opts || {};
        var prefix = opts.prefix !== undefined ? opts.prefix : this.opts.prefix;
        var fullUri = this.opts.baseUrl + prefix + path;

        return this.requestOtherUrl(callback, method, fullUri, queryParams, data, opts);
    },

    /**
     * Perform an authorised request to the homeserver with a specific path
     * prefix which overrides the default for this call only. Useful for hitting
     * different Matrix Client-Server versions.
     * @param {Function} callback Optional. The callback to invoke on
     * success/failure. See the promise return values for more information.
     * @param {string} method The HTTP method e.g. "GET".
     * @param {string} path The HTTP path <b>after</b> the supplied prefix e.g.
     * "/createRoom".
     * @param {Object} queryParams A dict of query params (these will NOT be
     * urlencoded).
     * @param {Object} data The HTTP JSON body.
     * @param {string} prefix The full prefix to use e.g.
     * "/_matrix/client/v2_alpha".
     * @param {Number=} localTimeoutMs The maximum amount of time to wait before
     * timing out the request. If not specified, there is no timeout.
     * @return {module:client.Promise} Resolves to <code>{data: {Object},
     * headers: {Object}, code: {Number}}</code>.
     * If <code>onlyData</code> is set, this will resolve to the <code>data</code>
     * object only.
     * @return {module:http-api.MatrixError} Rejects with an error if a problem
     * occurred. This includes network problems and Matrix-specific error JSON.
     *
     * @deprecated prefer authedRequest with opts.prefix
     */
    authedRequestWithPrefix: function authedRequestWithPrefix(callback, method, path, queryParams, data, prefix, localTimeoutMs) {
        return this.authedRequest(callback, method, path, queryParams, data, {
            localTimeoutMs: localTimeoutMs,
            prefix: prefix
        });
    },

    /**
     * Perform a request to the homeserver without any credentials but with a
     * specific path prefix which overrides the default for this call only.
     * Useful for hitting different Matrix Client-Server versions.
     * @param {Function} callback Optional. The callback to invoke on
     * success/failure. See the promise return values for more information.
     * @param {string} method The HTTP method e.g. "GET".
     * @param {string} path The HTTP path <b>after</b> the supplied prefix e.g.
     * "/createRoom".
     * @param {Object} queryParams A dict of query params (these will NOT be
     * urlencoded).
     * @param {Object} data The HTTP JSON body.
     * @param {string} prefix The full prefix to use e.g.
     * "/_matrix/client/v2_alpha".
     * @param {Number=} localTimeoutMs The maximum amount of time to wait before
     * timing out the request. If not specified, there is no timeout.
     * @return {module:client.Promise} Resolves to <code>{data: {Object},
     * headers: {Object}, code: {Number}}</code>.
     * If <code>onlyData</code> is set, this will resolve to the <code>data</code>
     * object only.
     * @return {module:http-api.MatrixError} Rejects with an error if a problem
     * occurred. This includes network problems and Matrix-specific error JSON.
     *
     * @deprecated prefer request with opts.prefix
     */
    requestWithPrefix: function requestWithPrefix(callback, method, path, queryParams, data, prefix, localTimeoutMs) {
        return this.request(callback, method, path, queryParams, data, {
            localTimeoutMs: localTimeoutMs,
            prefix: prefix
        });
    },

    /**
     * Perform a request to an arbitrary URL.
     * @param {Function} callback Optional. The callback to invoke on
     * success/failure. See the promise return values for more information.
     * @param {string} method The HTTP method e.g. "GET".
     * @param {string} uri The HTTP URI
     *
     * @param {Object=} queryParams A dict of query params (these will NOT be
     * urlencoded). If unspecified, there will be no query params.
     *
     * @param {Object} data The HTTP JSON body.
     *
     * @param {Object=} opts additional options
     *
     * @param {Number=} opts.localTimeoutMs The maximum amount of time to wait before
     * timing out the request. If not specified, there is no timeout.
     *
     * @param {sting=} opts.prefix The full prefix to use e.g.
     * "/_matrix/client/v2_alpha". If not specified, uses this.opts.prefix.
     *
     * @param {Object=} opts.headers map of additional request headers
     *
     * @return {module:client.Promise} Resolves to <code>{data: {Object},
     * headers: {Object}, code: {Number}}</code>.
     * If <code>onlyData</code> is set, this will resolve to the <code>data</code>
     * object only.
     * @return {module:http-api.MatrixError} Rejects with an error if a problem
     * occurred. This includes network problems and Matrix-specific error JSON.
     */
    requestOtherUrl: function requestOtherUrl(callback, method, uri, queryParams, data, opts) {
        if (opts === undefined || opts === null) {
            opts = {};
        } else if (isFinite(opts)) {
            // opts used to be localTimeoutMs
            opts = {
                localTimeoutMs: opts
            };
        }

        return this._request(callback, method, uri, queryParams, data, opts);
    },

    /**
     * Form and return a homeserver request URL based on the given path
     * params and prefix.
     * @param {string} path The HTTP path <b>after</b> the supplied prefix e.g.
     * "/createRoom".
     * @param {Object} queryParams A dict of query params (these will NOT be
     * urlencoded).
     * @param {string} prefix The full prefix to use e.g.
     * "/_matrix/client/v2_alpha".
     * @return {string} URL
     */
    getUrl: function getUrl(path, queryParams, prefix) {
        var queryString = "";
        if (queryParams) {
            queryString = "?" + utils.encodeParams(queryParams);
        }
        return this.opts.baseUrl + prefix + path + queryString;
    },

    /**
     * @private
     *
     * @param {function} callback
     * @param {string} method
     * @param {string} uri
     * @param {object} queryParams
     * @param {object|string} data
     * @param {object=} opts
     *
     * @param {boolean} [opts.json =true] Json-encode data before sending, and
     *   decode response on receipt. (We will still json-decode error
     *   responses, even if this is false.)
     *
     * @param {object=} opts.headers  extra request headers
     *
     * @param {number=} opts.localTimeoutMs client-side timeout for the
     *    request. Default timeout if falsy.
     *
     * @param {function=} opts.bodyParser function to parse the body of the
     *    response before passing it to the promise and callback.
     *
     * @return {module:client.Promise} a promise which resolves to either the
     * response object (if this.opts.onlyData is truthy), or the parsed
     * body. Rejects
     */
    _request: function _request(callback, method, uri, queryParams, data, opts) {
        if (callback !== undefined && !utils.isFunction(callback)) {
            throw Error("Expected callback to be a function but got " + (typeof callback === "undefined" ? "undefined" : _typeof(callback)));
        }
        opts = opts || {};

        var self = this;
        if (this.opts.extraParams) {
            for (var key in this.opts.extraParams) {
                if (!this.opts.extraParams.hasOwnProperty(key)) {
                    continue;
                }
                queryParams[key] = this.opts.extraParams[key];
            }
        }

        var json = opts.json === undefined ? true : opts.json;

        var defer = q.defer();

        var timeoutId = void 0;
        var timedOut = false;
        var req = void 0;
        var localTimeoutMs = opts.localTimeoutMs || this.opts.localTimeoutMs;
        if (localTimeoutMs) {
            timeoutId = callbacks.setTimeout(function () {
                timedOut = true;
                if (req && req.abort) {
                    req.abort();
                }
                defer.reject(new module.exports.MatrixError({
                    error: "Locally timed out waiting for a response",
                    errcode: "ORG.MATRIX.JSSDK_TIMEOUT",
                    timeout: localTimeoutMs
                }));
            }, localTimeoutMs);
        }

        var reqPromise = defer.promise;

        try {
            req = this.opts.request({
                uri: uri,
                method: method,
                withCredentials: false,
                qs: queryParams,
                body: data,
                json: json,
                timeout: localTimeoutMs,
                headers: opts.headers || {},
                _matrix_opts: this.opts
            }, function (err, response, body) {
                if (localTimeoutMs) {
                    callbacks.clearTimeout(timeoutId);
                    if (timedOut) {
                        return; // already rejected promise
                    }
                }

                // if json is falsy, we won't parse any error response, so need
                // to do so before turning it into a MatrixError
                var parseErrorJson = !json;
                var handlerFn = requestCallback(defer, callback, self.opts.onlyData, parseErrorJson, opts.bodyParser);
                handlerFn(err, response, body);
            });
            if (req && req.abort) {
                // FIXME: This is EVIL, but I can't think of a better way to expose
                // abort() operations on underlying HTTP requests :(
                reqPromise.abort = req.abort.bind(req);
            }
        } catch (ex) {
            defer.reject(ex);
            if (callback) {
                callback(ex);
            }
        }
        return reqPromise;
    }
};

/*
 * Returns a callback that can be invoked by an HTTP request on completion,
 * that will either resolve or reject the given defer as well as invoke the
 * given userDefinedCallback (if any).
 *
 * If onlyData is true, the defer/callback is invoked with the body of the
 * response, otherwise the result code.
 *
 * If parseErrorJson is true, we will JSON.parse the body if we get a 4xx error.
 *
 */
var requestCallback = function requestCallback(defer, userDefinedCallback, onlyData, parseErrorJson, bodyParser) {
    userDefinedCallback = userDefinedCallback || function () {};

    return function (err, response, body) {
        if (!err) {
            try {
                if (response.statusCode >= 400) {
                    if (parseErrorJson) {
                        // we won't have json-decoded the response.
                        body = JSON.parse(body);
                    }
                    err = new module.exports.MatrixError(body);
                } else if (bodyParser) {
                    body = bodyParser(body);
                }
            } catch (e) {
                err = e;
            }
            if (err) {
                err.httpStatus = response.statusCode;
            }
        }

        if (err) {
            defer.reject(err);
            userDefinedCallback(err);
        } else {
            var res = {
                code: response.statusCode,
                headers: response.headers,
                data: body
            };
            defer.resolve(onlyData ? body : res);
            userDefinedCallback(null, onlyData ? body : res);
        }
    };
};

/**
 * Construct a Matrix error. This is a JavaScript Error with additional
 * information specific to the standard Matrix error response.
 * @constructor
 * @param {Object} errorJson The Matrix error JSON returned from the homeserver.
 * @prop {string} errcode The Matrix 'errcode' value, e.g. "M_FORBIDDEN".
 * @prop {string} name Same as MatrixError.errcode but with a default unknown string.
 * @prop {string} message The Matrix 'error' value, e.g. "Missing token."
 * @prop {Object} data The raw Matrix error JSON used to construct this object.
 * @prop {integer} httpStatus The numeric HTTP status code given
 */
module.exports.MatrixError = function MatrixError(errorJson) {
    errorJson = errorJson || {};
    this.errcode = errorJson.errcode;
    this.name = errorJson.errcode || "Unknown error code";
    this.message = errorJson.error || "Unknown message";
    this.data = errorJson;
};
module.exports.MatrixError.prototype = Object.create(Error.prototype);
/** */
module.exports.MatrixError.prototype.constructor = module.exports.MatrixError;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./realtime-callbacks":29,"./utils":36,"q":42}],16:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/** @module interactive-auth */

var q = require("q");

var utils = require("./utils");

/**
 * Abstracts the logic used to drive the interactive auth process.
 *
 * <p>Components implementing an interactive auth flow should instantiate one of
 * these, passing in the necessary callbacks to the constructor. They should
 * then call attemptAuth, which will return a promise which will resolve or
 * reject when the interactive-auth process completes.
 *
 * <p>Meanwhile, calls will be made to the startAuthStage and doRequest
 * callbacks, and information gathered from the user can be submitted with
 * submitAuthDict.
 *
 * @constructor
 * @alias module:interactive-auth
 *
 * @param {object} opts  options object
 *
 * @param {object?} opts.authData error response from the last request. If
 *    null, a request will be made with no auth before starting.
 *
 * @param {function(object?): module:client.Promise} opts.doRequest
 *     called with the new auth dict to submit the request. Should return a
 *     promise which resolves to the successful response or rejects with a
 *     MatrixError.
 *
 * @param {function(string, object?)} opts.startAuthStage
 *     called to ask the UI to start a particular auth stage. The arguments
 *     are: the login type (eg m.login.password); and (if the last request
 *     returned an error), an error object, with fields 'errcode' and 'error'.
 *
 */
function InteractiveAuth(opts) {
    this._data = opts.authData;
    this._requestCallback = opts.doRequest;
    this._startAuthStageCallback = opts.startAuthStage;
    this._completionDeferred = null;
}

InteractiveAuth.prototype = {
    /**
     * begin the authentication process.
     *
     * @return {module:client.Promise}  which resolves to the response on success,
     * or rejects with the error on failure.
     */
    attemptAuth: function attemptAuth() {
        this._completionDeferred = q.defer();

        if (!this._data) {
            this._doRequest(null);
        } else {
            this._startNextAuthStage();
        }

        return this._completionDeferred.promise;
    },

    /**
     * get the auth session ID
     *
     * @return {string} session id
     */
    getSessionId: function getSessionId() {
        return this._data ? this._data.session : undefined;
    },

    /**
     * get the server params for a given stage
     *
     * @param {string} loginType login type for the stage
     * @return {object?} any parameters from the server for this stage
     */
    getStageParams: function getStageParams(loginType) {
        var params = {};
        if (this._data && this._data.params) {
            params = this._data.params;
        }
        return params[loginType];
    },

    /**
     * submit a new auth dict and fire off the request. This will either
     * make attemptAuth resolve/reject, or cause the startAuthStage callback
     * to be called for a new stage.
     *
     * @param {object} authData new auth dict to send to the server. Should
     *    include a `type` propterty denoting the login type, as well as any
     *    other params for that stage.
     */
    submitAuthDict: function submitAuthDict(authData) {
        if (!this._completionDeferred) {
            throw new Error("submitAuthDict() called before attemptAuth()");
        }

        // use the sessionid from the last request.
        var auth = {
            session: this._data.session
        };
        utils.extend(auth, authData);

        this._doRequest(auth);
    },

    /**
     * Fire off a request, and either resolve the promise, or call
     * startAuthStage.
     *
     * @private
     * @param {object?} auth new auth dict, including session id
     */
    _doRequest: function _doRequest(auth) {
        var self = this;

        // hackery to make sure that synchronous exceptions end up in the catch
        // handler (without the additional event loop entailed by q.fcall or an
        // extra q().then)
        var prom = void 0;
        try {
            prom = this._requestCallback(auth);
        } catch (e) {
            prom = q.reject(e);
        }

        prom.then(function (result) {
            console.log("result from request: ", result);
            self._completionDeferred.resolve(result);
        }, function (error) {
            if (error.httpStatus !== 401 || !error.data || !error.data.flows) {
                // doesn't look like an interactive-auth failure. fail the whole lot.
                throw error;
            }
            self._data = error.data;
            self._startNextAuthStage();
        }).catch(this._completionDeferred.reject).done();
    },

    /**
     * Pick the next stage and call the callback
     *
     * @private
     */
    _startNextAuthStage: function _startNextAuthStage() {
        var nextStage = this._chooseStage();
        if (!nextStage) {
            throw new Error("No incomplete flows from the server");
        }

        var stageError = null;
        if (this._data.errcode || this._data.error) {
            stageError = {
                errcode: this._data.errcode || "",
                error: this._data.error || ""
            };
        }
        this._startAuthStageCallback(nextStage, stageError);
    },

    /**
     * Pick the next auth stage
     *
     * @private
     * @return {string?} login type
     */
    _chooseStage: function _chooseStage() {
        var flow = this._chooseFlow();
        console.log("Active flow => %s", JSON.stringify(flow));
        var nextStage = this._firstUncompletedStage(flow);
        console.log("Next stage: %s", nextStage);
        return nextStage;
    },

    /**
     * Pick one of the flows from the returned list
     *
     * @private
     * @return {object} flow
     */
    _chooseFlow: function _chooseFlow() {
        var flows = this._data.flows || [];
        // always use the first flow for now
        return flows[0];
    },

    /**
     * Get the first uncompleted stage in the given flow
     *
     * @private
     * @param {object} flow
     * @return {string} login type
     */
    _firstUncompletedStage: function _firstUncompletedStage(flow) {
        var completed = (this._data || {}).completed || [];
        for (var i = 0; i < flow.stages.length; ++i) {
            var stageType = flow.stages[i];
            if (completed.indexOf(stageType) === -1) {
                return stageType;
            }
        }
    }
};

/** */
module.exports = InteractiveAuth;

},{"./utils":36,"q":42}],17:[function(require,module,exports){
(function (global){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/** The {@link module:models/event.MatrixEvent|MatrixEvent} class. */

module.exports.MatrixEvent = require("./models/event").MatrixEvent;
/** The {@link module:models/event.EventStatus|EventStatus} enum. */
module.exports.EventStatus = require("./models/event").EventStatus;
/** The {@link module:store/memory.MatrixInMemoryStore|MatrixInMemoryStore} class. */
module.exports.MatrixInMemoryStore = require("./store/memory").MatrixInMemoryStore;
/** The {@link module:http-api.MatrixHttpApi|MatrixHttpApi} class. */
module.exports.MatrixHttpApi = require("./http-api").MatrixHttpApi;
/** The {@link module:http-api.MatrixError|MatrixError} class. */
module.exports.MatrixError = require("./http-api").MatrixError;
/** The {@link module:client.MatrixClient|MatrixClient} class. */
module.exports.MatrixClient = require("./client").MatrixClient;
/** The {@link module:models/room|Room} class. */
module.exports.Room = require("./models/room");
/** The {@link module:models/event-timeline~EventTimeline} class. */
module.exports.EventTimeline = require("./models/event-timeline");
/** The {@link module:models/event-timeline-set~EventTimelineSet} class. */
module.exports.EventTimelineSet = require("./models/event-timeline-set");
/** The {@link module:models/room-member|RoomMember} class. */
module.exports.RoomMember = require("./models/room-member");
/** The {@link module:models/room-state~RoomState|RoomState} class. */
module.exports.RoomState = require("./models/room-state");
/** The {@link module:models/user~User|User} class. */
module.exports.User = require("./models/user");
/** The {@link module:scheduler~MatrixScheduler|MatrixScheduler} class. */
module.exports.MatrixScheduler = require("./scheduler");
/** The {@link module:store/session/webstorage~WebStorageSessionStore|
 * WebStorageSessionStore} class. <strong>Work in progress; unstable.</strong> */
module.exports.WebStorageSessionStore = require("./store/session/webstorage");
/** True if crypto libraries are being used on this client. */
module.exports.CRYPTO_ENABLED = require("./client").CRYPTO_ENABLED;
/** {@link module:content-repo|ContentRepo} utility functions. */
module.exports.ContentRepo = require("./content-repo");
/** The {@link module:filter~Filter|Filter} class. */
module.exports.Filter = require("./filter");
/** The {@link module:timeline-window~TimelineWindow} class. */
module.exports.TimelineWindow = require("./timeline-window").TimelineWindow;
/** The {@link module:interactive-auth} class. */
module.exports.InteractiveAuth = require("./interactive-auth");

/**
 * Create a new Matrix Call.
 * @function
 * @param {module:client.MatrixClient} client The MatrixClient instance to use.
 * @param {string} roomId The room the call is in.
 * @return {module:webrtc/call~MatrixCall} The Matrix call or null if the browser
 * does not support WebRTC.
 */
module.exports.createNewMatrixCall = require("./webrtc/call").createNewMatrixCall;

// expose the underlying request object so different environments can use
// different request libs (e.g. request or browser-request)
var request = void 0;
/**
 * The function used to perform HTTP requests. Only use this if you want to
 * use a different HTTP library, e.g. Angular's <code>$http</code>. This should
 * be set prior to calling {@link createClient}.
 * @param {requestFunction} r The request function to use.
 */
module.exports.request = function (r) {
  request = r;
};

/**
 * Return the currently-set request function.
 * @return {requestFunction} The current request function.
 */
module.exports.getRequest = function () {
  return request;
};

/**
 * Apply wrapping code around the request function. The wrapper function is
 * installed as the new request handler, and when invoked it is passed the
 * previous value, along with the options and callback arguments.
 * @param {requestWrapperFunction} wrapper The wrapping function.
 */
module.exports.wrapRequest = function (wrapper) {
  var origRequest = request;
  request = function request(options, callback) {
    return wrapper(origRequest, options, callback);
  };
};

/**
 * Construct a Matrix Client. Similar to {@link module:client~MatrixClient}
 * except that the 'request', 'store' and 'scheduler' dependencies are satisfied.
 * @param {(Object|string)} opts The configuration options for this client. If
 * this is a string, it is assumed to be the base URL. These configuration
 * options will be passed directly to {@link module:client~MatrixClient}.
 * @param {Object} opts.store If not set, defaults to
 * {@link module:store/memory.MatrixInMemoryStore}.
 * @param {Object} opts.scheduler If not set, defaults to
 * {@link module:scheduler~MatrixScheduler}.
 * @param {requestFunction} opts.request If not set, defaults to the function
 * supplied to {@link request} which defaults to the request module from NPM.
 * @return {MatrixClient} A new matrix client.
 * @see {@link module:client~MatrixClient} for the full list of options for
 * <code>opts</code>.
 */
module.exports.createClient = function (opts) {
  if (typeof opts === "string") {
    opts = {
      "baseUrl": opts
    };
  }
  opts.request = opts.request || request;
  opts.store = opts.store || new module.exports.MatrixInMemoryStore({
    localStorage: global.localStorage
  });
  opts.scheduler = opts.scheduler || new module.exports.MatrixScheduler();
  return new module.exports.MatrixClient(opts);
};

/**
 * The request function interface for performing HTTP requests. This matches the
 * API for the {@link https://github.com/request/request#requestoptions-callback|
 * request NPM module}. The SDK will attempt to call this function in order to
 * perform an HTTP request.
 * @callback requestFunction
 * @param {Object} opts The options for this HTTP request.
 * @param {string} opts.uri The complete URI.
 * @param {string} opts.method The HTTP method.
 * @param {Object} opts.qs The query parameters to append to the URI.
 * @param {Object} opts.body The JSON-serializable object.
 * @param {boolean} opts.json True if this is a JSON request.
 * @param {Object} opts._matrix_opts The underlying options set for
 * {@link MatrixHttpApi}.
 * @param {requestCallback} callback The request callback.
 */

/**
 * A wrapper for the request function interface.
 * @callback requestWrapperFunction
 * @param {requestFunction} origRequest The underlying request function being
 * wrapped
 * @param {Object} opts The options for this HTTP request, given in the same
 * form as {@link requestFunction}.
 * @param {requestCallback} callback The request callback.
 */

/**
 * The request callback interface for performing HTTP requests. This matches the
 * API for the {@link https://github.com/request/request#requestoptions-callback|
 * request NPM module}. The SDK will implement a callback which meets this
 * interface in order to handle the HTTP response.
 * @callback requestCallback
 * @param {Error} err The error if one occurred, else falsey.
 * @param {Object} response The HTTP response which consists of
 * <code>{statusCode: {Number}, headers: {Object}}</code>
 * @param {Object} body The parsed HTTP response body.
 */

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./client":3,"./content-repo":4,"./filter":14,"./http-api":15,"./interactive-auth":16,"./models/event":21,"./models/event-timeline":20,"./models/event-timeline-set":19,"./models/room":25,"./models/room-member":22,"./models/room-state":23,"./models/user":27,"./scheduler":30,"./store/memory":31,"./store/session/webstorage":32,"./timeline-window":35,"./webrtc/call":37}],18:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * @module models/event-context
 */

/**
 * Construct a new EventContext
 *
 * An eventcontext is used for circumstances such as search results, when we
 * have a particular event of interest, and a bunch of events before and after
 * it.
 *
 * It also stores pagination tokens for going backwards and forwards in the
 * timeline.
 *
 * @param {MatrixEvent} ourEvent  the event at the centre of this context
 *
 * @constructor
 */

function EventContext(ourEvent) {
    this._timeline = [ourEvent];
    this._ourEventIndex = 0;
    this._paginateTokens = { b: null, f: null };

    // this is used by MatrixClient to keep track of active requests
    this._paginateRequests = { b: null, f: null };
}

/**
 * Get the main event of interest
 *
 * This is a convenience function for getTimeline()[getOurEventIndex()].
 *
 * @return {MatrixEvent} The event at the centre of this context.
 */
EventContext.prototype.getEvent = function () {
    return this._timeline[this._ourEventIndex];
};

/**
 * Get the list of events in this context
 *
 * @return {Array} An array of MatrixEvents
 */
EventContext.prototype.getTimeline = function () {
    return this._timeline;
};

/**
 * Get the index in the timeline of our event
 *
 * @return {Number}
 */
EventContext.prototype.getOurEventIndex = function () {
    return this._ourEventIndex;
};

/**
 * Get a pagination token.
 *
 * @param {boolean} backwards   true to get the pagination token for going
 *                                  backwards in time
 * @return {string}
 */
EventContext.prototype.getPaginateToken = function (backwards) {
    return this._paginateTokens[backwards ? 'b' : 'f'];
};

/**
 * Set a pagination token.
 *
 * Generally this will be used only by the matrix js sdk.
 *
 * @param {string} token        pagination token
 * @param {boolean} backwards   true to set the pagination token for going
 *                                   backwards in time
 */
EventContext.prototype.setPaginateToken = function (token, backwards) {
    this._paginateTokens[backwards ? 'b' : 'f'] = token;
};

/**
 * Add more events to the timeline
 *
 * @param {Array} events      new events, in timeline order
 * @param {boolean} atStart   true to insert new events at the start
 */
EventContext.prototype.addEvents = function (events, atStart) {
    // TODO: should we share logic with Room.addEventsToTimeline?
    // Should Room even use EventContext?

    if (atStart) {
        this._timeline = events.concat(this._timeline);
        this._ourEventIndex += events.length;
    } else {
        this._timeline = this._timeline.concat(events);
    }
};

/**
 * The EventContext class
 */
module.exports = EventContext;

},{}],19:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module models/event-timeline-set
 */

var EventEmitter = require("events").EventEmitter;
var utils = require("../utils");
var EventTimeline = require("./event-timeline");

// var DEBUG = false;
var DEBUG = true;

var debuglog = void 0;
if (DEBUG) {
    // using bind means that we get to keep useful line numbers in the console
    debuglog = console.log.bind(console);
} else {
    debuglog = function debuglog() {};
}

/**
 * Construct a set of EventTimeline objects, typically on behalf of a given
 * room.  A room may have multiple EventTimelineSets for different levels
 * of filtering.  The global notification list is also an EventTimelineSet, but
 * lacks a room.
 *
 * <p>This is an ordered sequence of timelines, which may or may not
 * be continuous. Each timeline lists a series of events, as well as tracking
 * the room state at the start and the end of the timeline (if appropriate).
 * It also tracks forward and backward pagination tokens, as well as containing
 * links to the next timeline in the sequence.
 *
 * <p>There is one special timeline - the 'live' timeline, which represents the
 * timeline to which events are being added in real-time as they are received
 * from the /sync API. Note that you should not retain references to this
 * timeline - even if it is the current timeline right now, it may not remain
 * so if the server gives us a timeline gap in /sync.
 *
 * <p>In order that we can find events from their ids later, we also maintain a
 * map from event_id to timeline and index.
 *
 * @constructor
 * @param {?Room} room      the optional room for this timelineSet
 * @param {Object} opts     hash of options inherited from Room.
 *      opts.timelineSupport gives whether timeline support is enabled
 *      opts.filter is the filter object, if any, for this timelineSet.
 */
function EventTimelineSet(room, opts) {
    this.room = room;

    this._timelineSupport = Boolean(opts.timelineSupport);
    this._liveTimeline = new EventTimeline(this);

    // just a list - *not* ordered.
    this._timelines = [this._liveTimeline];
    this._eventIdToTimeline = {};

    this._filter = opts.filter || null;
}
utils.inherits(EventTimelineSet, EventEmitter);

/**
 * Get the filter object this timeline set is filtered on, if any
 * @return {?Filter} the optional filter for this timelineSet
 */
EventTimelineSet.prototype.getFilter = function () {
    return this._filter;
};

/**
 * Set the filter object this timeline set is filtered on
 * (passed to the server when paginating via /messages).
 * @param {Filter} filter the filter for this timelineSet
 */
EventTimelineSet.prototype.setFilter = function (filter) {
    this._filter = filter;
};

/**
 * Get the list of pending sent events for this timelineSet's room, filtered
 * by the timelineSet's filter if appropriate.
 *
 * @return {module:models/event.MatrixEvent[]} A list of the sent events
 * waiting for remote echo.
 *
 * @throws If <code>opts.pendingEventOrdering</code> was not 'detached'
 */
EventTimelineSet.prototype.getPendingEvents = function () {
    if (!this.room) {
        return [];
    }

    if (this._filter) {
        return this._filter.filterRoomTimeline(this.room.getPendingEvents());
    } else {
        return this.room.getPendingEvents();
    }
};

/**
 * Get the live timeline for this room.
 *
 * @return {module:models/event-timeline~EventTimeline} live timeline
 */
EventTimelineSet.prototype.getLiveTimeline = function () {
    return this._liveTimeline;
};

/**
 * Return the timeline (if any) this event is in.
 * @param {String} eventId the eventId being sought
 * @return {module:models/event-timeline~EventTimeline} timeline
 */
EventTimelineSet.prototype.eventIdToTimeline = function (eventId) {
    return this._eventIdToTimeline[eventId];
};

/**
 * Track a new event as if it were in the same timeline as an old event,
 * replacing it.
 * @param {String} oldEventId  event ID of the original event
 * @param {String} newEventId  event ID of the replacement event
 */
EventTimelineSet.prototype.replaceEventId = function (oldEventId, newEventId) {
    var existingTimeline = this._eventIdToTimeline[oldEventId];
    if (existingTimeline) {
        delete this._eventIdToTimeline[oldEventId];
        this._eventIdToTimeline[newEventId] = existingTimeline;
    }
};

/**
 * Reset the live timeline, and start a new one.
 *
 * <p>This is used when /sync returns a 'limited' timeline.
 *
 * @param {string=} backPaginationToken   token for back-paginating the new timeline
 * @param {?bool} flush  Whether to flush the non-live timelines too.
 *
 * @fires module:client~MatrixClient#event:"Room.timelineReset"
 */
EventTimelineSet.prototype.resetLiveTimeline = function (backPaginationToken, flush) {
    var newTimeline = void 0;

    if (!this._timelineSupport || flush) {
        // if timeline support is disabled, forget about the old timelines
        newTimeline = new EventTimeline(this);
        this._timelines = [newTimeline];
        this._eventIdToTimeline = {};
    } else {
        newTimeline = this.addTimeline();
    }

    // initialise the state in the new timeline from our last known state
    var evMap = this._liveTimeline.getState(EventTimeline.FORWARDS).events;
    var events = [];
    for (var evtype in evMap) {
        if (!evMap.hasOwnProperty(evtype)) {
            continue;
        }
        for (var stateKey in evMap[evtype]) {
            if (!evMap[evtype].hasOwnProperty(stateKey)) {
                continue;
            }
            events.push(evMap[evtype][stateKey]);
        }
    }
    newTimeline.initialiseState(events);

    // make sure we set the pagination token before firing timelineReset,
    // otherwise clients which start back-paginating will fail, and then get
    // stuck without realising that they *can* back-paginate.
    newTimeline.setPaginationToken(backPaginationToken, EventTimeline.BACKWARDS);

    this._liveTimeline = newTimeline;
    this.emit("Room.timelineReset", this.room, this);
};

/**
 * Get the timeline which contains the given event, if any
 *
 * @param {string} eventId  event ID to look for
 * @return {?module:models/event-timeline~EventTimeline} timeline containing
 * the given event, or null if unknown
 */
EventTimelineSet.prototype.getTimelineForEvent = function (eventId) {
    var res = this._eventIdToTimeline[eventId];
    return res === undefined ? null : res;
};

/**
 * Get an event which is stored in our timelines
 *
 * @param {string} eventId  event ID to look for
 * @return {?module:models/event~MatrixEvent} the given event, or undefined if unknown
 */
EventTimelineSet.prototype.findEventById = function (eventId) {
    var tl = this.getTimelineForEvent(eventId);
    if (!tl) {
        return undefined;
    }
    return utils.findElement(tl.getEvents(), function (ev) {
        return ev.getId() == eventId;
    });
};

/**
 * Add a new timeline to this timeline list
 *
 * @return {module:models/event-timeline~EventTimeline} newly-created timeline
 */
EventTimelineSet.prototype.addTimeline = function () {
    if (!this._timelineSupport) {
        throw new Error("timeline support is disabled. Set the 'timelineSupport'" + " parameter to true when creating MatrixClient to enable" + " it.");
    }

    var timeline = new EventTimeline(this);
    this._timelines.push(timeline);
    return timeline;
};

/**
 * Add events to a timeline
 *
 * <p>Will fire "Room.timeline" for each event added.
 *
 * @param {MatrixEvent[]} events A list of events to add.
 *
 * @param {boolean} toStartOfTimeline   True to add these events to the start
 * (oldest) instead of the end (newest) of the timeline. If true, the oldest
 * event will be the <b>last</b> element of 'events'.
 *
 * @param {module:models/event-timeline~EventTimeline} timeline   timeline to
 *    add events to.
 *
 * @param {string=} paginationToken   token for the next batch of events
 *
 * @fires module:client~MatrixClient#event:"Room.timeline"
 *
 */
EventTimelineSet.prototype.addEventsToTimeline = function (events, toStartOfTimeline, timeline, paginationToken) {
    if (!timeline) {
        throw new Error("'timeline' not specified for EventTimelineSet.addEventsToTimeline");
    }

    if (!toStartOfTimeline && timeline == this._liveTimeline) {
        throw new Error("EventTimelineSet.addEventsToTimeline cannot be used for adding events to " + "the live timeline - use Room.addLiveEvents instead");
    }

    if (this._filter) {
        events = this._filter.filterRoomTimeline(events);
        if (!events.length) {
            return;
        }
    }

    var direction = toStartOfTimeline ? EventTimeline.BACKWARDS : EventTimeline.FORWARDS;
    var inverseDirection = toStartOfTimeline ? EventTimeline.FORWARDS : EventTimeline.BACKWARDS;

    // Adding events to timelines can be quite complicated. The following
    // illustrates some of the corner-cases.
    //
    // Let's say we start by knowing about four timelines. timeline3 and
    // timeline4 are neighbours:
    //
    //    timeline1    timeline2    timeline3    timeline4
    //      [M]          [P]          [S] <------> [T]
    //
    // Now we paginate timeline1, and get the following events from the server:
    // [M, N, P, R, S, T, U].
    //
    // 1. First, we ignore event M, since we already know about it.
    //
    // 2. Next, we append N to timeline 1.
    //
    // 3. Next, we don't add event P, since we already know about it,
    //    but we do link together the timelines. We now have:
    //
    //    timeline1    timeline2    timeline3    timeline4
    //      [M, N] <---> [P]          [S] <------> [T]
    //
    // 4. Now we add event R to timeline2:
    //
    //    timeline1    timeline2    timeline3    timeline4
    //      [M, N] <---> [P, R]       [S] <------> [T]
    //
    //    Note that we have switched the timeline we are working on from
    //    timeline1 to timeline2.
    //
    // 5. We ignore event S, but again join the timelines:
    //
    //    timeline1    timeline2    timeline3    timeline4
    //      [M, N] <---> [P, R] <---> [S] <------> [T]
    //
    // 6. We ignore event T, and the timelines are already joined, so there
    //    is nothing to do.
    //
    // 7. Finally, we add event U to timeline4:
    //
    //    timeline1    timeline2    timeline3    timeline4
    //      [M, N] <---> [P, R] <---> [S] <------> [T, U]
    //
    // The important thing to note in the above is what happened when we
    // already knew about a given event:
    //
    //   - if it was appropriate, we joined up the timelines (steps 3, 5).
    //   - in any case, we started adding further events to the timeline which
    //       contained the event we knew about (steps 3, 5, 6).
    //
    //
    // So much for adding events to the timeline. But what do we want to do
    // with the pagination token?
    //
    // In the case above, we will be given a pagination token which tells us how to
    // get events beyond 'U' - in this case, it makes sense to store this
    // against timeline4. But what if timeline4 already had 'U' and beyond? in
    // that case, our best bet is to throw away the pagination token we were
    // given and stick with whatever token timeline4 had previously. In short,
    // we want to only store the pagination token if the last event we receive
    // is one we didn't previously know about.
    //
    // We make an exception for this if it turns out that we already knew about
    // *all* of the events, and we weren't able to join up any timelines. When
    // that happens, it means our existing pagination token is faulty, since it
    // is only telling us what we already know. Rather than repeatedly
    // paginating with the same token, we might as well use the new pagination
    // token in the hope that we eventually work our way out of the mess.

    var didUpdate = false;
    var lastEventWasNew = false;
    for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var eventId = event.getId();

        var existingTimeline = this._eventIdToTimeline[eventId];

        if (!existingTimeline) {
            // we don't know about this event yet. Just add it to the timeline.
            this.addEventToTimeline(event, timeline, toStartOfTimeline);
            lastEventWasNew = true;
            didUpdate = true;
            continue;
        }

        lastEventWasNew = false;

        if (existingTimeline == timeline) {
            debuglog("Event " + eventId + " already in timeline " + timeline);
            continue;
        }

        var neighbour = timeline.getNeighbouringTimeline(direction);
        if (neighbour) {
            // this timeline already has a neighbour in the relevant direction;
            // let's assume the timelines are already correctly linked up, and
            // skip over to it.
            //
            // there's probably some edge-case here where we end up with an
            // event which is in a timeline a way down the chain, and there is
            // a break in the chain somewhere. But I can't really imagine how
            // that would happen, so I'm going to ignore it for now.
            //
            if (existingTimeline == neighbour) {
                debuglog("Event " + eventId + " in neighbouring timeline - " + "switching to " + existingTimeline);
            } else {
                debuglog("Event " + eventId + " already in a different " + "timeline " + existingTimeline);
            }
            timeline = existingTimeline;
            continue;
        }

        // time to join the timelines.
        console.info("Already have timeline for " + eventId + " - joining timeline " + timeline + " to " + existingTimeline);
        timeline.setNeighbouringTimeline(existingTimeline, direction);
        existingTimeline.setNeighbouringTimeline(timeline, inverseDirection);
        timeline = existingTimeline;
        didUpdate = true;
    }

    // see above - if the last event was new to us, or if we didn't find any
    // new information, we update the pagination token for whatever
    // timeline we ended up on.
    if (lastEventWasNew || !didUpdate) {
        timeline.setPaginationToken(paginationToken, direction);
    }
};

/**
 * Add an event to the end of this live timeline.
 *
 * @param {MatrixEvent} event Event to be added
 * @param {string?} duplicateStrategy 'ignore' or 'replace'
 */
EventTimelineSet.prototype.addLiveEvent = function (event, duplicateStrategy) {
    if (this._filter) {
        var events = this._filter.filterRoomTimeline([event]);
        if (!events.length) {
            return;
        }
    }

    var timeline = this._eventIdToTimeline[event.getId()];
    if (timeline) {
        if (duplicateStrategy === "replace") {
            debuglog("EventTimelineSet.addLiveEvent: replacing duplicate event " + event.getId());
            var tlEvents = timeline.getEvents();
            for (var j = 0; j < tlEvents.length; j++) {
                if (tlEvents[j].getId() === event.getId()) {
                    // still need to set the right metadata on this event
                    EventTimeline.setEventMetadata(event, timeline.getState(EventTimeline.FORWARDS), false);

                    if (!tlEvents[j].encryptedType) {
                        tlEvents[j] = event;
                    }

                    // XXX: we need to fire an event when this happens.
                    break;
                }
            }
        } else {
            debuglog("EventTimelineSet.addLiveEvent: ignoring duplicate event " + event.getId());
        }
        return;
    }

    this.addEventToTimeline(event, this._liveTimeline, false);
};

/**
 * Add event to the given timeline, and emit Room.timeline. Assumes
 * we have already checked we don't know about this event.
 *
 * Will fire "Room.timeline" for each event added.
 *
 * @param {MatrixEvent} event
 * @param {EventTimeline} timeline
 * @param {boolean} toStartOfTimeline
 *
 * @fires module:client~MatrixClient#event:"Room.timeline"
 */
EventTimelineSet.prototype.addEventToTimeline = function (event, timeline, toStartOfTimeline) {
    var eventId = event.getId();
    timeline.addEvent(event, toStartOfTimeline);
    this._eventIdToTimeline[eventId] = timeline;

    var data = {
        timeline: timeline,
        liveEvent: !toStartOfTimeline && timeline == this._liveTimeline
    };
    this.emit("Room.timeline", event, this.room, Boolean(toStartOfTimeline), false, data);
};

/**
 * Replaces event with ID oldEventId with one with newEventId, if oldEventId is
 * recognised.  Otherwise, add to the live timeline.  Used to handle remote echos.
 *
 * @param {MatrixEvent} localEvent     the new event to be added to the timeline
 * @param {String} oldEventId          the ID of the original event
 * @param {boolean} newEventId         the ID of the replacement event
 *
 * @fires module:client~MatrixClient#event:"Room.timeline"
 */
EventTimelineSet.prototype.handleRemoteEcho = function (localEvent, oldEventId, newEventId) {
    // XXX: why don't we infer newEventId from localEvent?
    var existingTimeline = this._eventIdToTimeline[oldEventId];
    if (existingTimeline) {
        delete this._eventIdToTimeline[oldEventId];
        this._eventIdToTimeline[newEventId] = existingTimeline;
    } else {
        if (this._filter) {
            if (this._filter.filterRoomTimeline([localEvent]).length) {
                this.addEventToTimeline(localEvent, this._liveTimeline, false);
            }
        } else {
            this.addEventToTimeline(localEvent, this._liveTimeline, false);
        }
    }
};

/**
 * Removes a single event from this room.
 *
 * @param {String} eventId  The id of the event to remove
 *
 * @return {?MatrixEvent} the removed event, or null if the event was not found
 * in this room.
 */
EventTimelineSet.prototype.removeEvent = function (eventId) {
    var timeline = this._eventIdToTimeline[eventId];
    if (!timeline) {
        return null;
    }

    var removed = timeline.removeEvent(eventId);
    if (removed) {
        delete this._eventIdToTimeline[eventId];
        var data = {
            timeline: timeline
        };
        this.emit("Room.timeline", removed, this.room, undefined, true, data);
    }
    return removed;
};

/**
 * Determine where two events appear in the timeline relative to one another
 *
 * @param {string} eventId1   The id of the first event
 * @param {string} eventId2   The id of the second event

 * @return {?number} a number less than zero if eventId1 precedes eventId2, and
 *    greater than zero if eventId1 succeeds eventId2. zero if they are the
 *    same event; null if we can't tell (either because we don't know about one
 *    of the events, or because they are in separate timelines which don't join
 *    up).
 */
EventTimelineSet.prototype.compareEventOrdering = function (eventId1, eventId2) {
    if (eventId1 == eventId2) {
        // optimise this case
        return 0;
    }

    var timeline1 = this._eventIdToTimeline[eventId1];
    var timeline2 = this._eventIdToTimeline[eventId2];

    if (timeline1 === undefined) {
        return null;
    }
    if (timeline2 === undefined) {
        return null;
    }

    if (timeline1 === timeline2) {
        // both events are in the same timeline - figure out their
        // relative indices
        var idx1 = void 0,
            idx2 = void 0;
        var events = timeline1.getEvents();
        for (var idx = 0; idx < events.length && (idx1 === undefined || idx2 === undefined); idx++) {
            var evId = events[idx].getId();
            if (evId == eventId1) {
                idx1 = idx;
            }
            if (evId == eventId2) {
                idx2 = idx;
            }
        }
        return idx1 - idx2;
    }

    // the events are in different timelines. Iterate through the
    // linkedlist to see which comes first.

    // first work forwards from timeline1
    var tl = timeline1;
    while (tl) {
        if (tl === timeline2) {
            // timeline1 is before timeline2
            return -1;
        }
        tl = tl.getNeighbouringTimeline(EventTimeline.FORWARDS);
    }

    // now try backwards from timeline1
    tl = timeline1;
    while (tl) {
        if (tl === timeline2) {
            // timeline2 is before timeline1
            return 1;
        }
        tl = tl.getNeighbouringTimeline(EventTimeline.BACKWARDS);
    }

    // the timelines are not contiguous.
    return null;
};

/**
 * The EventTimelineSet class.
 */
module.exports = EventTimelineSet;

/**
 * Fires whenever the timeline in a room is updated.
 * @event module:client~MatrixClient#"Room.timeline"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {?Room} room The room, if any, whose timeline was updated.
 * @param {boolean} toStartOfTimeline True if this event was added to the start
 * @param {boolean} removed True if this event has just been removed from the timeline
 * (beginning; oldest) of the timeline e.g. due to pagination.
 *
 * @param {object} data  more data about the event
 *
 * @param {module:event-timeline.EventTimeline} data.timeline the timeline the
 * event was added to/removed from
 *
 * @param {boolean} data.liveEvent true if the event was a real-time event
 * added to the end of the live timeline
 *
 * @example
 * matrixClient.on("Room.timeline",
 *                 function(event, room, toStartOfTimeline, removed, data) {
 *   if (!toStartOfTimeline && data.liveEvent) {
 *     var messageToAppend = room.timeline.[room.timeline.length - 1];
 *   }
 * });
 */

/**
 * Fires whenever the live timeline in a room is reset.
 *
 * When we get a 'limited' sync (for example, after a network outage), we reset
 * the live timeline to be empty before adding the recent events to the new
 * timeline. This event is fired after the timeline is reset, and before the
 * new events are added.
 *
 * @event module:client~MatrixClient#"Room.timelineReset"
 * @param {Room} room The room whose live timeline was reset, if any
 * @param {EventTimelineSet} timelineSet timelineSet room whose live timeline was reset
 */

},{"../utils":36,"./event-timeline":20,"events":46}],20:[function(require,module,exports){
"use strict";

/**
 * @module models/event-timeline
 */

var RoomState = require("./room-state");
var utils = require("../utils");
var MatrixEvent = require("./event").MatrixEvent;

/**
 * Construct a new EventTimeline
 *
 * <p>An EventTimeline represents a contiguous sequence of events in a room.
 *
 * <p>As well as keeping track of the events themselves, it stores the state of
 * the room at the beginning and end of the timeline, and pagination tokens for
 * going backwards and forwards in the timeline.
 *
 * <p>In order that clients can meaningfully maintain an index into a timeline,
 * the EventTimeline object tracks a 'baseIndex'. This starts at zero, but is
 * incremented when events are prepended to the timeline. The index of an event
 * relative to baseIndex therefore remains constant.
 *
 * <p>Once a timeline joins up with its neighbour, they are linked together into a
 * doubly-linked list.
 *
 * @param {EventTimelineSet} eventTimelineSet the set of timelines this is part of
 * @constructor
 */
function EventTimeline(eventTimelineSet) {
    this._eventTimelineSet = eventTimelineSet;
    this._roomId = eventTimelineSet.room ? eventTimelineSet.room.roomId : null;
    this._events = [];
    this._baseIndex = 0;
    this._startState = new RoomState(this._roomId);
    this._startState.paginationToken = null;
    this._endState = new RoomState(this._roomId);
    this._endState.paginationToken = null;

    this._prevTimeline = null;
    this._nextTimeline = null;

    // this is used by client.js
    this._paginationRequests = { 'b': null, 'f': null };

    this._name = this._roomId + ":" + new Date().toISOString();
}

/**
 * Symbolic constant for methods which take a 'direction' argument:
 * refers to the start of the timeline, or backwards in time.
 */
EventTimeline.BACKWARDS = "b";

/**
 * Symbolic constant for methods which take a 'direction' argument:
 * refers to the end of the timeline, or forwards in time.
 */
EventTimeline.FORWARDS = "f";

/**
 * Initialise the start and end state with the given events
 *
 * <p>This can only be called before any events are added.
 *
 * @param {MatrixEvent[]} stateEvents list of state events to initialise the
 * state with.
 * @throws {Error} if an attempt is made to call this after addEvent is called.
 */
EventTimeline.prototype.initialiseState = function (stateEvents) {
    if (this._events.length > 0) {
        throw new Error("Cannot initialise state after events are added");
    }

    // we deep-copy the events here, in case they get changed later - we don't
    // want changes to the start state leaking through to the end state.
    var oldStateEvents = utils.map(utils.deepCopy(stateEvents.map(function (mxEvent) {
        return mxEvent.event;
    })), function (ev) {
        return new MatrixEvent(ev);
    });

    this._startState.setStateEvents(oldStateEvents);
    this._endState.setStateEvents(stateEvents);
};

/**
 * Get the ID of the room for this timeline
 * @return {string} room ID
 */
EventTimeline.prototype.getRoomId = function () {
    return this._roomId;
};

/**
 * Get the filter for this timeline's timelineSet (if any)
 * @return {Filter} filter
 */
EventTimeline.prototype.getFilter = function () {
    return this._eventTimelineSet.getFilter();
};

/**
 * Get the timelineSet for this timeline
 * @return {EventTimelineSet} timelineSet
 */
EventTimeline.prototype.getTimelineSet = function () {
    return this._eventTimelineSet;
};

/**
 * Get the base index.
 *
 * <p>This is an index which is incremented when events are prepended to the
 * timeline. An individual event therefore stays at the same index in the array
 * relative to the base index (although note that a given event's index may
 * well be less than the base index, thus giving that event a negative relative
 * index).
 *
 * @return {number}
 */
EventTimeline.prototype.getBaseIndex = function () {
    return this._baseIndex;
};

/**
 * Get the list of events in this context
 *
 * @return {MatrixEvent[]} An array of MatrixEvents
 */
EventTimeline.prototype.getEvents = function () {
    return this._events;
};

/**
 * Get the room state at the start/end of the timeline
 *
 * @param {string} direction   EventTimeline.BACKWARDS to get the state at the
 *   start of the timeline; EventTimeline.FORWARDS to get the state at the end
 *   of the timeline.
 *
 * @return {RoomState} state at the start/end of the timeline
 */
EventTimeline.prototype.getState = function (direction) {
    if (direction == EventTimeline.BACKWARDS) {
        return this._startState;
    } else if (direction == EventTimeline.FORWARDS) {
        return this._endState;
    } else {
        throw new Error("Invalid direction '" + direction + "'");
    }
};

/**
 * Get a pagination token
 *
 * @param {string} direction   EventTimeline.BACKWARDS to get the pagination
 *   token for going backwards in time; EventTimeline.FORWARDS to get the
 *   pagination token for going forwards in time.
 *
 * @return {?string} pagination token
 */
EventTimeline.prototype.getPaginationToken = function (direction) {
    return this.getState(direction).paginationToken;
};

/**
 * Set a pagination token
 *
 * @param {?string} token       pagination token
 *
 * @param {string} direction    EventTimeline.BACKWARDS to set the pagination
 *   token for going backwards in time; EventTimeline.FORWARDS to set the
 *   pagination token for going forwards in time.
 */
EventTimeline.prototype.setPaginationToken = function (token, direction) {
    this.getState(direction).paginationToken = token;
};

/**
 * Get the next timeline in the series
 *
 * @param {string} direction EventTimeline.BACKWARDS to get the previous
 *   timeline; EventTimeline.FORWARDS to get the next timeline.
 *
 * @return {?EventTimeline} previous or following timeline, if they have been
 * joined up.
 */
EventTimeline.prototype.getNeighbouringTimeline = function (direction) {
    if (direction == EventTimeline.BACKWARDS) {
        return this._prevTimeline;
    } else if (direction == EventTimeline.FORWARDS) {
        return this._nextTimeline;
    } else {
        throw new Error("Invalid direction '" + direction + "'");
    }
};

/**
 * Set the next timeline in the series
 *
 * @param {EventTimeline} neighbour previous/following timeline
 *
 * @param {string} direction EventTimeline.BACKWARDS to set the previous
 *   timeline; EventTimeline.FORWARDS to set the next timeline.
 *
 * @throws {Error} if an attempt is made to set the neighbouring timeline when
 * it is already set.
 */
EventTimeline.prototype.setNeighbouringTimeline = function (neighbour, direction) {
    if (this.getNeighbouringTimeline(direction)) {
        throw new Error("timeline already has a neighbouring timeline - " + "cannot reset neighbour");
    }

    if (direction == EventTimeline.BACKWARDS) {
        this._prevTimeline = neighbour;
    } else if (direction == EventTimeline.FORWARDS) {
        this._nextTimeline = neighbour;
    } else {
        throw new Error("Invalid direction '" + direction + "'");
    }

    // make sure we don't try to paginate this timeline
    this.setPaginationToken(null, direction);
};

/**
 * Add a new event to the timeline, and update the state
 *
 * @param {MatrixEvent} event   new event
 * @param {boolean}  atStart     true to insert new event at the start
 */
EventTimeline.prototype.addEvent = function (event, atStart) {
    var stateContext = atStart ? this._startState : this._endState;

    // only call setEventMetadata on the unfiltered timelineSets
    var timelineSet = this.getTimelineSet();
    if (timelineSet.room && timelineSet.room.getUnfilteredTimelineSet() === timelineSet) {
        EventTimeline.setEventMetadata(event, stateContext, atStart);

        // modify state
        if (event.isState()) {
            stateContext.setStateEvents([event]);
            // it is possible that the act of setting the state event means we
            // can set more metadata (specifically sender/target props), so try
            // it again if the prop wasn't previously set. It may also mean that
            // the sender/target is updated (if the event set was a room member event)
            // so we want to use the *updated* member (new avatar/name) instead.
            //
            // However, we do NOT want to do this on member events if we're going
            // back in time, else we'll set the .sender value for BEFORE the given
            // member event, whereas we want to set the .sender value for the ACTUAL
            // member event itself.
            if (!event.sender || event.getType() === "m.room.member" && !atStart) {
                EventTimeline.setEventMetadata(event, stateContext, atStart);
            }
        }
    }

    var insertIndex = void 0;

    if (atStart) {
        insertIndex = 0;
    } else {
        insertIndex = this._events.length;
    }

    this._events.splice(insertIndex, 0, event); // insert element
    if (atStart) {
        this._baseIndex++;
    }
};

/**
 * Static helper method to set sender and target properties
 *
 * @param {MatrixEvent} event   the event whose metadata is to be set
 * @param {RoomState} stateContext  the room state to be queried
 * @param {bool} toStartOfTimeline  if true the event's forwardLooking flag is set false
 */
EventTimeline.setEventMetadata = function (event, stateContext, toStartOfTimeline) {
    // set sender and target properties
    event.sender = stateContext.getSentinelMember(event.getSender());
    if (event.getType() === "m.room.member") {
        event.target = stateContext.getSentinelMember(event.getStateKey());
    }
    if (event.isState()) {
        // room state has no concept of 'old' or 'current', but we want the
        // room state to regress back to previous values if toStartOfTimeline
        // is set, which means inspecting prev_content if it exists. This
        // is done by toggling the forwardLooking flag.
        if (toStartOfTimeline) {
            event.forwardLooking = false;
        }
    }
};

/**
 * Remove an event from the timeline
 *
 * @param {string} eventId  ID of event to be removed
 * @return {?MatrixEvent} removed event, or null if not found
 */
EventTimeline.prototype.removeEvent = function (eventId) {
    for (var i = this._events.length - 1; i >= 0; i--) {
        var ev = this._events[i];
        if (ev.getId() == eventId) {
            this._events.splice(i, 1);
            if (i < this._baseIndex) {
                this._baseIndex--;
            }
            return ev;
        }
    }
    return null;
};

/**
 * Return a string to identify this timeline, for debugging
 *
 * @return {string} name for this timeline
 */
EventTimeline.prototype.toString = function () {
    return this._name;
};

/**
 * The EventTimeline class
 */
module.exports = EventTimeline;

},{"../utils":36,"./event":21,"./room-state":23}],21:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * This is an internal module. See {@link MatrixEvent} and {@link RoomEvent} for
 * the public classes.
 * @module models/event
 */

var EventEmitter = require("events").EventEmitter;

var utils = require('../utils.js');

/**
 * Enum for event statuses.
 * @readonly
 * @enum {string}
 */
module.exports.EventStatus = {
    /** The event was not sent and will no longer be retried. */
    NOT_SENT: "not_sent",

    /** The message is being encrypted */
    ENCRYPTING: "encrypting",

    /** The event is in the process of being sent. */
    SENDING: "sending",
    /** The event is in a queue waiting to be sent. */
    QUEUED: "queued",
    /** The event has been sent to the server, but we have not yet received the
     * echo. */
    SENT: "sent",

    /** The event was cancelled before it was successfully sent. */
    CANCELLED: "cancelled"
};

/**
 * Construct a Matrix Event object
 * @constructor
 *
 * @param {Object} event The raw event to be wrapped in this DAO
 *
 * @prop {Object} event The raw (possibly encrypted) event. <b>Do not access
 * this property</b> directly unless you absolutely have to. Prefer the getter
 * methods defined on this class. Using the getter methods shields your app
 * from changes to event JSON between Matrix versions.
 *
 * @prop {RoomMember} sender The room member who sent this event, or null e.g.
 * this is a presence event.
 * @prop {RoomMember} target The room member who is the target of this event, e.g.
 * the invitee, the person being banned, etc.
 * @prop {EventStatus} status The sending status of the event.
 * @prop {boolean} forwardLooking True if this event is 'forward looking', meaning
 * that getDirectionalContent() will return event.content and not event.prev_content.
 * Default: true. <strong>This property is experimental and may change.</strong>
 */
module.exports.MatrixEvent = function MatrixEvent(event) {
    this.event = event || {};
    this.sender = null;
    this.target = null;
    this.status = null;
    this.forwardLooking = true;
    this._pushActions = null;
    this._date = this.event.origin_server_ts ? new Date(this.event.origin_server_ts) : null;

    this._clearEvent = {};
    this._keysProved = {};
    this._keysClaimed = {};
};
utils.inherits(module.exports.MatrixEvent, EventEmitter);

utils.extend(module.exports.MatrixEvent.prototype, {

    /**
     * Get the event_id for this event.
     * @return {string} The event ID, e.g. <code>$143350589368169JsLZx:localhost
     * </code>
     */
    getId: function getId() {
        return this.event.event_id;
    },

    /**
     * Get the user_id for this event.
     * @return {string} The user ID, e.g. <code>@alice:matrix.org</code>
     */
    getSender: function getSender() {
        return this.event.sender || this.event.user_id; // v2 / v1
    },

    /**
     * Get the (decrypted, if necessary) type of event.
     *
     * @return {string} The event type, e.g. <code>m.room.message</code>
     */
    getType: function getType() {
        return this._clearEvent.type || this.event.type;
    },

    /**
     * Get the (possibly encrypted) type of the event that will be sent to the
     * homeserver.
     *
     * @return {string} The event type.
     */
    getWireType: function getWireType() {
        return this.event.type;
    },

    /**
     * Get the room_id for this event. This will return <code>undefined</code>
     * for <code>m.presence</code> events.
     * @return {string} The room ID, e.g. <code>!cURbafjkfsMDVwdRDQ:matrix.org
     * </code>
     */
    getRoomId: function getRoomId() {
        return this.event.room_id;
    },

    /**
     * Get the timestamp of this event.
     * @return {Number} The event timestamp, e.g. <code>1433502692297</code>
     */
    getTs: function getTs() {
        return this.event.origin_server_ts;
    },

    /**
     * Get the timestamp of this event, as a Date object.
     * @return {Date} The event date, e.g. <code>new Date(1433502692297)</code>
     */
    getDate: function getDate() {
        return this._date;
    },

    /**
     * Get the (decrypted, if necessary) event content JSON.
     *
     * @return {Object} The event content JSON, or an empty object.
     */
    getContent: function getContent() {
        return this._clearEvent.content || this.event.content || {};
    },

    /**
     * Get the (possibly encrypted) event content JSON that will be sent to the
     * homeserver.
     *
     * @return {Object} The event content JSON, or an empty object.
     */
    getWireContent: function getWireContent() {
        return this.event.content || {};
    },

    /**
     * Get the previous event content JSON. This will only return something for
     * state events which exist in the timeline.
     * @return {Object} The previous event content JSON, or an empty object.
     */
    getPrevContent: function getPrevContent() {
        // v2 then v1 then default
        return this.getUnsigned().prev_content || this.event.prev_content || {};
    },

    /**
     * Get either 'content' or 'prev_content' depending on if this event is
     * 'forward-looking' or not. This can be modified via event.forwardLooking.
     * In practice, this means we get the chronologically earlier content value
     * for this event (this method should surely be called getEarlierContent)
     * <strong>This method is experimental and may change.</strong>
     * @return {Object} event.content if this event is forward-looking, else
     * event.prev_content.
     */
    getDirectionalContent: function getDirectionalContent() {
        return this.forwardLooking ? this.getContent() : this.getPrevContent();
    },

    /**
     * Get the age of this event. This represents the age of the event when the
     * event arrived at the device, and not the age of the event when this
     * function was called.
     * @return {Number} The age of this event in milliseconds.
     */
    getAge: function getAge() {
        return this.getUnsigned().age || this.event.age; // v2 / v1
    },

    /**
     * Get the event state_key if it has one. This will return <code>undefined
     * </code> for message events.
     * @return {string} The event's <code>state_key</code>.
     */
    getStateKey: function getStateKey() {
        return this.event.state_key;
    },

    /**
     * Check if this event is a state event.
     * @return {boolean} True if this is a state event.
     */
    isState: function isState() {
        return this.event.state_key !== undefined;
    },

    /**
     * Replace the content of this event with encrypted versions.
     * (This is used when sending an event; it should not be used by applications).
     *
     * @internal
     *
     * @param {string} crypto_type type of the encrypted event - typically
     * <tt>"m.room.encrypted"</tt>
     *
     * @param {object} crypto_content raw 'content' for the encrypted event.
     * @param {object} keys The local keys claimed and proved by this event.
     */
    makeEncrypted: function makeEncrypted(crypto_type, crypto_content, keys) {
        // keep the plain-text data for 'view source'
        this._clearEvent = {
            type: this.event.type,
            content: this.event.content
        };
        this.event.type = crypto_type;
        this.event.content = crypto_content;
        this._keysProved = keys;
        this._keysClaimed = keys;
    },

    /**
     * Update the cleartext data on this event.
     *
     * (This is used after decrypting an event; it should not be used by applications).
     *
     * @internal
     *
     * @fires module:models/event.MatrixEvent#"Event.decrypted"
     *
     * @param {Object} clearEvent The plaintext payload for the event
     *     (typically containing <tt>type</tt> and <tt>content</tt> fields).
     *
     * @param {Object=} keysProved Keys owned by the sender of this event.
     *    See {@link module:models/event.MatrixEvent#getKeysProved}.
     *
     * @param {Object=} keysClaimed Keys the sender of this event claims.
     *    See {@link module:models/event.MatrixEvent#getKeysClaimed}.
     */
    setClearData: function setClearData(clearEvent, keysProved, keysClaimed) {
        this._clearEvent = clearEvent;
        this._keysProved = keysProved || {};
        this._keysClaimed = keysClaimed || {};
        this.emit("Event.decrypted", this);
    },

    /**
     * Check if the event is encrypted.
     * @return {boolean} True if this event is encrypted.
     */
    isEncrypted: function isEncrypted() {
        return this.event.type === "m.room.encrypted";
    },

    /**
     * The curve25519 key that sent this event
     * @return {string}
     */
    getSenderKey: function getSenderKey() {
        return this.getKeysProved().curve25519 || null;
    },

    /**
     * The keys that must have been owned by the sender of this encrypted event.
     * <p>
     * These don't necessarily have to come from this event itself, but may be
     * implied by the cryptographic session.
     *
     * @return {Object<string, string>}
     */
    getKeysProved: function getKeysProved() {
        return this._keysProved;
    },

    /**
     * The additional keys the sender of this encrypted event claims to possess.
     * <p>
     * These don't necessarily have to come from this event itself, but may be
     * implied by the cryptographic session.
     * For example megolm messages don't claim keys directly, but instead
     * inherit a claim from the olm message that established the session.
     *
     * @return {Object<string, string>}
     */
    getKeysClaimed: function getKeysClaimed() {
        return this._keysClaimed;
    },

    getUnsigned: function getUnsigned() {
        return this.event.unsigned || {};
    },

    /**
     * Update the content of an event in the same way it would be by the server
     * if it were redacted before it was sent to us
     *
     * @param {module:models/event.MatrixEvent} redaction_event
     *     event causing the redaction
     */
    makeRedacted: function makeRedacted(redaction_event) {
        // quick sanity-check
        if (!redaction_event.event) {
            throw new Error("invalid redaction_event in makeRedacted");
        }

        // we attempt to replicate what we would see from the server if
        // the event had been redacted before we saw it.
        //
        // The server removes (most of) the content of the event, and adds a
        // "redacted_because" key to the unsigned section containing the
        // redacted event.
        if (!this.event.unsigned) {
            this.event.unsigned = {};
        }
        this.event.unsigned.redacted_because = redaction_event.event;

        var key = void 0;
        for (key in this.event) {
            if (!this.event.hasOwnProperty(key)) {
                continue;
            }
            if (!_REDACT_KEEP_KEY_MAP[key]) {
                delete this.event[key];
            }
        }

        var keeps = _REDACT_KEEP_CONTENT_MAP[this.getType()] || {};
        var content = this.getContent();
        for (key in content) {
            if (!content.hasOwnProperty(key)) {
                continue;
            }
            if (!keeps[key]) {
                delete content[key];
            }
        }
    },

    /**
     * Check if this event has been redacted
     *
     * @return {boolean} True if this event has been redacted
     */
    isRedacted: function isRedacted() {
        return Boolean(this.getUnsigned().redacted_because);
    },

    /**
     * Get the push actions, if known, for this event
     *
     * @return {?Object} push actions
     */
    getPushActions: function getPushActions() {
        return this._pushActions;
    },

    /**
     * Set the push actions for this event.
     *
     * @param {Object} pushActions push actions
     */
    setPushActions: function setPushActions(pushActions) {
        this._pushActions = pushActions;
    },

    /**
     * Replace the `event` property and recalculate any properties based on it.
     * @param {Object} event the object to assign to the `event` property
     */
    handleRemoteEcho: function handleRemoteEcho(event) {
        this.event = event;
        // successfully sent.
        this.status = null;
        this._date = new Date(this.event.origin_server_ts);
    }
});

/* http://matrix.org/docs/spec/r0.0.1/client_server.html#redactions says:
 *
 * the server should strip off any keys not in the following list:
 *    event_id
 *    type
 *    room_id
 *    user_id
 *    state_key
 *    prev_state
 *    content
 *    [we keep 'unsigned' as well, since that is created by the local server]
 *
 * The content object should also be stripped of all keys, unless it is one of
 * one of the following event types:
 *    m.room.member allows key membership
 *    m.room.create allows key creator
 *    m.room.join_rules allows key join_rule
 *    m.room.power_levels allows keys ban, events, events_default, kick,
 *        redact, state_default, users, users_default.
 *    m.room.aliases allows key aliases
 */
// a map giving the keys we keep when an event is redacted
var _REDACT_KEEP_KEY_MAP = ['event_id', 'type', 'room_id', 'user_id', 'state_key', 'prev_state', 'content', 'unsigned'].reduce(function (ret, val) {
    ret[val] = 1;return ret;
}, {});

// a map from event type to the .content keys we keep when an event is redacted
var _REDACT_KEEP_CONTENT_MAP = {
    'm.room.member': { 'membership': 1 },
    'm.room.create': { 'creator': 1 },
    'm.room.join_rules': { 'join_rule': 1 },
    'm.room.power_levels': { 'ban': 1, 'events': 1, 'events_default': 1,
        'kick': 1, 'redact': 1, 'state_default': 1,
        'users': 1, 'users_default': 1
    },
    'm.room.aliases': { 'aliases': 1 }
};

/**
 * Fires when an event is decrypted
 *
 * @event module:models/event.MatrixEvent#"Event.decrypted"
 *
 * @param {module:models/event.MatrixEvent} event
 *    The matrix event which has been decrypted
 */

},{"../utils.js":36,"events":46}],22:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module models/room-member
 */

var EventEmitter = require("events").EventEmitter;
var ContentRepo = require("../content-repo");

var utils = require("../utils");

/**
 * Construct a new room member.
 *
 * @constructor
 * @alias module:models/room-member
 *
 * @param {string} roomId The room ID of the member.
 * @param {string} userId The user ID of the member.
 * @prop {string} roomId The room ID for this member.
 * @prop {string} userId The user ID of this member.
 * @prop {boolean} typing True if the room member is currently typing.
 * @prop {string} name The human-readable name for this room member.
 * @prop {Number} powerLevel The power level for this room member.
 * @prop {Number} powerLevelNorm The normalised power level (0-100) for this
 * room member.
 * @prop {User} user The User object for this room member, if one exists.
 * @prop {string} membership The membership state for this room member e.g. 'join'.
 * @prop {Object} events The events describing this RoomMember.
 * @prop {MatrixEvent} events.member The m.room.member event for this RoomMember.
 */
function RoomMember(roomId, userId) {
    this.roomId = roomId;
    this.userId = userId;
    this.typing = false;
    this.name = userId;
    this.powerLevel = 0;
    this.powerLevelNorm = 0;
    this.user = null;
    this.membership = null;
    this.events = {
        member: null
    };
    this._updateModifiedTime();
}
utils.inherits(RoomMember, EventEmitter);

/**
 * Update this room member's membership event. May fire "RoomMember.name" if
 * this event updates this member's name.
 * @param {MatrixEvent} event The <code>m.room.member</code> event
 * @param {RoomState} roomState Optional. The room state to take into account
 * when calculating (e.g. for disambiguating users with the same name).
 * @fires module:client~MatrixClient#event:"RoomMember.name"
 * @fires module:client~MatrixClient#event:"RoomMember.membership"
 */
RoomMember.prototype.setMembershipEvent = function (event, roomState) {
    if (event.getType() !== "m.room.member") {
        return;
    }
    this.events.member = event;

    var oldMembership = this.membership;
    this.membership = event.getDirectionalContent().membership;

    var oldName = this.name;
    this.name = calculateDisplayName(this, event, roomState);
    if (oldMembership !== this.membership) {
        this._updateModifiedTime();
        this.emit("RoomMember.membership", event, this, oldMembership);
    }
    if (oldName !== this.name) {
        this._updateModifiedTime();
        this.emit("RoomMember.name", event, this, oldName);
    }
};

/**
 * Update this room member's power level event. May fire
 * "RoomMember.powerLevel" if this event updates this member's power levels.
 * @param {MatrixEvent} powerLevelEvent The <code>m.room.power_levels</code>
 * event
 * @fires module:client~MatrixClient#event:"RoomMember.powerLevel"
 */
RoomMember.prototype.setPowerLevelEvent = function (powerLevelEvent) {
    if (powerLevelEvent.getType() !== "m.room.power_levels") {
        return;
    }
    var maxLevel = powerLevelEvent.getContent().users_default || 0;
    utils.forEach(utils.values(powerLevelEvent.getContent().users), function (lvl) {
        maxLevel = Math.max(maxLevel, lvl);
    });
    var oldPowerLevel = this.powerLevel;
    var oldPowerLevelNorm = this.powerLevelNorm;

    if (powerLevelEvent.getContent().users[this.userId] !== undefined) {
        this.powerLevel = powerLevelEvent.getContent().users[this.userId];
    } else if (powerLevelEvent.getContent().users_default !== undefined) {
        this.powerLevel = powerLevelEvent.getContent().users_default;
    } else {
        this.powerLevel = 0;
    }
    this.powerLevelNorm = 0;
    if (maxLevel > 0) {
        this.powerLevelNorm = this.powerLevel * 100 / maxLevel;
    }

    // emit for changes in powerLevelNorm as well (since the app will need to
    // redraw everyone's level if the max has changed)
    if (oldPowerLevel !== this.powerLevel || oldPowerLevelNorm !== this.powerLevelNorm) {
        this._updateModifiedTime();
        this.emit("RoomMember.powerLevel", powerLevelEvent, this);
    }
};

/**
 * Update this room member's typing event. May fire "RoomMember.typing" if
 * this event changes this member's typing state.
 * @param {MatrixEvent} event The typing event
 * @fires module:client~MatrixClient#event:"RoomMember.typing"
 */
RoomMember.prototype.setTypingEvent = function (event) {
    if (event.getType() !== "m.typing") {
        return;
    }
    var oldTyping = this.typing;
    this.typing = false;
    var typingList = event.getContent().user_ids;
    if (!utils.isArray(typingList)) {
        // malformed event :/ bail early. TODO: whine?
        return;
    }
    if (typingList.indexOf(this.userId) !== -1) {
        this.typing = true;
    }
    if (oldTyping !== this.typing) {
        this._updateModifiedTime();
        this.emit("RoomMember.typing", event, this);
    }
};

/**
 * Update the last modified time to the current time.
 */
RoomMember.prototype._updateModifiedTime = function () {
    this._modified = Date.now();
};

/**
 * Get the timestamp when this RoomMember was last updated. This timestamp is
 * updated when properties on this RoomMember are updated.
 * It is updated <i>before</i> firing events.
 * @return {number} The timestamp
 */
RoomMember.prototype.getLastModifiedTime = function () {
    return this._modified;
};

/**
 * Get the avatar URL for a room member.
 * @param {string} baseUrl The base homeserver URL See
 * {@link module:client~MatrixClient#getHomeserverUrl}.
 * @param {Number} width The desired width of the thumbnail.
 * @param {Number} height The desired height of the thumbnail.
 * @param {string} resizeMethod The thumbnail resize method to use, either
 * "crop" or "scale".
 * @param {Boolean} allowDefault (optional) Passing false causes this method to
 * return null if the user has no avatar image. Otherwise, a default image URL
 * will be returned. Default: true.
 * @param {Boolean} allowDirectLinks (optional) If true, the avatar URL will be
 * returned even if it is a direct hyperlink rather than a matrix content URL.
 * If false, any non-matrix content URLs will be ignored. Setting this option to
 * true will expose URLs that, if fetched, will leak information about the user
 * to anyone who they share a room with.
 * @return {?string} the avatar URL or null.
 */
RoomMember.prototype.getAvatarUrl = function (baseUrl, width, height, resizeMethod, allowDefault, allowDirectLinks) {
    if (allowDefault === undefined) {
        allowDefault = true;
    }
    if (!this.events.member && !allowDefault) {
        return null;
    }
    var rawUrl = this.events.member ? this.events.member.getContent().avatar_url : null;
    var httpUrl = ContentRepo.getHttpUriForMxc(baseUrl, rawUrl, width, height, resizeMethod, allowDirectLinks);
    if (httpUrl) {
        return httpUrl;
    } else if (allowDefault) {
        return ContentRepo.getIdenticonUri(baseUrl, this.userId, width, height);
    }
    return null;
};

function calculateDisplayName(member, event, roomState) {
    var displayName = event.getDirectionalContent().displayname;
    var selfUserId = member.userId;

    if (!displayName) {
        return selfUserId;
    }

    if (!roomState) {
        return displayName;
    }

    var userIds = roomState.getUserIdsWithDisplayName(displayName);
    var otherUsers = userIds.filter(function (u) {
        return u !== selfUserId;
    });
    if (otherUsers.length > 0) {
        return displayName + " (" + selfUserId + ")";
    }
    return displayName;
}

/**
 * The RoomMember class.
 */
module.exports = RoomMember;

/**
 * Fires whenever any room member's name changes.
 * @event module:client~MatrixClient#"RoomMember.name"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {RoomMember} member The member whose RoomMember.name changed.
 * @param {string?} oldName The previous name. Null if the member didn't have a
 *    name previously.
 * @example
 * matrixClient.on("RoomMember.name", function(event, member){
 *   var newName = member.name;
 * });
 */

/**
 * Fires whenever any room member's membership state changes.
 * @event module:client~MatrixClient#"RoomMember.membership"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {RoomMember} member The member whose RoomMember.membership changed.
 * @param {string?} oldMembership The previous membership state. Null if it's a
 *    new member.
 * @example
 * matrixClient.on("RoomMember.membership", function(event, member, oldMembership){
 *   var newState = member.membership;
 * });
 */

/**
 * Fires whenever any room member's typing state changes.
 * @event module:client~MatrixClient#"RoomMember.typing"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {RoomMember} member The member whose RoomMember.typing changed.
 * @example
 * matrixClient.on("RoomMember.typing", function(event, member){
 *   var isTyping = member.typing;
 * });
 */

/**
 * Fires whenever any room member's power level changes.
 * @event module:client~MatrixClient#"RoomMember.powerLevel"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {RoomMember} member The member whose RoomMember.powerLevel changed.
 * @example
 * matrixClient.on("RoomMember.powerLevel", function(event, member){
 *   var newPowerLevel = member.powerLevel;
 *   var newNormPowerLevel = member.powerLevelNorm;
 * });
 */

},{"../content-repo":4,"../utils":36,"events":46}],23:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module models/room-state
 */

var EventEmitter = require("events").EventEmitter;

var utils = require("../utils");
var RoomMember = require("./room-member");

/**
 * Construct room state.
 * @constructor
 * @param {?string} roomId Optional. The ID of the room which has this state.
 * If none is specified it just tracks paginationTokens, useful for notifTimelineSet
 * @prop {Object.<string, RoomMember>} members The room member dictionary, keyed
 * on the user's ID.
 * @prop {Object.<string, Object.<string, MatrixEvent>>} events The state
 * events dictionary, keyed on the event type and then the state_key value.
 * @prop {string} paginationToken The pagination token for this state.
 */
function RoomState(roomId) {
    this.roomId = roomId;
    this.members = {
        // userId: RoomMember
    };
    this.events = {
        // eventType: { stateKey: MatrixEvent }
    };
    this.paginationToken = null;

    this._sentinels = {
        // userId: RoomMember
    };
    this._updateModifiedTime();
    this._displayNameToUserIds = {};
    this._userIdsToDisplayNames = {};
    this._tokenToInvite = {}; // 3pid invite state_key to m.room.member invite
}
utils.inherits(RoomState, EventEmitter);

/**
 * Get all RoomMembers in this room.
 * @return {Array<RoomMember>} A list of RoomMembers.
 */
RoomState.prototype.getMembers = function () {
    return utils.values(this.members);
};

/**
 * Get a room member by their user ID.
 * @param {string} userId The room member's user ID.
 * @return {RoomMember} The member or null if they do not exist.
 */
RoomState.prototype.getMember = function (userId) {
    return this.members[userId] || null;
};

/**
 * Get a room member whose properties will not change with this room state. You
 * typically want this if you want to attach a RoomMember to a MatrixEvent which
 * may no longer be represented correctly by Room.currentState or Room.oldState.
 * The term 'sentinel' refers to the fact that this RoomMember is an unchanging
 * guardian for state at this particular point in time.
 * @param {string} userId The room member's user ID.
 * @return {RoomMember} The member or null if they do not exist.
 */
RoomState.prototype.getSentinelMember = function (userId) {
    return this._sentinels[userId] || null;
};

/**
 * Get state events from the state of the room.
 * @param {string} eventType The event type of the state event.
 * @param {string} stateKey Optional. The state_key of the state event. If
 * this is <code>undefined</code> then all matching state events will be
 * returned.
 * @return {MatrixEvent[]|MatrixEvent} A list of events if state_key was
 * <code>undefined</code>, else a single event (or null if no match found).
 */
RoomState.prototype.getStateEvents = function (eventType, stateKey) {
    if (!this.events[eventType]) {
        // no match
        return stateKey === undefined ? [] : null;
    }
    if (stateKey === undefined) {
        // return all values
        return utils.values(this.events[eventType]);
    }
    var event = this.events[eventType][stateKey];
    return event ? event : null;
};

/**
 * Add an array of one or more state MatrixEvents, overwriting
 * any existing state with the same {type, stateKey} tuple. Will fire
 * "RoomState.events" for every event added. May fire "RoomState.members"
 * if there are <code>m.room.member</code> events.
 * @param {MatrixEvent[]} stateEvents a list of state events for this room.
 * @fires module:client~MatrixClient#event:"RoomState.members"
 * @fires module:client~MatrixClient#event:"RoomState.newMember"
 * @fires module:client~MatrixClient#event:"RoomState.events"
 */
RoomState.prototype.setStateEvents = function (stateEvents) {
    var self = this;
    this._updateModifiedTime();

    // update the core event dict
    utils.forEach(stateEvents, function (event) {
        if (event.getRoomId() !== self.roomId) {
            return;
        }
        if (!event.isState()) {
            return;
        }

        if (self.events[event.getType()] === undefined) {
            self.events[event.getType()] = {};
        }
        self.events[event.getType()][event.getStateKey()] = event;
        if (event.getType() === "m.room.member") {
            _updateDisplayNameCache(self, event.getStateKey(), event.getContent().displayname);
            _updateThirdPartyTokenCache(self, event);
        }
        self.emit("RoomState.events", event, self);
    });

    // update higher level data structures. This needs to be done AFTER the
    // core event dict as these structures may depend on other state events in
    // the given array (e.g. disambiguating display names in one go to do both
    // clashing names rather than progressively which only catches 1 of them).
    utils.forEach(stateEvents, function (event) {
        if (event.getRoomId() !== self.roomId) {
            return;
        }
        if (!event.isState()) {
            return;
        }

        if (event.getType() === "m.room.member") {
            var userId = event.getStateKey();

            // leave events apparently elide the displayname or avatar_url,
            // so let's fake one up so that we don't leak user ids
            // into the timeline
            if (event.getContent().membership === "leave" || event.getContent().membership === "ban") {
                event.getContent().avatar_url = event.getContent().avatar_url || event.getPrevContent().avatar_url;
                event.getContent().displayname = event.getContent().displayname || event.getPrevContent().displayname;
            }

            var member = self.members[userId];
            if (!member) {
                member = new RoomMember(event.getRoomId(), userId);
                self.emit("RoomState.newMember", event, self, member);
            }
            // Add a new sentinel for this change. We apply the same
            // operations to both sentinel and member rather than deep copying
            // so we don't make assumptions about the properties of RoomMember
            // (e.g. and manage to break it because deep copying doesn't do
            // everything).
            var sentinel = new RoomMember(event.getRoomId(), userId);
            utils.forEach([member, sentinel], function (roomMember) {
                roomMember.setMembershipEvent(event, self);
                // this member may have a power level already, so set it.
                var pwrLvlEvent = self.getStateEvents("m.room.power_levels", "");
                if (pwrLvlEvent) {
                    roomMember.setPowerLevelEvent(pwrLvlEvent);
                }
            });

            self._sentinels[userId] = sentinel;
            self.members[userId] = member;
            self.emit("RoomState.members", event, self, member);
        } else if (event.getType() === "m.room.power_levels") {
            var members = utils.values(self.members);
            utils.forEach(members, function (member) {
                member.setPowerLevelEvent(event);
                self.emit("RoomState.members", event, self, member);
            });
        }
    });
};

/**
 * Set the current typing event for this room.
 * @param {MatrixEvent} event The typing event
 */
RoomState.prototype.setTypingEvent = function (event) {
    utils.forEach(utils.values(this.members), function (member) {
        member.setTypingEvent(event);
    });
};

/**
 * Get the m.room.member event which has the given third party invite token.
 *
 * @param {string} token The token
 * @return {?MatrixEvent} The m.room.member event or null
 */
RoomState.prototype.getInviteForThreePidToken = function (token) {
    return this._tokenToInvite[token] || null;
};

/**
 * Update the last modified time to the current time.
 */
RoomState.prototype._updateModifiedTime = function () {
    this._modified = Date.now();
};

/**
 * Get the timestamp when this room state was last updated. This timestamp is
 * updated when this object has received new state events.
 * @return {number} The timestamp
 */
RoomState.prototype.getLastModifiedTime = function () {
    return this._modified;
};

/**
 * Get user IDs with the specified display name.
 * @param {string} displayName The display name to get user IDs from.
 * @return {string[]} An array of user IDs or an empty array.
 */
RoomState.prototype.getUserIdsWithDisplayName = function (displayName) {
    return this._displayNameToUserIds[displayName] || [];
};

/**
 * Short-form for maySendEvent('m.room.message', userId)
 * @param {string} userId The user ID of the user to test permission for
 * @return {boolean} true if the given user ID should be permitted to send
 *                   message events into the given room.
 */
RoomState.prototype.maySendMessage = function (userId) {
    return this._maySendEventOfType('m.room.message', userId, false);
};

/**
 * Returns true if the given user ID has permission to send a normal
 * event of type `eventType` into this room.
 * @param {string} eventType The type of event to test
 * @param {string} userId The user ID of the user to test permission for
 * @return {boolean} true if the given user ID should be permitted to send
 *                        the given type of event into this room,
 *                        according to the room's state.
 */
RoomState.prototype.maySendEvent = function (eventType, userId) {
    return this._maySendEventOfType(eventType, userId, false);
};

/**
 * Returns true if the given MatrixClient has permission to send a state
 * event of type `stateEventType` into this room.
 * @param {string} stateEventType The type of state events to test
 * @param {MatrixClient} cli The client to test permission for
 * @return {boolean} true if the given client should be permitted to send
 *                        the given type of state event into this room,
 *                        according to the room's state.
 */
RoomState.prototype.mayClientSendStateEvent = function (stateEventType, cli) {
    if (cli.isGuest()) {
        return false;
    }
    return this.maySendStateEvent(stateEventType, cli.credentials.userId);
};

/**
 * Returns true if the given user ID has permission to send a state
 * event of type `stateEventType` into this room.
 * @param {string} stateEventType The type of state events to test
 * @param {string} userId The user ID of the user to test permission for
 * @return {boolean} true if the given user ID should be permitted to send
 *                        the given type of state event into this room,
 *                        according to the room's state.
 */
RoomState.prototype.maySendStateEvent = function (stateEventType, userId) {
    return this._maySendEventOfType(stateEventType, userId, true);
};

/**
 * Returns true if the given user ID has permission to send a normal or state
 * event of type `eventType` into this room.
 * @param {string} eventType The type of event to test
 * @param {string} userId The user ID of the user to test permission for
 * @param {boolean} state If true, tests if the user may send a state
                          event of this type. Otherwise tests whether
                          they may send a regular event.
 * @return {boolean} true if the given user ID should be permitted to send
 *                        the given type of event into this room,
 *                        according to the room's state.
 */
RoomState.prototype._maySendEventOfType = function (eventType, userId, state) {
    var member = this.getMember(userId);
    if (!member || member.membership == 'leave') {
        return false;
    }

    var power_levels_event = this.getStateEvents('m.room.power_levels', '');

    var power_levels = void 0;
    var events_levels = {};

    var state_default = 0;
    var events_default = 0;
    if (power_levels_event) {
        power_levels = power_levels_event.getContent();
        events_levels = power_levels.events || {};

        if (power_levels.state_default !== undefined) {
            state_default = power_levels.state_default;
        } else {
            state_default = 50;
        }
        if (power_levels.events_default !== undefined) {
            events_default = power_levels.events_default;
        }
    }

    var required_level = state ? state_default : events_default;
    if (events_levels[eventType] !== undefined) {
        required_level = events_levels[eventType];
    }
    return member.powerLevel >= required_level;
};

/**
 * The RoomState class.
 */
module.exports = RoomState;

function _updateThirdPartyTokenCache(roomState, memberEvent) {
    if (!memberEvent.getContent().third_party_invite) {
        return;
    }
    var token = (memberEvent.getContent().third_party_invite.signed || {}).token;
    if (!token) {
        return;
    }
    var threePidInvite = roomState.getStateEvents("m.room.third_party_invite", token);
    if (!threePidInvite) {
        return;
    }
    roomState._tokenToInvite[token] = memberEvent;
}

function _updateDisplayNameCache(roomState, userId, displayName) {
    var oldName = roomState._userIdsToDisplayNames[userId];
    delete roomState._userIdsToDisplayNames[userId];
    if (oldName) {
        // Remove the old name from the cache.
        // We clobber the user_id > name lookup but the name -> [user_id] lookup
        // means we need to remove that user ID from that array rather than nuking
        // the lot.
        var existingUserIds = roomState._displayNameToUserIds[oldName] || [];
        for (var i = 0; i < existingUserIds.length; i++) {
            if (existingUserIds[i] === userId) {
                // remove this user ID from this array
                existingUserIds.splice(i, 1);
                i--;
            }
        }
        roomState._displayNameToUserIds[oldName] = existingUserIds;
    }

    roomState._userIdsToDisplayNames[userId] = displayName;
    if (!roomState._displayNameToUserIds[displayName]) {
        roomState._displayNameToUserIds[displayName] = [];
    }
    roomState._displayNameToUserIds[displayName].push(userId);
}

/**
 * Fires whenever the event dictionary in room state is updated.
 * @event module:client~MatrixClient#"RoomState.events"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {RoomState} state The room state whose RoomState.events dictionary
 * was updated.
 * @example
 * matrixClient.on("RoomState.events", function(event, state){
 *   var newStateEvent = event;
 * });
 */

/**
 * Fires whenever a member in the members dictionary is updated in any way.
 * @event module:client~MatrixClient#"RoomState.members"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {RoomState} state The room state whose RoomState.members dictionary
 * was updated.
 * @param {RoomMember} member The room member that was updated.
 * @example
 * matrixClient.on("RoomState.members", function(event, state, member){
 *   var newMembershipState = member.membership;
 * });
 */

/**
* Fires whenever a member is added to the members dictionary. The RoomMember
* will not be fully populated yet (e.g. no membership state).
* @event module:client~MatrixClient#"RoomState.newMember"
* @param {MatrixEvent} event The matrix event which caused this event to fire.
* @param {RoomState} state The room state whose RoomState.members dictionary
* was updated with a new entry.
* @param {RoomMember} member The room member that was added.
* @example
* matrixClient.on("RoomState.newMember", function(event, state, member){
*   // add event listeners on 'member'
* });
*/

},{"../utils":36,"./room-member":22,"events":46}],24:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module models/room-summary
 */

/**
 * Construct a new Room Summary. A summary can be used for display on a recent
 * list, without having to load the entire room list into memory.
 * @constructor
 * @param {string} roomId Required. The ID of this room.
 * @param {Object} info Optional. The summary info. Additional keys are supported.
 * @param {string} info.title The title of the room (e.g. <code>m.room.name</code>)
 * @param {string} info.desc The description of the room (e.g.
 * <code>m.room.topic</code>)
 * @param {Number} info.numMembers The number of joined users.
 * @param {string[]} info.aliases The list of aliases for this room.
 * @param {Number} info.timestamp The timestamp for this room.
 */

function RoomSummary(roomId, info) {
  this.roomId = roomId;
  this.info = info;
}

/**
 * The RoomSummary class.
 */
module.exports = RoomSummary;

},{}],25:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module models/room
 */

var EventEmitter = require("events").EventEmitter;

var EventStatus = require("./event").EventStatus;
var RoomSummary = require("./room-summary");
var MatrixEvent = require("./event").MatrixEvent;
var utils = require("../utils");
var ContentRepo = require("../content-repo");
var EventTimeline = require("./event-timeline");
var EventTimelineSet = require("./event-timeline-set");

function synthesizeReceipt(userId, event, receiptType) {
    // console.log("synthesizing receipt for "+event.getId());
    // This is really ugly because JS has no way to express an object literal
    // where the name of a key comes from an expression
    var fakeReceipt = {
        content: {},
        type: "m.receipt",
        room_id: event.getRoomId()
    };
    fakeReceipt.content[event.getId()] = {};
    fakeReceipt.content[event.getId()][receiptType] = {};
    fakeReceipt.content[event.getId()][receiptType][userId] = {
        ts: event.getTs()
    };
    return new MatrixEvent(fakeReceipt);
}

/**
 * Construct a new Room.
 *
 * <p>For a room, we store an ordered sequence of timelines, which may or may not
 * be continuous. Each timeline lists a series of events, as well as tracking
 * the room state at the start and the end of the timeline. It also tracks
 * forward and backward pagination tokens, as well as containing links to the
 * next timeline in the sequence.
 *
 * <p>There is one special timeline - the 'live' timeline, which represents the
 * timeline to which events are being added in real-time as they are received
 * from the /sync API. Note that you should not retain references to this
 * timeline - even if it is the current timeline right now, it may not remain
 * so if the server gives us a timeline gap in /sync.
 *
 * <p>In order that we can find events from their ids later, we also maintain a
 * map from event_id to timeline and index.
 *
 * @constructor
 * @alias module:models/room
 * @param {string} roomId Required. The ID of this room.
 * @param {Object=} opts Configuration options
 * @param {*} opts.storageToken Optional. The token which a data store can use
 * to remember the state of the room. What this means is dependent on the store
 * implementation.
 *
 * @param {String=} opts.pendingEventOrdering Controls where pending messages
 * appear in a room's timeline. If "<b>chronological</b>", messages will appear
 * in the timeline when the call to <code>sendEvent</code> was made. If
 * "<b>detached</b>", pending messages will appear in a separate list,
 * accessbile via {@link module:models/room#getPendingEvents}. Default:
 * "chronological".
 *
 * @param {boolean} [opts.timelineSupport = false] Set to true to enable improved
 * timeline support.
 *
 * @prop {string} roomId The ID of this room.
 * @prop {string} name The human-readable display name for this room.
 * @prop {Array<MatrixEvent>} timeline The live event timeline for this room,
 * with the oldest event at index 0. Present for backwards compatibility -
 * prefer getLiveTimeline().getEvents().
 * @prop {object} tags Dict of room tags; the keys are the tag name and the values
 * are any metadata associated with the tag - e.g. { "fav" : { order: 1 } }
 * @prop {object} accountData Dict of per-room account_data events; the keys are the
 * event type and the values are the events.
 * @prop {RoomState} oldState The state of the room at the time of the oldest
 * event in the live timeline. Present for backwards compatibility -
 * prefer getLiveTimeline().getState(true).
 * @prop {RoomState} currentState The state of the room at the time of the
 * newest event in the timeline. Present for backwards compatibility -
 * prefer getLiveTimeline().getState(false).
 * @prop {RoomSummary} summary The room summary.
 * @prop {*} storageToken A token which a data store can use to remember
 * the state of the room.
 */
function Room(roomId, opts) {
    opts = opts || {};
    opts.pendingEventOrdering = opts.pendingEventOrdering || "chronological";

    if (["chronological", "detached"].indexOf(opts.pendingEventOrdering) === -1) {
        throw new Error("opts.pendingEventOrdering MUST be either 'chronological' or " + "'detached'. Got: '" + opts.pendingEventOrdering + "'");
    }

    this.roomId = roomId;
    this.name = roomId;
    this.tags = {
        // $tagName: { $metadata: $value },
        // $tagName: { $metadata: $value },
    };
    this.accountData = {
        // $eventType: $event
    };
    this.summary = null;
    this.storageToken = opts.storageToken;
    this._opts = opts;
    this._txnToEvent = {}; // Pending in-flight requests { string: MatrixEvent }
    // receipts should clobber based on receipt_type and user_id pairs hence
    // the form of this structure. This is sub-optimal for the exposed APIs
    // which pass in an event ID and get back some receipts, so we also store
    // a pre-cached list for this purpose.
    this._receipts = {
        // receipt_type: {
        //   user_id: {
        //     eventId: <event_id>,
        //     data: <receipt_data>
        //   }
        // }
    };
    this._receiptCacheByEventId = {
        // $event_id: [{
        //   type: $type,
        //   userId: $user_id,
        //   data: <receipt data>
        // }]
    };
    // only receipts that came from the server, not synthesized ones
    this._realReceipts = {};

    this._notificationCounts = {};

    // all our per-room timeline sets. the first one is the unfiltered ones;
    // the subsequent ones are the filtered ones in no particular order.
    this._timelineSets = [new EventTimelineSet(this, opts)];
    reEmit(this, this.getUnfilteredTimelineSet(), ["Room.timeline", "Room.timelineReset"]);

    this._fixUpLegacyTimelineFields();

    // any filtered timeline sets we're maintaining for this room
    this._filteredTimelineSets = {
        // filter_id: timelineSet
    };

    if (this._opts.pendingEventOrdering == "detached") {
        this._pendingEventList = [];
    }
}
utils.inherits(Room, EventEmitter);

/**
 * Get the list of pending sent events for this room
 *
 * @return {module:models/event.MatrixEvent[]} A list of the sent events
 * waiting for remote echo.
 *
 * @throws If <code>opts.pendingEventOrdering</code> was not 'detached'
 */
Room.prototype.getPendingEvents = function () {
    if (this._opts.pendingEventOrdering !== "detached") {
        throw new Error("Cannot call getPendingEventList with pendingEventOrdering == " + this._opts.pendingEventOrdering);
    }

    return this._pendingEventList;
};

/**
 * Get the live unfiltered timeline for this room.
 *
 * @return {module:models/event-timeline~EventTimeline} live timeline
 */
Room.prototype.getLiveTimeline = function () {
    return this.getUnfilteredTimelineSet().getLiveTimeline();
};

/**
 * Reset the live timeline of all timelineSets, and start new ones.
 *
 * <p>This is used when /sync returns a 'limited' timeline.
 *
 * @param {string=} backPaginationToken   token for back-paginating the new timeline
 */
Room.prototype.resetLiveTimeline = function (backPaginationToken) {
    for (var i = 0; i < this._timelineSets.length; i++) {
        this._timelineSets[i].resetLiveTimeline(backPaginationToken);
    }

    this._fixUpLegacyTimelineFields();
};

/**
 * Fix up this.timeline, this.oldState and this.currentState
 *
 * @private
 */
Room.prototype._fixUpLegacyTimelineFields = function () {
    // maintain this.timeline as a reference to the live timeline,
    // and this.oldState and this.currentState as references to the
    // state at the start and end of that timeline. These are more
    // for backwards-compatibility than anything else.
    this.timeline = this.getLiveTimeline().getEvents();
    this.oldState = this.getLiveTimeline().getState(EventTimeline.BACKWARDS);
    this.currentState = this.getLiveTimeline().getState(EventTimeline.FORWARDS);
};

/**
 * Return the timeline sets for this room.
 * @return {EventTimelineSet[]} array of timeline sets for this room
 */
Room.prototype.getTimelineSets = function () {
    return this._timelineSets;
};

/**
 * Helper to return the main unfiltered timeline set for this room
 * @return {EventTimelineSet} room's unfiltered timeline set
 */
Room.prototype.getUnfilteredTimelineSet = function () {
    return this._timelineSets[0];
};

/**
 * Get the timeline which contains the given event from the unfiltered set, if any
 *
 * @param {string} eventId  event ID to look for
 * @return {?module:models/event-timeline~EventTimeline} timeline containing
 * the given event, or null if unknown
 */
Room.prototype.getTimelineForEvent = function (eventId) {
    return this.getUnfilteredTimelineSet().getTimelineForEvent(eventId);
};

/**
 * Add a new timeline to this room's unfiltered timeline set
 *
 * @return {module:models/event-timeline~EventTimeline} newly-created timeline
 */
Room.prototype.addTimeline = function () {
    return this.getUnfilteredTimelineSet().addTimeline();
};

/**
 * Get an event which is stored in our unfiltered timeline set
 *
 * @param {string} eventId  event ID to look for
 * @return {?module:models/event.MatrixEvent} the given event, or undefined if unknown
 */
Room.prototype.findEventById = function (eventId) {
    return this.getUnfilteredTimelineSet().findEventById(eventId);
};

/**
 * Get one of the notification counts for this room
 * @param {String} type The type of notification count to get. default: 'total'
 * @return {Number} The notification count, or undefined if there is no count
 *                  for this type.
 */
Room.prototype.getUnreadNotificationCount = function (type) {
    type = type || 'total';
    return this._notificationCounts[type];
};

/**
 * Set one of the notification counts for this room
 * @param {String} type The type of notification count to set.
 * @param {Number} count The new count
 */
Room.prototype.setUnreadNotificationCount = function (type, count) {
    this._notificationCounts[type] = count;
};

/**
 * Get the avatar URL for a room if one was set.
 * @param {String} baseUrl The homeserver base URL. See
 * {@link module:client~MatrixClient#getHomeserverUrl}.
 * @param {Number} width The desired width of the thumbnail.
 * @param {Number} height The desired height of the thumbnail.
 * @param {string} resizeMethod The thumbnail resize method to use, either
 * "crop" or "scale".
 * @param {boolean} allowDefault True to allow an identicon for this room if an
 * avatar URL wasn't explicitly set. Default: true.
 * @return {?string} the avatar URL or null.
 */
Room.prototype.getAvatarUrl = function (baseUrl, width, height, resizeMethod, allowDefault) {
    var roomAvatarEvent = this.currentState.getStateEvents("m.room.avatar", "");
    if (allowDefault === undefined) {
        allowDefault = true;
    }
    if (!roomAvatarEvent && !allowDefault) {
        return null;
    }

    var mainUrl = roomAvatarEvent ? roomAvatarEvent.getContent().url : null;
    if (mainUrl) {
        return ContentRepo.getHttpUriForMxc(baseUrl, mainUrl, width, height, resizeMethod);
    } else if (allowDefault) {
        return ContentRepo.getIdenticonUri(baseUrl, this.roomId, width, height);
    }

    return null;
};

/**
 * Get the aliases this room has according to the room's state
 * The aliases returned by this function may not necessarily
 * still point to this room.
 * @return {array} The room's alias as an array of strings
 */
Room.prototype.getAliases = function () {
    var alias_strings = [];

    var alias_events = this.currentState.getStateEvents("m.room.aliases");
    if (alias_events) {
        for (var i = 0; i < alias_events.length; ++i) {
            var alias_event = alias_events[i];
            if (utils.isArray(alias_event.getContent().aliases)) {
                Array.prototype.push.apply(alias_strings, alias_event.getContent().aliases);
            }
        }
    }
    return alias_strings;
};

/**
 * Get this room's canonical alias
 * The alias returned by this function may not necessarily
 * still point to this room.
 * @return {?string} The room's canonical alias, or null if there is none
 */
Room.prototype.getCanonicalAlias = function () {
    var canonicalAlias = this.currentState.getStateEvents("m.room.canonical_alias", "");
    if (canonicalAlias) {
        return canonicalAlias.getContent().alias;
    }
    return null;
};

/**
 * Add events to a timeline
 *
 * <p>Will fire "Room.timeline" for each event added.
 *
 * @param {MatrixEvent[]} events A list of events to add.
 *
 * @param {boolean} toStartOfTimeline   True to add these events to the start
 * (oldest) instead of the end (newest) of the timeline. If true, the oldest
 * event will be the <b>last</b> element of 'events'.
 *
 * @param {module:models/event-timeline~EventTimeline} timeline   timeline to
 *    add events to.
 *
 * @param {string=} paginationToken   token for the next batch of events
 *
 * @fires module:client~MatrixClient#event:"Room.timeline"
 *
 */
Room.prototype.addEventsToTimeline = function (events, toStartOfTimeline, timeline, paginationToken) {
    timeline.getTimelineSet().addEventsToTimeline(events, toStartOfTimeline, timeline, paginationToken);
};

/**
 * Get a member from the current room state.
 * @param {string} userId The user ID of the member.
 * @return {RoomMember} The member or <code>null</code>.
 */
Room.prototype.getMember = function (userId) {
    var member = this.currentState.members[userId];
    if (!member) {
        return null;
    }
    return member;
};

/**
 * Get a list of members whose membership state is "join".
 * @return {RoomMember[]} A list of currently joined members.
 */
Room.prototype.getJoinedMembers = function () {
    return this.getMembersWithMembership("join");
};

/**
 * Get a list of members with given membership state.
 * @param {string} membership The membership state.
 * @return {RoomMember[]} A list of members with the given membership state.
 */
Room.prototype.getMembersWithMembership = function (membership) {
    return utils.filter(this.currentState.getMembers(), function (m) {
        return m.membership === membership;
    });
};

/**
 * Get the default room name (i.e. what a given user would see if the
 * room had no m.room.name)
 * @param {string} userId The userId from whose perspective we want
 * to calculate the default name
 * @return {string} The default room name
 */
Room.prototype.getDefaultRoomName = function (userId) {
    return calculateRoomName(this, userId, true);
};

/**
* Check if the given user_id has the given membership state.
* @param {string} userId The user ID to check.
* @param {string} membership The membership e.g. <code>'join'</code>
* @return {boolean} True if this user_id has the given membership state.
*/
Room.prototype.hasMembershipState = function (userId, membership) {
    var member = this.getMember(userId);
    if (!member) {
        return false;
    }
    return member.membership === membership;
};

/**
 * Add a timelineSet for this room with the given filter
 * @param {Filter} filter  The filter to be applied to this timelineSet
 * @return {EventTimelineSet}  The timelineSet
 */
Room.prototype.getOrCreateFilteredTimelineSet = function (filter) {
    if (this._filteredTimelineSets[filter.filterId]) {
        return this._filteredTimelineSets[filter.filterId];
    }
    var opts = Object.assign({ filter: filter }, this._opts);
    var timelineSet = new EventTimelineSet(this, opts);
    reEmit(this, timelineSet, ["Room.timeline", "Room.timelineReset"]);
    this._filteredTimelineSets[filter.filterId] = timelineSet;
    this._timelineSets.push(timelineSet);

    // populate up the new timelineSet with filtered events from our live
    // unfiltered timeline.
    //
    // XXX: This is risky as our timeline
    // may have grown huge and so take a long time to filter.
    // see https://github.com/vector-im/vector-web/issues/2109

    var unfilteredLiveTimeline = this.getLiveTimeline();

    unfilteredLiveTimeline.getEvents().forEach(function (event) {
        timelineSet.addLiveEvent(event);
    });

    // find the earliest unfiltered timeline
    var timeline = unfilteredLiveTimeline;
    while (timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS)) {
        timeline = timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS);
    }

    timelineSet.getLiveTimeline().setPaginationToken(timeline.getPaginationToken(EventTimeline.BACKWARDS), EventTimeline.BACKWARDS);

    // alternatively, we could try to do something like this to try and re-paginate
    // in the filtered events from nothing, but Mark says it's an abuse of the API
    // to do so:
    //
    // timelineSet.resetLiveTimeline(
    //      unfilteredLiveTimeline.getPaginationToken(EventTimeline.FORWARDS)
    // );

    return timelineSet;
};

/**
 * Forget the timelineSet for this room with the given filter
 *
 * @param {Filter} filter  the filter whose timelineSet is to be forgotten
 */
Room.prototype.removeFilteredTimelineSet = function (filter) {
    var timelineSet = this._filteredTimelineSets[filter.filterId];
    delete this._filteredTimelineSets[filter.filterId];
    var i = this._timelineSets.indexOf(timelineSet);
    if (i > -1) {
        this._timelineSets.splice(i, 1);
    }
};

/**
 * Add an event to the end of this room's live timelines. Will fire
 * "Room.timeline".
 *
 * @param {MatrixEvent} event Event to be added
 * @param {string?} duplicateStrategy 'ignore' or 'replace'
 * @fires module:client~MatrixClient#event:"Room.timeline"
 * @private
 */
Room.prototype._addLiveEvent = function (event, duplicateStrategy) {
    var i = void 0;
    if (event.getType() === "m.room.redaction") {
        var redactId = event.event.redacts;

        // if we know about this event, redact its contents now.
        var redactedEvent = this.getUnfilteredTimelineSet().findEventById(redactId);
        if (redactedEvent) {
            redactedEvent.makeRedacted(event);
            this.emit("Room.redaction", event, this);

            // TODO: we stash user displaynames (among other things) in
            // RoomMember objects which are then attached to other events
            // (in the sender and target fields). We should get those
            // RoomMember objects to update themselves when the events that
            // they are based on are changed.
        }

        // FIXME: apply redactions to notification list

        // NB: We continue to add the redaction event to the timeline so
        // clients can say "so and so redacted an event" if they wish to. Also
        // this may be needed to trigger an update.
    }

    if (event.getUnsigned().transaction_id) {
        var existingEvent = this._txnToEvent[event.getUnsigned().transaction_id];
        if (existingEvent) {
            // remote echo of an event we sent earlier
            this._handleRemoteEcho(event, existingEvent);
            return;
        }
    }

    // add to our timeline sets
    for (i = 0; i < this._timelineSets.length; i++) {
        this._timelineSets[i].addLiveEvent(event, duplicateStrategy);
    }

    // synthesize and inject implicit read receipts
    // Done after adding the event because otherwise the app would get a read receipt
    // pointing to an event that wasn't yet in the timeline
    if (event.sender) {
        this.addReceipt(synthesizeReceipt(event.sender.userId, event, "m.read"), true);

        // Any live events from a user could be taken as implicit
        // presence information: evidence that they are currently active.
        // ...except in a world where we use 'user.currentlyActive' to reduce
        // presence spam, this isn't very useful - we'll get a transition when
        // they are no longer currently active anyway. So don't bother to
        // reset the lastActiveAgo and lastPresenceTs from the RoomState's user.
    }
};

/**
 * Add a pending outgoing event to this room.
 *
 * <p>The event is added to either the pendingEventList, or the live timeline,
 * depending on the setting of opts.pendingEventOrdering.
 *
 * <p>This is an internal method, intended for use by MatrixClient.
 *
 * @param {module:models/event.MatrixEvent} event The event to add.
 *
 * @param {string} txnId   Transaction id for this outgoing event
 *
 * @fires module:client~MatrixClient#event:"Room.localEchoUpdated"
 *
 * @throws if the event doesn't have status SENDING, or we aren't given a
 * unique transaction id.
 */
Room.prototype.addPendingEvent = function (event, txnId) {
    if (event.status !== EventStatus.SENDING) {
        throw new Error("addPendingEvent called on an event with status " + event.status);
    }

    if (this._txnToEvent[txnId]) {
        throw new Error("addPendingEvent called on an event with known txnId " + txnId);
    }

    // call setEventMetadata to set up event.sender etc
    // as event is shared over all timelineSets, we set up its metadata based
    // on the unfiltered timelineSet.
    EventTimeline.setEventMetadata(event, this.getLiveTimeline().getState(EventTimeline.FORWARDS), false);

    this._txnToEvent[txnId] = event;

    if (this._opts.pendingEventOrdering == "detached") {
        this._pendingEventList.push(event);
    } else {
        for (var i = 0; i < this._timelineSets.length; i++) {
            var timelineSet = this._timelineSets[i];
            if (timelineSet.getFilter()) {
                if (this._filter.filterRoomTimeline([event]).length) {
                    timelineSet.addEventToTimeline(event, timelineSet.getLiveTimeline(), false);
                }
            } else {
                timelineSet.addEventToTimeline(event, timelineSet.getLiveTimeline(), false);
            }
        }
    }

    this.emit("Room.localEchoUpdated", event, this, null, null);
};

/**
 * Deal with the echo of a message we sent.
 *
 * <p>We move the event to the live timeline if it isn't there already, and
 * update it.
 *
 * @param {module:models/event.MatrixEvent} remoteEvent   The event received from
 *    /sync
 * @param {module:models/event.MatrixEvent} localEvent    The local echo, which
 *    should be either in the _pendingEventList or the timeline.
 *
 * @fires module:client~MatrixClient#event:"Room.localEchoUpdated"
 * @private
 */
Room.prototype._handleRemoteEcho = function (remoteEvent, localEvent) {
    var oldEventId = localEvent.getId();
    var newEventId = remoteEvent.getId();
    var oldStatus = localEvent.status;

    // no longer pending
    delete this._txnToEvent[remoteEvent.transaction_id];

    // if it's in the pending list, remove it
    if (this._pendingEventList) {
        utils.removeElement(this._pendingEventList, function (ev) {
            return ev.getId() == oldEventId;
        }, false);
    }

    // replace the event source (this will preserve the plaintext payload if
    // any, which is good, because we don't want to try decoding it again).
    localEvent.handleRemoteEcho(remoteEvent.event);

    for (var i = 0; i < this._timelineSets.length; i++) {
        var timelineSet = this._timelineSets[i];

        // if it's already in the timeline, update the timeline map. If it's not, add it.
        timelineSet.handleRemoteEcho(localEvent, oldEventId, newEventId);
    }

    this.emit("Room.localEchoUpdated", localEvent, this, oldEventId, oldStatus);
};

/* a map from current event status to a list of allowed next statuses
 */
var ALLOWED_TRANSITIONS = {};

ALLOWED_TRANSITIONS[EventStatus.ENCRYPTING] = [EventStatus.SENDING, EventStatus.NOT_SENT];

ALLOWED_TRANSITIONS[EventStatus.SENDING] = [EventStatus.ENCRYPTING, EventStatus.QUEUED, EventStatus.NOT_SENT, EventStatus.SENT];

ALLOWED_TRANSITIONS[EventStatus.QUEUED] = [EventStatus.SENDING, EventStatus.CANCELLED];

ALLOWED_TRANSITIONS[EventStatus.SENT] = [];

ALLOWED_TRANSITIONS[EventStatus.NOT_SENT] = [EventStatus.SENDING, EventStatus.QUEUED, EventStatus.CANCELLED];

ALLOWED_TRANSITIONS[EventStatus.CANCELLED] = [];

/**
 * Update the status / event id on a pending event, to reflect its transmission
 * progress.
 *
 * <p>This is an internal method.
 *
 * @param {MatrixEvent} event      local echo event
 * @param {EventStatus} newStatus  status to assign
 * @param {string} newEventId      new event id to assign. Ignored unless
 *    newStatus == EventStatus.SENT.
 * @fires module:client~MatrixClient#event:"Room.localEchoUpdated"
 */
Room.prototype.updatePendingEvent = function (event, newStatus, newEventId) {
    // if the message was sent, we expect an event id
    if (newStatus == EventStatus.SENT && !newEventId) {
        throw new Error("updatePendingEvent called with status=SENT, " + "but no new event id");
    }

    // SENT races against /sync, so we have to special-case it.
    if (newStatus == EventStatus.SENT) {
        var timeline = this.getUnfilteredTimelineSet().eventIdToTimeline(newEventId);
        if (timeline) {
            // we've already received the event via the event stream.
            // nothing more to do here.
            return;
        }
    }

    var oldStatus = event.status;
    var oldEventId = event.getId();

    if (!oldStatus) {
        throw new Error("updatePendingEventStatus called on an event which is " + "not a local echo.");
    }

    var allowed = ALLOWED_TRANSITIONS[oldStatus];
    if (!allowed || allowed.indexOf(newStatus) < 0) {
        throw new Error("Invalid EventStatus transition " + oldStatus + "->" + newStatus);
    }

    event.status = newStatus;

    if (newStatus == EventStatus.SENT) {
        // update the event id
        event.event.event_id = newEventId;

        // if the event was already in the timeline (which will be the case if
        // opts.pendingEventOrdering==chronological), we need to update the
        // timeline map.
        for (var i = 0; i < this._timelineSets.length; i++) {
            this._timelineSets[i].replaceEventId(oldEventId, newEventId);
        }
    } else if (newStatus == EventStatus.CANCELLED) {
        // remove it from the pending event list, or the timeline.
        if (this._pendingEventList) {
            utils.removeElement(this._pendingEventList, function (ev) {
                return ev.getId() == oldEventId;
            }, false);
        }
        this.removeEvent(oldEventId);
    }

    this.emit("Room.localEchoUpdated", event, this, event.getId(), oldStatus);
};

/**
 * Add some events to this room. This can include state events, message
 * events and typing notifications. These events are treated as "live" so
 * they will go to the end of the timeline.
 *
 * @param {MatrixEvent[]} events A list of events to add.
 *
 * @param {string} duplicateStrategy Optional. Applies to events in the
 * timeline only. If this is 'replace' then if a duplicate is encountered, the
 * event passed to this function will replace the existing event in the
 * timeline. If this is not specified, or is 'ignore', then the event passed to
 * this function will be ignored entirely, preserving the existing event in the
 * timeline. Events are identical based on their event ID <b>only</b>.
 *
 * @throws If <code>duplicateStrategy</code> is not falsey, 'replace' or 'ignore'.
 */
Room.prototype.addLiveEvents = function (events, duplicateStrategy) {
    var i = void 0;
    if (duplicateStrategy && ["replace", "ignore"].indexOf(duplicateStrategy) === -1) {
        throw new Error("duplicateStrategy MUST be either 'replace' or 'ignore'");
    }

    // sanity check that the live timeline is still live
    for (i = 0; i < this._timelineSets.length; i++) {
        var liveTimeline = this._timelineSets[i].getLiveTimeline();
        if (liveTimeline.getPaginationToken(EventTimeline.FORWARDS)) {
            throw new Error("live timeline " + i + " is no longer live - it has a pagination token " + "(" + liveTimeline.getPaginationToken(EventTimeline.FORWARDS) + ")");
        }
        if (liveTimeline.getNeighbouringTimeline(EventTimeline.FORWARDS)) {
            throw new Error("live timeline " + i + " is no longer live - " + "it has a neighbouring timeline");
        }
    }

    for (i = 0; i < events.length; i++) {
        if (events[i].getType() === "m.typing") {
            this.currentState.setTypingEvent(events[i]);
        } else if (events[i].getType() === "m.receipt") {
            this.addReceipt(events[i]);
        }
        // N.B. account_data is added directly by /sync to avoid
        // having to maintain an event.isAccountData() here
        else {
                // TODO: We should have a filter to say "only add state event
                // types X Y Z to the timeline".
                this._addLiveEvent(events[i], duplicateStrategy);
            }
    }
};

/**
 * Removes events from this room.
 * @param {String[]} event_ids A list of event_ids to remove.
 */
Room.prototype.removeEvents = function (event_ids) {
    for (var i = 0; i < event_ids.length; ++i) {
        this.removeEvent(event_ids[i]);
    }
};

/**
 * Removes a single event from this room.
 *
 * @param {String} eventId  The id of the event to remove
 *
 * @return {bool} true if the event was removed from any of the room's timeline sets
 */
Room.prototype.removeEvent = function (eventId) {
    var removedAny = false;
    for (var i = 0; i < this._timelineSets.length; i++) {
        var removed = this._timelineSets[i].removeEvent(eventId);
        if (removed) {
            removedAny = true;
        }
    }
    return removedAny;
};

/**
 * Recalculate various aspects of the room, including the room name and
 * room summary. Call this any time the room's current state is modified.
 * May fire "Room.name" if the room name is updated.
 * @param {string} userId The client's user ID.
 * @fires module:client~MatrixClient#event:"Room.name"
 */
Room.prototype.recalculate = function (userId) {
    // set fake stripped state events if this is an invite room so logic remains
    // consistent elsewhere.
    var self = this;
    var membershipEvent = this.currentState.getStateEvents("m.room.member", userId);
    if (membershipEvent && membershipEvent.getContent().membership === "invite") {
        var strippedStateEvents = membershipEvent.event.invite_room_state || [];
        utils.forEach(strippedStateEvents, function (strippedEvent) {
            var existingEvent = self.currentState.getStateEvents(strippedEvent.type, strippedEvent.state_key);
            if (!existingEvent) {
                // set the fake stripped event instead
                self.currentState.setStateEvents([new MatrixEvent({
                    type: strippedEvent.type,
                    state_key: strippedEvent.state_key,
                    content: strippedEvent.content,
                    event_id: "$fake" + Date.now(),
                    room_id: self.roomId,
                    user_id: userId })]);
            }
        });
    }

    var oldName = this.name;
    this.name = calculateRoomName(this, userId);
    this.summary = new RoomSummary(this.roomId, {
        title: this.name
    });

    if (oldName !== this.name) {
        this.emit("Room.name", this);
    }
};

/**
 * Get a list of user IDs who have <b>read up to</b> the given event.
 * @param {MatrixEvent} event the event to get read receipts for.
 * @return {String[]} A list of user IDs.
 */
Room.prototype.getUsersReadUpTo = function (event) {
    return this.getReceiptsForEvent(event).filter(function (receipt) {
        return receipt.type === "m.read";
    }).map(function (receipt) {
        return receipt.userId;
    });
};

/**
 * Get the ID of the event that a given user has read up to, or null if we
 * have received no read receipts from them.
 * @param {String} userId The user ID to get read receipt event ID for
 * @param {Boolean} ignoreSynthesized If true, return only receipts that have been
 *                                    sent by the server, not implicit ones generated
 *                                    by the JS SDK.
 * @return {String} ID of the latest event that the given user has read, or null.
 */
Room.prototype.getEventReadUpTo = function (userId, ignoreSynthesized) {
    var receipts = this._receipts;
    if (ignoreSynthesized) {
        receipts = this._realReceipts;
    }

    if (receipts["m.read"] === undefined || receipts["m.read"][userId] === undefined) {
        return null;
    }

    return receipts["m.read"][userId].eventId;
};

/**
 * Get a list of receipts for the given event.
 * @param {MatrixEvent} event the event to get receipts for
 * @return {Object[]} A list of receipts with a userId, type and data keys or
 * an empty list.
 */
Room.prototype.getReceiptsForEvent = function (event) {
    return this._receiptCacheByEventId[event.getId()] || [];
};

/**
 * Add a receipt event to the room.
 * @param {MatrixEvent} event The m.receipt event.
 * @param {Boolean} fake True if this event is implicit
 */
Room.prototype.addReceipt = function (event, fake) {
    // event content looks like:
    // content: {
    //   $event_id: {
    //     $receipt_type: {
    //       $user_id: {
    //         ts: $timestamp
    //       }
    //     }
    //   }
    // }
    if (fake === undefined) {
        fake = false;
    }
    if (!fake) {
        this._addReceiptsToStructure(event, this._realReceipts);
        // we don't bother caching real receipts by event ID
        // as there's nothing that would read it.
    }
    this._addReceiptsToStructure(event, this._receipts);
    this._receiptCacheByEventId = this._buildReceiptCache(this._receipts);

    // send events after we've regenerated the cache, otherwise things that
    // listened for the event would read from a stale cache
    this.emit("Room.receipt", event, this);
};

/**
 * Add a receipt event to the room.
 * @param {MatrixEvent} event The m.receipt event.
 * @param {Object} receipts The object to add receipts to
 */
Room.prototype._addReceiptsToStructure = function (event, receipts) {
    var self = this;
    utils.keys(event.getContent()).forEach(function (eventId) {
        utils.keys(event.getContent()[eventId]).forEach(function (receiptType) {
            utils.keys(event.getContent()[eventId][receiptType]).forEach(function (userId) {
                var receipt = event.getContent()[eventId][receiptType][userId];

                if (!receipts[receiptType]) {
                    receipts[receiptType] = {};
                }

                var existingReceipt = receipts[receiptType][userId];

                if (!existingReceipt) {
                    receipts[receiptType][userId] = {};
                } else {
                    // we only want to add this receipt if we think it is later
                    // than the one we already have. (This is managed
                    // server-side, but because we synthesize RRs locally we
                    // have to do it here too.)
                    var ordering = self.getUnfilteredTimelineSet().compareEventOrdering(existingReceipt.eventId, eventId);
                    if (ordering !== null && ordering >= 0) {
                        return;
                    }
                }

                receipts[receiptType][userId] = {
                    eventId: eventId,
                    data: receipt
                };
            });
        });
    });
};

/**
 * Build and return a map of receipts by event ID
 * @param {Object} receipts A map of receipts
 * @return {Object} Map of receipts by event ID
 */
Room.prototype._buildReceiptCache = function (receipts) {
    var receiptCacheByEventId = {};
    utils.keys(receipts).forEach(function (receiptType) {
        utils.keys(receipts[receiptType]).forEach(function (userId) {
            var receipt = receipts[receiptType][userId];
            if (!receiptCacheByEventId[receipt.eventId]) {
                receiptCacheByEventId[receipt.eventId] = [];
            }
            receiptCacheByEventId[receipt.eventId].push({
                userId: userId,
                type: receiptType,
                data: receipt.data
            });
        });
    });
    return receiptCacheByEventId;
};

/**
 * Add a temporary local-echo receipt to the room to reflect in the
 * client the fact that we've sent one.
 * @param {string} userId The user ID if the receipt sender
 * @param {MatrixEvent} e The event that is to be acknowledged
 * @param {string} receiptType The type of receipt
 */
Room.prototype._addLocalEchoReceipt = function (userId, e, receiptType) {
    this.addReceipt(synthesizeReceipt(userId, e, receiptType), true);
};

/**
 * Update the room-tag event for the room.  The previous one is overwritten.
 * @param {MatrixEvent} event the m.tag event
 */
Room.prototype.addTags = function (event) {
    // event content looks like:
    // content: {
    //    tags: {
    //       $tagName: { $metadata: $value },
    //       $tagName: { $metadata: $value },
    //    }
    // }

    // XXX: do we need to deep copy here?
    this.tags = event.getContent().tags;

    // XXX: we could do a deep-comparison to see if the tags have really
    // changed - but do we want to bother?
    this.emit("Room.tags", event, this);
};

/**
 * Update the account_data events for this room, overwriting events of the same type.
 * @param {Array<MatrixEvent>} events an array of account_data events to add
 */
Room.prototype.addAccountData = function (events) {
    for (var i = 0; i < events.length; i++) {
        var event = events[i];
        if (event.getType() === "m.tag") {
            this.addTags(event);
        }
        this.accountData[event.getType()] = event;
        this.emit("Room.accountData", event, this);
    }
};

/**
 * Access account_data event of given event type for this room
 * @param {string} type the type of account_data event to be accessed
 * @return {?MatrixEvent} the account_data event in question
 */
Room.prototype.getAccountData = function (type) {
    return this.accountData[type];
};

/**
 * This is an internal method. Calculates the name of the room from the current
 * room state.
 * @param {Room} room The matrix room.
 * @param {string} userId The client's user ID. Used to filter room members
 * correctly.
 * @param {bool} ignoreRoomNameEvent Return the implicit room name that we'd see if there
 * was no m.room.name event.
 * @return {string} The calculated room name.
 */
function calculateRoomName(room, userId, ignoreRoomNameEvent) {
    if (!ignoreRoomNameEvent) {
        // check for an alias, if any. for now, assume first alias is the
        // official one.
        var mRoomName = room.currentState.getStateEvents("m.room.name", "");
        if (mRoomName && mRoomName.getContent() && mRoomName.getContent().name) {
            return mRoomName.getContent().name;
        }
    }

    var alias = room.getCanonicalAlias();

    if (!alias) {
        var aliases = room.getAliases();

        if (aliases.length) {
            alias = aliases[0];
        }
    }
    if (alias) {
        return alias;
    }

    // get members that are NOT ourselves and are actually in the room.
    var otherMembers = utils.filter(room.currentState.getMembers(), function (m) {
        return m.userId !== userId && m.membership !== "leave";
    });
    var allMembers = utils.filter(room.currentState.getMembers(), function (m) {
        return m.membership !== "leave";
    });
    var myMemberEventArray = utils.filter(room.currentState.getMembers(), function (m) {
        return m.userId == userId;
    });
    var myMemberEvent = myMemberEventArray.length && myMemberEventArray[0].events ? myMemberEventArray[0].events.member.event : undefined;

    // TODO: Localisation
    if (myMemberEvent && myMemberEvent.content.membership == "invite") {
        if (room.currentState.getMember(myMemberEvent.sender)) {
            // extract who invited us to the room
            return "Invite from " + room.currentState.getMember(myMemberEvent.sender).name;
        } else if (allMembers[0].events.member) {
            // use the sender field from the invite event, although this only
            // gets us the mxid
            return "Invite from " + myMemberEvent.sender;
        } else {
            return "Room Invite";
        }
    }

    if (otherMembers.length === 0) {
        if (allMembers.length === 1) {
            // self-chat, peeked room with 1 participant,
            // or inbound invite, or outbound 3PID invite.
            if (allMembers[0].userId === userId) {
                var thirdPartyInvites = room.currentState.getStateEvents("m.room.third_party_invite");
                if (thirdPartyInvites && thirdPartyInvites.length > 0) {
                    var name = "Inviting " + thirdPartyInvites[0].getContent().display_name;
                    if (thirdPartyInvites.length > 1) {
                        if (thirdPartyInvites.length == 2) {
                            name += " and " + thirdPartyInvites[1].getContent().display_name;
                        } else {
                            name += " and " + thirdPartyInvites.length + " others";
                        }
                    }
                    return name;
                } else {
                    return "Empty room";
                }
            } else {
                return allMembers[0].name;
            }
        } else {
            // there really isn't anyone in this room...
            return "Empty room";
        }
    } else if (otherMembers.length === 1) {
        return otherMembers[0].name;
    } else if (otherMembers.length === 2) {
        return otherMembers[0].name + " and " + otherMembers[1].name;
    } else {
        return otherMembers[0].name + " and " + (otherMembers.length - 1) + " others";
    }
}

// FIXME: copypasted from sync.js
function reEmit(reEmitEntity, emittableEntity, eventNames) {
    utils.forEach(eventNames, function (eventName) {
        // setup a listener on the entity (the Room, User, etc) for this event
        emittableEntity.on(eventName, function () {
            // take the args from the listener and reuse them, adding the
            // event name to the arg list so it works with .emit()
            // Transformation Example:
            // listener on "foo" => function(a,b) { ... }
            // Re-emit on "thing" => thing.emit("foo", a, b)
            var newArgs = [eventName];
            for (var i = 0; i < arguments.length; i++) {
                newArgs.push(arguments[i]);
            }
            reEmitEntity.emit.apply(reEmitEntity, newArgs);
        });
    });
}

/**
 * The Room class.
 */
module.exports = Room;

/**
 * Fires when an event we had previously received is redacted.
 *
 * (Note this is *not* fired when the redaction happens before we receive the
 * event).
 *
 * @event module:client~MatrixClient#"Room.redaction"
 * @param {MatrixEvent} event The matrix event which was redacted
 * @param {Room} room The room containing the redacted event
 */

/**
 * Fires whenever the name of a room is updated.
 * @event module:client~MatrixClient#"Room.name"
 * @param {Room} room The room whose Room.name was updated.
 * @example
 * matrixClient.on("Room.name", function(room){
 *   var newName = room.name;
 * });
 */

/**
 * Fires whenever a receipt is received for a room
 * @event module:client~MatrixClient#"Room.receipt"
 * @param {event} event The receipt event
 * @param {Room} room The room whose receipts was updated.
 * @example
 * matrixClient.on("Room.receipt", function(event, room){
 *   var receiptContent = event.getContent();
 * });
 */

/**
 * Fires whenever a room's tags are updated.
 * @event module:client~MatrixClient#"Room.tags"
 * @param {event} event The tags event
 * @param {Room} room The room whose Room.tags was updated.
 * @example
 * matrixClient.on("Room.tags", function(event, room){
 *   var newTags = event.getContent().tags;
 *   if (newTags["favourite"]) showStar(room);
 * });
 */

/**
 * Fires whenever a room's account_data is updated.
 * @event module:client~MatrixClient#"Room.accountData"
 * @param {event} event The account_data event
 * @param {Room} room The room whose account_data was updated.
 * @example
 * matrixClient.on("Room.accountData", function(event, room){
 *   if (event.getType() === "m.room.colorscheme") {
 *       applyColorScheme(event.getContents());
 *   }
 * });
 */

/**
 * Fires when the status of a transmitted event is updated.
 *
 * <p>When an event is first transmitted, a temporary copy of the event is
 * inserted into the timeline, with a temporary event id, and a status of
 * 'SENDING'.
 *
 * <p>Once the echo comes back from the server, the content of the event
 * (MatrixEvent.event) is replaced by the complete event from the homeserver,
 * thus updating its event id, as well as server-generated fields such as the
 * timestamp. Its status is set to null.
 *
 * <p>Once the /send request completes, if the remote echo has not already
 * arrived, the event is updated with a new event id and the status is set to
 * 'SENT'. The server-generated fields are of course not updated yet.
 *
 * <p>If the /send fails, In this case, the event's status is set to
 * 'NOT_SENT'. If it is later resent, the process starts again, setting the
 * status to 'SENDING'. Alternatively, the message may be cancelled, which
 * removes the event from the room, and sets the status to 'CANCELLED'.
 *
 * <p>This event is raised to reflect each of the transitions above.
 *
 * @event module:client~MatrixClient#"Room.localEchoUpdated"
 *
 * @param {MatrixEvent} event The matrix event which has been updated
 *
 * @param {Room} room The room containing the redacted event
 *
 * @param {string} oldEventId The previous event id (the temporary event id,
 *    except when updating a successfully-sent event when its echo arrives)
 *
 * @param {EventStatus} oldStatus The previous event status.
 */

},{"../content-repo":4,"../utils":36,"./event":21,"./event-timeline":20,"./event-timeline-set":19,"./room-summary":24,"events":46}],26:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * @module models/search-result
 */

var EventContext = require("./event-context");
var utils = require("../utils");

/**
 * Construct a new SearchResult
 *
 * @param {number} rank   where this SearchResult ranks in the results
 * @param {event-context.EventContext} eventContext  the matching event and its
 *    context
 *
 * @constructor
 */
function SearchResult(rank, eventContext) {
  this.rank = rank;
  this.context = eventContext;
}

/**
 * Create a SearchResponse from the response to /search
 * @static
 * @param {Object} jsonObj
 * @param {function} eventMapper
 * @return {SearchResult}
 */

SearchResult.fromJson = function (jsonObj, eventMapper) {
  var jsonContext = jsonObj.context || {};
  var events_before = jsonContext.events_before || [];
  var events_after = jsonContext.events_after || [];

  var context = new EventContext(eventMapper(jsonObj.result));

  context.setPaginateToken(jsonContext.start, true);
  context.addEvents(utils.map(events_before, eventMapper), true);
  context.addEvents(utils.map(events_after, eventMapper), false);
  context.setPaginateToken(jsonContext.end, false);

  return new SearchResult(jsonObj.rank, context);
};

/**
 * The SearchResult class
 */
module.exports = SearchResult;

},{"../utils":36,"./event-context":18}],27:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * @module models/user
 */

var EventEmitter = require("events").EventEmitter;
var utils = require("../utils");

/**
 * Construct a new User. A User must have an ID and can optionally have extra
 * information associated with it.
 * @constructor
 * @param {string} userId Required. The ID of this user.
 * @prop {string} userId The ID of the user.
 * @prop {Object} info The info object supplied in the constructor.
 * @prop {string} displayName The 'displayname' of the user if known.
 * @prop {string} avatarUrl The 'avatar_url' of the user if known.
 * @prop {string} presence The presence enum if known.
 * @prop {string} presenceStatusMsg The presence status message if known.
 * @prop {Number} lastActiveAgo The time elapsed in ms since the user interacted
 *                proactively with the server, or we saw a message from the user
 * @prop {Number} lastPresenceTs Timestamp (ms since the epoch) for when we last
 *                received presence data for this user.  We can subtract
 *                lastActiveAgo from this to approximate an absolute value for
 *                when a user was last active.
 * @prop {Boolean} currentlyActive Whether we should consider lastActiveAgo to be
 *               an approximation and that the user should be seen as active 'now'
 * @prop {Object} events The events describing this user.
 * @prop {MatrixEvent} events.presence The m.presence event for this user.
 */
function User(userId) {
    this.userId = userId;
    this.presence = "offline";
    this.presenceStatusMsg = null;
    this.displayName = userId;
    this.rawDisplayName = userId;
    this.avatarUrl = null;
    this.lastActiveAgo = 0;
    this.lastPresenceTs = 0;
    this.currentlyActive = false;
    this.events = {
        presence: null,
        profile: null
    };
    this._updateModifiedTime();
}
utils.inherits(User, EventEmitter);

/**
 * Update this User with the given presence event. May fire "User.presence",
 * "User.avatarUrl" and/or "User.displayName" if this event updates this user's
 * properties.
 * @param {MatrixEvent} event The <code>m.presence</code> event.
 * @fires module:client~MatrixClient#event:"User.presence"
 * @fires module:client~MatrixClient#event:"User.displayName"
 * @fires module:client~MatrixClient#event:"User.avatarUrl"
 */
User.prototype.setPresenceEvent = function (event) {
    if (event.getType() !== "m.presence") {
        return;
    }
    var firstFire = this.events.presence === null;
    this.events.presence = event;

    var eventsToFire = [];
    if (event.getContent().presence !== this.presence || firstFire) {
        eventsToFire.push("User.presence");
    }
    if (event.getContent().avatar_url && event.getContent().avatar_url !== this.avatarUrl) {
        eventsToFire.push("User.avatarUrl");
    }
    if (event.getContent().displayname && event.getContent().displayname !== this.displayName) {
        eventsToFire.push("User.displayName");
    }
    if (event.getContent().currently_active !== undefined && event.getContent().currently_active !== this.currentlyActive) {
        eventsToFire.push("User.currentlyActive");
    }

    this.presence = event.getContent().presence;
    eventsToFire.push("User.lastPresenceTs");

    if (event.getContent().status_msg) {
        this.presenceStatusMsg = event.getContent().status_msg;
    }
    if (event.getContent().displayname) {
        this.displayName = event.getContent().displayname;
    }
    if (event.getContent().avatar_url) {
        this.avatarUrl = event.getContent().avatar_url;
    }
    this.lastActiveAgo = event.getContent().last_active_ago;
    this.lastPresenceTs = Date.now();
    this.currentlyActive = event.getContent().currently_active;

    this._updateModifiedTime();

    for (var i = 0; i < eventsToFire.length; i++) {
        this.emit(eventsToFire[i], event, this);
    }
};

/**
 * Manually set this user's display name. No event is emitted in response to this
 * as there is no underlying MatrixEvent to emit with.
 * @param {string} name The new display name.
 */
User.prototype.setDisplayName = function (name) {
    var oldName = this.displayName;
    this.displayName = name;
    if (name !== oldName) {
        this._updateModifiedTime();
    }
};

/**
 * Manually set this user's non-disambiguated display name. No event is emitted
 * in response to this as there is no underlying MatrixEvent to emit with.
 * @param {string} name The new display name.
 */
User.prototype.setRawDisplayName = function (name) {
    this.rawDisplayName = name;
};

/**
 * Manually set this user's avatar URL. No event is emitted in response to this
 * as there is no underlying MatrixEvent to emit with.
 * @param {string} url The new avatar URL.
 */
User.prototype.setAvatarUrl = function (url) {
    var oldUrl = this.avatarUrl;
    this.avatarUrl = url;
    if (url !== oldUrl) {
        this._updateModifiedTime();
    }
};

/**
 * Update the last modified time to the current time.
 */
User.prototype._updateModifiedTime = function () {
    this._modified = Date.now();
};

/**
 * Get the timestamp when this User was last updated. This timestamp is
 * updated when this User receives a new Presence event which has updated a
 * property on this object. It is updated <i>before</i> firing events.
 * @return {number} The timestamp
 */
User.prototype.getLastModifiedTime = function () {
    return this._modified;
};

/**
 * Get the absolute timestamp when this User was last known active on the server.
 * It is *NOT* accurate if this.currentlyActive is true.
 * @return {number} The timestamp
 */
User.prototype.getLastActiveTs = function () {
    return this.lastPresenceTs - this.lastActiveAgo;
};

/**
 * The User class.
 */
module.exports = User;

/**
 * Fires whenever any user's lastPresenceTs changes,
 * ie. whenever any presence event is received for a user.
 * @event module:client~MatrixClient#"User.lastPresenceTs"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {User} user The user whose User.lastPresenceTs changed.
 * @example
 * matrixClient.on("User.lastPresenceTs", function(event, user){
 *   var newlastPresenceTs = user.lastPresenceTs;
 * });
 */

/**
 * Fires whenever any user's presence changes.
 * @event module:client~MatrixClient#"User.presence"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {User} user The user whose User.presence changed.
 * @example
 * matrixClient.on("User.presence", function(event, user){
 *   var newPresence = user.presence;
 * });
 */

/**
 * Fires whenever any user's currentlyActive changes.
 * @event module:client~MatrixClient#"User.currentlyActive"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {User} user The user whose User.currentlyActive changed.
 * @example
 * matrixClient.on("User.currentlyActive", function(event, user){
 *   var newCurrentlyActive = user.currentlyActive;
 * });
 */

/**
 * Fires whenever any user's display name changes.
 * @event module:client~MatrixClient#"User.displayName"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {User} user The user whose User.displayName changed.
 * @example
 * matrixClient.on("User.displayName", function(event, user){
 *   var newName = user.displayName;
 * });
 */

/**
 * Fires whenever any user's avatar URL changes.
 * @event module:client~MatrixClient#"User.avatarUrl"
 * @param {MatrixEvent} event The matrix event which caused this event to fire.
 * @param {User} user The user whose User.avatarUrl changed.
 * @example
 * matrixClient.on("User.avatarUrl", function(event, user){
 *   var newUrl = user.avatarUrl;
 * });
 */

},{"../utils":36,"events":46}],28:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/**
 * @module pushprocessor
 */

/**
 * Construct a Push Processor.
 * @constructor
 * @param {Object} client The Matrix client object to use
 */
function PushProcessor(client) {
    var escapeRegExp = function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    var matchingRuleFromKindSet = function matchingRuleFromKindSet(ev, kindset, device) {
        var rulekinds_in_order = ['override', 'content', 'room', 'sender', 'underride'];
        for (var ruleKindIndex = 0; ruleKindIndex < rulekinds_in_order.length; ++ruleKindIndex) {
            var kind = rulekinds_in_order[ruleKindIndex];
            var ruleset = kindset[kind];

            for (var ruleIndex = 0; ruleIndex < ruleset.length; ++ruleIndex) {
                var rule = ruleset[ruleIndex];
                if (!rule.enabled) {
                    continue;
                }

                var rawrule = templateRuleToRaw(kind, rule, device);
                if (!rawrule) {
                    continue;
                }

                if (ruleMatchesEvent(rawrule, ev)) {
                    rule.kind = kind;
                    return rule;
                }
            }
        }
        return null;
    };

    var templateRuleToRaw = function templateRuleToRaw(kind, tprule, device) {
        var rawrule = {
            'rule_id': tprule.rule_id,
            'actions': tprule.actions,
            'conditions': []
        };
        switch (kind) {
            case 'underride':
            case 'override':
                rawrule.conditions = tprule.conditions;
                break;
            case 'room':
                if (!tprule.rule_id) {
                    return null;
                }
                rawrule.conditions.push({
                    'kind': 'event_match',
                    'key': 'room_id',
                    'pattern': tprule.rule_id
                });
                break;
            case 'sender':
                if (!tprule.rule_id) {
                    return null;
                }
                rawrule.conditions.push({
                    'kind': 'event_match',
                    'key': 'user_id',
                    'pattern': tprule.rule_id
                });
                break;
            case 'content':
                if (!tprule.pattern) {
                    return null;
                }
                rawrule.conditions.push({
                    'kind': 'event_match',
                    'key': 'content.body',
                    'pattern': tprule.pattern
                });
                break;
        }
        if (device) {
            rawrule.conditions.push({
                'kind': 'device',
                'profile_tag': device
            });
        }
        return rawrule;
    };

    var ruleMatchesEvent = function ruleMatchesEvent(rule, ev) {
        var ret = true;
        for (var i = 0; i < rule.conditions.length; ++i) {
            var cond = rule.conditions[i];
            ret &= eventFulfillsCondition(cond, ev);
        }
        //console.log("Rule "+rule.rule_id+(ret ? " matches" : " doesn't match"));
        return ret;
    };

    var eventFulfillsCondition = function eventFulfillsCondition(cond, ev) {
        var condition_functions = {
            "event_match": eventFulfillsEventMatchCondition,
            "device": eventFulfillsDeviceCondition,
            "contains_display_name": eventFulfillsDisplayNameCondition,
            "room_member_count": eventFulfillsRoomMemberCountCondition
        };
        if (condition_functions[cond.kind]) {
            return condition_functions[cond.kind](cond, ev);
        }
        return true;
    };

    var eventFulfillsRoomMemberCountCondition = function eventFulfillsRoomMemberCountCondition(cond, ev) {
        if (!cond.is) {
            return false;
        }

        var room = client.getRoom(ev.getRoomId());
        if (!room || !room.currentState || !room.currentState.members) {
            return false;
        }

        var memberCount = Object.keys(room.currentState.members).filter(function (m) {
            return room.currentState.members[m].membership == 'join';
        }).length;

        var m = cond.is.match(/^([=<>]*)([0-9]*)$/);
        if (!m) {
            return false;
        }
        var ineq = m[1];
        var rhs = parseInt(m[2]);
        if (isNaN(rhs)) {
            return false;
        }
        switch (ineq) {
            case '':
            case '==':
                return memberCount == rhs;
            case '<':
                return memberCount < rhs;
            case '>':
                return memberCount > rhs;
            case '<=':
                return memberCount <= rhs;
            case '>=':
                return memberCount >= rhs;
            default:
                return false;
        }
    };

    var eventFulfillsDisplayNameCondition = function eventFulfillsDisplayNameCondition(cond, ev) {
        var content = ev.getContent();
        if (!content || !content.body || typeof content.body != 'string') {
            return false;
        }

        var room = client.getRoom(ev.getRoomId());
        if (!room || !room.currentState || !room.currentState.members || !room.currentState.getMember(client.credentials.userId)) {
            return false;
        }

        var displayName = room.currentState.getMember(client.credentials.userId).name;

        // N.B. we can't use \b as it chokes on unicode. however \W seems to be okay
        // as shorthand for [^0-9A-Za-z_].
        var pat = new RegExp("(^|\\W)" + escapeRegExp(displayName) + "(\\W|$)", 'i');
        return content.body.search(pat) > -1;
    };

    var eventFulfillsDeviceCondition = function eventFulfillsDeviceCondition(cond, ev) {
        return false; // XXX: Allow a profile tag to be set for the web client instance
    };

    var eventFulfillsEventMatchCondition = function eventFulfillsEventMatchCondition(cond, ev) {
        var val = valueForDottedKey(cond.key, ev);
        if (!val || typeof val != 'string') {
            return false;
        }

        var pat = void 0;
        if (cond.key == 'content.body') {
            pat = '(^|\\W)' + globToRegexp(cond.pattern) + '(\\W|$)';
        } else {
            pat = '^' + globToRegexp(cond.pattern) + '$';
        }
        var regex = new RegExp(pat, 'i');
        return !!val.match(regex);
    };

    var globToRegexp = function globToRegexp(glob) {
        // From
        // https://github.com/matrix-org/synapse/blob/abbee6b29be80a77e05730707602f3bbfc3f38cb/synapse/push/__init__.py#L132
        // Because micromatch is about 130KB with dependencies,
        // and minimatch is not much better.
        var pat = escapeRegExp(glob);
        pat = pat.replace(/\\\*/, '.*');
        pat = pat.replace(/\?/, '.');
        pat = pat.replace(/\\\[(!|)(.*)\\]/, function (match, p1, p2, offset, string) {
            var first = p1 && '^' || '';
            var second = p2.replace(/\\\-/, '-');
            return '[' + first + second + ']';
        });
        return pat;
    };

    var valueForDottedKey = function valueForDottedKey(key, ev) {
        var parts = key.split('.');
        var val = void 0;

        // special-case the first component to deal with encrypted messages
        var firstPart = parts[0];
        if (firstPart == 'content') {
            val = ev.getContent();
            parts.shift();
        } else if (firstPart == 'type') {
            val = ev.getType();
            parts.shift();
        } else {
            // use the raw event for any other fields
            val = ev.event;
        }

        while (parts.length > 0) {
            var thispart = parts.shift();
            if (!val[thispart]) {
                return null;
            }
            val = val[thispart];
        }
        return val;
    };

    var matchingRuleForEventWithRulesets = function matchingRuleForEventWithRulesets(ev, rulesets) {
        if (!rulesets || !rulesets.device) {
            return null;
        }
        if (ev.getSender() == client.credentials.userId) {
            return null;
        }

        var allDevNames = Object.keys(rulesets.device);
        for (var i = 0; i < allDevNames.length; ++i) {
            var devname = allDevNames[i];
            var devrules = rulesets.device[devname];

            var matchingRule = matchingRuleFromKindSet(devrules, devname);
            if (matchingRule) {
                return matchingRule;
            }
        }
        return matchingRuleFromKindSet(ev, rulesets.global);
    };

    var pushActionsForEventAndRulesets = function pushActionsForEventAndRulesets(ev, rulesets) {
        var rule = matchingRuleForEventWithRulesets(ev, rulesets);
        if (!rule) {
            return {};
        }

        var actionObj = PushProcessor.actionListToActionsObject(rule.actions);

        // Some actions are implicit in some situations: we add those here
        if (actionObj.tweaks.highlight === undefined) {
            // if it isn't specified, highlight if it's a content
            // rule but otherwise not
            actionObj.tweaks.highlight = rule.kind == 'content';
        }

        return actionObj;
    };

    /**
     * Get the user's push actions for the given event
     *
     * @param {module:models/event.MatrixEvent} ev
     *
     * @return {PushAction}
     */
    this.actionsForEvent = function (ev) {
        return pushActionsForEventAndRulesets(ev, client.pushRules);
    };
}

/**
 * Convert a list of actions into a object with the actions as keys and their values
 * eg. [ 'notify', { set_tweak: 'sound', value: 'default' } ]
 *     becomes { notify: true, tweaks: { sound: 'default' } }
 * @param {array} actionlist The actions list
 *
 * @return {object} A object with key 'notify' (true or false) and an object of actions
 */
PushProcessor.actionListToActionsObject = function (actionlist) {
    var actionobj = { 'notify': false, 'tweaks': {} };
    for (var i = 0; i < actionlist.length; ++i) {
        var action = actionlist[i];
        if (action === 'notify') {
            actionobj.notify = true;
        } else if ((typeof action === 'undefined' ? 'undefined' : _typeof(action)) === 'object') {
            if (action.value === undefined) {
                action.value = true;
            }
            actionobj.tweaks[action.set_tweak] = action.value;
        }
    }
    return actionobj;
};

/**
 * @typedef {Object} PushAction
 * @type {Object}
 * @property {boolean} notify Whether this event should notify the user or not.
 * @property {Object} tweaks How this event should be notified.
 * @property {boolean} tweaks.highlight Whether this event should be highlighted
 * on the UI.
 * @property {boolean} tweaks.sound Whether this notification should produce a
 * noise.
 */

/** The PushProcessor class. */
module.exports = PushProcessor;

},{}],29:[function(require,module,exports){
(function (global){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* A re-implementation of the javascript callback functions (setTimeout,
 * clearTimeout; setInterval and clearInterval are not yet implemented) which
 * try to improve handling of large clock jumps (as seen when
 * suspending/resuming the system).
 *
 * In particular, if a timeout would have fired while the system was suspended,
 * it will instead fire as soon as possible after resume.
 */

"use strict";

// we schedule a callback at least this often, to check if we've missed out on
// some wall-clock time due to being suspended.

var TIMER_CHECK_PERIOD_MS = 1000;

// counter, for making up ids to return from setTimeout
var _count = 0;

// the key for our callback with the real global.setTimeout
var _realCallbackKey = void 0;

// a sorted list of the callbacks to be run.
// each is an object with keys [runAt, func, params, key].
var _callbackList = [];

// var debuglog = console.log.bind(console);
var debuglog = function debuglog() {};

/**
 * Replace the function used by this module to get the current time.
 *
 * Intended for use by the unit tests.
 *
 * @param {function} f function which should return a millisecond counter
 *
 * @internal
 */
module.exports.setNow = function (f) {
    _now = f || Date.now;
};
var _now = Date.now;

/**
 * reimplementation of window.setTimeout, which will call the callback if
 * the wallclock time goes past the deadline.
 *
 * @param {function} func   callback to be called after a delay
 * @param {Number} delayMs  number of milliseconds to delay by
 *
 * @return {Number} an identifier for this callback, which may be passed into
 *                   clearTimeout later.
 */
module.exports.setTimeout = function (func, delayMs) {
    delayMs = delayMs || 0;
    if (delayMs < 0) {
        delayMs = 0;
    }

    var params = Array.prototype.slice.call(arguments, 2);
    var runAt = _now() + delayMs;
    var key = _count++;
    debuglog("setTimeout: scheduling cb", key, "at", runAt, "(delay", delayMs, ")");
    var data = {
        runAt: runAt,
        func: func,
        params: params,
        key: key
    };

    // figure out where it goes in the list
    var idx = binarySearch(_callbackList, function (el) {
        return el.runAt - runAt;
    });

    _callbackList.splice(idx, 0, data);
    _scheduleRealCallback();

    return key;
};

/**
 * reimplementation of window.clearTimeout, which mirrors setTimeout
 *
 * @param {Number} key   result from an earlier setTimeout call
 */
module.exports.clearTimeout = function (key) {
    if (_callbackList.length === 0) {
        return;
    }

    // remove the element from the list
    var i = void 0;
    for (i = 0; i < _callbackList.length; i++) {
        var cb = _callbackList[i];
        if (cb.key == key) {
            _callbackList.splice(i, 1);
            break;
        }
    }

    // iff it was the first one in the list, reschedule our callback.
    if (i === 0) {
        _scheduleRealCallback();
    }
};

// use the real global.setTimeout to schedule a callback to _runCallbacks.
function _scheduleRealCallback() {
    if (_realCallbackKey) {
        global.clearTimeout(_realCallbackKey);
    }

    var first = _callbackList[0];

    if (!first) {
        debuglog("_scheduleRealCallback: no more callbacks, not rescheduling");
        return;
    }

    var now = _now();
    var delayMs = Math.min(first.runAt - now, TIMER_CHECK_PERIOD_MS);

    debuglog("_scheduleRealCallback: now:", now, "delay:", delayMs);
    _realCallbackKey = global.setTimeout(_runCallbacks, delayMs);
}

function _runCallbacks() {
    var cb = void 0;
    var now = _now();
    debuglog("_runCallbacks: now:", now);

    // get the list of things to call
    var callbacksToRun = [];
    while (true) {
        var first = _callbackList[0];
        if (!first || first.runAt > now) {
            break;
        }
        cb = _callbackList.shift();
        debuglog("_runCallbacks: popping", cb.key);
        callbacksToRun.push(cb);
    }

    // reschedule the real callback before running our functions, to
    // keep the codepaths the same whether or not our functions
    // register their own setTimeouts.
    _scheduleRealCallback();

    for (var i = 0; i < callbacksToRun.length; i++) {
        cb = callbacksToRun[i];
        try {
            cb.func.apply(null, cb.params);
        } catch (e) {
            console.error("Uncaught exception in callback function", e.stack || e);
        }
    }
}

/* search in a sorted array.
 *
 * returns the index of the last element for which func returns
 * greater than zero, or array.length if no such element exists.
 */
function binarySearch(array, func) {
    // min is inclusive, max exclusive.
    var min = 0,
        max = array.length;

    while (min < max) {
        var mid = min + max >> 1;
        var res = func(array[mid]);
        if (res > 0) {
            // the element at 'mid' is too big; set it as the new max.
            max = mid;
        } else {
            // the element at 'mid' is too small. 'min' is inclusive, so +1.
            min = mid + 1;
        }
    }
    // presumably, min==max now.
    return min;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],30:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * This is an internal module which manages queuing, scheduling and retrying
 * of requests.
 * @module scheduler
 */

var utils = require("./utils");
var q = require("q");

var DEBUG = false; // set true to enable console logging.

/**
 * Construct a scheduler for Matrix. Requires
 * {@link module:scheduler~MatrixScheduler#setProcessFunction} to be provided
 * with a way of processing events.
 * @constructor
 * @param {module:scheduler~retryAlgorithm} retryAlgorithm Optional. The retry
 * algorithm to apply when determining when to try to send an event again.
 * Defaults to {@link module:scheduler~MatrixScheduler.RETRY_BACKOFF_RATELIMIT}.
 * @param {module:scheduler~queueAlgorithm} queueAlgorithm Optional. The queuing
 * algorithm to apply when determining which events should be sent before the
 * given event. Defaults to {@link module:scheduler~MatrixScheduler.QUEUE_MESSAGES}.
 */
function MatrixScheduler(retryAlgorithm, queueAlgorithm) {
    this.retryAlgorithm = retryAlgorithm || MatrixScheduler.RETRY_BACKOFF_RATELIMIT;
    this.queueAlgorithm = queueAlgorithm || MatrixScheduler.QUEUE_MESSAGES;
    this._queues = {
        // queueName: [{
        //  event: MatrixEvent,  // event to send
        //  defer: Deferred,  // defer to resolve/reject at the END of the retries
        //  attempts: Number  // number of times we've called processFn
        // }, ...]
    };
    this._activeQueues = [];
    this._procFn = null;
}

/**
 * Retrieve a queue based on an event. The event provided does not need to be in
 * the queue.
 * @param {MatrixEvent} event An event to get the queue for.
 * @return {?Array<MatrixEvent>} A shallow copy of events in the queue or null.
 * Modifying this array will not modify the list itself. Modifying events in
 * this array <i>will</i> modify the underlying event in the queue.
 * @see MatrixScheduler.removeEventFromQueue To remove an event from the queue.
 */
MatrixScheduler.prototype.getQueueForEvent = function (event) {
    var name = this.queueAlgorithm(event);
    if (!name || !this._queues[name]) {
        return null;
    }
    return utils.map(this._queues[name], function (obj) {
        return obj.event;
    });
};

/**
 * Remove this event from the queue. The event is equal to another event if they
 * have the same ID returned from event.getId().
 * @param {MatrixEvent} event The event to remove.
 * @return {boolean} True if this event was removed.
 */
MatrixScheduler.prototype.removeEventFromQueue = function (event) {
    var name = this.queueAlgorithm(event);
    if (!name || !this._queues[name]) {
        return false;
    }
    var removed = false;
    utils.removeElement(this._queues[name], function (element) {
        if (element.event.getId() === event.getId()) {
            removed = true;
            return true;
        }
    });
    return removed;
};

/**
 * Set the process function. Required for events in the queue to be processed.
 * If set after events have been added to the queue, this will immediately start
 * processing them.
 * @param {module:scheduler~processFn} fn The function that can process events
 * in the queue.
 */
MatrixScheduler.prototype.setProcessFunction = function (fn) {
    this._procFn = fn;
    _startProcessingQueues(this);
};

/**
 * Queue an event if it is required and start processing queues.
 * @param {MatrixEvent} event The event that may be queued.
 * @return {?Promise} A promise if the event was queued, which will be
 * resolved or rejected in due time, else null.
 */
MatrixScheduler.prototype.queueEvent = function (event) {
    var queueName = this.queueAlgorithm(event);
    if (!queueName) {
        return null;
    }
    // add the event to the queue and make a deferred for it.
    if (!this._queues[queueName]) {
        this._queues[queueName] = [];
    }
    var defer = q.defer();
    this._queues[queueName].push({
        event: event,
        defer: defer,
        attempts: 0
    });
    debuglog("Queue algorithm dumped event %s into queue '%s'", event.getId(), queueName);
    _startProcessingQueues(this);
    return defer.promise;
};

/**
 * Retries events up to 4 times using exponential backoff. This produces wait
 * times of 2, 4, 8, and 16 seconds (30s total) after which we give up. If the
 * failure was due to a rate limited request, the time specified in the error is
 * waited before being retried.
 * @param {MatrixEvent} event
 * @param {Number} attempts
 * @param {MatrixError} err
 * @return {Number}
 * @see module:scheduler~retryAlgorithm
 */
MatrixScheduler.RETRY_BACKOFF_RATELIMIT = function (event, attempts, err) {
    if (err.httpStatus === 400 || err.httpStatus === 403 || err.httpStatus === 401) {
        // client error; no amount of retrying with save you now.
        return -1;
    }
    // we ship with browser-request which returns { cors: rejected } when trying
    // with no connection, so if we match that, give up since they have no conn.
    if (err.cors === "rejected") {
        return -1;
    }

    if (err.name === "M_LIMIT_EXCEEDED") {
        var waitTime = err.data.retry_after_ms;
        if (waitTime) {
            return waitTime;
        }
    }
    if (attempts > 4) {
        return -1; // give up
    }
    return 1000 * Math.pow(2, attempts);
};

/**
 * Queues <code>m.room.message</code> events and lets other events continue
 * concurrently.
 * @param {MatrixEvent} event
 * @return {string}
 * @see module:scheduler~queueAlgorithm
 */
MatrixScheduler.QUEUE_MESSAGES = function (event) {
    if (event.getType() === "m.room.message") {
        // put these events in the 'message' queue.
        return "message";
    }
    // allow all other events continue concurrently.
    return null;
};

function _startProcessingQueues(scheduler) {
    if (!scheduler._procFn) {
        return;
    }
    // for each inactive queue with events in them
    utils.forEach(utils.filter(utils.keys(scheduler._queues), function (queueName) {
        return scheduler._activeQueues.indexOf(queueName) === -1 && scheduler._queues[queueName].length > 0;
    }), function (queueName) {
        // mark the queue as active
        scheduler._activeQueues.push(queueName);
        // begin processing the head of the queue
        debuglog("Spinning up queue: '%s'", queueName);
        _processQueue(scheduler, queueName);
    });
}

function _processQueue(scheduler, queueName) {
    // get head of queue
    var obj = _peekNextEvent(scheduler, queueName);
    if (!obj) {
        // queue is empty. Mark as inactive and stop recursing.
        var index = scheduler._activeQueues.indexOf(queueName);
        if (index >= 0) {
            scheduler._activeQueues.splice(index, 1);
        }
        debuglog("Stopping queue '%s' as it is now empty", queueName);
        return;
    }
    debuglog("Queue '%s' has %s pending events", queueName, scheduler._queues[queueName].length);
    // fire the process function and if it resolves, resolve the deferred. Else
    // invoke the retry algorithm.
    scheduler._procFn(obj.event).done(function (res) {
        // remove this from the queue
        _removeNextEvent(scheduler, queueName);
        debuglog("Queue '%s' sent event %s", queueName, obj.event.getId());
        obj.defer.resolve(res);
        // keep processing
        _processQueue(scheduler, queueName);
    }, function (err) {
        obj.attempts += 1;
        // ask the retry algorithm when/if we should try again
        var waitTimeMs = scheduler.retryAlgorithm(obj.event, obj.attempts, err);
        debuglog("retry(%s) err=%s event_id=%s waitTime=%s", obj.attempts, err, obj.event.getId(), waitTimeMs);
        if (waitTimeMs === -1) {
            // give up (you quitter!)
            debuglog("Queue '%s' giving up on event %s", queueName, obj.event.getId());
            // remove this from the queue
            _removeNextEvent(scheduler, queueName);
            obj.defer.reject(err);
            // process next event
            _processQueue(scheduler, queueName);
        } else {
            setTimeout(function () {
                _processQueue(scheduler, queueName);
            }, waitTimeMs);
        }
    });
}

function _peekNextEvent(scheduler, queueName) {
    var queue = scheduler._queues[queueName];
    if (!utils.isArray(queue)) {
        return null;
    }
    return queue[0];
}

function _removeNextEvent(scheduler, queueName) {
    var queue = scheduler._queues[queueName];
    if (!utils.isArray(queue)) {
        return null;
    }
    return queue.shift();
}

function debuglog() {
    if (DEBUG) {
        var _console;

        (_console = console).log.apply(_console, arguments);
    }
}

/**
 * The retry algorithm to apply when retrying events. To stop retrying, return
 * <code>-1</code>. If this event was part of a queue, it will be removed from
 * the queue.
 * @callback retryAlgorithm
 * @param {MatrixEvent} event The event being retried.
 * @param {Number} attempts The number of failed attempts. This will always be
 * >= 1.
 * @param {MatrixError} err The most recent error message received when trying
 * to send this event.
 * @return {Number} The number of milliseconds to wait before trying again. If
 * this is 0, the request will be immediately retried. If this is
 * <code>-1</code>, the event will be marked as
 * {@link module:models/event.EventStatus.NOT_SENT} and will not be retried.
 */

/**
 * The queuing algorithm to apply to events. This function must be idempotent as
 * it may be called multiple times with the same event. All queues created are
 * serviced in a FIFO manner. To send the event ASAP, return <code>null</code>
 * which will not put this event in a queue. Events that fail to send that form
 * part of a queue will be removed from the queue and the next event in the
 * queue will be sent.
 * @callback queueAlgorithm
 * @param {MatrixEvent} event The event to be sent.
 * @return {string} The name of the queue to put the event into. If a queue with
 * this name does not exist, it will be created. If this is <code>null</code>,
 * the event is not put into a queue and will be sent concurrently.
 */

/**
* The function to invoke to process (send) events in the queue.
* @callback processFn
* @param {MatrixEvent} event The event to send.
* @return {Promise} Resolved/rejected depending on the outcome of the request.
*/

/**
 * The MatrixScheduler class.
 */
module.exports = MatrixScheduler;

},{"./utils":36,"q":42}],31:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * This is an internal module. See {@link MatrixInMemoryStore} for the public class.
 * @module store/memory
 */

var utils = require("../utils");
var User = require("../models/user");

/**
 * Construct a new in-memory data store for the Matrix Client.
 * @constructor
 * @param {Object=} opts Config options
 * @param {LocalStorage} opts.localStorage The local storage instance to persist
 * some forms of data such as tokens. Rooms will NOT be stored.
 */
module.exports.MatrixInMemoryStore = function MatrixInMemoryStore(opts) {
    opts = opts || {};
    this.rooms = {
        // roomId: Room
    };
    this.users = {
        // userId: User
    };
    this.syncToken = null;
    this.filters = {
        // userId: {
        //    filterId: Filter
        // }
    };
    this.accountData = {
        // type : content
    };
    this.localStorage = opts.localStorage;
};

module.exports.MatrixInMemoryStore.prototype = {

    /**
     * Retrieve the token to stream from.
     * @return {string} The token or null.
     */
    getSyncToken: function getSyncToken() {
        return this.syncToken;
    },

    /**
     * Set the token to stream from.
     * @param {string} token The token to stream from.
     */
    setSyncToken: function setSyncToken(token) {
        this.syncToken = token;
    },

    /**
     * Store the given room.
     * @param {Room} room The room to be stored. All properties must be stored.
     */
    storeRoom: function storeRoom(room) {
        this.rooms[room.roomId] = room;
        // add listeners for room member changes so we can keep the room member
        // map up-to-date.
        room.currentState.on("RoomState.members", this._onRoomMember.bind(this));
        // add existing members
        var self = this;
        room.currentState.getMembers().forEach(function (m) {
            self._onRoomMember(null, room.currentState, m);
        });
    },

    /**
     * Called when a room member in a room being tracked by this store has been
     * updated.
     * @param {MatrixEvent} event
     * @param {RoomState} state
     * @param {RoomMember} member
     */
    _onRoomMember: function _onRoomMember(event, state, member) {
        if (member.membership === "invite") {
            // We do NOT add invited members because people love to typo user IDs
            // which would then show up in these lists (!)
            return;
        }

        var user = this.users[member.userId] || new User(member.userId);
        if (member.name) {
            user.setDisplayName(member.name);
            if (member.events.member) {
                user.setRawDisplayName(member.events.member.getDirectionalContent().displayname);
            }
        }
        if (member.events.member && member.events.member.getContent().avatar_url) {
            user.setAvatarUrl(member.events.member.getContent().avatar_url);
        }
        this.users[user.userId] = user;
    },

    /**
     * Retrieve a room by its' room ID.
     * @param {string} roomId The room ID.
     * @return {Room} The room or null.
     */
    getRoom: function getRoom(roomId) {
        return this.rooms[roomId] || null;
    },

    /**
     * Retrieve all known rooms.
     * @return {Room[]} A list of rooms, which may be empty.
     */
    getRooms: function getRooms() {
        return utils.values(this.rooms);
    },

    /**
     * Permanently delete a room.
     * @param {string} roomId
     */
    removeRoom: function removeRoom(roomId) {
        if (this.rooms[roomId]) {
            this.rooms[roomId].removeListener("RoomState.members", this._onRoomMember);
        }
        delete this.rooms[roomId];
    },

    /**
     * Retrieve a summary of all the rooms.
     * @return {RoomSummary[]} A summary of each room.
     */
    getRoomSummaries: function getRoomSummaries() {
        return utils.map(utils.values(this.rooms), function (room) {
            return room.summary;
        });
    },

    /**
     * Store a User.
     * @param {User} user The user to store.
     */
    storeUser: function storeUser(user) {
        this.users[user.userId] = user;
    },

    /**
     * Retrieve a User by its' user ID.
     * @param {string} userId The user ID.
     * @return {User} The user or null.
     */
    getUser: function getUser(userId) {
        return this.users[userId] || null;
    },

    /**
     * Retrieve all known users.
     * @return {User[]} A list of users, which may be empty.
     */
    getUsers: function getUsers() {
        return utils.values(this.users);
    },

    /**
     * Retrieve scrollback for this room.
     * @param {Room} room The matrix room
     * @param {integer} limit The max number of old events to retrieve.
     * @return {Array<Object>} An array of objects which will be at most 'limit'
     * length and at least 0. The objects are the raw event JSON.
     */
    scrollback: function scrollback(room, limit) {
        return [];
    },

    /**
     * Store events for a room. The events have already been added to the timeline
     * @param {Room} room The room to store events for.
     * @param {Array<MatrixEvent>} events The events to store.
     * @param {string} token The token associated with these events.
     * @param {boolean} toStart True if these are paginated results.
     */
    storeEvents: function storeEvents(room, events, token, toStart) {
        // no-op because they've already been added to the room instance.
    },

    /**
     * Store a filter.
     * @param {Filter} filter
     */
    storeFilter: function storeFilter(filter) {
        if (!filter) {
            return;
        }
        if (!this.filters[filter.userId]) {
            this.filters[filter.userId] = {};
        }
        this.filters[filter.userId][filter.filterId] = filter;
    },

    /**
     * Retrieve a filter.
     * @param {string} userId
     * @param {string} filterId
     * @return {?Filter} A filter or null.
     */
    getFilter: function getFilter(userId, filterId) {
        if (!this.filters[userId] || !this.filters[userId][filterId]) {
            return null;
        }
        return this.filters[userId][filterId];
    },

    /**
     * Retrieve a filter ID with the given name.
     * @param {string} filterName The filter name.
     * @return {?string} The filter ID or null.
     */
    getFilterIdByName: function getFilterIdByName(filterName) {
        if (!this.localStorage) {
            return null;
        }
        try {
            return this.localStorage.getItem("mxjssdk_memory_filter_" + filterName);
        } catch (e) {}
        return null;
    },

    /**
     * Set a filter name to ID mapping.
     * @param {string} filterName
     * @param {string} filterId
     */
    setFilterIdByName: function setFilterIdByName(filterName, filterId) {
        if (!this.localStorage) {
            return;
        }
        try {
            this.localStorage.setItem("mxjssdk_memory_filter_" + filterName, filterId);
        } catch (e) {}
    },

    /**
     * Store user-scoped account data events.
     * N.B. that account data only allows a single event per type, so multiple
     * events with the same type will replace each other.
     * @param {Array<MatrixEvent>} events The events to store.
     */
    storeAccountDataEvents: function storeAccountDataEvents(events) {
        var self = this;
        events.forEach(function (event) {
            self.accountData[event.getType()] = event;
        });
    },

    /**
     * Get account data event by event type
     * @param {string} eventType The event type being queried
     * @return {?MatrixEvent} the user account_data event of given type, if any
     */
    getAccountData: function getAccountData(eventType) {
        return this.accountData[eventType];
    }

};

},{"../models/user":27,"../utils":36}],32:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/**
 * @module store/session/webstorage
 */

var utils = require("../../utils");

var DEBUG = false; // set true to enable console logging.
var E2E_PREFIX = "session.e2e.";

/**
 * Construct a web storage session store, capable of storing account keys,
 * session keys and access tokens.
 * @constructor
 * @param {WebStorage} webStore A web storage implementation, e.g.
 * 'window.localStorage' or 'window.sessionStorage' or a custom implementation.
 * @throws if the supplied 'store' does not meet the Storage interface of the
 * WebStorage API.
 */
function WebStorageSessionStore(webStore) {
    this.store = webStore;
    if (!utils.isFunction(webStore.getItem) || !utils.isFunction(webStore.setItem) || !utils.isFunction(webStore.removeItem) || !utils.isFunction(webStore.key) || typeof webStore.length !== 'number') {
        throw new Error("Supplied webStore does not meet the WebStorage API interface");
    }
}

WebStorageSessionStore.prototype = {

    /**
     * Store the end to end account for the logged-in user.
     * @param {string} account Base64 encoded account.
     */
    storeEndToEndAccount: function storeEndToEndAccount(account) {
        this.store.setItem(KEY_END_TO_END_ACCOUNT, account);
    },

    /**
     * Load the end to end account for the logged-in user.
     * @return {?string} Base64 encoded account.
     */
    getEndToEndAccount: function getEndToEndAccount() {
        return this.store.getItem(KEY_END_TO_END_ACCOUNT);
    },

    /**
     * Store a flag indicating that we have announced the new device.
     */
    setDeviceAnnounced: function setDeviceAnnounced() {
        this.store.setItem(KEY_END_TO_END_ANNOUNCED, "true");
    },

    /**
     * Check if the "device announced" flag is set
     *
     * @return {boolean} true if the "device announced" flag has been set.
     */
    getDeviceAnnounced: function getDeviceAnnounced() {
        return this.store.getItem(KEY_END_TO_END_ANNOUNCED) == "true";
    },

    /**
     * Stores the known devices for a user.
     * @param {string} userId The user's ID.
     * @param {object} devices A map from device ID to keys for the device.
     */
    storeEndToEndDevicesForUser: function storeEndToEndDevicesForUser(userId, devices) {
        setJsonItem(this.store, keyEndToEndDevicesForUser(userId), devices);
    },

    /**
     * Retrieves the known devices for a user.
     * @param {string} userId The user's ID.
     * @return {object} A map from device ID to keys for the device.
     */
    getEndToEndDevicesForUser: function getEndToEndDevicesForUser(userId) {
        return getJsonItem(this.store, keyEndToEndDevicesForUser(userId));
    },

    /**
     * Store a session between the logged-in user and another device
     * @param {string} deviceKey The public key of the other device.
     * @param {string} sessionId The ID for this end-to-end session.
     * @param {string} session Base64 encoded end-to-end session.
     */
    storeEndToEndSession: function storeEndToEndSession(deviceKey, sessionId, session) {
        var sessions = this.getEndToEndSessions(deviceKey) || {};
        sessions[sessionId] = session;
        setJsonItem(this.store, keyEndToEndSessions(deviceKey), sessions);
    },

    /**
     * Retrieve the end-to-end sessions between the logged-in user and another
     * device.
     * @param {string} deviceKey The public key of the other device.
     * @return {object} A map from sessionId to Base64 end-to-end session.
     */
    getEndToEndSessions: function getEndToEndSessions(deviceKey) {
        return getJsonItem(this.store, keyEndToEndSessions(deviceKey));
    },

    /**
     * Retrieve a list of all known inbound group sessions
     *
     * @return {{senderKey: string, sessionId: string}}
     */
    getAllEndToEndInboundGroupSessionKeys: function getAllEndToEndInboundGroupSessionKeys() {
        var prefix = E2E_PREFIX + 'inboundgroupsessions/';
        var result = [];
        for (var i = 0; i < this.store.length; i++) {
            var key = this.store.key(i);
            if (!key.startsWith(prefix)) {
                continue;
            }
            // we can't use split, as the components we are trying to split out
            // might themselves contain '/' characters. We rely on the
            // senderKey being a (32-byte) curve25519 key, base64-encoded
            // (hence 43 characters long).

            result.push({
                senderKey: key.substr(prefix.length, 43),
                sessionId: key.substr(prefix.length + 44)
            });
        }
        return result;
    },

    getEndToEndInboundGroupSession: function getEndToEndInboundGroupSession(senderKey, sessionId) {
        var key = keyEndToEndInboundGroupSession(senderKey, sessionId);
        return this.store.getItem(key);
    },

    storeEndToEndInboundGroupSession: function storeEndToEndInboundGroupSession(senderKey, sessionId, pickledSession) {
        var key = keyEndToEndInboundGroupSession(senderKey, sessionId);
        return this.store.setItem(key, pickledSession);
    },

    /**
     * Store the end-to-end state for a room.
     * @param {string} roomId The room's ID.
     * @param {object} roomInfo The end-to-end info for the room.
     */
    storeEndToEndRoom: function storeEndToEndRoom(roomId, roomInfo) {
        setJsonItem(this.store, keyEndToEndRoom(roomId), roomInfo);
    },

    /**
     * Get the end-to-end state for a room
     * @param {string} roomId The room's ID.
     * @return {object} The end-to-end info for the room.
     */
    getEndToEndRoom: function getEndToEndRoom(roomId) {
        return getJsonItem(this.store, keyEndToEndRoom(roomId));
    }
};

var KEY_END_TO_END_ACCOUNT = E2E_PREFIX + "account";
var KEY_END_TO_END_ANNOUNCED = E2E_PREFIX + "announced";

function keyEndToEndDevicesForUser(userId) {
    return E2E_PREFIX + "devices/" + userId;
}

function keyEndToEndSessions(deviceKey) {
    return E2E_PREFIX + "sessions/" + deviceKey;
}

function keyEndToEndInboundGroupSession(senderKey, sessionId) {
    return E2E_PREFIX + "inboundgroupsessions/" + senderKey + "/" + sessionId;
}

function keyEndToEndRoom(roomId) {
    return E2E_PREFIX + "rooms/" + roomId;
}

function getJsonItem(store, key) {
    try {
        return JSON.parse(store.getItem(key));
    } catch (e) {
        debuglog("Failed to get key %s: %s", key, e);
        debuglog(e.stack);
    }
    return null;
}

function setJsonItem(store, key, val) {
    store.setItem(key, JSON.stringify(val));
}

function debuglog() {
    if (DEBUG) {
        var _console;

        (_console = console).log.apply(_console, arguments);
    }
}

/** */
module.exports = WebStorageSessionStore;

},{"../../utils":36}],33:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * This is an internal module.
 * @module store/stub
 */

/**
 * Construct a stub store. This does no-ops on most store methods.
 * @constructor
 */

function StubStore() {
  this.fromToken = null;
}

StubStore.prototype = {

  /**
   * Get the sync token.
   * @return {string}
   */
  getSyncToken: function getSyncToken() {
    return this.fromToken;
  },

  /**
   * Set the sync token.
   * @param {string} token
   */
  setSyncToken: function setSyncToken(token) {
    this.fromToken = token;
  },

  /**
   * No-op.
   * @param {Room} room
   */
  storeRoom: function storeRoom(room) {},

  /**
   * No-op.
   * @param {string} roomId
   * @return {null}
   */
  getRoom: function getRoom(roomId) {
    return null;
  },

  /**
   * No-op.
   * @return {Array} An empty array.
   */
  getRooms: function getRooms() {
    return [];
  },

  /**
   * Permanently delete a room.
   * @param {string} roomId
   */
  removeRoom: function removeRoom(roomId) {
    return;
  },

  /**
   * No-op.
   * @return {Array} An empty array.
   */
  getRoomSummaries: function getRoomSummaries() {
    return [];
  },

  /**
   * No-op.
   * @param {User} user
   */
  storeUser: function storeUser(user) {},

  /**
   * No-op.
   * @param {string} userId
   * @return {null}
   */
  getUser: function getUser(userId) {
    return null;
  },

  /**
   * No-op.
   * @return {User[]}
   */
  getUsers: function getUsers() {
    return [];
  },

  /**
   * No-op.
   * @param {Room} room
   * @param {integer} limit
   * @return {Array}
   */
  scrollback: function scrollback(room, limit) {
    return [];
  },

  /**
   * Store events for a room.
   * @param {Room} room The room to store events for.
   * @param {Array<MatrixEvent>} events The events to store.
   * @param {string} token The token associated with these events.
   * @param {boolean} toStart True if these are paginated results.
   */
  storeEvents: function storeEvents(room, events, token, toStart) {},

  /**
   * Store a filter.
   * @param {Filter} filter
   */
  storeFilter: function storeFilter(filter) {},

  /**
   * Retrieve a filter.
   * @param {string} userId
   * @param {string} filterId
   * @return {?Filter} A filter or null.
   */
  getFilter: function getFilter(userId, filterId) {
    return null;
  },

  /**
   * Retrieve a filter ID with the given name.
   * @param {string} filterName The filter name.
   * @return {?string} The filter ID or null.
   */
  getFilterIdByName: function getFilterIdByName(filterName) {
    return null;
  },

  /**
   * Set a filter name to ID mapping.
   * @param {string} filterName
   * @param {string} filterId
   */
  setFilterIdByName: function setFilterIdByName(filterName, filterId) {},

  /**
   * Store user-scoped account data events
   * @param {Array<MatrixEvent>} events The events to store.
   */
  storeAccountDataEvents: function storeAccountDataEvents(events) {},

  /**
   * Get account data event by event type
   * @param {string} eventType The event type being queried
   */
  getAccountData: function getAccountData(eventType) {}

};

/** Stub Store class. */
module.exports = StubStore;

},{}],34:[function(require,module,exports){
(function (global){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/*
 * TODO:
 * This class mainly serves to take all the syncing logic out of client.js and
 * into a separate file. It's all very fluid, and this class gut wrenches a lot
 * of MatrixClient props (e.g. _http). Given we want to support WebSockets as
 * an alternative syncing API, we may want to have a proper syncing interface
 * for HTTP and WS at some point.
 */

var q = require("q");
var User = require("./models/user");
var Room = require("./models/room");
var utils = require("./utils");
var Filter = require("./filter");
var EventTimeline = require("./models/event-timeline");

var DEBUG = true;

// /sync requests allow you to set a timeout= but the request may continue
// beyond that and wedge forever, so we need to track how long we are willing
// to keep open the connection. This constant is *ADDED* to the timeout= value
// to determine the max time we're willing to wait.
var BUFFER_PERIOD_MS = 80 * 1000;

function getFilterName(userId, suffix) {
    // scope this on the user ID because people may login on many accounts
    // and they all need to be stored!
    return "FILTER_SYNC_" + userId + (suffix ? "_" + suffix : "");
}

function debuglog() {
    var _console;

    if (!DEBUG) {
        return;
    }
    (_console = console).log.apply(_console, arguments);
}

/**
 * <b>Internal class - unstable.</b>
 * Construct an entity which is able to sync with a homeserver.
 * @constructor
 * @param {MatrixClient} client The matrix client instance to use.
 * @param {Object} opts Config options
 */
function SyncApi(client, opts) {
    this.client = client;
    opts = opts || {};
    opts.initialSyncLimit = opts.initialSyncLimit === undefined ? 8 : opts.initialSyncLimit;
    opts.resolveInvitesToProfiles = opts.resolveInvitesToProfiles || false;
    opts.pollTimeout = opts.pollTimeout || 30 * 1000;
    opts.pendingEventOrdering = opts.pendingEventOrdering || "chronological";
    this.opts = opts;
    this._peekRoomId = null;
    this._currentSyncRequest = null;
    this._syncState = null;
    this._running = false;
    this._keepAliveTimer = null;
    this._connectionReturnedDefer = null;
    this._notifEvents = []; // accumulator of sync events in the current sync response

    if (client.getNotifTimelineSet()) {
        reEmit(client, client.getNotifTimelineSet(), ["Room.timeline", "Room.timelineReset"]);
    }
}

/**
 * @param {string} roomId
 * @return {Room}
 */
SyncApi.prototype.createRoom = function (roomId) {
    var client = this.client;
    var room = new Room(roomId, {
        pendingEventOrdering: this.opts.pendingEventOrdering,
        timelineSupport: client.timelineSupport
    });
    reEmit(client, room, ["Room.name", "Room.timeline", "Room.redaction", "Room.receipt", "Room.tags", "Room.timelineReset", "Room.localEchoUpdated", "Room.accountData"]);
    this._registerStateListeners(room);
    return room;
};

/**
 * @param {Room} room
 * @private
 */
SyncApi.prototype._registerStateListeners = function (room) {
    var client = this.client;
    // we need to also re-emit room state and room member events, so hook it up
    // to the client now. We need to add a listener for RoomState.members in
    // order to hook them correctly. (TODO: find a better way?)
    reEmit(client, room.currentState, ["RoomState.events", "RoomState.members", "RoomState.newMember"]);
    room.currentState.on("RoomState.newMember", function (event, state, member) {
        member.user = client.getUser(member.userId);
        reEmit(client, member, ["RoomMember.name", "RoomMember.typing", "RoomMember.powerLevel", "RoomMember.membership"]);
    });
};

/**
 * @param {Room} room
 * @private
 */
SyncApi.prototype._deregisterStateListeners = function (room) {
    // could do with a better way of achieving this.
    room.currentState.removeAllListeners("RoomState.events");
    room.currentState.removeAllListeners("RoomState.members");
    room.currentState.removeAllListeners("RoomState.newMember");
};

/**
 * Sync rooms the user has left.
 * @return {Promise} Resolved when they've been added to the store.
 */
SyncApi.prototype.syncLeftRooms = function () {
    var client = this.client;
    var self = this;

    // grab a filter with limit=1 and include_leave=true
    var filter = new Filter(this.client.credentials.userId);
    filter.setTimelineLimit(1);
    filter.setIncludeLeaveRooms(true);

    var localTimeoutMs = this.opts.pollTimeout + BUFFER_PERIOD_MS;
    var qps = {
        timeout: 0 };

    return client.getOrCreateFilter(getFilterName(client.credentials.userId, "LEFT_ROOMS"), filter).then(function (filterId) {
        qps.filter = filterId;
        return client._http.authedRequest(undefined, "GET", "/sync", qps, undefined, localTimeoutMs);
    }).then(function (data) {
        var leaveRooms = [];
        if (data.rooms && data.rooms.leave) {
            leaveRooms = self._mapSyncResponseToRoomArray(data.rooms.leave);
        }
        var rooms = [];
        leaveRooms.forEach(function (leaveObj) {
            var room = leaveObj.room;
            rooms.push(room);
            if (!leaveObj.isBrandNewRoom) {
                // the intention behind syncLeftRooms is to add in rooms which were
                // *omitted* from the initial /sync. Rooms the user were joined to
                // but then left whilst the app is running will appear in this list
                // and we do not want to bother with them since they will have the
                // current state already (and may get dupe messages if we add
                // yet more timeline events!), so skip them.
                // NB: When we persist rooms to localStorage this will be more
                //     complicated...
                return;
            }
            leaveObj.timeline = leaveObj.timeline || {};
            var timelineEvents = self._mapSyncEventsFormat(leaveObj.timeline, room);
            var stateEvents = self._mapSyncEventsFormat(leaveObj.state, room);

            // set the back-pagination token. Do this *before* adding any
            // events so that clients can start back-paginating.
            room.getLiveTimeline().setPaginationToken(leaveObj.timeline.prev_batch, EventTimeline.BACKWARDS);

            self._processRoomEvents(room, stateEvents, timelineEvents);

            room.recalculate(client.credentials.userId);
            client.store.storeRoom(room);
            client.emit("Room", room);
        });
        return rooms;
    });
};

/**
 * Peek into a room. This will result in the room in question being synced so it
 * is accessible via getRooms(). Live updates for the room will be provided.
 * @param {string} roomId The room ID to peek into.
 * @return {Promise} A promise which resolves once the room has been added to the
 * store.
 */
SyncApi.prototype.peek = function (roomId) {
    var self = this;
    var client = this.client;
    this._peekRoomId = roomId;
    return this.client.roomInitialSync(roomId, 20).then(function (response) {
        // make sure things are init'd
        response.messages = response.messages || {};
        response.messages.chunk = response.messages.chunk || [];
        response.state = response.state || [];

        var peekRoom = self.createRoom(roomId);

        // FIXME: Mostly duplicated from _processRoomEvents but not entirely
        // because "state" in this API is at the BEGINNING of the chunk
        var oldStateEvents = utils.map(utils.deepCopy(response.state), client.getEventMapper());
        var stateEvents = utils.map(response.state, client.getEventMapper());
        var messages = utils.map(response.messages.chunk, client.getEventMapper());

        // XXX: copypasted from /sync until we kill off this
        // minging v1 API stuff)
        // handle presence events (User objects)
        if (response.presence && utils.isArray(response.presence)) {
            response.presence.map(client.getEventMapper()).forEach(function (presenceEvent) {
                var user = client.store.getUser(presenceEvent.getContent().user_id);
                if (user) {
                    user.setPresenceEvent(presenceEvent);
                } else {
                    user = createNewUser(client, presenceEvent.getContent().user_id);
                    user.setPresenceEvent(presenceEvent);
                    client.store.storeUser(user);
                }
                client.emit("event", presenceEvent);
            });
        }

        // set the pagination token before adding the events in case people
        // fire off pagination requests in response to the Room.timeline
        // events.
        if (response.messages.start) {
            peekRoom.oldState.paginationToken = response.messages.start;
        }

        // set the state of the room to as it was after the timeline executes
        peekRoom.oldState.setStateEvents(oldStateEvents);
        peekRoom.currentState.setStateEvents(stateEvents);

        self._resolveInvites(peekRoom);
        peekRoom.recalculate(self.client.credentials.userId);

        // roll backwards to diverge old state. addEventsToTimeline
        // will overwrite the pagination token, so make sure it overwrites
        // it with the right thing.
        peekRoom.addEventsToTimeline(messages.reverse(), true, peekRoom.getLiveTimeline(), response.messages.start);

        client.store.storeRoom(peekRoom);
        client.emit("Room", peekRoom);

        self._peekPoll(roomId);
        return peekRoom;
    });
};

/**
 * Stop polling for updates in the peeked room. NOPs if there is no room being
 * peeked.
 */
SyncApi.prototype.stopPeeking = function () {
    this._peekRoomId = null;
};

/**
 * Do a peek room poll.
 * @param {string} roomId
 * @param {string} token from= token
 */
SyncApi.prototype._peekPoll = function (roomId, token) {
    if (this._peekRoomId !== roomId) {
        debuglog("Stopped peeking in room %s", roomId);
        return;
    }

    var self = this;
    // FIXME: gut wrenching; hard-coded timeout values
    this.client._http.authedRequest(undefined, "GET", "/events", {
        room_id: roomId,
        timeout: 30 * 1000,
        from: token
    }, undefined, 50 * 1000).done(function (res) {
        // We have a problem that we get presence both from /events and /sync
        // however, /sync only returns presence for users in rooms
        // you're actually joined to.
        // in order to be sure to get presence for all of the users in the
        // peeked room, we handle presence explicitly here. This may result
        // in duplicate presence events firing for some users, which is a
        // performance drain, but such is life.
        // XXX: copypasted from /sync until we can kill this minging v1 stuff.

        res.chunk.filter(function (e) {
            return e.type === "m.presence";
        }).map(self.client.getEventMapper()).forEach(function (presenceEvent) {
            var user = self.client.store.getUser(presenceEvent.getContent().user_id);
            if (user) {
                user.setPresenceEvent(presenceEvent);
            } else {
                user = createNewUser(self.client, presenceEvent.getContent().user_id);
                user.setPresenceEvent(presenceEvent);
                self.client.store.storeUser(user);
            }
            self.client.emit("event", presenceEvent);
        });

        // strip out events which aren't for the given room_id (e.g presence)
        var events = res.chunk.filter(function (e) {
            return e.room_id === roomId;
        }).map(self.client.getEventMapper());
        var room = self.client.getRoom(roomId);
        room.addLiveEvents(events);
        self._peekPoll(roomId, res.end);
    }, function (err) {
        console.error("[%s] Peek poll failed: %s", roomId, err);
        setTimeout(function () {
            self._peekPoll(roomId, token);
        }, 30 * 1000);
    });
};

/**
 * Returns the current state of this sync object
 * @see module:client~MatrixClient#event:"sync"
 * @return {?String}
 */
SyncApi.prototype.getSyncState = function () {
    return this._syncState;
};

/**
 * Main entry point
 */
SyncApi.prototype.sync = function () {
    debuglog("SyncApi.sync: starting with sync token " + this.client.store.getSyncToken());

    var client = this.client;
    var self = this;

    this._running = true;

    if (global.document) {
        this._onOnlineBound = this._onOnline.bind(this);
        global.document.addEventListener("online", this._onOnlineBound, false);
    }

    // We need to do one-off checks before we can begin the /sync loop.
    // These are:
    //   1) We need to get push rules so we can check if events should bing as we get
    //      them from /sync.
    //   2) We need to get/create a filter which we can use for /sync.

    function getPushRules() {
        client.getPushRules().done(function (result) {
            debuglog("Got push rules");
            client.pushRules = result;
            getFilter(); // Now get the filter
        }, function (err) {
            self._startKeepAlives().done(function () {
                getPushRules();
            });
            self._updateSyncState("ERROR", { error: err });
        });
    }

    function getFilter() {
        var filter = void 0;
        if (self.opts.filter) {
            filter = self.opts.filter;
        } else {
            filter = new Filter(client.credentials.userId);
            filter.setTimelineLimit(self.opts.initialSyncLimit);
        }

        client.getOrCreateFilter(getFilterName(client.credentials.userId), filter).done(function (filterId) {
            // reset the notifications timeline to prepare it to paginate from
            // the current point in time.
            // The right solution would be to tie /sync pagination tokens into
            // /notifications API somehow.
            client.resetNotifTimelineSet();

            self._sync({ filterId: filterId });
        }, function (err) {
            self._startKeepAlives().done(function () {
                getFilter();
            });
            self._updateSyncState("ERROR", { error: err });
        });
    }

    if (client.isGuest()) {
        // no push rules for guests, no access to POST filter for guests.
        self._sync({});
    } else {
        getPushRules();
    }
};

/**
 * Stops the sync object from syncing.
 */
SyncApi.prototype.stop = function () {
    debuglog("SyncApi.stop");
    if (global.document) {
        global.document.removeEventListener("online", this._onOnlineBound, false);
        this._onOnlineBound = undefined;
    }
    this._running = false;
    if (this._currentSyncRequest) {
        this._currentSyncRequest.abort();
    }
    if (this._keepAliveTimer) {
        clearTimeout(this._keepAliveTimer);
        this._keepAliveTimer = null;
    }
};

/**
 * Retry a backed off syncing request immediately. This should only be used when
 * the user <b>explicitly</b> attempts to retry their lost connection.
 * @return {boolean} True if this resulted in a request being retried.
 */
SyncApi.prototype.retryImmediately = function () {
    if (!this._connectionReturnedDefer) {
        return false;
    }
    this._startKeepAlives(0);
    return true;
};

/**
 * Invoke me to do /sync calls
 * @param {Object} syncOptions
 * @param {string} syncOptions.filterId
 * @param {boolean} syncOptions.hasSyncedBefore
 */
SyncApi.prototype._sync = function (syncOptions) {
    var client = this.client;
    var self = this;

    if (!this._running) {
        debuglog("Sync no longer running: exiting.");
        if (self._connectionReturnedDefer) {
            self._connectionReturnedDefer.reject();
            self._connectionReturnedDefer = null;
        }
        this._updateSyncState("STOPPED");
        return;
    }

    var filterId = syncOptions.filterId;
    if (client.isGuest() && !filterId) {
        filterId = this._getGuestFilter();
    }

    var syncToken = client.store.getSyncToken();

    var qps = {
        filter: filterId,
        timeout: this.opts.pollTimeout
    };

    if (syncToken) {
        qps.since = syncToken;
    } else {
        // use a cachebuster for initialsyncs, to make sure that
        // we don't get a stale sync
        // (https://github.com/vector-im/vector-web/issues/1354)
        qps._cacheBuster = Date.now();
    }

    if (this.getSyncState() == 'ERROR' || this.getSyncState() == 'RECONNECTING') {
        // we think the connection is dead. If it comes back up, we won't know
        // about it till /sync returns. If the timeout= is high, this could
        // be a long time. Set it to 0 when doing retries so we don't have to wait
        // for an event or a timeout before emiting the SYNCING event.
        qps.timeout = 0;
    }

    // normal timeout= plus buffer time
    var clientSideTimeoutMs = this.opts.pollTimeout + BUFFER_PERIOD_MS;

    this._currentSyncRequest = client._http.authedRequest(undefined, "GET", "/sync", qps, undefined, clientSideTimeoutMs);

    this._currentSyncRequest.done(function (data) {
        // set the sync token NOW *before* processing the events. We do this so
        // if something barfs on an event we can skip it rather than constantly
        // polling with the same token.
        client.store.setSyncToken(data.next_batch);

        try {
            self._processSyncResponse(syncToken, data);
        } catch (e) {
            // log the exception with stack if we have it, else fall back
            // to the plain description
            console.error("Caught /sync error", e.stack || e);
        }

        // emit synced events
        if (!syncOptions.hasSyncedBefore) {
            self._updateSyncState("PREPARED");
            syncOptions.hasSyncedBefore = true;
        }

        // keep emitting SYNCING -> SYNCING for clients who want to do bulk updates
        self._updateSyncState("SYNCING");

        self._sync(syncOptions);
    }, function (err) {
        if (!self._running) {
            debuglog("Sync no longer running: exiting");
            if (self._connectionReturnedDefer) {
                self._connectionReturnedDefer.reject();
                self._connectionReturnedDefer = null;
            }
            self._updateSyncState("STOPPED");
            return;
        }
        console.error("/sync error %s", err);
        console.error(err);

        debuglog("Starting keep-alive");
        // Note that we do *not* mark the sync connection as
        // lost yet: we only do this if a keepalive poke
        // fails, since long lived HTTP connections will
        // go away sometimes and we shouldn't treat this as
        // erroneous. We set the state to 'reconnecting'
        // instead, so that clients can onserve this state
        // if they wish.
        self._startKeepAlives().done(function () {
            self._sync(syncOptions);
        });
        self._currentSyncRequest = null;
        self._updateSyncState("RECONNECTING");
    });
};

/**
 * Process data returned from a sync response and propagate it
 * into the model objects
 *
 * @param {string} syncToken the old next_batch token sent to this
 *    sync request.
 * @param {Object} data The response from /sync
 */
SyncApi.prototype._processSyncResponse = function (syncToken, data) {
    var client = this.client;
    var self = this;

    // data looks like:
    // {
    //    next_batch: $token,
    //    presence: { events: [] },
    //    account_data: { events: [] },
    //    to_device: { events: [] },
    //    rooms: {
    //      invite: {
    //        $roomid: {
    //          invite_state: { events: [] }
    //        }
    //      },
    //      join: {
    //        $roomid: {
    //          state: { events: [] },
    //          timeline: { events: [], prev_batch: $token, limited: true },
    //          ephemeral: { events: [] },
    //          account_data: { events: [] },
    //          unread_notifications: {
    //              highlight_count: 0,
    //              notification_count: 0,
    //          }
    //        }
    //      },
    //      leave: {
    //        $roomid: {
    //          state: { events: [] },
    //          timeline: { events: [], prev_batch: $token }
    //        }
    //      }
    //    },
    // }

    // TODO-arch:
    // - Each event we pass through needs to be emitted via 'event', can we
    //   do this in one place?
    // - The isBrandNewRoom boilerplate is boilerplatey.

    // handle presence events (User objects)
    if (data.presence && utils.isArray(data.presence.events)) {
        data.presence.events.map(client.getEventMapper()).forEach(function (presenceEvent) {
            var user = client.store.getUser(presenceEvent.getSender());
            if (user) {
                user.setPresenceEvent(presenceEvent);
            } else {
                user = createNewUser(client, presenceEvent.getSender());
                user.setPresenceEvent(presenceEvent);
                client.store.storeUser(user);
            }
            client.emit("event", presenceEvent);
        });
    }

    // handle non-room account_data
    if (data.account_data && utils.isArray(data.account_data.events)) {
        var events = data.account_data.events.map(client.getEventMapper());
        client.store.storeAccountDataEvents(events);
        events.forEach(function (accountDataEvent) {
            if (accountDataEvent.getType() == 'm.push_rules') {
                client.pushRules = accountDataEvent.getContent();
            }
            client.emit("accountData", accountDataEvent);
            return accountDataEvent;
        });
    }

    // handle to-device events
    if (data.to_device && utils.isArray(data.to_device.events)) {
        data.to_device.events.map(client.getEventMapper()).forEach(function (toDeviceEvent) {
            var content = toDeviceEvent.getContent();
            if (toDeviceEvent.getType() == "m.room.message" && content.msgtype == "m.bad.encrypted") {
                console.warn("Unable to decrypt to-device event: " + content.body);
                return;
            }

            client.emit("toDeviceEvent", toDeviceEvent);
        });
    }

    // the returned json structure is a bit crap, so make it into a
    // nicer form (array) after applying sanity to make sure we don't fail
    // on missing keys (on the off chance)
    var inviteRooms = [];
    var joinRooms = [];
    var leaveRooms = [];

    if (data.rooms) {
        if (data.rooms.invite) {
            inviteRooms = this._mapSyncResponseToRoomArray(data.rooms.invite);
        }
        if (data.rooms.join) {
            joinRooms = this._mapSyncResponseToRoomArray(data.rooms.join);
        }
        if (data.rooms.leave) {
            leaveRooms = this._mapSyncResponseToRoomArray(data.rooms.leave);
        }
    }

    this._notifEvents = [];

    // Handle invites
    inviteRooms.forEach(function (inviteObj) {
        var room = inviteObj.room;
        var stateEvents = self._mapSyncEventsFormat(inviteObj.invite_state, room);
        self._processRoomEvents(room, stateEvents);
        if (inviteObj.isBrandNewRoom) {
            room.recalculate(client.credentials.userId);
            client.store.storeRoom(room);
            client.emit("Room", room);
        }
        stateEvents.forEach(function (e) {
            client.emit("event", e);
        });
    });

    // Handle joins
    joinRooms.forEach(function (joinObj) {
        var room = joinObj.room;
        var stateEvents = self._mapSyncEventsFormat(joinObj.state, room);
        var timelineEvents = self._mapSyncEventsFormat(joinObj.timeline, room);
        var ephemeralEvents = self._mapSyncEventsFormat(joinObj.ephemeral);
        var accountDataEvents = self._mapSyncEventsFormat(joinObj.account_data);

        // we do this first so it's correct when any of the events fire
        if (joinObj.unread_notifications) {
            room.setUnreadNotificationCount('total', joinObj.unread_notifications.notification_count);
            room.setUnreadNotificationCount('highlight', joinObj.unread_notifications.highlight_count);
        }

        joinObj.timeline = joinObj.timeline || {};

        if (joinObj.isBrandNewRoom) {
            // set the back-pagination token. Do this *before* adding any
            // events so that clients can start back-paginating.
            room.getLiveTimeline().setPaginationToken(joinObj.timeline.prev_batch, EventTimeline.BACKWARDS);
        } else if (joinObj.timeline.limited) {
            var limited = true;

            // we've got a limited sync, so we *probably* have a gap in the
            // timeline, so should reset. But we might have been peeking or
            // paginating and already have some of the events, in which
            // case we just want to append any subsequent events to the end
            // of the existing timeline.
            //
            // This is particularly important in the case that we already have
            // *all* of the events in the timeline - in that case, if we reset
            // the timeline, we'll end up with an entirely empty timeline,
            // which we'll try to paginate but not get any new events (which
            // will stop us linking the empty timeline into the chain).
            //
            for (var i = timelineEvents.length - 1; i >= 0; i--) {
                var eventId = timelineEvents[i].getId();
                if (room.getTimelineForEvent(eventId)) {
                    debuglog("Already have event " + eventId + " in limited " + "sync - not resetting");
                    limited = false;

                    // we might still be missing some of the events before i;
                    // we don't want to be adding them to the end of the
                    // timeline because that would put them out of order.
                    timelineEvents.splice(0, i);

                    // XXX: there's a problem here if the skipped part of the
                    // timeline modifies the state set in stateEvents, because
                    // we'll end up using the state from stateEvents rather
                    // than the later state from timelineEvents. We probably
                    // need to wind stateEvents forward over the events we're
                    // skipping.

                    break;
                }
            }

            if (limited) {
                // save the old 'next_batch' token as the
                // forward-pagination token for the previously-active
                // timeline.
                room.currentState.paginationToken = syncToken;
                self._deregisterStateListeners(room);
                room.resetLiveTimeline(joinObj.timeline.prev_batch);

                // We have to assume any gap in any timeline is
                // reason to stop incrementally tracking notifications and
                // reset the timeline.
                client.resetNotifTimelineSet();

                self._registerStateListeners(room);
            }
        }

        self._processRoomEvents(room, stateEvents, timelineEvents);

        // XXX: should we be adding ephemeralEvents to the timeline?
        // It feels like that for symmetry with room.addAccountData()
        // there should be a room.addEphemeralEvents() or similar.
        room.addLiveEvents(ephemeralEvents);

        // we deliberately don't add accountData to the timeline
        room.addAccountData(accountDataEvents);

        room.recalculate(client.credentials.userId);
        if (joinObj.isBrandNewRoom) {
            client.store.storeRoom(room);
            client.emit("Room", room);
        }
        stateEvents.forEach(function (e) {
            client.emit("event", e);
        });
        timelineEvents.forEach(function (e) {
            client.emit("event", e);
        });
        ephemeralEvents.forEach(function (e) {
            client.emit("event", e);
        });
        accountDataEvents.forEach(function (e) {
            client.emit("event", e);
        });
    });

    // Handle leaves (e.g. kicked rooms)
    leaveRooms.forEach(function (leaveObj) {
        var room = leaveObj.room;
        var stateEvents = self._mapSyncEventsFormat(leaveObj.state, room);
        var timelineEvents = self._mapSyncEventsFormat(leaveObj.timeline, room);
        var accountDataEvents = self._mapSyncEventsFormat(leaveObj.account_data);

        self._processRoomEvents(room, stateEvents, timelineEvents);
        room.addAccountData(accountDataEvents);

        room.recalculate(client.credentials.userId);
        if (leaveObj.isBrandNewRoom) {
            client.store.storeRoom(room);
            client.emit("Room", room);
        }

        stateEvents.forEach(function (e) {
            client.emit("event", e);
        });
        timelineEvents.forEach(function (e) {
            client.emit("event", e);
        });
        accountDataEvents.forEach(function (e) {
            client.emit("event", e);
        });
    });

    // update the notification timeline, if appropriate.
    // we only do this for live events, as otherwise we can't order them sanely
    // in the timeline relative to ones paginated in by /notifications.
    // XXX: we could fix this by making EventTimeline support chronological
    // ordering... but it doesn't, right now.
    if (syncToken && this._notifEvents.length) {
        this._notifEvents.sort(function (a, b) {
            return a.getTs() - b.getTs();
        });
        this._notifEvents.forEach(function (event) {
            client.getNotifTimelineSet().addLiveEvent(event);
        });
    }
};

/**
 * Starts polling the connectivity check endpoint
 * @param {number} delay How long to delay until the first poll.
 *        defaults to a short, randomised interval (to prevent
 *        tightlooping if /versions succeeds but /sync etc. fail).
 * @return {promise}
 */
SyncApi.prototype._startKeepAlives = function (delay) {
    if (delay === undefined) {
        delay = 2000 + Math.floor(Math.random() * 5000);
    }

    if (this._keepAliveTimer !== null) {
        clearTimeout(this._keepAliveTimer);
    }
    var self = this;
    if (delay > 0) {
        self._keepAliveTimer = setTimeout(self._pokeKeepAlive.bind(self), delay);
    } else {
        self._pokeKeepAlive();
    }
    if (!this._connectionReturnedDefer) {
        this._connectionReturnedDefer = q.defer();
    }
    return this._connectionReturnedDefer.promise;
};

/**
 *
 */
SyncApi.prototype._pokeKeepAlive = function () {
    var self = this;
    function success() {
        clearTimeout(self._keepAliveTimer);
        if (self._connectionReturnedDefer) {
            self._connectionReturnedDefer.resolve();
            self._connectionReturnedDefer = null;
        }
    }

    this.client._http.request(undefined, // callback
    "GET", "/_matrix/client/versions", undefined, // queryParams
    undefined, // data
    {
        prefix: '',
        localTimeoutMs: 15 * 1000
    }).done(function () {
        success();
    }, function (err) {
        if (err.httpStatus == 400) {
            // treat this as a success because the server probably just doesn't
            // support /versions: point is, we're getting a response.
            // We wait a short time though, just in case somehow the server
            // is in a mode where it 400s /versions responses and sync etc.
            // responses fail, this will mean we don't hammer in a loop.
            self._keepAliveTimer = setTimeout(success, 2000);
        } else {
            self._keepAliveTimer = setTimeout(self._pokeKeepAlive.bind(self), 5000 + Math.floor(Math.random() * 5000));
            // A keepalive has failed, so we emit the
            // error state (whether or not this is the
            // first failure).
            // Note we do this after setting the timer:
            // this lets the unit tests advance the mock
            // clock when the get the error.
            self._updateSyncState("ERROR", { error: err });
        }
    });
};

/**
 * @param {Object} obj
 * @return {Object[]}
 */
SyncApi.prototype._mapSyncResponseToRoomArray = function (obj) {
    // Maps { roomid: {stuff}, roomid: {stuff} }
    // to
    // [{stuff+Room+isBrandNewRoom}, {stuff+Room+isBrandNewRoom}]
    var client = this.client;
    var self = this;
    return utils.keys(obj).map(function (roomId) {
        var arrObj = obj[roomId];
        var room = client.store.getRoom(roomId);
        var isBrandNewRoom = false;
        if (!room) {
            room = self.createRoom(roomId);
            isBrandNewRoom = true;
        }
        arrObj.room = room;
        arrObj.isBrandNewRoom = isBrandNewRoom;
        return arrObj;
    });
};

/**
 * @param {Object} obj
 * @param {Room} room
 * @return {MatrixEvent[]}
 */
SyncApi.prototype._mapSyncEventsFormat = function (obj, room) {
    if (!obj || !utils.isArray(obj.events)) {
        return [];
    }
    var mapper = this.client.getEventMapper();
    return obj.events.map(function (e) {
        if (room) {
            e.room_id = room.roomId;
        }
        return mapper(e);
    });
};

/**
 * @param {Room} room
 */
SyncApi.prototype._resolveInvites = function (room) {
    if (!room || !this.opts.resolveInvitesToProfiles) {
        return;
    }
    var client = this.client;
    // For each invited room member we want to give them a displayname/avatar url
    // if they have one (the m.room.member invites don't contain this).
    room.getMembersWithMembership("invite").forEach(function (member) {
        if (member._requestedProfileInfo) {
            return;
        }
        member._requestedProfileInfo = true;
        // try to get a cached copy first.
        var user = client.getUser(member.userId);
        var promise = void 0;
        if (user) {
            promise = q({
                avatar_url: user.avatarUrl,
                displayname: user.displayName
            });
        } else {
            promise = client.getProfileInfo(member.userId);
        }
        promise.done(function (info) {
            // slightly naughty by doctoring the invite event but this means all
            // the code paths remain the same between invite/join display name stuff
            // which is a worthy trade-off for some minor pollution.
            var inviteEvent = member.events.member;
            if (inviteEvent.getContent().membership !== "invite") {
                // between resolving and now they have since joined, so don't clobber
                return;
            }
            inviteEvent.getContent().avatar_url = info.avatar_url;
            inviteEvent.getContent().displayname = info.displayname;
            // fire listeners
            member.setMembershipEvent(inviteEvent, room.currentState);
        }, function (err) {
            // OH WELL.
        });
    });
};

/**
 * @param {Room} room
 * @param {MatrixEvent[]} stateEventList A list of state events. This is the state
 * at the *START* of the timeline list if it is supplied.
 * @param {MatrixEvent[]} [timelineEventList] A list of timeline events. Lower index
 * is earlier in time. Higher index is later.
 */
SyncApi.prototype._processRoomEvents = function (room, stateEventList, timelineEventList) {
    timelineEventList = timelineEventList || [];
    var client = this.client;
    // "old" and "current" state are the same initially; they
    // start diverging if the user paginates.
    // We must deep copy otherwise membership changes in old state
    // will leak through to current state!
    var oldStateEvents = utils.map(utils.deepCopy(stateEventList.map(function (mxEvent) {
        return mxEvent.event;
    })), client.getEventMapper());
    var stateEvents = stateEventList;

    // set the state of the room to as it was before the timeline executes
    //
    // XXX: what if we've already seen (some of) the events in the timeline,
    // and they modify some of the state set in stateEvents? In that case we'll
    // end up with the state from stateEvents, instead of the more recent state
    // from the timeline.
    room.oldState.setStateEvents(oldStateEvents);
    room.currentState.setStateEvents(stateEvents);

    this._resolveInvites(room);

    // recalculate the room name at this point as adding events to the timeline
    // may make notifications appear which should have the right name.
    room.recalculate(this.client.credentials.userId);

    // gather our notifications into this._notifEvents
    if (client.getNotifTimelineSet()) {
        for (var i = 0; i < timelineEventList.length; i++) {
            var pushActions = client.getPushActionsForEvent(timelineEventList[i]);
            if (pushActions && pushActions.notify && pushActions.tweaks && pushActions.tweaks.highlight) {
                this._notifEvents.push(timelineEventList[i]);
            }
        }
    }

    // execute the timeline events, this will begin to diverge the current state
    // if the timeline has any state events in it.
    room.addLiveEvents(timelineEventList);
};

/**
 * @return {string}
 */
SyncApi.prototype._getGuestFilter = function () {
    var guestRooms = this.client._guestRooms; // FIXME: horrible gut-wrenching
    if (!guestRooms) {
        return "{}";
    }
    // we just need to specify the filter inline if we're a guest because guests
    // can't create filters.
    return JSON.stringify({
        room: {
            timeline: {
                limit: 20
            }
        }
    });
};

/**
 * Sets the sync state and emits an event to say so
 * @param {String} newState The new state string
 * @param {Object} data Object of additional data to emit in the event
 */
SyncApi.prototype._updateSyncState = function (newState, data) {
    var old = this._syncState;
    this._syncState = newState;
    this.client.emit("sync", this._syncState, old, data);
};

/**
 * Event handler for the 'online' event
 * This event is generally unreliable and precise behaviour
 * varies between browsers, so we poll for connectivity too,
 * but this might help us reconnect a little faster.
 */
SyncApi.prototype._onOnline = function () {
    debuglog("Browser thinks we are back online");
    this._startKeepAlives(0);
};

function createNewUser(client, userId) {
    var user = new User(userId);
    reEmit(client, user, ["User.avatarUrl", "User.displayName", "User.presence", "User.currentlyActive", "User.lastPresenceTs"]);
    return user;
}

function reEmit(reEmitEntity, emittableEntity, eventNames) {
    utils.forEach(eventNames, function (eventName) {
        // setup a listener on the entity (the Room, User, etc) for this event
        emittableEntity.on(eventName, function () {
            // take the args from the listener and reuse them, adding the
            // event name to the arg list so it works with .emit()
            // Transformation Example:
            // listener on "foo" => function(a,b) { ... }
            // Re-emit on "thing" => thing.emit("foo", a, b)
            var newArgs = [eventName];
            for (var i = 0; i < arguments.length; i++) {
                newArgs.push(arguments[i]);
            }
            reEmitEntity.emit.apply(reEmitEntity, newArgs);
        });
    });
}

/** */
module.exports = SyncApi;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./filter":14,"./models/event-timeline":20,"./models/room":25,"./models/user":27,"./utils":36,"q":42}],35:[function(require,module,exports){
/*
Copyright 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

/** @module timeline-window */

var q = require("q");
var EventTimeline = require("./models/event-timeline");

/**
 * @private
 */
var DEBUG = false;

/**
 * @private
 */
var debuglog = DEBUG ? console.log.bind(console) : function () {};

/**
 * the number of times we ask the server for more events before giving up
 *
 * @private
 */
var DEFAULT_PAGINATE_LOOP_LIMIT = 5;

/**
 * Construct a TimelineWindow.
 *
 * <p>This abstracts the separate timelines in a Matrix {@link
 * module:models/room|Room} into a single iterable thing. It keeps track of
 * the start and endpoints of the window, which can be advanced with the help
 * of pagination requests.
 *
 * <p>Before the window is useful, it must be initialised by calling {@link
 * module:timeline-window~TimelineWindow#load|load}.
 *
 * <p>Note that the window will not automatically extend itself when new events
 * are received from /sync; you should arrange to call {@link
 * module:timeline-window~TimelineWindow#paginate|paginate} on {@link
 * module:client~MatrixClient.event:"Room.timeline"|Room.timeline} events.
 *
 * @param {MatrixClient} client   MatrixClient to be used for context/pagination
 *   requests.
 *
 * @param {EventTimelineSet} timelineSet  The timelineSet to track
 *
 * @param {Object} [opts] Configuration options for this window
 *
 * @param {number} [opts.windowLimit = 1000] maximum number of events to keep
 *    in the window. If more events are retrieved via pagination requests,
 *    excess events will be dropped from the other end of the window.
 *
 * @constructor
 */
function TimelineWindow(client, timelineSet, opts) {
    opts = opts || {};
    this._client = client;
    this._timelineSet = timelineSet;

    // these will be TimelineIndex objects; they delineate the 'start' and
    // 'end' of the window.
    //
    // _start.index is inclusive; _end.index is exclusive.
    this._start = null;
    this._end = null;

    this._eventCount = 0;
    this._windowLimit = opts.windowLimit || 1000;
}

/**
 * Initialise the window to point at a given event, or the live timeline
 *
 * @param {string} [initialEventId]   If given, the window will contain the
 *    given event
 * @param {number} [initialWindowSize = 20]   Size of the initial window
 *
 * @return {module:client.Promise}
 */
TimelineWindow.prototype.load = function (initialEventId, initialWindowSize) {
    var self = this;
    initialWindowSize = initialWindowSize || 20;

    // given an EventTimeline, and an event index within it, initialise our
    // fields so that the event in question is in the middle of the window.
    var initFields = function initFields(timeline, eventIndex) {
        var endIndex = Math.min(timeline.getEvents().length, eventIndex + Math.ceil(initialWindowSize / 2));
        var startIndex = Math.max(0, endIndex - initialWindowSize);
        self._start = new TimelineIndex(timeline, startIndex - timeline.getBaseIndex());
        self._end = new TimelineIndex(timeline, endIndex - timeline.getBaseIndex());
        self._eventCount = endIndex - startIndex;
    };

    // We avoid delaying the resolution of the promise by a reactor tick if
    // we already have the data we need, which is important to keep room-switching
    // feeling snappy.
    //
    // TODO: ideally we'd spot getEventTimeline returning a resolved promise and
    // skip straight to the find-event loop.
    if (initialEventId) {
        return this._client.getEventTimeline(this._timelineSet, initialEventId).then(function (tl) {
            // make sure that our window includes the event
            for (var i = 0; i < tl.getEvents().length; i++) {
                if (tl.getEvents()[i].getId() == initialEventId) {
                    initFields(tl, i);
                    return;
                }
            }
            throw new Error("getEventTimeline result didn't include requested event");
        });
    } else {
        // start with the most recent events
        var tl = this._timelineSet.getLiveTimeline();
        initFields(tl, tl.getEvents().length);
        return q();
    }
};

/**
 * Check if this window can be extended
 *
 * <p>This returns true if we either have more events, or if we have a
 * pagination token which means we can paginate in that direction. It does not
 * necessarily mean that there are more events available in that direction at
 * this time.
 *
 * @param {string} direction   EventTimeline.BACKWARDS to check if we can
 *   paginate backwards; EventTimeline.FORWARDS to check if we can go forwards
 *
 * @return {boolean} true if we can paginate in the given direction
 */
TimelineWindow.prototype.canPaginate = function (direction) {
    var tl = void 0;
    if (direction == EventTimeline.BACKWARDS) {
        tl = this._start;
    } else if (direction == EventTimeline.FORWARDS) {
        tl = this._end;
    } else {
        throw new Error("Invalid direction '" + direction + "'");
    }

    if (!tl) {
        debuglog("TimelineWindow: no timeline yet");
        return false;
    }

    if (direction == EventTimeline.BACKWARDS) {
        if (tl.index > tl.minIndex()) {
            return true;
        }
    } else {
        if (tl.index < tl.maxIndex()) {
            return true;
        }
    }

    return Boolean(tl.timeline.getNeighbouringTimeline(direction) || tl.timeline.getPaginationToken(direction));
};

/**
 * Attempt to extend the window
 *
 * @param {string} direction   EventTimeline.BACKWARDS to extend the window
 *    backwards (towards older events); EventTimeline.FORWARDS to go forwards.
 *
 * @param {number} size   number of events to try to extend by. If fewer than this
 *    number are immediately available, then we return immediately rather than
 *    making an API call.
 *
 * @param {boolean} [makeRequest = true] whether we should make API calls to
 *    fetch further events if we don't have any at all. (This has no effect if
 *    the room already knows about additional events in the relevant direction,
 *    even if there are fewer than 'size' of them, as we will just return those
 *    we already know about.)
 *
 * @param {number} [requestLimit = 5] limit for the number of API requests we
 *    should make.
 *
 * @return {module:client.Promise} Resolves to a boolean which is true if more events
 *    were successfully retrieved.
 */
TimelineWindow.prototype.paginate = function (direction, size, makeRequest, requestLimit) {
    // Either wind back the message cap (if there are enough events in the
    // timeline to do so), or fire off a pagination request.

    if (makeRequest === undefined) {
        makeRequest = true;
    }

    if (requestLimit === undefined) {
        requestLimit = DEFAULT_PAGINATE_LOOP_LIMIT;
    }

    var tl = void 0;
    if (direction == EventTimeline.BACKWARDS) {
        tl = this._start;
    } else if (direction == EventTimeline.FORWARDS) {
        tl = this._end;
    } else {
        throw new Error("Invalid direction '" + direction + "'");
    }

    if (!tl) {
        debuglog("TimelineWindow: no timeline yet");
        return q(false);
    }

    if (tl.pendingPaginate) {
        return tl.pendingPaginate;
    }

    // try moving the cap
    var count = direction == EventTimeline.BACKWARDS ? tl.retreat(size) : tl.advance(size);

    if (count) {
        this._eventCount += count;
        debuglog("TimelineWindow: increased cap by " + count + " (now " + this._eventCount + ")");
        // remove some events from the other end, if necessary
        var excess = this._eventCount - this._windowLimit;
        if (excess > 0) {
            this.unpaginate(excess, direction != EventTimeline.BACKWARDS);
        }
        return q(true);
    }

    if (!makeRequest || requestLimit === 0) {
        // todo: should we return something different to indicate that there
        // might be more events out there, but we haven't found them yet?
        return q(false);
    }

    // try making a pagination request
    var token = tl.timeline.getPaginationToken(direction);
    if (!token) {
        debuglog("TimelineWindow: no token");
        return q(false);
    }

    debuglog("TimelineWindow: starting request");
    var self = this;

    var prom = this._client.paginateEventTimeline(tl.timeline, {
        backwards: direction == EventTimeline.BACKWARDS,
        limit: size
    }).finally(function () {
        tl.pendingPaginate = null;
    }).then(function (r) {
        debuglog("TimelineWindow: request completed with result " + r);
        if (!r) {
            // end of timeline
            return false;
        }

        // recurse to advance the index into the results.
        //
        // If we don't get any new events, we want to make sure we keep asking
        // the server for events for as long as we have a valid pagination
        // token. In particular, we want to know if we've actually hit the
        // start of the timeline, or if we just happened to know about all of
        // the events thanks to https://matrix.org/jira/browse/SYN-645.
        //
        // On the other hand, we necessarily want to wait forever for the
        // server to make its mind up about whether there are other events,
        // because it gives a bad user experience
        // (https://github.com/vector-im/vector-web/issues/1204).
        return self.paginate(direction, size, true, requestLimit - 1);
    });
    tl.pendingPaginate = prom;
    return prom;
};

/**
 * Remove `delta` events from the start or end of the timeline.
 *
 * @param {number}  delta           number of events to remove from the timeline
 * @param {boolean} startOfTimeline if events should be removed from the start
 *     of the timeline.
 */
TimelineWindow.prototype.unpaginate = function (delta, startOfTimeline) {
    var tl = startOfTimeline ? this._start : this._end;

    // sanity-check the delta
    if (delta > this._eventCount || delta < 0) {
        throw new Error("Attemting to unpaginate " + delta + " events, but " + "only have " + this._eventCount + " in the timeline");
    }

    while (delta > 0) {
        var count = startOfTimeline ? tl.advance(delta) : tl.retreat(delta);
        if (count <= 0) {
            // sadness. This shouldn't be possible.
            throw new Error("Unable to unpaginate any further, but still have " + this._eventCount + " events");
        }

        delta -= count;
        this._eventCount -= count;
        debuglog("TimelineWindow.unpaginate: dropped " + count + " (now " + this._eventCount + ")");
    }
};

/**
 * Get a list of the events currently in the window
 *
 * @return {MatrixEvent[]} the events in the window
 */
TimelineWindow.prototype.getEvents = function () {
    if (!this._start) {
        // not yet loaded
        return [];
    }

    var result = [];

    // iterate through each timeline between this._start and this._end
    // (inclusive).
    var timeline = this._start.timeline;
    while (true) {
        var events = timeline.getEvents();

        // For the first timeline in the chain, we want to start at
        // this._start.index. For the last timeline in the chain, we want to
        // stop before this._end.index. Otherwise, we want to copy all of the
        // events in the timeline.
        //
        // (Note that both this._start.index and this._end.index are relative
        // to their respective timelines' BaseIndex).
        //
        var startIndex = 0,
            endIndex = events.length;
        if (timeline === this._start.timeline) {
            startIndex = this._start.index + timeline.getBaseIndex();
        }
        if (timeline === this._end.timeline) {
            endIndex = this._end.index + timeline.getBaseIndex();
        }

        for (var i = startIndex; i < endIndex; i++) {
            result.push(events[i]);
        }

        // if we're not done, iterate to the next timeline.
        if (timeline === this._end.timeline) {
            break;
        } else {
            timeline = timeline.getNeighbouringTimeline(EventTimeline.FORWARDS);
        }
    }

    return result;
};

/**
 * a thing which contains a timeline reference, and an index into it.
 *
 * @constructor
 * @param {EventTimeline} timeline
 * @param {number} index
 * @private
 */
function TimelineIndex(timeline, index) {
    this.timeline = timeline;

    // the indexes are relative to BaseIndex, so could well be negative.
    this.index = index;
}

/**
 * @return {number} the minimum possible value for the index in the current
 *    timeline
 */
TimelineIndex.prototype.minIndex = function () {
    return this.timeline.getBaseIndex() * -1;
};

/**
 * @return {number} the maximum possible value for the index in the current
 *    timeline (exclusive - ie, it actually returns one more than the index
 *    of the last element).
 */
TimelineIndex.prototype.maxIndex = function () {
    return this.timeline.getEvents().length - this.timeline.getBaseIndex();
};

/**
 * Try move the index forward, or into the neighbouring timeline
 *
 * @param {number} delta  number of events to advance by
 * @return {number} number of events successfully advanced by
 */
TimelineIndex.prototype.advance = function (delta) {
    if (!delta) {
        return 0;
    }

    // first try moving the index in the current timeline. See if there is room
    // to do so.
    var cappedDelta = void 0;
    if (delta < 0) {
        // we want to wind the index backwards.
        //
        // (this.minIndex() - this.index) is a negative number whose magnitude
        // is the amount of room we have to wind back the index in the current
        // timeline. We cap delta to this quantity.
        cappedDelta = Math.max(delta, this.minIndex() - this.index);
        if (cappedDelta < 0) {
            this.index += cappedDelta;
            return cappedDelta;
        }
    } else {
        // we want to wind the index forwards.
        //
        // (this.maxIndex() - this.index) is a (positive) number whose magnitude
        // is the amount of room we have to wind forward the index in the current
        // timeline. We cap delta to this quantity.
        cappedDelta = Math.min(delta, this.maxIndex() - this.index);
        if (cappedDelta > 0) {
            this.index += cappedDelta;
            return cappedDelta;
        }
    }

    // the index is already at the start/end of the current timeline.
    //
    // next see if there is a neighbouring timeline to switch to.
    var neighbour = this.timeline.getNeighbouringTimeline(delta < 0 ? EventTimeline.BACKWARDS : EventTimeline.FORWARDS);
    if (neighbour) {
        this.timeline = neighbour;
        if (delta < 0) {
            this.index = this.maxIndex();
        } else {
            this.index = this.minIndex();
        }

        debuglog("paginate: switched to new neighbour");

        // recurse, using the next timeline
        return this.advance(delta);
    }

    return 0;
};

/**
 * Try move the index backwards, or into the neighbouring timeline
 *
 * @param {number} delta  number of events to retreat by
 * @return {number} number of events successfully retreated by
 */
TimelineIndex.prototype.retreat = function (delta) {
    return this.advance(delta * -1) * -1;
};

/**
 * The TimelineWindow class.
 */
module.exports.TimelineWindow = TimelineWindow;

/**
 * The TimelineIndex class. exported here for unit testing.
 */
module.exports.TimelineIndex = TimelineIndex;

},{"./models/event-timeline":20,"q":42}],36:[function(require,module,exports){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * This is an internal module.
 * @module utils
 */

/**
 * Encode a dictionary of query parameters.
 * @param {Object} params A dict of key/values to encode e.g.
 * {"foo": "bar", "baz": "taz"}
 * @return {string} The encoded string e.g. foo=bar&baz=taz
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports.encodeParams = function (params) {
    var qs = "";
    for (var key in params) {
        if (!params.hasOwnProperty(key)) {
            continue;
        }
        qs += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    }
    return qs.substring(1);
};

/**
 * Encodes a URI according to a set of template variables. Variables will be
 * passed through encodeURIComponent.
 * @param {string} pathTemplate The path with template variables e.g. '/foo/$bar'.
 * @param {Object} variables The key/value pairs to replace the template
 * variables with. E.g. { "$bar": "baz" }.
 * @return {string} The result of replacing all template variables e.g. '/foo/baz'.
 */
module.exports.encodeUri = function (pathTemplate, variables) {
    for (var key in variables) {
        if (!variables.hasOwnProperty(key)) {
            continue;
        }
        pathTemplate = pathTemplate.replace(key, encodeURIComponent(variables[key]));
    }
    return pathTemplate;
};

/**
 * Applies a map function to the given array.
 * @param {Array} array The array to apply the function to.
 * @param {Function} fn The function that will be invoked for each element in
 * the array with the signature <code>fn(element){...}</code>
 * @return {Array} A new array with the results of the function.
 */
module.exports.map = function (array, fn) {
    var results = new Array(array.length);
    for (var i = 0; i < array.length; i++) {
        results[i] = fn(array[i]);
    }
    return results;
};

/**
 * Applies a filter function to the given array.
 * @param {Array} array The array to apply the function to.
 * @param {Function} fn The function that will be invoked for each element in
 * the array. It should return true to keep the element. The function signature
 * looks like <code>fn(element, index, array){...}</code>.
 * @return {Array} A new array with the results of the function.
 */
module.exports.filter = function (array, fn) {
    var results = [];
    for (var i = 0; i < array.length; i++) {
        if (fn(array[i], i, array)) {
            results.push(array[i]);
        }
    }
    return results;
};

/**
 * Get the keys for an object. Same as <code>Object.keys()</code>.
 * @param {Object} obj The object to get the keys for.
 * @return {string[]} The keys of the object.
 */
module.exports.keys = function (obj) {
    var keys = [];
    for (var key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }
        keys.push(key);
    }
    return keys;
};

/**
 * Get the values for an object.
 * @param {Object} obj The object to get the values for.
 * @return {Array<*>} The values of the object.
 */
module.exports.values = function (obj) {
    var values = [];
    for (var key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }
        values.push(obj[key]);
    }
    return values;
};

/**
 * Invoke a function for each item in the array.
 * @param {Array} array The array.
 * @param {Function} fn The function to invoke for each element. Has the
 * function signature <code>fn(element, index)</code>.
 */
module.exports.forEach = function (array, fn) {
    for (var i = 0; i < array.length; i++) {
        fn(array[i], i);
    }
};

/**
 * The findElement() method returns a value in the array, if an element in the array
 * satisfies (returns true) the provided testing function. Otherwise undefined
 * is returned.
 * @param {Array} array The array.
 * @param {Function} fn Function to execute on each value in the array, with the
 * function signature <code>fn(element, index, array)</code>
 * @param {boolean} reverse True to search in reverse order.
 * @return {*} The first value in the array which returns <code>true</code> for
 * the given function.
 */
module.exports.findElement = function (array, fn, reverse) {
    var i = void 0;
    if (reverse) {
        for (i = array.length - 1; i >= 0; i--) {
            if (fn(array[i], i, array)) {
                return array[i];
            }
        }
    } else {
        for (i = 0; i < array.length; i++) {
            if (fn(array[i], i, array)) {
                return array[i];
            }
        }
    }
};

/**
 * The removeElement() method removes the first element in the array that
 * satisfies (returns true) the provided testing function.
 * @param {Array} array The array.
 * @param {Function} fn Function to execute on each value in the array, with the
 * function signature <code>fn(element, index, array)</code>. Return true to
 * remove this element and break.
 * @param {boolean} reverse True to search in reverse order.
 * @return {boolean} True if an element was removed.
 */
module.exports.removeElement = function (array, fn, reverse) {
    var i = void 0;
    var removed = void 0;
    if (reverse) {
        for (i = array.length - 1; i >= 0; i--) {
            if (fn(array[i], i, array)) {
                removed = array[i];
                array.splice(i, 1);
                return removed;
            }
        }
    } else {
        for (i = 0; i < array.length; i++) {
            if (fn(array[i], i, array)) {
                removed = array[i];
                array.splice(i, 1);
                return removed;
            }
        }
    }
    return false;
};

/**
 * Checks if the given thing is a function.
 * @param {*} value The thing to check.
 * @return {boolean} True if it is a function.
 */
module.exports.isFunction = function (value) {
    return Object.prototype.toString.call(value) == "[object Function]";
};

/**
 * Checks if the given thing is an array.
 * @param {*} value The thing to check.
 * @return {boolean} True if it is an array.
 */
module.exports.isArray = function (value) {
    return Array.isArray ? Array.isArray(value) : Boolean(value && value.constructor === Array);
};

/**
 * Checks that the given object has the specified keys.
 * @param {Object} obj The object to check.
 * @param {string[]} keys The list of keys that 'obj' must have.
 * @throws If the object is missing keys.
 */
module.exports.checkObjectHasKeys = function (obj, keys) {
    for (var i = 0; i < keys.length; i++) {
        if (!obj.hasOwnProperty(keys[i])) {
            throw new Error("Missing required key: " + keys[i]);
        }
    }
};

/**
 * Checks that the given object has no extra keys other than the specified ones.
 * @param {Object} obj The object to check.
 * @param {string[]} allowedKeys The list of allowed key names.
 * @throws If there are extra keys.
 */
module.exports.checkObjectHasNoAdditionalKeys = function (obj, allowedKeys) {
    for (var key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }
        if (allowedKeys.indexOf(key) === -1) {
            throw new Error("Unknown key: " + key);
        }
    }
};

/**
 * Deep copy the given object. The object MUST NOT have circular references and
 * MUST NOT have functions.
 * @param {Object} obj The object to deep copy.
 * @return {Object} A copy of the object without any references to the original.
 */
module.exports.deepCopy = function (obj) {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Compare two objects for equality. The objects MUST NOT have circular references.
 *
 * @param {Object} x The first object to compare.
 * @param {Object} y The second object to compare.
 *
 * @return {boolean} true if the two objects are equal
 */
var deepCompare = module.exports.deepCompare = function (x, y) {
    // Inspired by
    // http://stackoverflow.com/questions/1068834/object-comparison-in-javascript#1144249

    // Compare primitives and functions.
    // Also check if both arguments link to the same object.
    if (x === y) {
        return true;
    }

    if ((typeof x === "undefined" ? "undefined" : _typeof(x)) !== (typeof y === "undefined" ? "undefined" : _typeof(y))) {
        return false;
    }

    // special-case NaN (since NaN !== NaN)
    if (typeof x === 'number' && isNaN(x) && isNaN(y)) {
        return true;
    }

    // special-case null (since typeof null == 'object', but null.constructor
    // throws)
    if (x === null || y === null) {
        return x === y;
    }

    // everything else is either an unequal primitive, or an object
    if (!(x instanceof Object)) {
        return false;
    }

    // check they are the same type of object
    if (x.constructor !== y.constructor || x.prototype !== y.prototype) {
        return false;
    }

    // special-casing for some special types of object
    if (x instanceof RegExp || x instanceof Date) {
        return x.toString() === y.toString();
    }

    // the object algorithm works for Array, but it's sub-optimal.
    if (x instanceof Array) {
        if (x.length !== y.length) {
            return false;
        }

        for (var i = 0; i < x.length; i++) {
            if (!deepCompare(x[i], y[i])) {
                return false;
            }
        }
    } else {
        // disable jshint "The body of a for in should be wrapped in an if
        // statement"
        /* jshint -W089 */

        // check that all of y's direct keys are in x
        var p = void 0;
        for (p in y) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false;
            }
        }

        // finally, compare each of x's keys with y
        for (p in y) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false;
            }
            if (!deepCompare(x[p], y[p])) {
                return false;
            }
        }
    }
    /* jshint +W089 */
    return true;
};

/**
 * Copy properties from one object to another.
 *
 * All enumerable properties, included inherited ones, are copied.
 *
 * This is approximately equivalent to ES6's Object.assign, except
 * that the latter doesn't copy inherited properties.
 *
 * @param {Object} target  The object that will receive new properties
 * @param {...Object} source  Objects from which to copy properties
 *
 * @return {Object} target
 */
module.exports.extend = function () {
    var target = arguments[0] || {};
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var propName in source) {
            // eslint-disable-line guard-for-in
            target[propName] = source[propName];
        }
    }
    return target;
};

/**
 * Run polyfills to add Array.map and Array.filter if they are missing.
 */
module.exports.runPolyfills = function () {
    //                Array.prototype.filter
    // ========================================================
    // SOURCE:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    if (!Array.prototype.filter) {
        Array.prototype.filter = function (fun /*, thisArg*/) {
            if (this === void 0 || this === null) {
                throw new TypeError();
            }

            var t = Object(this);
            var len = t.length >>> 0;
            if (typeof fun !== 'function') {
                throw new TypeError();
            }

            var res = [];
            var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
            for (var i = 0; i < len; i++) {
                if (i in t) {
                    var val = t[i];

                    // NOTE: Technically this should Object.defineProperty at
                    //       the next index, as push can be affected by
                    //       properties on Object.prototype and Array.prototype.
                    //       But that method's new, and collisions should be
                    //       rare, so use the more-compatible alternative.
                    if (fun.call(thisArg, val, i, t)) {
                        res.push(val);
                    }
                }
            }

            return res;
        };
    }

    //                Array.prototype.map
    // ========================================================
    // SOURCE:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
    // Production steps of ECMA-262, Edition 5, 15.4.4.19
    // Reference: http://es5.github.io/#x15.4.4.19
    if (!Array.prototype.map) {
        Array.prototype.map = function (callback, thisArg) {
            var T = void 0,
                k = void 0;

            if (this === null || this === undefined) {
                throw new TypeError(' this is null or not defined');
            }

            // 1. Let O be the result of calling ToObject passing the |this|
            //    value as the argument.
            var O = Object(this);

            // 2. Let lenValue be the result of calling the Get internal
            //    method of O with the argument "length".
            // 3. Let len be ToUint32(lenValue).
            var len = O.length >>> 0;

            // 4. If IsCallable(callback) is false, throw a TypeError exception.
            // See: http://es5.github.com/#x9.11
            if (typeof callback !== 'function') {
                throw new TypeError(callback + ' is not a function');
            }

            // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
            if (arguments.length > 1) {
                T = thisArg;
            }

            // 6. Let A be a new array created as if by the expression new Array(len)
            //    where Array is the standard built-in constructor with that name and
            //    len is the value of len.
            var A = new Array(len);

            // 7. Let k be 0
            k = 0;

            // 8. Repeat, while k < len
            while (k < len) {
                var kValue, mappedValue;

                // a. Let Pk be ToString(k).
                //   This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the HasProperty internal
                //    method of O with argument Pk.
                //   This step can be combined with c
                // c. If kPresent is true, then
                if (k in O) {
                    // i. Let kValue be the result of calling the Get internal
                    //    method of O with argument Pk.
                    kValue = O[k];

                    // ii. Let mappedValue be the result of calling the Call internal
                    //     method of callback with T as the this value and argument
                    //     list containing kValue, k, and O.
                    mappedValue = callback.call(T, kValue, k, O);

                    // iii. Call the DefineOwnProperty internal method of A with arguments
                    // Pk, Property Descriptor
                    // { Value: mappedValue,
                    //   Writable: true,
                    //   Enumerable: true,
                    //   Configurable: true },
                    // and false.

                    // In browsers that support Object.defineProperty, use the following:
                    // Object.defineProperty(A, k, {
                    //   value: mappedValue,
                    //   writable: true,
                    //   enumerable: true,
                    //   configurable: true
                    // });

                    // For best browser support, use the following:
                    A[k] = mappedValue;
                }
                // d. Increase k by 1.
                k++;
            }

            // 9. return A
            return A;
        };
    }

    //                Array.prototype.forEach
    // ========================================================
    // SOURCE:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    // Production steps of ECMA-262, Edition 5, 15.4.4.18
    // Reference: http://es5.github.io/#x15.4.4.18
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (callback, thisArg) {
            var T = void 0,
                k = void 0;

            if (this === null || this === undefined) {
                throw new TypeError(' this is null or not defined');
            }

            // 1. Let O be the result of calling ToObject passing the |this| value as the
            // argument.
            var O = Object(this);

            // 2. Let lenValue be the result of calling the Get internal method of O with the
            // argument "length".
            // 3. Let len be ToUint32(lenValue).
            var len = O.length >>> 0;

            // 4. If IsCallable(callback) is false, throw a TypeError exception.
            // See: http://es5.github.com/#x9.11
            if (typeof callback !== "function") {
                throw new TypeError(callback + ' is not a function');
            }

            // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
            if (arguments.length > 1) {
                T = thisArg;
            }

            // 6. Let k be 0
            k = 0;

            // 7. Repeat, while k < len
            while (k < len) {
                var kValue;

                // a. Let Pk be ToString(k).
                //   This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the HasProperty internal
                //    method of O with
                //    argument Pk.
                //   This step can be combined with c
                // c. If kPresent is true, then
                if (k in O) {
                    // i. Let kValue be the result of calling the Get internal method of O with
                    // argument Pk
                    kValue = O[k];

                    // ii. Call the Call internal method of callback with T as the this value and
                    // argument list containing kValue, k, and O.
                    callback.call(T, kValue, k, O);
                }
                // d. Increase k by 1.
                k++;
            }
            // 8. return undefined
        };
    }
};

/**
 * Inherit the prototype methods from one constructor into another. This is a
 * port of the Node.js implementation with an Object.create polyfill.
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
module.exports.inherits = function (ctor, superCtor) {
    // Add Object.create polyfill for IE8
    // Source:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript
    // /Reference/Global_Objects/Object/create#Polyfill
    if (typeof Object.create != 'function') {
        // Production steps of ECMA-262, Edition 5, 15.2.3.5
        // Reference: http://es5.github.io/#x15.2.3.5
        Object.create = function () {
            // To save on memory, use a shared constructor
            function Temp() {}

            // make a safe reference to Object.prototype.hasOwnProperty
            var hasOwn = Object.prototype.hasOwnProperty;

            return function (O) {
                // 1. If Type(O) is not Object or Null throw a TypeError exception.
                if ((typeof O === "undefined" ? "undefined" : _typeof(O)) != 'object') {
                    throw new TypeError('Object prototype may only be an Object or null');
                }

                // 2. Let obj be the result of creating a new object as if by the
                //    expression new Object() where Object is the standard built-in
                //    constructor with that name
                // 3. Set the [[Prototype]] internal property of obj to O.
                Temp.prototype = O;
                var obj = new Temp();
                Temp.prototype = null; // Let's not keep a stray reference to O...

                // 4. If the argument Properties is present and not undefined, add
                //    own properties to obj as if by calling the standard built-in
                //    function Object.defineProperties with arguments obj and
                //    Properties.
                if (arguments.length > 1) {
                    // Object.defineProperties does ToObject on its first argument.
                    var Properties = Object(arguments[1]);
                    for (var prop in Properties) {
                        if (hasOwn.call(Properties, prop)) {
                            obj[prop] = Properties[prop];
                        }
                    }
                }

                // 5. Return obj
                return obj;
            };
        }();
    }
    // END polyfill

    // Add util.inherits from Node.js
    // Source:
    // https://github.com/joyent/node/blob/master/lib/util.js
    // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
};

},{}],37:[function(require,module,exports){
(function (global){
/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";
/**
 * This is an internal module. See {@link createNewMatrixCall} for the public API.
 * @module webrtc/call
 */

var utils = require("../utils");
var EventEmitter = require("events").EventEmitter;
var DEBUG = true; // set true to enable console logging.

// events: hangup, error(err), replaced(call), state(state, oldState)

/**
 * Construct a new Matrix Call.
 * @constructor
 * @param {Object} opts Config options.
 * @param {string} opts.roomId The room ID for this call.
 * @param {Object} opts.webRtc The WebRTC globals from the browser.
 * @param {Object} opts.URL The URL global.
 * @param {Array<Object>} opts.turnServers Optional. A list of TURN servers.
 * @param {MatrixClient} opts.client The Matrix Client instance to send events to.
 */
function MatrixCall(opts) {
    this.roomId = opts.roomId;
    this.client = opts.client;
    this.webRtc = opts.webRtc;
    this.URL = opts.URL;
    // Array of Objects with urls, username, credential keys
    this.turnServers = opts.turnServers || [];
    if (this.turnServers.length === 0) {
        this.turnServers.push({
            urls: [MatrixCall.FALLBACK_STUN_SERVER]
        });
    }
    utils.forEach(this.turnServers, function (server) {
        utils.checkObjectHasKeys(server, ["urls"]);
    });

    this.callId = "c" + new Date().getTime();
    this.state = 'fledgling';
    this.didConnect = false;

    // A queue for candidates waiting to go out.
    // We try to amalgamate candidates into a single candidate message where
    // possible
    this.candidateSendQueue = [];
    this.candidateSendTries = 0;

    // Lookup from opaque queue ID to a promise for media element operations that
    // need to be serialised into a given queue.  Store this per-MatrixCall on the
    // assumption that multiple matrix calls will never compete for control of the
    // same DOM elements.
    this.mediaPromises = Object.create(null);

    this.screenSharingStream = null;
}
/** The length of time a call can be ringing for. */
MatrixCall.CALL_TIMEOUT_MS = 60000;
/** The fallback server to use for STUN. */
MatrixCall.FALLBACK_STUN_SERVER = 'stun:stun.l.google.com:19302';
/** An error code when the local client failed to create an offer. */
MatrixCall.ERR_LOCAL_OFFER_FAILED = "local_offer_failed";
/**
 * An error code when there is no local mic/camera to use. This may be because
 * the hardware isn't plugged in, or the user has explicitly denied access.
 */
MatrixCall.ERR_NO_USER_MEDIA = "no_user_media";

utils.inherits(MatrixCall, EventEmitter);

/**
 * Place a voice call to this room.
 * @throws If you have not specified a listener for 'error' events.
 */
MatrixCall.prototype.placeVoiceCall = function () {
    debuglog("placeVoiceCall");
    checkForErrorListener(this);
    _placeCallWithConstraints(this, _getUserMediaVideoContraints('voice'));
    this.type = 'voice';
};

/**
 * Place a video call to this room.
 * @param {Element} remoteVideoElement a <code>&lt;video&gt;</code> DOM element
 * to render video to.
 * @param {Element} localVideoElement a <code>&lt;video&gt;</code> DOM element
 * to render the local camera preview.
 * @throws If you have not specified a listener for 'error' events.
 */
MatrixCall.prototype.placeVideoCall = function (remoteVideoElement, localVideoElement) {
    debuglog("placeVideoCall");
    checkForErrorListener(this);
    this.localVideoElement = localVideoElement;
    this.remoteVideoElement = remoteVideoElement;
    _placeCallWithConstraints(this, _getUserMediaVideoContraints('video'));
    this.type = 'video';
    _tryPlayRemoteStream(this);
};

/**
 * Place a screen-sharing call to this room. This includes audio.
 * <b>This method is EXPERIMENTAL and subject to change without warning. It
 * only works in Google Chrome.</b>
 * @param {Element} remoteVideoElement a <code>&lt;video&gt;</code> DOM element
 * to render video to.
 * @param {Element} localVideoElement a <code>&lt;video&gt;</code> DOM element
 * to render the local camera preview.
 * @throws If you have not specified a listener for 'error' events.
 */
MatrixCall.prototype.placeScreenSharingCall = function (remoteVideoElement, localVideoElement) {
    debuglog("placeScreenSharingCall");
    checkForErrorListener(this);
    var screenConstraints = _getChromeScreenSharingConstraints(this);
    if (!screenConstraints) {
        return;
    }
    this.localVideoElement = localVideoElement;
    this.remoteVideoElement = remoteVideoElement;
    var self = this;
    this.webRtc.getUserMedia(screenConstraints, function (stream) {
        self.screenSharingStream = stream;
        debuglog("Got screen stream, requesting audio stream...");
        var audioConstraints = _getUserMediaVideoContraints('voice');
        _placeCallWithConstraints(self, audioConstraints);
    }, function (err) {
        self.emit("error", callError(MatrixCall.ERR_NO_USER_MEDIA, "Failed to get screen-sharing stream: " + err));
    });
    this.type = 'video';
    _tryPlayRemoteStream(this);
};

/**
 * Play the given HTMLMediaElement, serialising the operation into a chain
 * of promises to avoid racing access to the element
 * @param {Element} element HTMLMediaElement element to play
 * @param {string} queueId Arbitrary ID to track the chain of promises to be used
 */
MatrixCall.prototype.playElement = function (element, queueId) {
    console.log("queuing play on " + queueId + " and element " + element);
    // XXX: FIXME: Does this leak elements, given the old promises
    // may hang around and retain a reference to them?
    if (this.mediaPromises[queueId]) {
        // XXX: these promises can fail (e.g. by <video/> being unmounted whilst
        // pending receiving media to play - e.g. whilst switching between
        // rooms before answering an inbound call), and throw unhandled exceptions.
        // However, we should soldier on as best we can even if they fail, given
        // these failures may be non-fatal (as in the case of unmounts)
        this.mediaPromises[queueId] = this.mediaPromises[queueId].then(function () {
            console.log("previous promise completed for " + queueId);
            return element.play();
        }, function () {
            console.log("previous promise failed for " + queueId);
            return element.play();
        });
    } else {
        this.mediaPromises[queueId] = element.play();
    }
};

/**
 * Pause the given HTMLMediaElement, serialising the operation into a chain
 * of promises to avoid racing access to the element
 * @param {Element} element HTMLMediaElement element to pause
 * @param {string} queueId Arbitrary ID to track the chain of promises to be used
 */
MatrixCall.prototype.pauseElement = function (element, queueId) {
    console.log("queuing pause on " + queueId + " and element " + element);
    if (this.mediaPromises[queueId]) {
        this.mediaPromises[queueId] = this.mediaPromises[queueId].then(function () {
            console.log("previous promise completed for " + queueId);
            return element.pause();
        }, function () {
            console.log("previous promise failed for " + queueId);
            return element.pause();
        });
    } else {
        // pause doesn't actually return a promise, but do this for symmetry
        // and just in case it does in future.
        this.mediaPromises[queueId] = element.pause();
    }
};

/**
 * Assign the given HTMLMediaElement by setting the .src attribute on it,
 * serialising the operation into a chain of promises to avoid racing access
 * to the element
 * @param {Element} element HTMLMediaElement element to pause
 * @param {string} src the src attribute value to assign to the element
 * @param {string} queueId Arbitrary ID to track the chain of promises to be used
 */
MatrixCall.prototype.assignElement = function (element, src, queueId) {
    console.log("queuing assign on " + queueId + " element " + element + " for " + src);
    if (this.mediaPromises[queueId]) {
        this.mediaPromises[queueId] = this.mediaPromises[queueId].then(function () {
            console.log("previous promise completed for " + queueId);
            element.src = src;
        }, function () {
            console.log("previous promise failed for " + queueId);
            element.src = src;
        });
    } else {
        element.src = src;
    }
};

/**
 * Retrieve the local <code>&lt;video&gt;</code> DOM element.
 * @return {Element} The dom element
 */
MatrixCall.prototype.getLocalVideoElement = function () {
    return this.localVideoElement;
};

/**
 * Retrieve the remote <code>&lt;video&gt;</code> DOM element
 * used for playing back video capable streams.
 * @return {Element} The dom element
 */
MatrixCall.prototype.getRemoteVideoElement = function () {
    return this.remoteVideoElement;
};

/**
 * Retrieve the remote <code>&lt;audio&gt;</code> DOM element
 * used for playing back audio only streams.
 * @return {Element} The dom element
 */
MatrixCall.prototype.getRemoteAudioElement = function () {
    return this.remoteAudioElement;
};

/**
 * Set the local <code>&lt;video&gt;</code> DOM element. If this call is active,
 * video will be rendered to it immediately.
 * @param {Element} element The <code>&lt;video&gt;</code> DOM element.
 */
MatrixCall.prototype.setLocalVideoElement = function (element) {
    var _this = this;

    this.localVideoElement = element;

    if (element && this.localAVStream && this.type === 'video') {
        (function () {
            element.autoplay = true;
            _this.assignElement(element, _this.URL.createObjectURL(_this.localAVStream), "localVideo");
            element.muted = true;
            var self = _this;
            setTimeout(function () {
                var vel = self.getLocalVideoElement();
                if (vel.play) {
                    self.playElement(vel, "localVideo");
                }
            }, 0);
        })();
    }
};

/**
 * Set the remote <code>&lt;video&gt;</code> DOM element. If this call is active,
 * the first received video-capable stream will be rendered to it immediately.
 * @param {Element} element The <code>&lt;video&gt;</code> DOM element.
 */
MatrixCall.prototype.setRemoteVideoElement = function (element) {
    this.remoteVideoElement = element;
    _tryPlayRemoteStream(this);
};

/**
 * Set the remote <code>&lt;audio&gt;</code> DOM element. If this call is active,
 * the first received audio-only stream will be rendered to it immediately.
 * The audio will *not* be rendered from the remoteVideoElement.
 * @param {Element} element The <code>&lt;video&gt;</code> DOM element.
 */
MatrixCall.prototype.setRemoteAudioElement = function (element) {
    this.remoteVideoElement.muted = true;
    this.remoteAudioElement = element;
    _tryPlayRemoteAudioStream(this);
};

/**
 * Configure this call from an invite event. Used by MatrixClient.
 * @protected
 * @param {MatrixEvent} event The m.call.invite event
 */
MatrixCall.prototype._initWithInvite = function (event) {
    this.msg = event.getContent();
    this.peerConn = _createPeerConnection(this);
    var self = this;
    if (this.peerConn) {
        this.peerConn.setRemoteDescription(new this.webRtc.RtcSessionDescription(this.msg.offer), hookCallback(self, self._onSetRemoteDescriptionSuccess), hookCallback(self, self._onSetRemoteDescriptionError));
    }
    setState(this, 'ringing');
    this.direction = 'inbound';

    // firefox and OpenWebRTC's RTCPeerConnection doesn't add streams until it
    // starts getting media on them so we need to figure out whether a video
    // channel has been offered by ourselves.
    if (this.msg.offer && this.msg.offer.sdp && this.msg.offer.sdp.indexOf('m=video') > -1) {
        this.type = 'video';
    } else {
        this.type = 'voice';
    }

    if (event.getAge()) {
        setTimeout(function () {
            if (self.state == 'ringing') {
                debuglog("Call invite has expired. Hanging up.");
                self.hangupParty = 'remote'; // effectively
                setState(self, 'ended');
                stopAllMedia(self);
                if (self.peerConn.signalingState != 'closed') {
                    self.peerConn.close();
                }
                self.emit("hangup", self);
            }
        }, this.msg.lifetime - event.getAge());
    }
};

/**
 * Configure this call from a hangup event. Used by MatrixClient.
 * @protected
 * @param {MatrixEvent} event The m.call.hangup event
 */
MatrixCall.prototype._initWithHangup = function (event) {
    // perverse as it may seem, sometimes we want to instantiate a call with a
    // hangup message (because when getting the state of the room on load, events
    // come in reverse order and we want to remember that a call has been hung up)
    this.msg = event.getContent();
    setState(this, 'ended');
};

/**
 * Answer a call.
 */
MatrixCall.prototype.answer = function () {
    debuglog("Answering call %s of type %s", this.callId, this.type);
    var self = this;

    if (!this.localAVStream && !this.waitForLocalAVStream) {
        this.webRtc.getUserMedia(_getUserMediaVideoContraints(this.type), hookCallback(self, self._gotUserMediaForAnswer), hookCallback(self, self._getUserMediaFailed));
        setState(this, 'wait_local_media');
    } else if (this.localAVStream) {
        this._gotUserMediaForAnswer(this.localAVStream);
    } else if (this.waitForLocalAVStream) {
        setState(this, 'wait_local_media');
    }
};

/**
 * Replace this call with a new call, e.g. for glare resolution. Used by
 * MatrixClient.
 * @protected
 * @param {MatrixCall} newCall The new call.
 */
MatrixCall.prototype._replacedBy = function (newCall) {
    debuglog(this.callId + " being replaced by " + newCall.callId);
    if (this.state == 'wait_local_media') {
        debuglog("Telling new call to wait for local media");
        newCall.waitForLocalAVStream = true;
    } else if (this.state == 'create_offer') {
        debuglog("Handing local stream to new call");
        newCall._gotUserMediaForAnswer(this.localAVStream);
        delete this.localAVStream;
    } else if (this.state == 'invite_sent') {
        debuglog("Handing local stream to new call");
        newCall._gotUserMediaForAnswer(this.localAVStream);
        delete this.localAVStream;
    }
    newCall.localVideoElement = this.localVideoElement;
    newCall.remoteVideoElement = this.remoteVideoElement;
    newCall.remoteAudioElement = this.remoteAudioElement;
    this.successor = newCall;
    this.emit("replaced", newCall);
    this.hangup(true);
};

/**
 * Hangup a call.
 * @param {string} reason The reason why the call is being hung up.
 * @param {boolean} suppressEvent True to suppress emitting an event.
 */
MatrixCall.prototype.hangup = function (reason, suppressEvent) {
    debuglog("Ending call " + this.callId);
    terminate(this, "local", reason, !suppressEvent);
    var content = {
        version: 0,
        call_id: this.callId,
        reason: reason
    };
    sendEvent(this, 'm.call.hangup', content);
};

/**
 * Set whether the local video preview should be muted or not.
 * @param {boolean} muted True to mute the local video.
 */
MatrixCall.prototype.setLocalVideoMuted = function (muted) {
    if (!this.localAVStream) {
        return;
    }
    setTracksEnabled(this.localAVStream.getVideoTracks(), !muted);
};

/**
 * Check if local video is muted.
 *
 * If there are multiple video tracks, <i>all</i> of the tracks need to be muted
 * for this to return true. This means if there are no video tracks, this will
 * return true.
 * @return {Boolean} True if the local preview video is muted, else false
 * (including if the call is not set up yet).
 */
MatrixCall.prototype.isLocalVideoMuted = function () {
    if (!this.localAVStream) {
        return false;
    }
    return !isTracksEnabled(this.localAVStream.getVideoTracks());
};

/**
 * Set whether the microphone should be muted or not.
 * @param {boolean} muted True to mute the mic.
 */
MatrixCall.prototype.setMicrophoneMuted = function (muted) {
    if (!this.localAVStream) {
        return;
    }
    setTracksEnabled(this.localAVStream.getAudioTracks(), !muted);
};

/**
 * Check if the microphone is muted.
 *
 * If there are multiple audio tracks, <i>all</i> of the tracks need to be muted
 * for this to return true. This means if there are no audio tracks, this will
 * return true.
 * @return {Boolean} True if the mic is muted, else false (including if the call
 * is not set up yet).
 */
MatrixCall.prototype.isMicrophoneMuted = function () {
    if (!this.localAVStream) {
        return false;
    }
    return !isTracksEnabled(this.localAVStream.getAudioTracks());
};

/**
 * Internal
 * @private
 * @param {Object} stream
 */
MatrixCall.prototype._gotUserMediaForInvite = function (stream) {
    if (this.successor) {
        this.successor._gotUserMediaForAnswer(stream);
        return;
    }
    if (this.state == 'ended') {
        return;
    }
    debuglog("_gotUserMediaForInvite -> " + this.type);
    var self = this;
    var videoEl = this.getLocalVideoElement();

    if (videoEl && this.type == 'video') {
        videoEl.autoplay = true;
        if (this.screenSharingStream) {
            debuglog("Setting screen sharing stream to the local video element");
            this.assignElement(videoEl, this.URL.createObjectURL(this.screenSharingStream), "localVideo");
        } else {
            this.assignElement(videoEl, this.URL.createObjectURL(stream), "localVideo");
        }
        videoEl.muted = true;
        setTimeout(function () {
            var vel = self.getLocalVideoElement();
            if (vel.play) {
                self.playElement(vel, "localVideo");
            }
        }, 0);
    }

    if (this.screenSharingStream) {
        this.screenSharingStream.addTrack(stream.getAudioTracks()[0]);
        stream = this.screenSharingStream;
    }

    this.localAVStream = stream;
    // why do we enable audio (and only audio) tracks here? -- matthew
    setTracksEnabled(stream.getAudioTracks(), true);
    this.peerConn = _createPeerConnection(this);
    this.peerConn.addStream(stream);
    this.peerConn.createOffer(hookCallback(self, self._gotLocalOffer), hookCallback(self, self._getLocalOfferFailed));
    setState(self, 'create_offer');
};

/**
 * Internal
 * @private
 * @param {Object} stream
 */
MatrixCall.prototype._gotUserMediaForAnswer = function (stream) {
    var self = this;
    if (self.state == 'ended') {
        return;
    }
    var localVidEl = self.getLocalVideoElement();

    if (localVidEl && self.type == 'video') {
        localVidEl.autoplay = true;
        this.assignElement(localVidEl, this.URL.createObjectURL(stream), "localVideo");
        localVidEl.muted = true;
        setTimeout(function () {
            var vel = self.getLocalVideoElement();
            if (vel.play) {
                self.playElement(vel, "localVideo");
            }
        }, 0);
    }

    self.localAVStream = stream;
    setTracksEnabled(stream.getAudioTracks(), true);
    self.peerConn.addStream(stream);

    var constraints = {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': self.type == 'video'
        }
    };
    self.peerConn.createAnswer(function (description) {
        debuglog("Created answer: " + description);
        self.peerConn.setLocalDescription(description, function () {
            var content = {
                version: 0,
                call_id: self.callId,
                answer: {
                    sdp: self.peerConn.localDescription.sdp,
                    type: self.peerConn.localDescription.type
                }
            };
            sendEvent(self, 'm.call.answer', content);
            setState(self, 'connecting');
        }, function () {
            debuglog("Error setting local description!");
        }, constraints);
    }, function (err) {
        debuglog("Failed to create answer: " + err);
    });
    setState(self, 'create_answer');
};

/**
 * Internal
 * @private
 * @param {Object} event
 */
MatrixCall.prototype._gotLocalIceCandidate = function (event) {
    if (event.candidate) {
        debuglog("Got local ICE " + event.candidate.sdpMid + " candidate: " + event.candidate.candidate);
        // As with the offer, note we need to make a copy of this object, not
        // pass the original: that broke in Chrome ~m43.
        var c = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
        };
        sendCandidate(this, c);
    }
};

/**
 * Used by MatrixClient.
 * @protected
 * @param {Object} cand
 */
MatrixCall.prototype._gotRemoteIceCandidate = function (cand) {
    if (this.state == 'ended') {
        //debuglog("Ignoring remote ICE candidate because call has ended");
        return;
    }
    debuglog("Got remote ICE " + cand.sdpMid + " candidate: " + cand.candidate);
    this.peerConn.addIceCandidate(new this.webRtc.RtcIceCandidate(cand), function () {}, function (e) {});
};

/**
 * Used by MatrixClient.
 * @protected
 * @param {Object} msg
 */
MatrixCall.prototype._receivedAnswer = function (msg) {
    if (this.state == 'ended') {
        return;
    }

    var self = this;
    this.peerConn.setRemoteDescription(new this.webRtc.RtcSessionDescription(msg.answer), hookCallback(self, self._onSetRemoteDescriptionSuccess), hookCallback(self, self._onSetRemoteDescriptionError));
    setState(self, 'connecting');
};

/**
 * Internal
 * @private
 * @param {Object} description
 */
MatrixCall.prototype._gotLocalOffer = function (description) {
    var self = this;
    debuglog("Created offer: " + description);

    if (self.state == 'ended') {
        debuglog("Ignoring newly created offer on call ID " + self.callId + " because the call has ended");
        return;
    }

    self.peerConn.setLocalDescription(description, function () {
        var content = {
            version: 0,
            call_id: self.callId,
            // OpenWebRTC appears to add extra stuff (like the DTLS fingerprint)
            // to the description when setting it on the peerconnection.
            // According to the spec it should only add ICE
            // candidates. Any ICE candidates that have already been generated
            // at this point will probably be sent both in the offer and separately.
            // Also, note that we have to make a new object here, copying the
            // type and sdp properties.
            // Passing the RTCSessionDescription object as-is doesn't work in
            // Chrome (as of about m43).
            offer: {
                sdp: self.peerConn.localDescription.sdp,
                type: self.peerConn.localDescription.type
            },
            lifetime: MatrixCall.CALL_TIMEOUT_MS
        };
        sendEvent(self, 'm.call.invite', content);

        setTimeout(function () {
            if (self.state == 'invite_sent') {
                self.hangup('invite_timeout');
            }
        }, MatrixCall.CALL_TIMEOUT_MS);
        setState(self, 'invite_sent');
    }, function () {
        debuglog("Error setting local description!");
    });
};

/**
 * Internal
 * @private
 * @param {Object} error
 */
MatrixCall.prototype._getLocalOfferFailed = function (error) {
    this.emit("error", callError(MatrixCall.ERR_LOCAL_OFFER_FAILED, "Failed to start audio for call!"));
};

/**
 * Internal
 * @private
 * @param {Object} error
 */
MatrixCall.prototype._getUserMediaFailed = function (error) {
    this.emit("error", callError(MatrixCall.ERR_NO_USER_MEDIA, "Couldn't start capturing media! Is your microphone set up and " + "does this app have permission?"));
    this.hangup("user_media_failed");
};

/**
 * Internal
 * @private
 */
MatrixCall.prototype._onIceConnectionStateChanged = function () {
    if (this.state == 'ended') {
        return; // because ICE can still complete as we're ending the call
    }
    debuglog("Ice connection state changed to: " + this.peerConn.iceConnectionState);
    // ideally we'd consider the call to be connected when we get media but
    // chrome doesn't implement any of the 'onstarted' events yet
    if (this.peerConn.iceConnectionState == 'completed' || this.peerConn.iceConnectionState == 'connected') {
        setState(this, 'connected');
        this.didConnect = true;
    } else if (this.peerConn.iceConnectionState == 'failed') {
        this.hangup('ice_failed');
    }
};

/**
 * Internal
 * @private
 */
MatrixCall.prototype._onSignallingStateChanged = function () {
    debuglog("call " + this.callId + ": Signalling state changed to: " + this.peerConn.signalingState);
};

/**
 * Internal
 * @private
 */
MatrixCall.prototype._onSetRemoteDescriptionSuccess = function () {
    debuglog("Set remote description");
};

/**
 * Internal
 * @private
 * @param {Object} e
 */
MatrixCall.prototype._onSetRemoteDescriptionError = function (e) {
    debuglog("Failed to set remote description" + e);
};

/**
 * Internal
 * @private
 * @param {Object} event
 */
MatrixCall.prototype._onAddStream = function (event) {
    debuglog("Stream id " + event.stream.id + " added");

    var s = event.stream;

    if (s.getVideoTracks().length > 0) {
        this.type = 'video';
        this.remoteAVStream = s;
        this.remoteAStream = s;
    } else {
        this.type = 'voice';
        this.remoteAStream = s;
    }

    var self = this;
    forAllTracksOnStream(s, function (t) {
        debuglog("Track id " + t.id + " added");
        // not currently implemented in chrome
        t.onstarted = hookCallback(self, self._onRemoteStreamTrackStarted);
    });

    if (event.stream.oninactive !== undefined) {
        event.stream.oninactive = hookCallback(self, self._onRemoteStreamEnded);
    } else {
        // onended is deprecated from Chrome 54
        event.stream.onended = hookCallback(self, self._onRemoteStreamEnded);
    }

    // not currently implemented in chrome
    event.stream.onstarted = hookCallback(self, self._onRemoteStreamStarted);

    if (this.type === 'video') {
        _tryPlayRemoteStream(this);
        _tryPlayRemoteAudioStream(this);
    } else {
        _tryPlayRemoteAudioStream(this);
    }
};

/**
 * Internal
 * @private
 * @param {Object} event
 */
MatrixCall.prototype._onRemoteStreamStarted = function (event) {
    setState(this, 'connected');
};

/**
 * Internal
 * @private
 * @param {Object} event
 */
MatrixCall.prototype._onRemoteStreamEnded = function (event) {
    debuglog("Remote stream ended");
    this.hangupParty = 'remote';
    setState(this, 'ended');
    stopAllMedia(this);
    if (this.peerConn.signalingState != 'closed') {
        this.peerConn.close();
    }
    this.emit("hangup", this);
};

/**
 * Internal
 * @private
 * @param {Object} event
 */
MatrixCall.prototype._onRemoteStreamTrackStarted = function (event) {
    setState(this, 'connected');
};

/**
 * Used by MatrixClient.
 * @protected
 * @param {Object} msg
 */
MatrixCall.prototype._onHangupReceived = function (msg) {
    debuglog("Hangup received");
    terminate(this, "remote", msg.reason, true);
};

/**
 * Used by MatrixClient.
 * @protected
 * @param {Object} msg
 */
MatrixCall.prototype._onAnsweredElsewhere = function (msg) {
    debuglog("Answered elsewhere");
    terminate(this, "remote", "answered_elsewhere", true);
};

var setTracksEnabled = function setTracksEnabled(tracks, enabled) {
    for (var i = 0; i < tracks.length; i++) {
        tracks[i].enabled = enabled;
    }
};

var isTracksEnabled = function isTracksEnabled(tracks) {
    for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].enabled) {
            return true; // at least one track is enabled
        }
    }
    return false;
};

var setState = function setState(self, state) {
    var oldState = self.state;
    self.state = state;
    self.emit("state", state, oldState);
};

/**
 * Internal
 * @param {MatrixCall} self
 * @param {string} eventType
 * @param {Object} content
 * @return {Promise}
 */
var sendEvent = function sendEvent(self, eventType, content) {
    return self.client.sendEvent(self.roomId, eventType, content);
};

var sendCandidate = function sendCandidate(self, content) {
    // Sends candidates with are sent in a special way because we try to amalgamate
    // them into one message
    self.candidateSendQueue.push(content);
    if (self.candidateSendTries === 0) {
        setTimeout(function () {
            _sendCandidateQueue(self);
        }, 100);
    }
};

var terminate = function terminate(self, hangupParty, hangupReason, shouldEmit) {
    if (self.getRemoteVideoElement()) {
        if (self.getRemoteVideoElement().pause) {
            self.pauseElement(self.getRemoteVideoElement(), "remoteVideo");
        }
        self.assignElement(self.getRemoteVideoElement(), "", "remoteVideo");
    }
    if (self.getRemoteAudioElement()) {
        if (self.getRemoteAudioElement().pause) {
            self.pauseElement(self.getRemoteAudioElement(), "remoteAudio");
        }
        self.assignElement(self.getRemoteAudioElement(), "", "remoteAudio");
    }
    if (self.getLocalVideoElement()) {
        if (self.getLocalVideoElement().pause) {
            self.pauseElement(self.getLocalVideoElement(), "localVideo");
        }
        self.assignElement(self.getLocalVideoElement(), "", "localVideo");
    }
    self.hangupParty = hangupParty;
    self.hangupReason = hangupReason;
    setState(self, 'ended');
    stopAllMedia(self);
    if (self.peerConn && self.peerConn.signalingState !== 'closed') {
        self.peerConn.close();
    }
    if (shouldEmit) {
        self.emit("hangup", self);
    }
};

var stopAllMedia = function stopAllMedia(self) {
    debuglog("stopAllMedia (stream=%s)", self.localAVStream);
    if (self.localAVStream) {
        forAllTracksOnStream(self.localAVStream, function (t) {
            if (t.stop) {
                t.stop();
            }
        });
        // also call stop on the main stream so firefox will stop sharing
        // the mic
        if (self.localAVStream.stop) {
            self.localAVStream.stop();
        }
    }
    if (self.screenSharingStream) {
        forAllTracksOnStream(self.screenSharingStream, function (t) {
            if (t.stop) {
                t.stop();
            }
        });
        if (self.screenSharingStream.stop) {
            self.screenSharingStream.stop();
        }
    }
    if (self.remoteAVStream) {
        forAllTracksOnStream(self.remoteAVStream, function (t) {
            if (t.stop) {
                t.stop();
            }
        });
    }
    if (self.remoteAStream) {
        forAllTracksOnStream(self.remoteAStream, function (t) {
            if (t.stop) {
                t.stop();
            }
        });
    }
};

var _tryPlayRemoteStream = function _tryPlayRemoteStream(self) {
    if (self.getRemoteVideoElement() && self.remoteAVStream) {
        var player = self.getRemoteVideoElement();
        player.autoplay = true;
        self.assignElement(player, self.URL.createObjectURL(self.remoteAVStream), "remoteVideo");
        setTimeout(function () {
            var vel = self.getRemoteVideoElement();
            if (vel.play) {
                self.playElement(vel, "remoteVideo");
            }
            // OpenWebRTC does not support oniceconnectionstatechange yet
            if (self.webRtc.isOpenWebRTC()) {
                setState(self, 'connected');
            }
        }, 0);
    }
};

var _tryPlayRemoteAudioStream = function _tryPlayRemoteAudioStream(self) {
    if (self.getRemoteAudioElement() && self.remoteAStream) {
        var player = self.getRemoteAudioElement();
        player.autoplay = true;
        self.assignElement(player, self.URL.createObjectURL(self.remoteAStream), "remoteAudio");
        setTimeout(function () {
            var ael = self.getRemoteAudioElement();
            if (ael.play) {
                self.playElement(ael, "remoteAudio");
            }
            // OpenWebRTC does not support oniceconnectionstatechange yet
            if (self.webRtc.isOpenWebRTC()) {
                setState(self, 'connected');
            }
        }, 0);
    }
};

var checkForErrorListener = function checkForErrorListener(self) {
    if (self.listeners("error").length === 0) {
        throw new Error("You MUST attach an error listener using call.on('error', function() {})");
    }
};

var callError = function callError(code, msg) {
    var e = new Error(msg);
    e.code = code;
    return e;
};

var debuglog = function debuglog() {
    if (DEBUG) {
        var _console;

        (_console = console).log.apply(_console, arguments);
    }
};

var _sendCandidateQueue = function _sendCandidateQueue(self) {
    if (self.candidateSendQueue.length === 0) {
        return;
    }

    var cands = self.candidateSendQueue;
    self.candidateSendQueue = [];
    ++self.candidateSendTries;
    var content = {
        version: 0,
        call_id: self.callId,
        candidates: cands
    };
    debuglog("Attempting to send " + cands.length + " candidates");
    sendEvent(self, 'm.call.candidates', content).then(function () {
        self.candidateSendTries = 0;
        _sendCandidateQueue(self);
    }, function (error) {
        for (var i = 0; i < cands.length; i++) {
            self.candidateSendQueue.push(cands[i]);
        }

        if (self.candidateSendTries > 5) {
            debuglog("Failed to send candidates on attempt %s. Giving up for now.", self.candidateSendTries);
            self.candidateSendTries = 0;
            return;
        }

        var delayMs = 500 * Math.pow(2, self.candidateSendTries);
        ++self.candidateSendTries;
        debuglog("Failed to send candidates. Retrying in " + delayMs + "ms");
        setTimeout(function () {
            _sendCandidateQueue(self);
        }, delayMs);
    });
};

var _placeCallWithConstraints = function _placeCallWithConstraints(self, constraints) {
    self.client.callList[self.callId] = self;
    self.webRtc.getUserMedia(constraints, hookCallback(self, self._gotUserMediaForInvite), hookCallback(self, self._getUserMediaFailed));
    setState(self, 'wait_local_media');
    self.direction = 'outbound';
    self.config = constraints;
};

var _createPeerConnection = function _createPeerConnection(self) {
    var servers = self.turnServers;
    if (self.webRtc.vendor === "mozilla") {
        // modify turnServers struct to match what mozilla expects.
        servers = [];
        for (var i = 0; i < self.turnServers.length; i++) {
            for (var j = 0; j < self.turnServers[i].urls.length; j++) {
                servers.push({
                    url: self.turnServers[i].urls[j],
                    username: self.turnServers[i].username,
                    credential: self.turnServers[i].credential
                });
            }
        }
    }

    var pc = new self.webRtc.RtcPeerConnection({
        iceServers: servers
    });
    pc.oniceconnectionstatechange = hookCallback(self, self._onIceConnectionStateChanged);
    pc.onsignalingstatechange = hookCallback(self, self._onSignallingStateChanged);
    pc.onicecandidate = hookCallback(self, self._gotLocalIceCandidate);
    pc.onaddstream = hookCallback(self, self._onAddStream);
    return pc;
};

var _getChromeScreenSharingConstraints = function _getChromeScreenSharingConstraints(call) {
    var screen = global.screen;
    if (!screen) {
        call.emit("error", callError(MatrixCall.ERR_NO_USER_MEDIA, "Couldn't determine screen sharing constaints."));
        return;
    }

    return {
        video: {
            mandatory: {
                chromeMediaSource: "screen",
                chromeMediaSourceId: "" + Date.now(),
                maxWidth: screen.width,
                maxHeight: screen.height,
                minFrameRate: 1,
                maxFrameRate: 10
            }
        }
    };
};

var _getUserMediaVideoContraints = function _getUserMediaVideoContraints(callType) {
    switch (callType) {
        case 'voice':
            return { audio: true, video: false };
        case 'video':
            return { audio: true, video: {
                    mandatory: {
                        minWidth: 640,
                        maxWidth: 640,
                        minHeight: 360,
                        maxHeight: 360
                    }
                } };
    }
};

var hookCallback = function hookCallback(call, fn) {
    return function () {
        return fn.apply(call, arguments);
    };
};

var forAllVideoTracksOnStream = function forAllVideoTracksOnStream(s, f) {
    var tracks = s.getVideoTracks();
    for (var i = 0; i < tracks.length; i++) {
        f(tracks[i]);
    }
};

var forAllAudioTracksOnStream = function forAllAudioTracksOnStream(s, f) {
    var tracks = s.getAudioTracks();
    for (var i = 0; i < tracks.length; i++) {
        f(tracks[i]);
    }
};

var forAllTracksOnStream = function forAllTracksOnStream(s, f) {
    forAllVideoTracksOnStream(s, f);
    forAllAudioTracksOnStream(s, f);
};

/** The MatrixCall class. */
module.exports.MatrixCall = MatrixCall;

/**
 * Create a new Matrix call for the browser.
 * @param {MatrixClient} client The client instance to use.
 * @param {string} roomId The room the call is in.
 * @return {MatrixCall} the call or null if the browser doesn't support calling.
 */
module.exports.createNewMatrixCall = function (client, roomId) {
    var w = global.window;
    var doc = global.document;
    if (!w || !doc) {
        return null;
    }
    var webRtc = {};
    webRtc.isOpenWebRTC = function () {
        var scripts = doc.getElementById("script");
        if (!scripts || !scripts.length) {
            return false;
        }
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src.indexOf("owr.js") > -1) {
                return true;
            }
        }
        return false;
    };
    var getUserMedia = w.navigator.getUserMedia || w.navigator.webkitGetUserMedia || w.navigator.mozGetUserMedia;
    if (getUserMedia) {
        webRtc.getUserMedia = function () {
            return getUserMedia.apply(w.navigator, arguments);
        };
    }
    webRtc.RtcPeerConnection = w.RTCPeerConnection || w.webkitRTCPeerConnection || w.mozRTCPeerConnection;
    webRtc.RtcSessionDescription = w.RTCSessionDescription || w.webkitRTCSessionDescription || w.mozRTCSessionDescription;
    webRtc.RtcIceCandidate = w.RTCIceCandidate || w.webkitRTCIceCandidate || w.mozRTCIceCandidate;
    webRtc.vendor = null;
    if (w.mozRTCPeerConnection) {
        webRtc.vendor = "mozilla";
    } else if (w.webkitRTCPeerConnection) {
        webRtc.vendor = "webkit";
    } else if (w.RTCPeerConnection) {
        webRtc.vendor = "generic";
    }
    if (!webRtc.RtcIceCandidate || !webRtc.RtcSessionDescription || !webRtc.RtcPeerConnection || !webRtc.getUserMedia) {
        return null; // WebRTC is not supported.
    }
    var opts = {
        webRtc: webRtc,
        client: client,
        URL: w.URL,
        roomId: roomId,
        turnServers: client.getTurnServers()
    };
    return new MatrixCall(opts);
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../utils":36,"events":46}],38:[function(require,module,exports){
/* Copyright 2015 Mark Haines
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var escaped = /[\\\"\x00-\x1F]/g;
var escapes = {};
for (var i = 0; i < 0x20; ++i) {
    escapes[String.fromCharCode(i)] = (
        '\\U' + ('0000' + i.toString(16)).slice(-4).toUpperCase()
    );
}
escapes['\b'] = '\\b';
escapes['\t'] = '\\t';
escapes['\n'] = '\\n';
escapes['\f'] = '\\f';
escapes['\r'] = '\\r';
escapes['\"'] = '\\\"';
escapes['\\'] = '\\\\';

function escapeString(value) {
    escaped.lastIndex = 0;
    return value.replace(escaped, function(c) { return escapes[c]; });
}

function stringify(value) {
    switch (typeof value) {
        case 'string':
            return '"' + escapeString(value) + '"';
        case 'number':
            return isFinite(value) ? value : 'null';
        case 'boolean':
            return value;
        case 'object':
            if (value === null) {
                return 'null';
            }
            if (Array.isArray(value)) {
                return stringifyArray(value);
            }
            return stringifyObject(value);
        default:
            throw new Error('Cannot stringify: ' + typeof value);
    }
}

function stringifyArray(array) {
    var sep = '[';
    var result = '';
    for (var i = 0; i < array.length; ++i) {
        result += sep;
        sep = ',';
        result += stringify(array[i]);
    }
    if (sep != ',') {
        return '[]';
    } else {
        return result + ']';
    }
}

function stringifyObject(object) {
    var sep = '{';
    var result = '';
    var keys = Object.keys(object);
    keys.sort();
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        result += sep + '"' + escapeString(key) + '":';
        sep = ',';
        result += stringify(object[key]);
    }
    if (sep != ',') {
        return '{}';
    } else {
        return result + '}';
    }
}

/** */
module.exports = {stringify: stringify};

},{}],39:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// UMD HEADER START 
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(this, function () {
// UMD HEADER END

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }
  
  //BEGIN QS Hack
  var serialize = function(obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }
  
  if(options.qs){
    var qs = (typeof options.qs == 'string')? options.qs : serialize(options.qs);
    if(options.uri.indexOf('?') !== -1){ //no get params
        options.uri = options.uri+'&'+qs;
    }else{ //existing get params
        options.uri = options.uri+'?'+qs;
    }
  }
  //END QS Hack
  
  //BEGIN FORM Hack
  var multipart = function(obj) {
    //todo: support file type (useful?)
    var result = {};
    result.boundry = '-------------------------------'+Math.floor(Math.random()*1000000000);
    var lines = [];
    for(var p in obj){
        if (obj.hasOwnProperty(p)) {
            lines.push(
                '--'+result.boundry+"\n"+
                'Content-Disposition: form-data; name="'+p+'"'+"\n"+
                "\n"+
                obj[p]+"\n"
            );
        }
    }
    lines.push( '--'+result.boundry+'--' );
    result.body = lines.join('');
    result.length = result.body.length;
    result.type = 'multipart/form-data; boundary='+result.boundry;
    return result;
  }
  
  if(options.form){
    if(typeof options.form == 'string') throw('form name unsupported');
    if(options.method === 'POST'){
        var encoding = (options.encoding || 'application/x-www-form-urlencoded').toLowerCase();
        options.headers['content-type'] = encoding;
        switch(encoding){
            case 'application/x-www-form-urlencoded':
                options.body = serialize(options.form).replace(/%20/g, "+");
                break;
            case 'multipart/form-data':
                var multi = multipart(options.form);
                //options.headers['content-length'] = multi.length;
                options.body = multi.body;
                options.headers['content-type'] = multi.type;
                break;
            default : throw new Error('unsupported encoding:'+encoding);
        }
    }
  }
  //END FORM Hack

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}
    return request;
//UMD FOOTER START
}));
//UMD FOOTER END

},{}],40:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
    try {
        cachedSetTimeout = setTimeout;
    } catch (e) {
        cachedSetTimeout = function () {
            throw new Error('setTimeout is not defined');
        }
    }
    try {
        cachedClearTimeout = clearTimeout;
    } catch (e) {
        cachedClearTimeout = function () {
            throw new Error('clearTimeout is not defined');
        }
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],41:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],42:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.nextTick()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected() {
            pendingCount--;
            if (pendingCount === 0) {
                deferred.reject(new Error(
                    "Can't get fulfillment value from any promise, all " +
                    "promises were rejected."
                ));
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require('_process'))

},{"_process":40}],43:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],44:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],45:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":43,"./encode":44}],46:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],47:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":48,"punycode":41,"querystring":45}],48:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}]},{},[1])
//# sourceMappingURL=browser-matrix.js.map
