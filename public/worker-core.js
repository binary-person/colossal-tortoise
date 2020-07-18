let first_run = false;
let callback = function(){};
onmessage = function(event){
    if(first_run) return callback(event.data);
    first_run = true;
    let worker_core_ws = new WebSocket(event.data[1]+'/ws/core-worker');
    worker_core_ws.onopen = function(){
        worker_core_ws.send(JSON.stringify({
            type: 'GET_JOB',
            jobid: event.data[0]
        }));
    };
    worker_core_ws.onmessage = function(message){
        let parsed = JSON.parse(message.data);
        if(parsed.type === 'INCOMING_WORK'){
            // nested workers unsupported in safari iOS
            // let worker = new Worker(URL.createObjectURL(new Blob([parsed.workerjs], {type: 'application/javascript'})));
            // worker.onmessage = function(result){
            //     worker_core_ws.send(JSON.stringify({
            //         type: 'RETURN_RESULT',
            //         thread: parsed.thread,
            //         jobid: parsed.jobid,
            //         workerjs_hash: parsed.workerjs_hash,
            //         result: result.data
            //     }));

            //     worker.terminate();
            // };
            // worker.postMessage(parsed.thread);
            postMessage([URL.createObjectURL(new Blob([parsed.workerjs], {type: 'application/javascript'})), parsed.thread]);
            callback = function(result){
                worker_core_ws.send(JSON.stringify({
                    type: 'RETURN_RESULT',
                    thread: parsed.thread,
                    jobid: parsed.jobid,
                    workerjs_hash: parsed.workerjs_hash,
                    result
                }));
            };
        }
    };
    setInterval(()=>{
        if(worker_core_ws.readyState === worker_core_ws.OPEN){
            worker_core_ws.send(JSON.stringify({
                type: 'HEARTBEAT'
            }));
        }
    }, 5000);
};