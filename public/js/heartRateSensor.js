(function() {
  'use strict';


  class HeartRateSensor {
    constructor() {
      this.device = null;
      this.server = null;
      this.name = null;
      this.age = null;
      this._characteristics = new Map();
	  this.status_msg = "Not initialized";
      this.socket = io( {transports:['websocket']});
      
	  window.setInterval(this.reportStatus.bind(this), 1000);

    }
    updateNameAge(name, age){
        this.name = name;
        this.age = age;
        //console.log("name: " + name + " age: " + age);
    }

    // constructs a json object with all relevant data
    // and sends it
    sendHR(hrm){
        var status_msg = "";
        var status_color = "white";
        var rate = "--";
        var age = "0";
        var name = "unknown";
        var device = null;
        
        if (this.device != null){
            if (this.device.id != null){
                device = this.device.id;
            }
        }

        if(this.server == null){
            status_msg = "not initialized";
            status_color = "white";
        }else if(this.server.connected){
            status_msg = "connected";
            status_color="#f8f9fa" 
        }else{
            status_msg = "disconnected";
            status_color = "#6c757d"
        }

        if (hrm == null){
            rate = "--"
        }else{
            rate = hrm.heartRate;
            if(!hrm.contactDetected){
                status_msg += " -- bad contact";
                status_color ="orange";
                rate = hrm.heartRate;}
            }

        name=this.name;
        age = this.age;
        var hr = {
            'name': name, 
            'age': age,
            'status_msg': status_msg,
            'status_color': status_color,
            'rate': rate,
            'device': device,
            }
        //console.log(hr);
    if(status_msg == "connected" && rate == "--"){
        return;
    }
    this.socket.emit('hrm_client', hr);
    const event = new CustomEvent('hrUpdate',{detail: hr});
	document.dispatchEvent(event);

        addHR(rate);
    }
        

	reportStatus(){
		// report status messages
        var hr_sent = false;

		if (this.server == null){
			this.status_msg = "not initialized";
		}else if (this.server.connected){
			this.status_msg = "connected";
		}else{
			this.status_msg = "disconnected";
		}
		
		if(this.status_msg == "connected"){
            var curr_hrm_measure = this._characteristics.get("heart_rate_measurement") ;

			if(curr_hrm_measure != null){
				var result = this.parseHeartRate(curr_hrm_measure.value);
                if (result !=null){
                    hr_sent = true;
				if (!result.contactDetected){
					this.status_msg += "-- bad contact";
				}
                }

			}
        }
		if(!hr_sent){
            this.sendHR(null);
        }

		var status = this.status_msg;
		//console.log("status: " + status);
		const event = new CustomEvent('status', { detail: status });
		document.dispatchEvent(event);

	}
	
	init(){
    if (typeof(navigator.bluetooth) == 'undefined'){
        console.log("unsupported browser");
        alert("This browser is not supported browser for web bluetooth.");
        throw("Unsupported browser");
    }
	return navigator.bluetooth.requestDevice({filters:[{services:[ 'heart_rate' ]}]})
      .then(device => {
        this.device = device;
		console.log("initialized device:" + this.device.name);
		this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
		return this.connect_();
	})
    .catch(error => {
        alert("cannot connect to bluetooth");
        console.log(error);
    })

    }
	
	onDisconnected(){
		console.log("disconnected");
		this.status_msg = "disconnected";
	}
		
	connect_ = function(){
		console.log("connecting device:" + this.device.name);
		return this.device.gatt.connect()
		.then(server => {
        this.server = server;
        return Promise.all([
          server.getPrimaryService('heart_rate').then(service => {
            return Promise.all([
              this._cacheCharacteristic(service, 'body_sensor_location'),
              this._cacheCharacteristic(service, 'heart_rate_measurement'),
				])
			})
        ]);
		});
		
		console.log("connected");
		
	};
	
    connect() {
		return this.init()
		
		

    }

    /* Heart Rate Service */

    getBodySensorLocation() {
      return this._readCharacteristicValue('body_sensor_location')
      .then(data => {
        let sensorLocation = data.getUint8(0);
        switch (sensorLocation) {
          case 0: return 'Other';
          case 1: return 'Chest';
          case 2: return 'Wrist';
          case 3: return 'Finger';
          case 4: return 'Hand';
          case 5: return 'Ear Lobe';
          case 6: return 'Foot';
          default: return 'Unknown';
        }
     });
    }
    startNotificationsHeartRateMeasurement() {
      return this._startNotifications('heart_rate_measurement');
    }
    stopNotificationsHeartRateMeasurement() {
      return this._stopNotifications('heart_rate_measurement');
    }
    parseHeartRate(value) {
      // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
      try{
        value = value.buffer ? value : new DataView(value);
      }catch(err){
          console.log("result failed");
          return null;
      }

      let flags = value.getUint8(0);
      let rate16Bits = flags & 0x1;
      let result = {};
      let index = 1;
      if (rate16Bits) {
        result.heartRate = value.getUint16(index, /*littleEndian=*/true);
        index += 2;
      } else {
        result.heartRate = value.getUint8(index);
        index += 1;
      }
      let contactDetected = flags & 0x2;
      let contactSensorPresent = flags & 0x4;
      if (contactSensorPresent) {
        result.contactDetected = !!contactDetected;
      }
      let energyPresent = flags & 0x8;
      if (energyPresent) {
        result.energyExpended = value.getUint16(index, /*littleEndian=*/true);
        index += 2;
      }
      let rrIntervalPresent = flags & 0x10;
      if (rrIntervalPresent) {
        let rrIntervals = [];
        for (; index + 1 < value.byteLength; index += 2) {
          rrIntervals.push(value.getUint16(index, /*littleEndian=*/true));
        }
        result.rrIntervals = rrIntervals;
      }

      this.socket.emit('chat message', result.heartRate);
      this.sendHR(result);
      return result;
    }

    /* Utils */

    _cacheCharacteristic(service, characteristicUuid) {
      return service.getCharacteristic(characteristicUuid)
      .then(characteristic => {
        this._characteristics.set(characteristicUuid, characteristic);
      });
    }
    _readCharacteristicValue(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.readValue()
      .then(value => {
        // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
        value = value.buffer ? value : new DataView(value);
        return value;
      });
    }
    _writeCharacteristicValue(characteristicUuid, value) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.writeValue(value);
    }
    _startNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to set up characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.startNotifications()
      .then(() => characteristic);
    }
    _stopNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to remove characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.stopNotifications()
      .then(() => characteristic);
    }
  }

  window.heartRateSensor = new HeartRateSensor();

})();
