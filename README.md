# HRM

![OBS + Web App](https://github.com/arii/hrm/raw/leader/docs/figs/evolve3.png  "OBS + Web App")


### Heart Rate Monitor Client and Server for Interactive Virtual Fitness

HRM was built for my mom, myself, and her trainer, Tim, to continue personal workouts during the pandemic. HRM provides a web client + server solution to see real-time heart rate data from anywhere with a bluetooth, supported browser, and internet connection.  TODO: add more security


__How does it work?__
* Web bluetooth is an unstable, but really cool recent development that makes it easy to write websites that can send and receive bluetooth data.  Standardized Bluetooth 4.0/Ant+ heart rate monitors are relatively cheap 25-60$ and you can start tracking realtime heartrate data with a supported chrome browser. 
Essentially, this software builds off of:
1. [Web bluetooth heart rate monitor demo](https://github.com/WebBluetoothCG/demos) 
2. websocket.io [chat app](https://socket.io/get-started/chat). Instead of chatting with words, you're chatting with your heartrate data.
3. Heart rate zones and colors use the simple max heart rate = 220-AGE and reports percentages of maximum heart rate.
4. [Tabata Interval fitness timer](https://github.com/markdaws/sports-timer)
5. Awesome web server stuff (nginx, pm2, npm, jquery, bootstrap, letsencrypt, ....)

__Running__

```
npm install
npm start
#1- go to localhost:3000 to see aggregate heart rate data and use a tabata timer
#2- go to localhost:3000/hrm to log individual bluetooth heartrates
#3- go to localhost:3000/hrm_mock to send fake heartrate data 
```

###### Starting tabata server and client
After runing `npm start`, open browser to [localhost:3000](localhost:3000). Click the button to start logging a client heart rate.  Open an additional browser to [localhost:3000](localhost:3000) to view the client heartrate data in realtime.

![HRM bringup](https://github.com/arii/hrm/raw/leader/docs/figs/hrm_start.gif "HRM bringup")


###### Starting tabata server and client
Test multiple clients using the mock client utility [localhost:3000/hrm_mock](localhost:3000/hrm_mock) or connect multiple bluetooth interfaces if you have them. 

![HRM Mock](https://github.com/arii/hrm/raw/leader/docs/figs/hrm_mock.gif "HRM mock")



##### Using the tabata/fitness timer
Currently has a 5 second countdown and then will loop through work and rest periods indefinitely. Makes beeping noises.  

![HRM Tabata](https://github.com/arii/hrm/raw/leader/docs/figs/hrm_tabata.gif "HRM tabata")


__For more detailed information:__

* [server bringup](docs/server_setup.md) : how to host the server with a static ip and not just on local host
* [client bringup](docs/client_setup.md) : supported browsers and hardware information
* [detailed running notes](docs/running.md) : heart rate mocking and client zones




__Thanks__

I would love to work with other people on improving this app. Ideally more personal trainers can continue providing guidance for improved fitness during the pandemic. I am releasing everything under an Apache 2.0 license. 

Shout out to:

* [tim](https://fitforlifegym.com/) the trainer
* My mom!
* [dogebot](https://www.linkedin.com/in/dogebot-wow-a71b79) for web UI information
* [ilia](https://github.com/ilebedev) for helping me with web server stuff

I tried a few different things before I got to this solution. Also, I have some more details here that I wrote on an exciting friday night during the pandemic: [origins story](docs/evolution.md).



