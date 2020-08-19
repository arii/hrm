/* 
 * @author(arii) 
 *
 * Maximum heart rate is 220- age
 * Zones: 
 * Zone 5 (90-100% of maximum) maximum, red
 * Zone 4 (80-90% of maximum) hard, orange
 * Zone 3 (70-80% of maximum) moderate, green
 * Zone 2 (60-70% of maximum) light, blue
 * Zone 1 (50-60% of maximum) very light, grey
 * */

console.log("hello world!");

var colors = {
    5: "#dc3545",//red
    4: "#fd7e14", //orange
    3: "#28a745", //green
    2: "#17a2b8", // blue
    1: "#f8f9fa", //light grey
};




function computeZonePercent(age, heartRate){
    /* returns precentage from assumed maximum heart rate */

    if (age == 220 || isNaN(heartRate) ){
        return 0;
    }
    
    var maxHR = 220 - parseInt(age);
    var percentage = parseFloat(heartRate)/parseFloat(maxHR);
    return percentage;
    }

function computeZone(age, heartRate){
    var percentage = computeZonePercent(age, heartRate);

    if(percentage >= 0.90){
        zone = 5;
    }else if (percentage >= 0.8){
        zone = 4;
    }else if (percentage >= 0.7){
        zone = 3;
    }else if (percentage >= 0.6){
        zone = 2;
    }else{
        zone = 1
    }
    return zone;

}

function computeZoneAndPercent(age, heartRate){
    percentage = computeZonePercent(age, heartRate);
    zone = computeZone(age, heartRate);
    return {'zone': zone, 'percentage': percentage}
    }


function computeZoneStyle(age, heartRate){
    zone = computeZone(age, heartRate);
    style = colors[zone];
    return style;
    }

