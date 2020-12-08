window.conference.live = (function() {
    {% assign d = site.data.program.days | first -%}
    {%- include partials/get_day_time.html -%}
    {%- assign t = day_start_talk -%}

    {%- include partials/get_talk_timestamp.html -%}
    {%- assign conf_start = timestamp_start -%}

    {%- assign d = site.data.program.days | last -%}
    {%- include partials/get_day_time.html -%}
    {%- assign t = day_end_talk -%}

    {%- include partials/get_talk_timestamp.html -%}
    {%- assign conf_end = timestamp_end -%}

    let confStart = {{ conf_start }};
    let confEnd = {{ conf_end }};
    let confDur = confEnd - confStart;

    let freezeTime = false;
    let timeFrozen = 0;
    let timeOffset = 0;

    let demo = {{ site.conference.live.demo | default: "false" }};
    let durDemo  = 5*60; // in seconds
    let durPause =   10; // in seconds

    let demoStart = confStart - confDur/durDemo*durPause;
    let demoEnd = confEnd + confDur/durDemo*durPause;

    let liveTimer;
    let streamVideoTimer;
    let streamInfoTimer;

    let mod = function (n, m) {
        return ((n % m) + m) % m;
    };

    let timeNow = function () {
        return Math.floor(Date.now() / 1000);
    };

    let timeCont = function () {
        return timeNow() - timeOffset;
    };

    let timeCycle = function () {
        let actTime = timeNow();
        let relTime = mod(actTime, durDemo + 2*durPause) / durDemo;
        let cycleTime = mod((demoEnd - demoStart) * relTime - timeOffset, (demoEnd - demoStart)) + demoStart;
        return cycleTime;
    };

    let time = function () {
        if (freezeTime) {
            return timeFrozen;
        }
        else if (demo) {
            return timeCycle();
        }
        else {
            return timeCont();
        }
    };

    let pauseTime = function () {
        if (!freezeTime) {
            timeFrozen = time();
            freezeTime = true;

            stopUpdate();
        }
    };

    let continueTime = function () {
        if (freezeTime) {
            freezeTime = false;
            timeOffset += time() - timeFrozen;
            startUpdate();
        }
    };

    let resetTime = function (timeStr) {
        timeOffset = 0;
        freezeTime = false;

        startUpdate();
    };

    let setTime = function (newTime, newDay=1) {
        pauseTime();

        let dayIdx;
        if (Number.isInteger(newDay)) {
            dayIdx = newDay-1;
        }
        else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(newDay)) {
            dayIdx = data.days.find(o => o.name === newDay);
        }
        else {
            dayIdx = data.days.find(o => o.name === newDay);
        }
        newDate = data.days[dayIdx].date;

        let d = new Date(newDate);
        newTime = newTime.split(':');
        d.setHours(newTime[0], newTime[1]);

        timeFrozen = Math.floor(d.getTime() / 1000);

        update();
    };

    let getTime = function (tConvert=time()) {
        let d = new Date(tConvert * 1000);
        let dStr = d.toISOString().slice(0,10);
        let h = d.getHours();
        let m = d.getMinutes();

        return dStr +" "+ h +":"+ (m < 10 ? "0" : "") + m;
    };

    let timeUnit = function () {
        if (demo) {
            return 0.1;
        }
        else {
            return 60;
        }
    };

    let delayStart = function (startTime) {
        let tNow = time();
        let tUnit = timeUnit();

        if (demo) {
            // Convert virtual duration to real duration
            return mod(startTime - tNow, demoEnd - demoStart) / (demoEnd - demoStart) * (durDemo + 2*durPause);
        }
        else {
            if (startTime > tNow) {
                return startTime - tNow;
            }
            else {
                // Start on the unit
                return (tUnit - (tNow % tUnit));
            }
        }
    };

    let toggleDemo = function () {
        demo = !demo;
        resetTime();
    };

    let demoOn = function () {
        return demo;
    };

    let updateLive = function () {
        let tNow = time();
        let liveShow = document.getElementsByClassName('live-show');
        let liveHide = document.getElementsByClassName('live-hide');
        let liveTime = document.getElementsByClassName('live-time');
        let livePast = document.getElementsByClassName('live-past');

        for (let i = 0; i < liveShow.length; i++) {
            let tStarts = liveShow[i].dataset.start.split(',');
            let tEnds = liveShow[i].dataset.end.split(',');

            for (let k = 0; k < tStarts.length; k++) {
                if (tNow >= tStarts[k] && tNow < tEnds[k]) {
                    // Show when active
                    liveShow[i].classList.remove('d-none');
                    break;
                }
                else if (!liveShow[i].classList.contains('d-none')) {
                    // Hide otherwise
                    liveShow[i].classList.add('d-none');
                }
            }
        }

        for (let i = 0; i < liveHide.length; i++) {
            let tStarts = liveHide[i].dataset.start.split(',');
            let tEnds = liveHide[i].dataset.end.split(',');

            for (let k = 0; k < tStarts.length; k++) {
                if (tNow >= tStarts[k] && tNow < tEnds[k]) {
                    // Hide when active
                    if (!liveHide[i].classList.contains('d-none')) {
                        liveHide[i].classList.add('d-none');
                        break;
                    }
                }
                else {
                    // Show otherwise
                    liveHide[i].classList.remove('d-none');
                }
            }
        }

        for (let i = 0; i < liveTime.length; i++) {
            let t = liveTime[i].dataset.time;
            if (typeof t == "undefined") {
                break;
            }
            let tRel = tNow - t;

            let tStr;
            if (tRel >= -60 && tRel < 0) {
                tStr = '{{ site.data.lang[site.conference.lang].live.time.soon | default: "soon" }}';
            }
            else if (tRel >= 0 && tRel < 60) {
                tStr = '{{ site.data.lang[site.conference.lang].live.time.now | default: "now" }}';
            }
            else {
                if (tRel < 0) {
                    tStr = '{{ site.data.lang[site.conference.lang].live.time.in | default: "in" }} ';
                }
                else {
                    tStr = '{{ site.data.lang[site.conference.lang].live.time.since | default: "since" }} ';
                }
                tRel = Math.abs(tRel);

                let dWeeks = Math.floor(tRel / (7*24*60*60));
                let dDays  = Math.floor(tRel / (24*60*60));
                let dHours = Math.floor(tRel / (60*60));
                let dMins  = Math.floor(tRel / (60));
                if (dWeeks > 4) {
                    break;
                }
                else if (dWeeks > 1) {
                    tStr += dWeeks +' {{ site.data.lang[site.conference.lang].live.time.weeks | default: "weeks" }}';
                }
                else if (dWeeks == 1) {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.week | default: "week" }}';
                }
                else if (dDays > 1) {
                    tStr += dDays +' {{ site.data.lang[site.conference.lang].live.time.days | default: "days" }}';
                }
                else if (dDays == 1) {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.day | default: "day" }}';
                }
                else if (dHours > 1) {
                    tStr += dHours +' {{ site.data.lang[site.conference.lang].live.time.hours | default: "hours" }}';
                }
                else if (dHours == 1) {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.hour | default: "hour" }}';
                }
                else if (dMins > 1) {
                    tStr += dMins +' {{ site.data.lang[site.conference.lang].live.time.minutes | default: "minutes" }}';
                }
                else {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.minute | default: "minute" }}';
                }
            }

            liveTime[i].innerHTML = tStr;
        }

        for (let i = 0; i < livePast.length; i++) {
            let t = livePast[i].dataset.time;
            if (typeof t == "undefined") {
                break;
            }
            let tRel = tNow - t;

            if (tRel < 0) {
                // Grey out when in past
                if (!livePast[i].classList.contains('text-secondary')) {
                    livePast[i].classList.add('text-secondary');
                }
            }
            else {
                // Show normal otherwise
                livePast[i].classList.remove('text-secondary');
            }
        }

        if (tNow > confEnd && !demo) {
            // Cancel timer after program is over
            stopUpdateLive();
        }
    };

    let startUpdateLive = function () {
        stopUpdateLive();
        updateLive();

        if (demo) {
            // Immediate start required since delayStart would wait for next wrap around
            liveTimer = setInterval(updateLive, timeUnit() * 1000);
        }
        else {
            setTimeout(function() {
                liveTimer = setInterval(updateLive, timeUnit() * 1000);
                updateLive();
            }, delayStart(confStart) * 1000);
        }
    };

    let stopUpdateLive = function () {
        if (typeof liveTimer !== "undefined") {
            clearInterval(liveTimer);
        }
    };

    {% if site.conference.live.streaming -%}
        let streamPause   = {{ site.conference.live.streaming.time_pause | default: 60 }};  // in minutes
        let streamPrepend = {{ site.conference.live.streaming.time_prepend | default: 5 }};  // in minutes
        let streamExtend  = {{ site.conference.live.streaming.time_extend | default: 5 }};  // in minutes

        let streamModal;
        let data;

        let getRoom = function (roomName) {
            if (roomName in data.rooms) {
                return data.rooms[roomName];
            }
            else {
                return data.rooms[Object.keys(data.rooms)[0]];
            }
        };

        let getNextTalk = function (roomName) {
            let timeNow = time();
            let talksHere = data.talks[roomName];

            if (typeof talksHere !== "undefined") {
                if (timeNow < talksHere[talksHere.length-1].end) {
                    for (var i = 0; i < talksHere.length; i++) {
                        if (timeNow < talksHere[i].end) {
                            return talksHere[i];
                        }
                    }
                }
            }
            return false;
        };

        let getNextPause = function (roomName) {
            let timeNow = time();
            let talksHere = data.talks[roomName];

            if (typeof talksHere !== "undefined") {
                if (timeNow < talksHere[talksHere.length-1].end) {
                    for (var i = 1; i < talksHere.length; i++) {
                        if (timeNow < talksHere[i].start && streamPause*60 <= talksHere[i].start - talksHere[i-1].end) {
                            return {
                                'start': talksHere[i-1].end,
                                'end':   talksHere[i].start,
                            };
                        }
                    }
                }
            }
            return false;
        };

        let setStreamContent = function (content) {
            streamModal.find('iframe').attr('src', '');
            streamModal.find('iframe').addClass('d-none');
            streamModal.find('#stream-placeholder > div').text(content);
            streamModal.find('#stream-placeholder').addClass('d-flex');
        };

        let setStreamSrc = function (href) {
            streamModal.find('iframe').attr('src', href);
            streamModal.find('#stream-placeholder').addClass('d-none').removeClass('d-flex');
            streamModal.find('iframe').removeClass('d-none');
        };

        let setStreamVideo = function (roomName) {
            let timeNow = time();

            let talksHere = data.talks[roomName];
            let roomStart = talksHere[0].start;
            let roomEnd = talksHere[talksHere.length-1].end;

            if (typeof streamVideoTimer !== "undefined") {
                clearInterval(streamVideoTimer);
            }

            // Conference not yet started
            if (timeNow < roomStart - streamPrepend*60) {
                setStreamContent('{{ site.data.lang[site.conference.lang].live.pre_stream | default: "Live stream has not started yet." }}');

                if (!freezeTime) {
                    streamVideoTimer = setTimeout(setStreamVideo, delayStart(roomStart - streamPrepend*60) * 1000, roomName);
                }
            }

            // Conference is over
            else if (timeNow > roomEnd + streamExtend*60) {
                setStreamContent('{{ site.data.lang[site.conference.lang].live.post_stream | default: "Live stream has ended." }}');

                if (!freezeTime && demo) {
                    streamVideoTimer = setTimeout(setStreamVideo, delayStart(roomEnd - streamPrepend*60) * 1000, roomName);
                }
            }

            // Conference ongoing
            else {
                let pauseNext = getNextPause(roomName);

                // Currently stream is paused
                if (pauseNext && timeNow >= pauseNext.start + streamExtend*60 && timeNow <= pauseNext.end - streamPrepend*60) {
                    setStreamContent('{{ site.data.lang[site.conference.lang].live.pause_stream | default: "Live stream is currently paused." }}');

                    if (!freezeTime) {
                        streamVideoTimer = setTimeout(setStreamVideo, delayStart(pauseNext.end - streamPrepend*60) * 1000, roomName);
                    }
                }
                // Currently a talk is active
                else {
                    let room = getRoom(roomName);
                    setStreamSrc(room.href);

                    if (!freezeTime) {
                        if (pauseNext) {
                            streamVideoTimer = setTimeout(setStreamVideo, delayStart(pauseNext.start + streamExtend*60) * 1000, roomName);
                        }
                        else {
                            streamVideoTimer = setTimeout(setStreamVideo, delayStart(roomEnd + streamExtend*60) * 1000, roomName);
                        }
                    }
                }
            }
        };

        let setStreamInfo = function (roomName) {
            let timeNow = time();
            let talkNext = getNextTalk(roomName);

            if (typeof streamInfoTimer !== "undefined") {
                clearInterval(streamInfoTimer);
            }

            if (timeNow >= talkNext.start - streamPause*60) {
                document.getElementById('stream-info').dataset.time = talkNext.start;
                document.getElementById('stream-info-time').dataset.time = talkNext.start;
                updateLive();

                streamModal.find('#stream-info-color').removeClass(function (index, className) {
                    return (className.match(/(^|\s)border-soft-\S+/g) || []).join(' ');
                });
                streamModal.find('#stream-info-color').addClass('border-soft-' + talkNext.color);

                streamModal.find('#stream-info-talk').text(talkNext.name).attr('href', talkNext.href);

                let speakerStr = '';
                for (var i = 0; i < talkNext.speakers.length; i++) {
                    let speaker = data.speakers[talkNext.speakers[i]];
                    if (speaker.href == '') {
                        speakerStr += speaker.name +', '
                    }
                    else {
                        speakerStr += '<a class="text-reset" href="'+ speaker.href +'">'+ speaker.name +'</a>, ';
                    }
                }
                speakerStr = speakerStr.slice(0, -2);
                streamModal.find('#stream-info-speakers').html(speakerStr);

                streamModal.find('#stream-info').removeClass('d-none');

                if (!freezeTime) {
                    streamInfoTimer = setTimeout(setStreamInfo, delayStart(talkNext.end) * 1000, roomName);
                }
            }
            else {
                streamModal.find('#stream-info').addClass('d-none');

                if (!freezeTime) {
                    if (talkNext) {
                        streamInfoTimer = setTimeout(setStreamInfo, delayStart(talkNext.start - streamPause*60) * 1000, roomName);
                    }
                    else if (demo) {
                        let talksHere = data.talks[roomName];
                        streamInfoTimer = setTimeout(setStreamInfo, delayStart(talksHere[0].start - streamPrepend*60) * 1000, roomName);
                    }
                }
            }
        };

        let setStream = function (roomName) {
            streamModal.find('.modal-footer .btn').removeClass('active');
            streamModal.find('#stream-select').val(0);

            // Recover room name in case of empty default
            let room = getRoom(roomName);
            roomName = room.name;

            setStreamVideo(roomName);
            setStreamInfo(roomName);

            streamModal.find('#stream-button' + room.id).addClass('active');
            streamModal.find('#stream-select').val(room.id);
        };

        let updateStream = function () {
            if (streamModal.hasClass('show')) {
                let activeButton = streamModal.find('.modal-footer .btn.active');
                let roomName = activeButton.data('room');

                if (typeof roomName !== "undefined") {
                    setStream(roomName);
                }
            }
        };

        let stopUpdateStream = function () {
            if (typeof streamVideoTimer !== "undefined") {
                clearInterval(streamVideoTimer);
            }
            if (typeof streamInfoTimer !== "undefined") {
                clearInterval(streamInfoTimer);
            }
        };

        let hideModal = function (event) {
            streamModal.find('iframe').attr('src', '');
            streamModal.find('.modal-footer .btn').removeClass('active');
            streamModal.find('#stream-select').selectedIndex = -1;
        };

        let setupStream = function () {
            streamModal = $('#stream-modal');

            // configure modal opening buttons
            streamModal.on('show.bs.modal', function (event) {
                let button = $(event.relatedTarget);
                let roomName = button.data('room');
                setStream(roomName);
            });
            streamModal.on('hide.bs.modal', function (event) {
                hideModal(event);
            });

            // configure room selection buttons in modal
            streamModal.find('.modal-footer .btn').on('click', function(event) {
                event.preventDefault();

                let roomName = $(this).data('room');
                setStream(roomName);
            });

            // configure room selection menu in modal
            streamModal.find('#stream-select').on('change', function(event) {
                event.preventDefault();

                let roomName = $(this).children('option:selected').text();
                setStream(roomName);
            });

            // load data
            $.getJSON('{{ site.baseurl }}/assets/js/data.json', function(json) {
                data = json;
            });
        };

        let setup = function () {
            startUpdateLive();
            setupStream();
        };

        let update = function () {
            updateLive();
            updateStream();
        };

        let startUpdate = function () {
            startUpdateLive();
            updateStream();
        };

        let stopUpdate = function () {
            stopUpdateLive();
            stopUpdateStream();
        };

    {%- else -%}

        let setup = function () {
            startUpdateLive();
        };

        let update = function () {
            updateLive();
        };

        let startUpdate = function () {
            startUpdateLive();
        };

        let stopUpdate = function () {
            stopUpdateLive();
        };

    {%- endif %}

    return {
        init: setup,

        pauseTime: pauseTime,
        continueTime: continueTime,
        resetTime: resetTime,
        setTime: setTime,
        getTime: getTime,

        toggleDemo: toggleDemo,
        demo: demoOn,
        durDemo: durDemo,
        durPause: durPause
    };

})();

window.conference.live.init();
