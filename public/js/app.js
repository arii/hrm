//var canvas = document.querySelector('canvas');
var statusText = document.querySelector('#statusText');
var statusHR = document.querySelector('#HR');
var statusBar = document.querySelector('#statusBar');
var statusBarDiv = document.querySelector('#statusBarDiv');
var nameAgeBtn = document.querySelector('#nameAgeBtn');
var userName = document.querySelector('#userName');
var userAge = document.querySelector('#userAge');
var HRCardHeader = document.querySelector('#HRCardHeader');
var HRCardHeaderAge = document.querySelector('#HRCardHeaderAge');
var nameAgeInput = document.querySelector('#nameAgeInput');
var reconnect = document.querySelector('#reconnect');
var last_connect_time = null;
var last_update = null;

function updateStatus(text, isHR){
    if(isHR){
        statusHR.textContent=text;
        statusText.textContent="";
    }else{
        statusText.textContent=text;
        statusHR.textContent ="";
    }
}

function updateStatusBar(text, color){
	    statusBar.textContent = text;
		statusBarDiv.style.backgroundColor = color;
   }


reconnect.addEventListener('click', function() {
  initialClick();
});

nameAgeBtn.addEventListener('click', function() {
    initialClick();
    HRCardHeader.textContent = userName.value;
    HRCardHeaderAge.textContent = userAge.value;

    heartRateSensor.updateNameAge(userName.value, userAge.value);
    nameAgeInput.style.display = "none";
    reconnect.style.display = "block";
});

function initialClick(){
  updateStatus("Breathe...", false);
  heartRates = [];
  heartRateSensor.init()
  .then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  .catch(error => {
    updateStatus(error, false);
  });
}

function connectHR(){
	if (last_connect_time == null){
		last_connect_time = Date.now();
	}else{
		if( (Date.now() - last_connect_time) < 1500){
			console.log("too soon to try to reconnect... waiting");
                updateStatus("Reconnecting", false);
			return;
		}
		else{
			console.log("attempting reconnect");
			last_connect_time = Date.now();
            updateStatus("Reconnecting...", false);
		}
	}
	
	heartRateSensor.connect_()
	.then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  .catch(error => {
      updateStatus(error, false);
  });
	
}

document.addEventListener("status", function(e){
    return;
	console.log("I heard " + e.detail);
    color = "white";
	if(e.detail == "disconnected"){
		// trigger reconnect
		connectHR();
        color ="red";
	}else if(e.detail == "connected-- bad contact"){
		// orange
        color = "orange";
	}else if(e.detail == "connected"){
        color = "green";
	}
    updateStatusBar(e.detail, color);	
	
}, false);


document.addEventListener("hrUpdate", function(e){
    hr = e.detail;
    if(hr.status_msg == "not initialized"){
        return;
    }
    updateStatusBar(hr.status_msg, hr.status_color);
    updateStatus(hr.rate, true);
    
    HRCardHeader.textContent = hr.name;
    HRCardHeaderAge.textContent = hr.age;
}, false);


function handleHeartRateMeasurement(heartRateMeasurement) {
	
  heartRateMeasurement.addEventListener('characteristicvaluechanged', event => {
    var heartRateMeasurement = heartRateSensor.parseHeartRate(event.target.value);
      if(heartRateMeasurement == null){
          return;
      }
    heartRates.push(heartRateMeasurement.heartRate);
  });
}

var heartRates = [];




