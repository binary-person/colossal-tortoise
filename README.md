# Colossal Tortoise

<img src='https://raw.githubusercontent.com/scheng123/colossal-tortoise/master/public/logo.png' alt='Logo'>

Table of contents
- [Live Application](#live-application)
- [Introduction](#introduction)
- [Why Colossal Tortoise?](#why-colossal-tortoise)
- [Can I opt out of loaning my device's computing power?](#can-i-opt-out-of-loaning-my-devices-computing-power)
- [Why the name Colossal Tortoise?](#why-the-name-colossal-tortoise)
- [Any finicky libraries that Colossal Toroise use?](#any-finicky-libraries-that-colossal-tortoise-use)
- [Usage](#usage)
    - [Creating a workerjs script](#creating-a-workerjs-script)
    - [Getting worker results](#getting-worker-results)
    - [Creating a job](#creating-a-job)
    - [Supporting all jobs](#supporting-all-jobs)
    - [Supporting a specific job](#supporting-a-specific-job)
- [Running my own Colossal Tortoise server](#running-my-own-colossal-tortoise-server)

## Live Application
It is suggested that you read through the entire README.md before going to the live app.

Live Colossal Tortoise server: [Colossal Tortoise](https://colossal-tortoise.tbt.mx)

Worker demo (must have running job first): [Worker demo](https://colossal-tortoise.tbt.mx/worker-demo.html)

## Introduction
With the most powerful browsing devices sitting at the palms of our hands, what if we use that device for research that could change humanity? What if we combine the power of that device with millions of other devices? Billions? What if we also include desktop computers and laptops?

The potential amount of processing power is far from imaginable. With this kind of computing power, we could run massive simulations like evolution simulations and disease simulations. Scientists and researchers do not have to buy expensive equipment to run their simulations. People have a way to contribute to scientists working on the very products that benefit people.

## Why Colossal Tortoise?
Supercomputer like [FoldingAtHome](https://foldingathome.org) already exists so why Colossal Tortoise? One answer: portability. FoldingAtHome already has a lot of users. But what about mobile phones? Or the rest of the devices that cannot install FoldignAtHome software? Or that people just do not want to install the FoldingAtHome worker on their device? With Colossal Tortoise, they do not have to install, or be left out, because as long as they have a browser, they can loan their devices's computing power to scientists and researchers.

## Can I opt out of loaning my device's computing power?
Of course. Colossal Tortoise is all about consent. When you visit a site that is supporting a scientist by appending a worker script on their website, there will be a popup regarding your consent on the use of your processing power.

## Why the name Colossal Tortoise?
Colossal means big. Big big big. Colossal Tortoise resembles the big big turtle that is connected to many different turtles that are living on the big big turtle. The little turtles do the living work for the big big turtle. Consequently, there is life on top of the big big turtle's shell. Similarly, the Colossal Tortoise can only happen by having many users (little turtles) join together to make the work happen.

## Any finicky libraries that Colossal Tortoise use?
No, with the exception of express, express-ws, md5, and node-fetch. There are no client-side libraries either. Everything is 99.99% pure javascript. (but what about frontend html... stop)

## Usage
### Creating a workerjs script
The script is a Web Worker script. It needs to listen for the `onmessage` event to know which thread it itself is on. It uses `postMessage` for returning the result to the Colossal Tortoise server. The following is a sample code that waits for one second, then returns the result of its thread squared.
```js
onmessage=function(event){ // event.data is the thread number, from 1 to N where N is the total required threads to run this job
    let thread_number = event.data;
    setTimeout(()=>{
        postMessage(Math.pow(thread_number, 2)); // if the current thread is 5, the result is 25
    }, 1000); // waits for one second, then returns the result
}
```
### Getting worker results
Go to the Colossal Tortoise server page and click on a jobid. There should be a link that says "API endpoint for worker results". Alternatively, you could go to https://COLOSSAL_TORTOISE_URL/workerresults/jobid_here

To know when a job is finished, you could enter in a webhook URL (during job creation/edit) or you could poll the API endpoint for worker results. The following is the JSON format for worker results:
```
{
    "1": {
        "finished": true|false,
        "result": your_workerjs_postMessage_result
    },
    "thread_number": {...},....
}
```
Note that threads which haven't started yet will not appear in the worker result as `worker_result[threadnumber].finished === false` nor will the object `worker_result[threadnumber]` exist. This is to keep track if the workers that are joining up to process the job needs to work on new threads or work on threads by slow workers.

### Creating a job
Simply go to the Colossal Tortoise server page and click on "Create/Edit Job". From there, you can upload your workerjs script.

### Supporting all jobs
Append the following to the head section of your website
```html
<script src="https://COLOSSAL_TORTOISE_URL/worker.js"></script>
```

### Supporting a specific job
Go to https://COLOSSAL_TORTOISE_URL/ and click on a jobid. A code snippet should appear that will only for the specified jobid. Alternatively, you could append the following, replacing `somejobid` with your own:
```html
<script src="https://COLOSSAL_TORTOISE_URL/worker.js?jobid=somejobid"></script>
```

## Running my own Colossal Tortoise server
To start, go onto a Linux machine and install nodejs, pm2, nginx, nano, and git. The following commands are assuming you are running Ubuntu.
```
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx nano
git clone https://github.com/scheng123/colossal-tortoise ~/colossal-tortoise
cd ~/colossal-tortoise
npm install
sudo npm install -g pm2
pm2 start server.js --name 'Colossal Tortoise server'
sudo adduser --system --home /nonexistent --shell /bin/false --no-create-home --disabled-login --disabled-password --gecos "nginx user" --group nginx

# if you don't want to bother with nginx, run the following command and your app should be on port 80
pm2 delete 'Colossal Tortoise server'
sudo pm2 start 'PORT=80 IP=0.0.0.0 node server.js' --name 'Colossal Tortoise server'
sudo pm2 startup
sudo pm2 save
```
Now that our server is running, we need to configure nginx to forward the request. Run `nano -n /etc/nginx/nginx.conf` and paste in the following:
```
user nginx nginx;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events{
    worker_connections 1024;
}

http{
    map $http_upgrade $connection_upgrade {
        default Upgrade;
        '' close;
    }
    
    server{
        server_name *; # change this to your (sub)domain name
        
        listen 80;
        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```
Hit `Ctrl+x`, `y`, then `Enter`. Restart nginx by `sudo service nginx restart`. The app should be running on port 80! Get a SSL certificate using [Certbot nginx](https://certbot.eff.org/lets-encrypt/ubuntubionic-nginx)

## Ending notes
This software is released under GNU General Public License version 3. A copy of this license is available in the repository's root directory with a file named "LICENSE."

As always, JavaScript at its purest vanilla flavor,<br>
Simon Cheng