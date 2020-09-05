# HRM

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
# go to localhost:3000 to see aggregate heart rate data and use a tabata timer
# go to localhost:3000/hrm to log individual bluetooth heartrates
# go to localhost:3000/hrm_mock to send fake heartrate data 
```

For more detailed information:
[server bringup](docs/server_setup.md)
[client bringup](docs/client_setup.md)
[detailed running notes](docs/running.md)




__Thanks__

I would love to work with other people on improving this app. Ideally more personal trainers can continue providing guidance for improved fitness during the pandemic. I am releasing everything under a BSD license. 

Shout out to:

* [tim](https://fitforlifegym.com/) the trainer
* My mom!
* [dogebot](https://www.linkedin.com/in/dogebot-wow-a71b79) for web UI information
* [ilia](https://github.com/ilebedev) for helping me with web server stuff

I tried a few different things before I got to this solution. Also, I have some more details here that I wrote on an exciting friday night during the pandemic: [origins story] (docs/evolution.md).



