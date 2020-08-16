var canvas = document.querySelector('canvas');
var statusText = document.querySelector('#statusText');
var statusBar = document.querySelector('#statusBar');
var last_connect_time = null;
var last_update = null;


statusText.addEventListener('click', function() {
  statusText.textContent = 'Breathe...';
  heartRates = [];
  initialClick();
});

function initialClick(){
  heartRateSensor.init()
  .then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  .catch(error => {
    statusText.textContent = error;
  });
}

function connectHR(){
	if (last_connect_time == null){
		last_connect_time = Date.now();
	}else{
		if( (Date.now() - last_connect_time) < 1500){
			console.log("too soon to try to reconnect... waiting");
			    statusText.innerHTML = "reconnecting";

			return;
		}
		else{
			console.log("attempting reconnect");
			last_connect_time = Date.now();
			statusText.innerHTML += ".";

		}
	}
	
	heartRateSensor.connect_()
	.then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  .catch(error => {
    statusText.textContent = error;
  });
	
}

document.addEventListener("status", function(e){
	console.log("I heard " + e.detail);
	statusBar.textContent = e.detail;
	if(e.detail == "disconnected"){
		// trigger reconnect
		connectHR();
		statusBar.style.backgroundColor = "red";

	}else if(e.detail == "connected-- bad contact"){
		// orange
		console.log("orange");
		statusBar.style.backgroundColor = "orange";

	}else if(e.detail == "connected"){
		console.log("green");
		statusBar.style.backgroundColor = "green";

	}
	
	
}, false);

	
function handleHeartRateMeasurement(heartRateMeasurement) {
	
  heartRateMeasurement.addEventListener('characteristicvaluechanged', event => {
    var heartRateMeasurement = heartRateSensor.parseHeartRate(event.target.value);
      if(heartRateMeasurement == null){
          return;
      }
    statusText.innerHTML = heartRateMeasurement.heartRate + ' &#x2764;';
    heartRates.push(heartRateMeasurement.heartRate);
    drawWaves();
  });
}

var heartRates = [];
var mode = 'bar';

canvas.addEventListener('click', event => {
  mode = mode === 'bar' ? 'line' : 'bar';
  drawWaves();
});

function drawWaves() {
  requestAnimationFrame(() => {
    canvas.width = parseInt(getComputedStyle(canvas).width.slice(0, -2)) * devicePixelRatio;
    canvas.height = parseInt(getComputedStyle(canvas).height.slice(0, -2)) * devicePixelRatio;

    var context = canvas.getContext('2d');
    var margin = 2;
    var max = Math.max(0, Math.round(canvas.width / 11));
    var offset = Math.max(0, heartRates.length - max);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#00796B';
    if (mode === 'bar') {
      for (var i = 0; i < Math.max(heartRates.length, max); i++) {
        var barHeight = Math.round(heartRates[i + offset ] * canvas.height / 200);
        context.rect(11 * i + margin, canvas.height - barHeight, margin, Math.max(0, barHeight - margin));
        context.stroke();
      }
    } else if (mode === 'line') {
      context.beginPath();
      context.lineWidth = 6;
      context.lineJoin = 'round';
      context.shadowBlur = '1';
      context.shadowColor = '#333';
      context.shadowOffsetY = '1';
      for (var i = 0; i < Math.max(heartRates.length, max); i++) {
        var lineHeight = Math.round(heartRates[i + offset ] * canvas.height / 200);
        if (i === 0) {
          context.moveTo(11 * i, canvas.height - lineHeight);
        } else {
          context.lineTo(11 * i, canvas.height - lineHeight);
        }
        context.stroke();
      }
    }
  });
}

window.onresize = drawWaves;

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    drawWaves();
  }
});
