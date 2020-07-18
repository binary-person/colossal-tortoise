(function(){
    if(!document.currentScript) return;
    let src_url = new URL(document.currentScript.src);

    const SCRIPT_JOBID = '__JOBID_HASH__';
    const COLOSSAL_TORTOISE_HOST = src_url.host;
    const WS_BASEURL = `ws${src_url.protocol=='https:'?'s':''}://${COLOSSAL_TORTOISE_HOST}`;
    const HTTP_BASEURL = `http${src_url.protocol=='https:'?'s':''}://${COLOSSAL_TORTOISE_HOST}`;
    let is_working = false;
    let worker_ws = new WebSocket(WS_BASEURL+'/ws/worker');
    worker_ws.onopen = function(){
        worker_ws.send(JSON.stringify({
            type: 'REQUEST_JOB',
            jobid: SCRIPT_JOBID
        }));
    };
    worker_ws.onmessage = function(message){
        let parsed = JSON.parse(message.data);
        if(parsed.type === 'GO_WORK' && !is_working){
            is_working = true;
            if(!window.localStorage.getItem('colossal_tortoise_consent') || Date.now() - parseInt(window.localStorage.getItem('colossal_tortoise_date')) > 1000*60*60*24*7){
                let notice_iframe = document.createElement('iframe');
                document.body.appendChild(notice_iframe);
                notice_iframe.style.position = 'absolute';
                notice_iframe.style.top = '-50%';
                notice_iframe.style.left = '50%';
                notice_iframe.style.transform = 'translateX(-50%)';
                notice_iframe.style.borderRadius = '10px';
                notice_iframe.style.opacity = '0';
                notice_iframe.style.transition = '0.5s';
                notice_iframe.style.border = 'none';
                notice_iframe.style.width = '600px';
                notice_iframe.style.height = '200px';

                let grayer = document.createElement('div');
                grayer.style.position = 'fixed';
                grayer.style.top = '0';
                grayer.style.bottom = '0';
                grayer.style.left = '0';
                grayer.style.right = '0';
                grayer.style.opacity = '0';
                grayer.style.transition = '0.5s';
                grayer.style.backgroundColor = 'black';

                 let run_on_window_load = function(){
                    document.body.appendChild(grayer);
                    document.body.appendChild(notice_iframe);
                    notice_iframe.style.backgroundColor = 'white';
                    notice_iframe.contentDocument.body.innerHTML = `
                    <img src='${HTTP_BASEURL+'/logo.png'}'>
                    <style>body{margin:0 20px;overflow-wrap:break-word;text-align:center;}
                    p{font-family:sans-serif;font-size:1.2em;margin:0 0 10px 0;}
                    span{font-family:sans-serif;font-size:2em;cursor:pointer;}
                    #yes{margin-right:5px;color:rgb(99, 185, 255);}
                    #no{margin-left:5px;color:rgb(255, 105, 135);}
                    a{color:rgb(49, 157, 245);text-decoration:none;}</style>
                    <p>Do you consent ${parsed.jobid}'s use of your cores?</p>
                    <p>Job description: ${(function(){let a=document.createElement('textarea');a.textContent=parsed.description;return a.innerHTML})()}</p> <!-- :P -->
                    <p>More info can be found <a target='_blank' href='${HTTP_BASEURL+'/#'+parsed.jobid}'>here</a></p>
                    <span id="yes">Yes</span><span id="no">No</span>
                    <p>Choice will be remembered for a week</p>
                    `; // save the time and pain
                    if(notice_iframe.contentDocument.readyState !== 'complete'){
                        notice_iframe.onload = function(){
                            notice_iframe.style.height = notice_iframe.contentDocument.documentElement.scrollHeight + 'px';
                        };
                    }else{ // fix for iOS 13 safari's weird issues
                        setTimeout(()=>notice_iframe.style.height = notice_iframe.contentDocument.documentElement.scrollHeight + 'px', 100);
                    }
                    let close_frame = ()=>{
                        notice_iframe.style.height = '200px';
                        notice_iframe.style.opacity = '0';
                        notice_iframe.style.top = '-50%';
                        grayer.style.opacity = '0';
                        setTimeout(()=>{
                            notice_iframe.parentNode.removeChild(notice_iframe);
                            grayer.parentNode.removeChild(grayer);
                        }, 1000);
                    };
                    window.localStorage.setItem('colossal_tortoise_date', Date.now());
                    notice_iframe.contentDocument.getElementById('yes').onclick = function(){
                        window.localStorage.setItem('colossal_tortoise_consent', 'true');
                        close_frame();
                        run(parsed);
                    };
                    notice_iframe.contentDocument.getElementById('no').onclick = function(){
                        window.localStorage.setItem('colossal_tortoise_consent', 'false');
                        worker_ws.close();
                        close_frame();
                    };
                    grayer.style.opacity = '0.25';
                    notice_iframe.style.opacity = '1';
                    notice_iframe.style.top = '20px';
                    notice_iframe.style.marginBottom = '20px';
                };
                if(document.readyState !== 'complete'){
                    window.addEventListener('load', run_on_window_load);
                }else{
                    run_on_window_load(); // fix for weird document.readyState behaviour on iOS 13 Safari iPhone
                }
            }else if(window.localStorage.getItem('colossal_tortoise_consent') == 'true'){
                run(parsed);
            }else{
                worker_ws.close();
            }
        }
    };
    function run(parsed){
        for(let each_core = 0; each_core < (window.navigator.hardwareConcurrency || 1); each_core++){
            let worker = new Worker(HTTP_BASEURL+'/worker-core.js');
            worker.postMessage([parsed.jobid, WS_BASEURL]);
            worker.onmessage = function(event){
                let actual_worker = new Worker(event.data[0]);
                actual_worker.onmessage = function(event_2){
                    worker.postMessage(event_2.data);
                    actual_worker.terminate();
                };
                actual_worker.postMessage(event.data[1]);
            };
        }
    }
    setInterval(()=>{
        if(worker_ws.readyState === worker_ws.OPEN){
            worker_ws.send(JSON.stringify({
                type: 'HEARTBEAT'
            }));
        }
    }, 5000);
})();