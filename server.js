'use-strict';

const express = require('express');
const enable_ws = require('express-ws');
const md5 = require('md5');
const http = require('http');
const fs = require('fs');
const ws_handler = require('./ws-job-handler');

const port = process.env.PORT || 8080;
const bind_ip = process.env.IP || '127.0.0.1';

/**
 * [{
 *     jobid: "hash",
 *     
 * },...]
 */
/*
// test data for reference:
var jobs = [{
    jobid: "89b4138517796b88585a05a3bb76d6b2",
    description: "Protein folding",
    workers: 0,
    cores: 0,
    finished: false,
    threads_required: 5,
    // threads_finished: {1:{finished:false,result:'result'}, 2:{finished:true,result:'result'}},
    threads_finished: {},
    unfinished_threads: [1,2,3,4,5],
    webhook_completion_url: 'http://localhost:1111',
    workerjs: 'onmessage=function(event){setTimeout(()=>postMessage(event.data), 10000)}',
    workerjs_hash: 'f5f4d1722152e8f0e3bec54704432dcf',
    password: '5f4dcc3b5aa765d61d8327deb882cf99' // md5 hash for 'password'
}];
*/
var jobs = [];

const workerjs_template = fs.readFileSync('public/worker.js', 'utf8');
var app = express();
enable_ws(app);
ws_handler(app, jobs);

app.use(express.json());
app.get('/worker.js', function(req, res){
    res.setHeader('Content-Type', 'application/javascript');
    if(req.query.jobid){
        res.send(workerjs_template.replace('__JOBID_HASH__', req.query.jobid));
    }else{
        res.send(workerjs_template);
    }
});
app.get('/workerjs/:jobid', function(req, res){
    res.setHeader('Content-Type', 'application/javascript');
    if(req.params.jobid){
        for(let each_job of jobs){
            if(each_job.jobid === req.params.jobid){
                res.send(each_job.workerjs);
                return;
            }
        }
    }
    res.send('');
});
app.get('/workerresults/:jobid', function(req, res){
    if(req.params.jobid){
        for(let each_job of jobs){
            if(each_job.jobid === req.params.jobid){
                res.json(each_job.threads_finished);
                return;
            }
        }
    }
    res.json({});
});
app.post('/createjob', function(req, res){
    if(Object.keys(req.body).length){
        if(req.body.description && req.body.workerjs &&
        req.body.threads_required > 0 && req.body.password){
            if(req.body.jobid){
                for(let each_job of jobs){
                    if(req.body.jobid === each_job.jobid){
                        if(md5(req.body.password) !== each_job.password){
                            res.status(400).send('Bad password');
                            return;
                        }
                        each_job.description = req.body.description;
                        each_job.finished = false;
                        each_job.threads_required = req.body.threads_required;
                        each_job.threads_finished = {};
                        let temp = [];
                        for(let c=1;c<=each_job.threads_required;c++) temp.push(c);
                        each_job.unfinished_threads = temp;
                        each_job.workerjs = req.body.workerjs;
                        each_job.workerjs_hash = md5(req.body.workerjs);
                        each_job.webhook_completion_url = req.body.webhook_completion;
                        res.send('Updated');
                        return;
                    }
                }
            }
            let temp = [];
            for(let c=1;c<=req.body.threads_required;c++) temp.push(c);
            jobs.push({
                jobid: md5(''+Date.now()+Math.random()),
                description: req.body.description,
                workers: 0,
                cores: 0,
                finished: false,
                threads_required: req.body.threads_required,
                threads_finished: {},
                unfinished_threads: temp,
                webhook_completion_url: req.body.webhook_completion,
                workerjs: req.body.workerjs,
                workerjs_hash: md5(req.body.workerjs),
                password: md5(req.body.password)
            });
            res.send(jobs[jobs.length-1].jobid);
        }else{
            res.status(400).send('Missing parameters');
        }
    }else{
        res.status(400).send('Bad JSON');
    }
});
app.get('/listjobs', function(req, res){
    let result = [];
    for(let each_job of jobs){
        let finished_thread_count = 0;
        for(let thread_number in each_job.threads_finished){
            if(each_job.threads_finished[thread_number].finished) finished_thread_count++;
        }
        result.push({
            jobid: each_job.jobid,
            description: each_job.description,
            workers: each_job.workers,
            cores: each_job.cores,
            finished: each_job.finished,
            threads_required: each_job.threads_required,
            threads_finished: finished_thread_count
        });
    }
    res.json(result);
});
app.use(express.static(__dirname+'/public'));

app.listen(port, bind_ip, null, ()=>console.log('Colossal Tortoise server listening on port '+port));