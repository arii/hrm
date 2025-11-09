"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketManager = void 0;
// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
var ws_1 = require("ws");
// Define service instances to be managed
var wssInstance;
var tabataServiceInstance;
var spotifyServiceInstance;
var clientData = new Map();
/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
var initSocketManager = function (wss, services) {
    wssInstance = wss;
    tabataServiceInstance = services.tabataService;
    spotifyServiceInstance = services.spotifyService;
    wssInstance.on('connection', function (ws) {
        var clientId = "user-".concat(Math.random().toString(36).substring(2, 9));
        console.log("WebSocket Client connected: ".concat(clientId));
        var newClient = {
            clientId: clientId,
            value: 0,
            maxHr: 185,
            name: 'New User',
            age: 30,
        };
        clientData.set(clientId, newClient);
        // Send initial state upon connection
        ws.send(JSON.stringify({
            type: 'STATE_UPDATE',
            hrmData: Array.from(clientData.values()),
            timerData: tabataServiceInstance.getState(),
            spotifyData: spotifyServiceInstance.getState(),
        }));
        ws.on('message', function (message) {
            handleIncomingMessage(ws, message.toString(), clientId);
        });
        ws.on('close', function () {
            console.log("WebSocket Client disconnected: ".concat(clientId));
            clientData.delete(clientId);
            broadcastState();
        });
    });
};
exports.initSocketManager = initSocketManager;
var broadcastState = function () {
    var message = {
        type: 'STATE_UPDATE',
        hrmData: Array.from(clientData.values()),
        timerData: tabataServiceInstance.getState(),
        spotifyData: spotifyServiceInstance.getState(),
    };
    wssInstance.clients.forEach(function (client) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};
/**
 * Handles incoming JSON messages from client applications.
 */
var handleIncomingMessage = function (ws, messageString, clientId) {
    try {
        // Parse and assert message type for type-safe routing
        var message = JSON.parse(messageString);
        switch (message.type) {
            case 'HRM_INPUT':
                // Check if message structure matches the interface before processing
                if (message.data && typeof message.data.value === 'number') {
                    var existingData = clientData.get(clientId);
                    if (existingData) {
                        clientData.set(clientId, __assign(__assign({}, existingData), message.data));
                    }
                    broadcastState();
                }
                break;
            case 'TIMER_COMMAND':
                if (tabataServiceInstance) {
                    // Command is guaranteed to be typed as START|PAUSE|STOP
                    tabataServiceInstance.handleCommand(message.command);
                }
                break;
            case 'SPOTIFY_COMMAND':
                if (spotifyServiceInstance) {
                    spotifyServiceInstance.handleCommand(message.command);
                }
                break;
            default:
                console.warn('Unknown message type received:', message.type);
        }
    }
    catch (e) {
        console.error('Error processing incoming message:', e);
    }
};
module.exports = { initSocketManager: exports.initSocketManager };
