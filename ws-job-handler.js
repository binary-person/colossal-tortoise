const fetch = require('node-fetch');

function pick_job_thread(job){ // {thread: Number, jobid: String, workerjs: String, workerjs_hash: String}
    if(job.finished) return false;
    // if all workers are working on all the threads, work on the threads that are not finished yet
    if(Object.keys(job.threads_finished).length === job.required_threads){
        for(let each_unfinished_thread of job.unfinished_threads){
            if(!job.threads_finished[each_unfinished_thread].finished){
                return {
                    type: 'INCOMING_WORK',
                    thread: each_unfinished_thread,
                    jobid: job.jobid,
                    workerjs: job.workerjs,
                    workerjs_hash: job.workerjs_hash
                };
            }
        }
    }else if(job.unfinished_threads.length){
        let thread = job.unfinished_threads[Math.floor(Math.random()*job.unfinished_threads.length)];
        job.threads_finished[thread] = {finished: false};
        return {
            type: 'INCOMING_WORK',
            thread,
            jobid: job.jobid,
            workerjs: job.workerjs,
            workerjs_hash: job.workerjs_hash
        };
    }
    return false;
}
function get_job(jobid, jobs, onsuccess){
    for(let each_job of jobs){
        if(each_job.jobid === jobid){
            onsuccess(each_job);
            return true;
        }
    }
    return false;
}
module.exports = function(app, jobs){
    app.ws('/ws/core-worker', function(ws_client){
        let current_jobid = '';
        ws_client.on('message', function(message){
            let parsed = JSON.parse(message);
            let send_job = ()=>{
                get_job(parsed.jobid, jobs, function(job){
                    if(current_jobid === ''){
                        current_jobid = job.jobid;
                        job.cores++;
                    }else if(current_jobid !== job.jobid){
                        get_job(current_jobid, jobs, function(j){
                            j.cores--;
                            current_jobid = job.jobid;
                            job.cores++;
                        });
                    }
                    let picked_job = pick_job_thread(job);
                    if(picked_job){
                        ws_client.send(JSON.stringify(picked_job));
                    }
                });
            };
            switch(parsed.type){
                case 'HEARTBEAT':
                    ws_client.send(JSON.stringify({
                        type: 'HEARTBEAT'
                    }));
                    break;
                case 'GET_JOB':
                    send_job();
                    break;
                case 'RETURN_RESULT':
                    get_job(parsed.jobid, jobs, function(job){
                        if(job.threads_finished[parsed.thread]
                        && job.workerjs_hash === parsed.workerjs_hash
                        && !job.threads_finished[parsed.thread].finished){
                            job.threads_finished[parsed.thread].result = parsed.result;
                            job.threads_finished[parsed.thread].finished = true;
                            job.unfinished_threads.splice(job.unfinished_threads.indexOf(parsed.thread), 1);
                            if(job.unfinished_threads.length === 0){
                                job.finished = true;
                                if(job.webhook_completion_url) try{
                                    new URL(job.webhook_completion_url);
                                    fetch(job.webhook_completion_url).then(()=>'').catch(()=>'');
                                }catch(e){}
                            }
                        }
                    });
                    send_job();
                    break;
            }
        });
        ws_client.on('close', function(){
            get_job(current_jobid, jobs, function(job){
                job.cores--;
            });
        });
    });
    app.ws('/ws/worker', function(ws_client){
        let current_jobid = '';
        ws_client.on('message', function(message){
            let parsed = JSON.parse(message);
            switch(parsed.type){
                case 'HEARTBEAT':
                    ws_client.send(JSON.stringify({
                        type: 'HEARTBEAT'
                    }));
                    break;
                case 'REQUEST_JOB':
                    let did_exist = get_job(parsed.jobid, jobs, function(job){
                        if(current_jobid === ''){
                            current_jobid = job.jobid;
                            job.workers++;
                        }else if(parsed.jobid !== current_jobid){
                            get_job(current_jobid, jobs, function(j){
                                j.workers--;
                                current_jobid = job.jobid;
                                job.workers++;
                            });
                        }
                        if(!job.finished) ws_client.send(JSON.stringify({
                            type: 'GO_WORK',
                            jobid: job.jobid
                        }));
                    });
                    if(!did_exist){
                        for(let each_job of jobs){
                            if(!each_job.finished){
                                if(current_jobid === ''){
                                    current_jobid = each_job.jobid;
                                    each_job.workers++;
                                }else if(each_job.jobid !== current_jobid){
                                    get_job(current_jobid, jobs, function(j){
                                        j.workers--;
                                        current_jobid = job.jobid;
                                        job.workers++;
                                    });
                                }
                                ws_client.send(JSON.stringify({
                                    type: 'GO_WORK',
                                    jobid: each_job.jobid,
                                    description: each_job.description
                                }));
                            }
                        }
                    }
                    break;
            }
        });
        ws_client.on('close', function(){
            get_job(current_jobid, jobs, function(job){
                job.workers--;
            });
        });
    });
};