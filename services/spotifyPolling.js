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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyPolling = void 0;
// File: services/spotifyPolling.ts (Spotify Polling Service - Typed)
/**
 * Spotify Polling Service: Handles token management, REST polling, and command execution.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */
var node_fetch_1 = require("node-fetch");
var spotifyTokenManager_1 = require("./spotifyTokenManager");
// API endpoint constants
var BASE_URL = "https://api.spotify.com/v1";
var TOKEN_URL = "https://accounts.spotify.com/api/token";
var SpotifyPolling = /** @class */ (function () {
    function SpotifyPolling(broadcastState) {
        var _this = this;
        this.pollInterval = null;
        // Internal auth/state values
        this.refreshToken = null;
        this.accessToken = null;
        this.lastTrackId = null;
        this.lastPlaybackState = null;
        this.state = {
            trackName: "Awaiting Login...",
            artist: "",
            isPlaying: false,
        };
        this.getCurrentlyPlaying = function () { return __awaiter(_this, void 0, void 0, function () {
            var response, data, error_1;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.accessToken)
                            return [2 /*return*/];
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(BASE_URL, "/me/player/currently-playing"), {
                                headers: {
                                    Authorization: "Bearer ".concat(this.accessToken),
                                },
                            })];
                    case 2:
                        response = _g.sent();
                        if (response.status === 204) {
                            // 204 No Content - nothing is playing on the user's account
                            if (this.lastPlaybackState !== false) {
                                this.lastPlaybackState = false;
                                this.state = {
                                    trackName: "Nothing is currently playing.",
                                    artist: "",
                                    isPlaying: false,
                                };
                                this.broadcastState({ spotifyData: this.getState() });
                            }
                            return [2 /*return*/];
                        }
                        if (!response.ok) {
                            if (response.status === 401) {
                                console.warn("Spotify token expired or invalid. Attempting refresh...");
                                this.refreshAccessToken();
                            }
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = (_g.sent());
                        // Only broadcast if track ID or playback state has changed
                        if (((_a = data.item) === null || _a === void 0 ? void 0 : _a.id) !== this.lastTrackId ||
                            data.is_playing !== this.lastPlaybackState) {
                            this.lastTrackId = (_b = data.item) === null || _b === void 0 ? void 0 : _b.id;
                            this.lastPlaybackState = data.is_playing;
                            this.state = {
                                trackName: ((_c = data.item) === null || _c === void 0 ? void 0 : _c.name) || "Unknown Track",
                                artist: ((_f = (_e = (_d = data.item) === null || _d === void 0 ? void 0 : _d.artists) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.name) || "Unknown Artist",
                                isPlaying: data.is_playing,
                            };
                            this.broadcastState({ spotifyData: this.getState() });
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _g.sent();
                        console.error("Error fetching currently playing track:", error_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        this.broadcastState = broadcastState;
        console.log("Spotify Polling Service Initialized.");
        this.tokenManager = new spotifyTokenManager_1.SpotifyTokenManager(process.env.SPOTIFY_CLIENT_ID || "", process.env.SPOTIFY_CLIENT_SECRET || "");
        // Start token refresh check loop (Every 55 mins)
        setInterval(function () { return _this.refreshAccessToken(); }, 1000 * 60 * 55);
    }
    SpotifyPolling.prototype.getState = function () {
        return __assign({}, this.state);
    };
    // --- Token Management (Used by NextAuth route) ---
    /**
     * Called by server.js POST /internal/token-delivery after NextAuth provides the refresh token.
     */
    SpotifyPolling.prototype.setRefreshToken = function (token) {
        this.refreshToken = token;
        console.log("Spotify Refresh Token received. Attempting initial access token refresh.");
        this.refreshAccessToken(true);
    };
    SpotifyPolling.prototype.refreshAccessToken = function () {
        return __awaiter(this, arguments, void 0, function (initial) {
            var authString, response, data, error_2;
            if (initial === void 0) { initial = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.refreshToken) {
                            if (!initial) {
                                this.broadcastState({
                                    spotifyData: {
                                        trackName: "Requires Login",
                                        artist: "Please log in via client/control",
                                        isPlaying: false,
                                    },
                                });
                            }
                            return [2 /*return*/];
                        }
                        authString = Buffer.from("".concat(process.env.SPOTIFY_CLIENT_ID, ":").concat(process.env.SPOTIFY_CLIENT_SECRET)).toString("base64");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, (0, node_fetch_1.default)(TOKEN_URL, {
                                method: "POST",
                                headers: {
                                    Authorization: "Basic ".concat(authString),
                                    "Content-Type": "application/x-www-form-urlencoded",
                                },
                                body: new URLSearchParams({
                                    grant_type: "refresh_token",
                                    refresh_token: this.refreshToken,
                                }).toString(),
                            })];
                    case 2:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Token refresh failed: ".concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = _a.sent();
                        this.accessToken = data.access_token;
                        console.log("Spotify Access Token refreshed successfully.");
                        // Start polling if not already running
                        if (!this.pollInterval) {
                            this.startPolling();
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        console.error("Error during Spotify token refresh:", error_2);
                        this.accessToken = null;
                        this.stopPolling();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // --- Polling Logic ---
    // Expose start/stop polling publicly (used by server to control lifecycle)
    SpotifyPolling.prototype.startPolling = function (intervalMs) {
        if (intervalMs === void 0) { intervalMs = 3000; }
        if (this.pollInterval)
            return;
        // Poll every `intervalMs` for low-latency updates
        this.pollInterval = setInterval(this.getCurrentlyPlaying, intervalMs);
        console.log("Spotify polling started.");
    };
    SpotifyPolling.prototype.stopPolling = function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log("Spotify polling stopped.");
        }
    };
    // --- Command Handling (Used by socketManager) ---
    SpotifyPolling.prototype.executePlayerCommand = function (endpoint, method) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.accessToken) {
                            console.warn("Cannot execute command: Access token is missing. Requires login.");
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(BASE_URL, "/me/player/").concat(endpoint), {
                                method: method,
                                headers: {
                                    Authorization: "Bearer ".concat(this.accessToken),
                                },
                            })];
                    case 2:
                        response = _a.sent();
                        if (response.status === 204) {
                            console.log("Spotify command '".concat(endpoint, "' executed successfully."));
                            // Immediately poll after a successful command to update the dashboard faster
                            setTimeout(this.getCurrentlyPlaying, 500);
                        }
                        else {
                            console.error("Spotify command failed (".concat(response.status, "): ").concat(endpoint));
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error("Error executing Spotify command:", error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SpotifyPolling.prototype.handleCommand = function (command) {
        switch (command) {
            case "PAUSE":
                this.executePlayerCommand("pause", "PUT");
                break;
            case "PLAY":
                this.executePlayerCommand("play", "PUT");
                break;
            case "NEXT":
                this.executePlayerCommand("next", "POST");
                break;
            case "PREVIOUS":
                this.executePlayerCommand("previous", "POST");
                break;
            case "LOGIN":
                // Note: The actual login is handled by the client redirecting to NextAuth.
                // This command is primarily for client-side feedback.
                console.log("Received LOGIN command. Client should initiate NextAuth sign-in.");
                break;
            default:
                console.warn("Unknown Spotify command: ".concat(command));
        }
    };
    SpotifyPolling.prototype.getCurrentPlayback = function () {
        return __awaiter(this, void 0, void 0, function () {
            var accessToken, response, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.tokenManager.getValidAccessToken()];
                    case 1:
                        accessToken = _d.sent();
                        if (!accessToken) {
                            throw new Error("No valid Spotify access token available");
                        }
                        return [4 /*yield*/, (0, node_fetch_1.default)("https://api.spotify.com/v1/me/player", {
                                headers: {
                                    Authorization: "Bearer ".concat(accessToken),
                                },
                            })];
                    case 2:
                        response = _d.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        if (response.status === 401) {
                            // Token might be invalid - force a refresh on next attempt
                            return [2 /*return*/, null];
                        }
                        _a = Error.bind;
                        _c = (_b = "HTTP ".concat(response.status, ": ")).concat;
                        return [4 /*yield*/, response.text()];
                    case 3: throw new (_a.apply(Error, [void 0, _c.apply(_b, [_d.sent()])]))();
                    case 4: return [2 /*return*/, response.json()];
                }
            });
        });
    };
    SpotifyPolling.prototype.controlPlayback = function (action) {
        return __awaiter(this, void 0, void 0, function () {
            var accessToken, endpoint, response, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.tokenManager.getValidAccessToken()];
                    case 1:
                        accessToken = _a.sent();
                        if (!accessToken)
                            return [2 /*return*/, false];
                        endpoint = {
                            play: "/play",
                            pause: "/pause",
                            next: "/next",
                            previous: "/previous",
                        }[action];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, node_fetch_1.default)("https://api.spotify.com/v1/me/player".concat(endpoint), {
                                method: "POST",
                                headers: {
                                    Authorization: "Bearer ".concat(accessToken),
                                },
                            })];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.ok];
                    case 4:
                        err_1 = _a.sent();
                        console.error("Spotify playback control failed:", err_1);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return SpotifyPolling;
}());
exports.SpotifyPolling = SpotifyPolling;
exports.default = SpotifyPolling;
