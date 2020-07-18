function sleep(ms){return new Promise(resolve=>setTimeout(resolve, ms))}
window.addEventListener('load', async function(){
    await refresh_list();
    let splash = document.getElementById('splash-wrapper');
    let table = document.querySelector('table');
    let top_bar = document.getElementById('top-bar');
    let top_bar_createjob_btn = document.getElementById('top-bar-btn');
    let createjob_grayer = document.getElementById('createjob-grayer');
    let createjob_btn = document.getElementById('createjob-btn');
    let createjob_file = document.getElementById('createjob-workerjs-file');
    let createjob_filename = document.getElementById('createjob-workerjs-filename');
    
    splash.style.top = 0;
    splash.style.left = 0;
    splash.style.transform = 'initial';
    splash.style.height = '100px';
    await sleep(1200);
    table.style.opacity = 1;
    top_bar.style.opacity = 1;

    createjob_btn.onclick = create_job_handler;
    createjob_grayer.onclick = createjob_hide;
    top_bar_createjob_btn.onclick = createjob_show;
    createjob_file.onchange = function(){
        if(createjob_file.files.length){
            createjob_filename.textContent = 'Current file selected: '+createjob_file.files[0].name;
        }else{
            createjob_filename.textContent = 'No file selected';
        }
    };

    if(window.location.hash){
        let jobid = window.location.hash.replace(/^#/, '');
        let tbody = document.querySelector('tbody');
        for(let each_tr of tbody.childNodes){
            if(each_tr.childNodes[0].childNodes[0].textContent === jobid){
                each_tr.childNodes[0].childNodes[0].click();
            }
        }
    }
});

let previous_joblist = [];
function refresh_list(){
    return new Promise(async resolve=>{
        let joblist;
        try{joblist = await (await fetch('/listjobs')).json()}catch(e){return resolve()}
        if(JSON.stringify(previous_joblist) === JSON.stringify(joblist)) return resolve();
        previous_joblist = joblist;
        let tbody = document.querySelector('tbody');
        let total_workers = 0;
        let total_cores = 0;
        while(tbody.lastChild) tbody.removeChild(tbody.lastChild);
        for(let each_job of joblist){
            let tr = document.createElement('tr');
            tr.setAttribute('job-data', JSON.stringify(each_job));

            let jobid = document.createElement('td');
            let span = document.createElement('span');
            span.textContent = each_job.jobid;
            span.className = 'clickable-jobid';
            span.onclick = jobinfo_show;
            jobid.appendChild(span);
            
            let job_description = document.createElement('td');
            job_description.textContent = each_job.description;

            let workers_online = document.createElement('td');
            workers_online.textContent = each_job.workers;
            total_workers += each_job.workers;

            let core_count = document.createElement('td');
            core_count.textContent = each_job.cores;
            total_cores += each_job.cores;

            tr.appendChild(jobid);
            tr.appendChild(job_description);
            tr.appendChild(workers_online);
            tr.appendChild(core_count);

            tbody.appendChild(tr);
        }
        document.getElementById('total-jobs').textContent = joblist.length;
        document.getElementById('total-workers').textContent = total_workers;
        document.getElementById('total-cores').textContent = total_cores;

        let open_job_slides = document.getElementsByClassName('jobinfo-slide');
        for(let each_slide of open_job_slides){
            let jobid = each_slide.childNodes[0].textContent.split(' ').pop();
            for(let each_job of joblist){
                if(each_job.jobid === jobid){
                    each_slide.childNodes[1].textContent = 'Status: '+(each_job.finished?'Finished':'Processing');
                    each_slide.childNodes[2].textContent = `${each_job.threads_finished} out of ${each_job.threads_required} finished`;
                    each_slide.childNodes[3].textContent = 'Description: '+each_job.description;
                    each_slide.childNodes[4].textContent = 'Workers online: '+each_job.workers;
                    each_slide.childNodes[5].textContent = 'Worker cores online: '+each_job.cores;
                    break;
                }
            }
        }
        resolve();
    });
}

function create_job_handler(){
    let description = document.getElementById('createjob-description');
    let workerjs_file = document.getElementById('createjob-workerjs-file');
    let thread_amt = document.getElementById('createjob-thread-amount');
    let webhook_completion = document.getElementById('createjob-completion-webhook');
    let edit_jobid = document.getElementById('createjob-edit-jobid');
    let password = document.getElementById('createjob-password');

    let creating_job = document.getElementById('createjob-creating');
    let creating_err = document.getElementById('createjob-error');
    let creating_err_connection = document.getElementById('createjob-connection-error');
    let creating_btn = document.getElementById('createjob-btn');
    
    if(description.textContent && workerjs_file.files.length &&
    parseInt(thread_amt.value) > 0 && password.value){
        creating_btn.style.pointerEvents = 'none';
        creating_err.style.display = '';
        creating_err_connection.style.display = '';
        creating_job.style.display = 'initial';
        
        let reader = new FileReader();
        let err_handler = ()=>{
            creating_btn.style.pointerEvents = '';
            creating_job.style.display = '';
            creating_err_connection.style.display = 'initial';
        };
        reader.onload = function(){
            fetch('/createjob', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: description.value,
                    workerjs: reader.result,
                    threads_required: parseInt(thread_amt.value),
                    password: password.value,
                    webhook_completion: webhook_completion.value,
                    jobid: edit_jobid.value
                })
            }).then(async (res)=>{
                creating_btn.style.pointerEvents = '';
                creating_job.style.display = '';
                if(await res.text() === 'Bad password'){
                    err_handler();
                    return;
                }
                await refresh_list();
                createjob_hide();
            }).catch(err_handler);
        };
        reader.onerror = function(){
            err_handler();
        };
        reader.readAsText(workerjs_file.files[0]);
    }else{
        creating_err.style.display = 'initial';
        creating_err_connection.style.display = '';
        creating_btn.style.pointerEvents = '';
        creating_job.style.display = '';
    }
}

function slide_show(slide_element, gray_element){
    gray_element.style.display = 'initial';
    slide_element.style.display = 'initial';
    setTimeout(function(){
        slide_element.style.top = '10px';
        slide_element.style.opacity = 1;
        gray_element.style.opacity = 0.25;
    }, 0);
}
function slide_hide(slide_element, gray_element, do_destroy){
    slide_element.style.top = '';
    slide_element.style.opacity = '';
    gray_element.style.opacity = '';
    setTimeout(function(){
        gray_element.style.display = '';
        slide_element.style.display = '';
        if(do_destroy){
            if(slide_element.parentNode) slide_element.parentNode.removeChild(slide_element);
            if(gray_element.parentNode) gray_element.parentNode.removeChild(gray_element);
        }
    }, 700);
}

function createjob_show(){
    slide_show(document.getElementById('createjob-slide'), document.getElementById('createjob-grayer'));
}
function createjob_hide(){
    slide_hide(document.getElementById('createjob-slide'), document.getElementById('createjob-grayer'));
}

function jobinfo_show(event){
    let data = JSON.parse(event.target.parentNode.parentNode.getAttribute('job-data'));

    let jobinfo_slide = document.createElement('div');
    jobinfo_slide.classList.add('jobinfo-slide');
    jobinfo_slide.classList.add('slide-template');

    let title = document.createElement('p');
    title.className = 'jobinfo-title';
    title.textContent = 'Job info for '+data.jobid;
    jobinfo_slide.appendChild(title);

    let status = document.createElement('p');
    status.className = 'jobinfo-subtitle';
    status.textContent = 'Status: '+(data.finished?'Finished':'Processing')
    jobinfo_slide.appendChild(status);

    let finished_threads = document.createElement('p');
    finished_threads.className = 'jobinfo-subtitle';
    finished_threads.textContent = `${data.threads_finished} out of ${data.threads_required} finished`;
    jobinfo_slide.appendChild(finished_threads);

    let description = document.createElement('p');
    description.textContent = 'Description: '+data.description;
    jobinfo_slide.appendChild(description);

    let workers_online = document.createElement('p');
    workers_online.textContent = 'Workers online: '+data.workers;
    jobinfo_slide.appendChild(workers_online);

    let worker_cores_online = document.createElement('p');
    worker_cores_online.textContent = 'Worker cores online: '+data.cores;
    jobinfo_slide.appendChild(worker_cores_online);

    let api_result = document.createElement('p');
    let result_link = document.createElement('a');
    result_link.href = '/workerresults/'+data.jobid;
    result_link.target = '_blank';
    result_link.textContent = 'API endpoint for worker results';
    api_result.appendChild(result_link);
    jobinfo_slide.appendChild(api_result);

    let workerjs_file = document.createElement('p');
    let workerjs_link = document.createElement('a');
    workerjs_link.href = '/workerjs/'+data.jobid;
    workerjs_link.target = '_blank';
    workerjs_link.textContent = 'workerjs file';
    workerjs_file.appendChild(workerjs_link);
    jobinfo_slide.appendChild(workerjs_file);

    let help_support_working = document.createElement('p');
    help_support_working.textContent = 'Help support this job by adding the following code snippet on your website (preferably add it to the head tag):';
    jobinfo_slide.appendChild(help_support_working);

    let code = document.createElement('textarea');
    code.readOnly = true;
    code.value = `<script src="https://${window.location.host}/worker.js?jobid=${data.jobid}"></script>`;
    code.onclick = function(){this.select()};
    jobinfo_slide.appendChild(code);

    
    let grayer = document.createElement('div');
    grayer.className = 'grayed-out-slide';
    grayer.onclick = function(){
        window.location.hash = '';
        slide_hide(jobinfo_slide, grayer, true);
    };

    window.location.hash = data.jobid;
    document.body.appendChild(grayer);
    document.body.appendChild(jobinfo_slide);
    slide_show(jobinfo_slide, grayer);
}



(async function(){
    while(true){
        await refresh_list();
        await sleep(1000);
    }
})();