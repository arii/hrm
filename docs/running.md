# Running the Heartrate Monitor Server and Client

@author(arii)


#### Landing Page 

The aggregate heartrate monitor information is located at the main landing page:

[localhost:3000](localhost:3000)

![HRM Server Landing Page](https://github.com/arii/hrm/raw/leader/docs/figs/hrm_server.png "HRM Server Landing Page")


#### Logging indivdual heartrate

There's a button to log your own heartrate, which will take you to

[localhost:3000/hrm](localhost:3000/hrm)

![HRM client connect](https://github.com/arii/hrm/raw/leader/docs/figs/client_connect.png "HRM Client")

There is a prompt to fill in your name and age.  Your name will be displayed in the server landing page and the age is used to compute maximum heart rate percentage.


#### maximum heart rate percentage and colors

I'm using a very simple algorithm for heart rate that you can modify in `public/js/heartRateZones.js`

```
 heartRateZones.js
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

```

#### Sending mock data
You can use the mock data generator to test multiple heart rate user

[localhost:3000/hrm_mock](localhost:3000/hrm_mock)

Each user is uniquely identified by their device id. In order to send multiple clients, cmodify device ID to a new number.

![HRM Multiple Users](https://github.com/arii/hrm/raw/leader/docs/figs/running.png "HRM Multiple Users")



#### Client Server communication

I am using websocket.io to send data from the hrm client [localhost:3000/hrm](localhost:3000/hrm) to the landing page l[localhost:3000](localhost:3000). 

Currently no data is saved on the web server.  Whatever data the server receives it will display on the landing page.  If a client has not sent data for over 4 seconds it will display the heartrate as -- and if it's over 30 seconds it will remove the heartrate card for that user.



