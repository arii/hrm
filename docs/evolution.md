# HRM
### Heart Rate Monitor Client and Server for Interactive Virtual Fitness

@author(arii)

HRM was built for my mom and her trainer, Tim, to continue their personal workouts during the pandemic. Tim's gym [FitForLife](https://fitforlifegym.com) had individual, small, and group exercises.  They had a pretty neat bluetooth heartrate monitor setup, where you would walk into the gym and your heartrate would be displayed on a screen.  The devices could also be used with a phone application, like Wahoo fitness.  Heart rate is an interesting and useful data point to personalize and improve your fitness. (TODO link cool heartrate information).  

Due to the pandemic, Tim's gym, like many other closed.  However, we started doing zoom fitness with a small group (3-4 people) and Tim. It started out pretty terrible. There's a ton of nonverbal communication during an exercise that's hard to capture in a small laggy 640x480 pixel stream.  Eventually we improved our video and lighting, home internet configuration, aquired small dumbells, bands, and mats which helps.  We noticed it was hard to keep track of the exercises so Tim would write the list of workout moves and reps and display it on the screen and added some music to make it more engaging.  Eventually, my mom started showing her heartrate displayed in the phone app to the camera and I started to do the same.  Although we did everything to make the workouts better, there still is a ton of information lost during a zoom workout. Providing a method for Tim to see real-time heart rate data makes it easier for him to guage how we are doing through the workout and adjust the intensity appropriately.

I tried a few different things to transmit heart rate in real time:

* python program to capture heart rate data.  Use opencv cv2.putText to write the data on top of the image and use a videoloopback driver to create a fake video device that has the added information.  This works, but I didn't want to attempt to replicate my results in linux on windows after reading about directshow
  * https://github.com/arii/hrm_cam
  ![cv2hrm](/home/ari/hrm/docs/figs/evolve1.png  "CV2 HRM")

* Use a simple web bluetooth app to access realtime heart rate information on windows and linux.  Then use open broadcast studio (OBS) to add the window for heart rate information to the video stream (OBS has a virtualcam plugin).  This worked more consistently on windows, but sometimes the screens would resize or if the usb camera was disconnected and reconnected.  My mom (on windows) had difficulty getting to start up every single time and sometimes zoom would aggressively take permission over the video camera and it was hard for her to disable zoom's camera, renable on obs, and resize the windows.  For the linux side... well I updated my kernel and lost bluetooth capablities all together so I decided a web server would be much better.  Also the data gets mirrored over zoom which looks odd.
  * https://github.com/arii/demos
  
    ![OBS + Web Client ](/home/ari/hrm/docs/figs/evolve2.png  "OBS + Web Client")


Eventually I came to this solution which uses the web heartrate camera and server.  Tim has a computer setup with OBS studio to share its screen as a camera.  He uses it to write the exercises down, run a Tabata timer, and display everyone's current heartrate information
  
    ![OBS + Web App](/home/ari/hrm/docs/figs/evolve3.png  "OBS + Web App")



