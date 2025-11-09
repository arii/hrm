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
exports.SpotifyTokenManager = void 0;
var fs_1 = require("fs");
var node_fetch_1 = require("node-fetch");
var path_1 = require("path");
var SpotifyTokenManager = /** @class */ (function () {
    function SpotifyTokenManager(clientId, clientSecret, logDir) {
        if (logDir === void 0) { logDir = path_1.default.resolve(process.cwd(), "logs"); }
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.currentToken = null;
        this.refreshPromise = null;
        this.tokenFile = path_1.default.join(logDir, "spotify_tokens.json");
        this.loadTokens();
    }
    SpotifyTokenManager.prototype.loadTokens = function () {
        try {
            if (fs_1.default.existsSync(this.tokenFile)) {
                var data = fs_1.default.readFileSync(this.tokenFile, "utf8");
                this.currentToken = JSON.parse(data);
                console.log("Loaded Spotify tokens for:", this.currentToken.payload.sub);
            }
        }
        catch (err) {
            console.warn("Failed to load Spotify tokens:", err);
        }
    };
    SpotifyTokenManager.prototype.refreshToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var basic, response, _a, _b, _c, data, err_1;
            var _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!((_d = this.currentToken) === null || _d === void 0 ? void 0 : _d.payload.refresh_token))
                            return [2 /*return*/, false];
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 6, , 7]);
                        basic = Buffer.from("".concat(this.clientId, ":").concat(this.clientSecret)).toString("base64");
                        return [4 /*yield*/, (0, node_fetch_1.default)("https://accounts.spotify.com/api/token", {
                                method: "POST",
                                headers: {
                                    Authorization: "Basic ".concat(basic),
                                    "Content-Type": "application/x-www-form-urlencoded",
                                },
                                body: new URLSearchParams({
                                    grant_type: "refresh_token",
                                    refresh_token: this.currentToken.payload.refresh_token,
                                }).toString(),
                            })];
                    case 2:
                        response = _f.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        _a = Error.bind;
                        _c = (_b = "HTTP ".concat(response.status, ": ")).concat;
                        return [4 /*yield*/, response.text()];
                    case 3: throw new (_a.apply(Error, [void 0, _c.apply(_b, [_f.sent()])]))();
                    case 4: return [4 /*yield*/, response.json()];
                    case 5:
                        data = _f.sent();
                        // Update current token with new values
                        this.currentToken = {
                            receivedAt: Date.now(),
                            payload: __assign(__assign({}, this.currentToken.payload), { access_token: data.access_token, expires_in: data.expires_in, refresh_token: (_e = data.refresh_token) !== null && _e !== void 0 ? _e : this.currentToken.payload.refresh_token, obtainedAt: Date.now() }),
                        };
                        // Save updated token
                        fs_1.default.writeFileSync(this.tokenFile, JSON.stringify(this.currentToken, null, 2), "utf8");
                        console.log("Refreshed Spotify token for:", this.currentToken.payload.sub);
                        return [2 /*return*/, true];
                    case 6:
                        err_1 = _f.sent();
                        console.error("Failed to refresh Spotify token:", err_1);
                        return [2 /*return*/, false];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    SpotifyTokenManager.prototype.getValidAccessToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var expiresAt;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.currentToken)
                            return [2 /*return*/, null];
                        expiresAt = this.currentToken.payload.obtainedAt +
                            this.currentToken.payload.expires_in * 1000;
                        if (!(Date.now() >= expiresAt - 60000)) return [3 /*break*/, 2];
                        // Refresh if within 1 minute of expiry
                        // Ensure only one refresh happens at a time
                        if (!this.refreshPromise) {
                            this.refreshPromise = this.refreshToken()
                                .then(function () {
                                _this.refreshPromise = null;
                            })
                                .catch(function () {
                                _this.refreshPromise = null;
                            });
                        }
                        return [4 /*yield*/, this.refreshPromise];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, this.currentToken.payload.access_token];
                }
            });
        });
    };
    SpotifyTokenManager.prototype.getUserId = function () {
        var _a, _b;
        return (_b = (_a = this.currentToken) === null || _a === void 0 ? void 0 : _a.payload.sub) !== null && _b !== void 0 ? _b : null;
    };
    return SpotifyTokenManager;
}());
exports.SpotifyTokenManager = SpotifyTokenManager;
