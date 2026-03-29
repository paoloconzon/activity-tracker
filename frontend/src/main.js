// ============================================================
// main.js — Punto di ingresso dell'applicazione Vue
//
// Qui colleghiamo tutti i plugin (Vuetify, Pinia, Router)
// e montiamo l'app nell'elemento HTML con id="app"
// ============================================================

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router/index.js'
import vuetify from './plugins/vuetify.js'

// Importa i dati iniziali di esempio
import { seedDatiIniziali } from './db/localStorage.js'

// Popola il localStorage con dati di esempio al primo avvio
seedDatiIniziali()

// Crea l'app Vue
const app = createApp(App)

// Installa i plugin
app.use(createPinia()) // Gestione stato globale
app.use(router)        // Navigazione tra pagine
app.use(vuetify)       // Componenti UI

// Monta l'app nell'elemento <div id="app"> di index.html
app.mount('#app')
