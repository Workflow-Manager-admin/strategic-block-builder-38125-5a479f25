import './style.css'
import { mountStrategicBlockBuilder } from './StrategicBlockBuilder'

// Remove template/demo content and mount game
const appEl = document.querySelector<HTMLDivElement>('#app')!
appEl.innerHTML = ""; // clear demo

mountStrategicBlockBuilder('#app');
