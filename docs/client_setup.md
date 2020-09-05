# bluetooth client setup

Individual bluetooth clients use web bluetooth to log
heartrate.   https://webbluetoothcg.github.io/web-bluetooth/  
This is a standardized Generic Attribute Profile (GATT) for Bluetooth 4 wireless devices and generally works on chrome (see below).  


#### Heart rate monitor equipment

The  heartrate protocol is standarized so there are many branded and non branded heart rate monitor products.  If you look for a "Bluetooth/ant+ heart rate monitor" you will probably find a product in the 25-70$ range.  The pricing scales on branding (some are branded for a particuar fitness app) or battery life and band quality.   I generally don't recommend getting a name brand one for more than 30$.  Often they will claim to work for a variety of apps: Garmin, Wahoo, Strava, etc. I recommend downloading one of these apps with your phone and testing the band to verify it works. The apps are prett cool and generally have good battery status and signal support. All things that would be nice to eventually add to this web app :)  

The chest bands tend to work well for monitoring the heart, but require a tight fit and don't work well with large breasts or some sports bras with wide lower bands.  (TODO add photo). There are also wrist bands that might be a better alternative.  Some smart watches have heart rate capabilities, but typically don't use the same protocol so they won't work either.

Perhaps the better BLE sensors sample at a faster rate.  Sometimes I see classic aliasing and my heartrate is probably half as much as it should be.  However, the bands seems to fail most often due to breasts or sport bra malfunction and just need to be fitted tighter.  


#### Phone/computer compatiblity 

Individual bluetooth clients use web bluetooth to log
heartrate.   https://webbluetoothcg.github.io/web-bluetooth/

This is only available in HTTPS and a set of supporting browsers. 

https://developer.mozilla.org/en-US/docs/Web/API/Bluetooth/requestDevice#Browser_compatibility

##### TLDR (as of August 2020):

* It works in chrome for android.  No support for iOS.
* Most modern computers with chrome are supported.  If you're in ubuntu, you 
will need to enable experimental features.

open chrome browser and in the url go to
chrome://flags/#enable-experimental-web-platform-features
and select "enable bluetooth" option.



