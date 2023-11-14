import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { Subscriber } from './utils/events/subscription';
import { Exception } from './utils/error';

createApp(App).mount('#app');