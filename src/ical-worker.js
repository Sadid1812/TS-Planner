import {readCalendar} from './ical-import.js';
self.onmessage=e=>{try{const {text,from,until}=e.data;self.postMessage({events:readCalendar(text,from,until)});}catch(error){self.postMessage({error:error.message||'This calendar could not be read.'});}};
