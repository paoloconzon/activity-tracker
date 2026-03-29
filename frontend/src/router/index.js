// ============================================================
// router/index.js
//
// Vue Router gestisce la navigazione tra le "pagine" (views)
// dell'app senza ricaricare la pagina.
// Usiamo la modalità "hash" (#) così funziona anche dentro WordPress
// senza configurazioni server particolari.
// ============================================================

import { createRouter, createWebHashHistory } from 'vue-router'

// Importa le viste (le "pagine" dell'app)
import HomeView from '../views/HomeView.vue'
import AzioneView from '../views/AzioneView.vue'
import AttivaView from '../views/AttivaView.vue'
import StoricoView from '../views/StoricoView.vue'
import ArgomentiCrud from '../views/ArgomentiCrud.vue'
import GrigliaView from '../views/GrigliaView.vue'

const router = createRouter({
  history: createWebHashHistory(), // URL tipo: /#/storico
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: 'Scegli argomento' },
    },
    {
      path: '/azione',
      name: 'azione',
      component: AzioneView,
      meta: { title: 'Scegli azione' },
    },
    {
      path: '/attiva',
      name: 'attiva',
      component: AttivaView,
      meta: { title: 'Attività in corso' },
    },
    {
      path: '/storico',
      name: 'storico',
      component: StoricoView,
      meta: { title: 'Storico attività' },
    },
    {
      path: '/argomenti',
      name: 'argomenti',
      component: ArgomentiCrud,
      meta: { title: 'Gestione argomenti' },
    },
    {
      path: '/griglia',
      name: 'griglia',
      component: GrigliaView,
      meta: { title: 'Griglia attività' },
    },    
  ],
})

export default router
