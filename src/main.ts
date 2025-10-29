import { createApp } from 'vue';
import { createPinia } from 'pinia';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import App from './App.vue';
import './style.css';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.config.globalProperties.$dayjs = dayjs;

app.mount('#app');
