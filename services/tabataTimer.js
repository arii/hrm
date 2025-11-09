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
var DEFAULT_CYCLES = 8;
var WORK_DURATION = 30; // seconds
var REST_DURATION = 10; // seconds
var COOLDOWN_DURATION = 5; // seconds
var TabataTimer = /** @class */ (function () {
    function TabataTimer(broadcastState) {
        var _this = this;
        this.interval = null;
        this.state = {
            isRunning: false,
            currentPhase: 'IDLE',
            timeRemaining: 0,
            cycle: 0,
            totalCycles: DEFAULT_CYCLES,
        };
        // --- Core Timer Logic ---
        this.tick = function () {
            if (!_this.state.isRunning)
                return;
            _this.state.timeRemaining -= 1;
            if (_this.state.timeRemaining <= 0) {
                _this.transitionPhase();
            }
            // Broadcast the entire timer state on every tick
            if (_this.state.timeRemaining <= 3 && _this.state.timeRemaining > 0) {
                _this.state.soundToPlay = 'COUNTDOWN';
            }
            else {
                _this.state.soundToPlay = undefined;
            }
            _this.broadcastState({ timerData: _this.getState() });
        };
        this.broadcastState = broadcastState;
        console.log('Tabata Timer Service Initialized.');
    }
    TabataTimer.prototype.getState = function () {
        return __assign({}, this.state);
    };
    TabataTimer.prototype.startTimer = function () {
        if (this.state.isRunning)
            return;
        if (this.state.currentPhase === 'IDLE') {
            this.state.cycle = 1;
            this.state.currentPhase = 'WORK';
            this.state.timeRemaining = WORK_DURATION;
        }
        this.state.isRunning = true;
        this.interval = setInterval(this.tick, 1000);
        console.log("Timer started: ".concat(this.state.currentPhase, " Cycle ").concat(this.state.cycle));
        this.broadcastState({ timerData: this.getState() });
    };
    TabataTimer.prototype.pauseTimer = function () {
        if (!this.state.isRunning)
            return;
        this.state.isRunning = false;
        if (this.interval)
            clearInterval(this.interval);
        this.interval = null;
        console.log('Timer paused.');
        this.broadcastState({ timerData: this.getState() });
    };
    TabataTimer.prototype.stopTimer = function () {
        this.state.isRunning = false;
        if (this.interval)
            clearInterval(this.interval);
        this.interval = null;
        this.state = {
            isRunning: false,
            currentPhase: 'IDLE',
            timeRemaining: 0,
            cycle: 0,
            totalCycles: DEFAULT_CYCLES,
        };
        console.log('Timer stopped and reset.');
        this.broadcastState({ timerData: this.getState() });
    };
    TabataTimer.prototype.transitionPhase = function () {
        this.state.soundToPlay = undefined; // Reset sound on phase transition
        switch (this.state.currentPhase) {
            case 'WORK':
                if (this.state.cycle < this.state.totalCycles) {
                    this.state.currentPhase = 'REST';
                    this.state.timeRemaining = REST_DURATION;
                    this.state.soundToPlay = 'REST';
                    console.log("Transition to REST for cycle ".concat(this.state.cycle));
                }
                else {
                    this.state.currentPhase = 'COOLDOWN';
                    this.state.timeRemaining = COOLDOWN_DURATION;
                    this.pauseTimer(); // Auto-pause after last cycle
                    console.log('Tabata finished. Transition to COOLDOWN.');
                }
                break;
            case 'REST':
                this.state.cycle += 1;
                this.state.currentPhase = 'WORK';
                this.state.timeRemaining = WORK_DURATION;
                this.state.soundToPlay = 'WORK';
                console.log("Transition to WORK for cycle ".concat(this.state.cycle));
                break;
            case 'IDLE':
            case 'COOLDOWN':
                this.stopTimer();
                break;
        }
    };
    // --- Command Handler (Used by socketManager) ---
    TabataTimer.prototype.handleCommand = function (command) {
        switch (command) {
            case 'START':
                this.startTimer();
                break;
            case 'PAUSE':
                this.pauseTimer();
                break;
            case 'STOP':
                this.stopTimer();
                break;
            default:
                console.warn("Unknown timer command: ".concat(command));
        }
    };
    return TabataTimer;
}());
exports.default = TabataTimer;
