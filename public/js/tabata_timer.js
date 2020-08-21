'use strict';

function Timer(tickCb, newLapCb, clearCb, newSetCb) {
    this.countdownFrom = 0;
    this.sets = [];
    this._tickCb = tickCb;
    this._newLapCb = newLapCb;
    this._clearCb = clearCb;
    this._newSetCb = newSetCb;
    this.reset();
}

Timer.prototype = {
    setCountdown: function(min, sec) {
        this.countdownFrom = min * 60 * 1000 + sec * 1000;
        this.reset();
    },

    setSets: function(sets) {
        this.sets = sets;
        this.reset();
    },

    isCountdownTimer: function() {
        return this.countdownFrom !== 0 || this.sets.length > 0;
    },

    currentSet: function() {
        return this._currentSet + 1;
    },

    _elapsed: function() {
        return this._runningTotal + this._currentTotal;
    },

    toggleTimer: function() {
        if (this._isRunning) {
            this.stopTimer();
        }
        else {
            this.startTimer();
        }
    },

    lapResetTimer: function() {
        if (this._isRunning) {
            if (this._isStartCountdown) {
                return;
            }
            if (this.sets.length > 0) {
                return;
            }
            if (this.countdownFrom !== 0) {
                return;
            }

            if (this._laps.length === 10) {
                return;
            }

            var currentTotal = this._runningTotal + this._currentTotal;
            this._laps.push({
                time: currentTotal - this._lastLap
            });
            this._lastLap = currentTotal;
            this._newLapCb(this);
        }
        else {
            this.reset();
            this._clearCb(this);
        }
    },

    reset: function() {
        this._isStartCountdown = true;
        this._lastLap = 0;
        this._lastTick = -9999;
        this._startTime = null;
        this._runningTotal = 0;
        this._currentTotal = 0;
        this._laps = [];
        this._currentSet = 0;
        this._setWorking = true;
        this._startCountdownLength = 5000;
    },

    startTimer: function() {
        var loop = function() {
            if (!this._isRunning) {
                return;
            }

            var delta = Math.floor((new Date().getTime() - this._startTime) / 1000) * 1000;
            this._currentTotal = delta;
            var starting = false;
            var finished = false;

            // Tick only once per second
            if (this._currentTotal - this._lastTick  >= 1000) {
                this._lastTick = this._currentTotal;

                var elapsed = this._elapsed();
                var isCountdown = this._isStartCountdown;

                if (this._isStartCountdown) {
                    elapsed = this._startCountdownLength - elapsed;

                    if (elapsed <= 0) {
                        this.reset();
                        this._isStartCountdown = false;
                        this._startTime = new Date().getTime();
                        elapsed = this.countdownFrom;
                        starting = true;
                    }
                }
                else {
                    if (this.sets.length > 0) {
                        var set = this.sets[this._currentSet];
                        elapsed = (this._setWorking ? set.work : set.rest) - elapsed;
                        if (elapsed <= 0) {
                            // We are on the rest or this is the last set in the work period in which
                            // case we don't need a rest set
                            if (!this._setWorking ||
                                (this._setWorking && this._currentSet === this.sets.length - 1)) {
                                ++this._currentSet;
                                if (this._currentSet >= this.sets.length) {
                                    this.stopTimer();
                                    finished= true;
                                }
                                else {
                                    this._newSetCb(this);
                                }
                            }
                            this._startTime = new Date().getTime();
                            this._runningTotal = this._currentTotal = 0;
                            this._lastTick = -9999;
                            this._setWorking = !this._setWorking;
                        }
                    } else if (this.countdownFrom !== 0) {
                        // Timer is counting down instead of up
                        elapsed = this.countdownFrom - elapsed;

                        if (elapsed <= 0) {
                            this.stopTimer();
                        }
                    } else {
                        // Wrap time if goes past 99:59
                        elapsed = elapsed % (100 * 60 * 1000);
                    }
                }
                this._tickCb(this, elapsed, isCountdown, starting, this._setWorking, finished);
            }
            setTimeout(loop, 100);
        }.bind(this);

        this._isRunning = true;
        this._startTime = new Date().getTime();
        setTimeout(loop, 100);
    },

    stopTimer: function() {
        this._runningTotal += this._currentTotal;
        this._isRunning = false;
        this._startTime = null;
        this._currentTotal = 0;
        this._lastTick = -9999;
    },

    laps: function() {
        return this._laps;
    },

    isRunning: function() {
        return this._isRunning;
    }
};
