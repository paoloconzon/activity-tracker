<!--
  App.vue — Componente radice dell'applicazione

  Struttura:
  - VApp: contenitore principale Vuetify (gestisce temi e layout)
  - VAppBar: barra superiore fissa con titolo e indicatore attività
  - VNavigationDrawer: menu laterale
  - VMain: area contenuto dove vengono renderizzate le views
  - RouterView: placeholder dove Vue Router inserisce la vista corrente
-->

<template>
  <v-app>

    <!-- ── Barra superiore ──────────────────────────────── -->
    <v-app-bar color="primary" elevation="2">

      <!-- Pulsante hamburger per aprire il menu laterale -->
      <v-app-bar-nav-icon @click="menuAperto = !menuAperto" />

      <v-app-bar-title>
        <span class="font-weight-bold">Activity Tracker</span>
      </v-app-bar-title>

      <v-spacer />

      <!-- Indicatore attività in corso (visibile solo se c'è un'attività aperta) -->
      <template v-if="attivitaStore.corrente">
        <v-chip
          color="white"
          text-color="primary"
          class="mr-3"
          prepend-icon="mdi-circle"
          :style="{ '--v-chip-prepend-icon-color': argomentoColore }"
          @click="router.push('/attiva')"
        >
          {{ durataBreve }} · {{ nomeArgomento }}
        </v-chip>
      </template>

    </v-app-bar>

    <!-- ── Menu laterale ────────────────────────────────── -->
    <v-navigation-drawer v-model="menuAperto" temporary>
      <v-list nav density="compact">

        <v-list-item
          prepend-icon="mdi-play-circle-outline"
          title="Nuova attività"
          to="/"
          @click="menuAperto = false"
        />

        <v-list-item
          v-if="attivitaStore.corrente"
          prepend-icon="mdi-timer-outline"
          title="Attività in corso"
          to="/attiva"
          @click="menuAperto = false"
        />

        <v-divider class="my-2" />

        <v-list-item
          prepend-icon="mdi-history"
          title="Storico"
          to="/storico"
          @click="menuAperto = false"
        />

        <v-list-item
          prepend-icon="mdi-folder-outline"
          title="Gestione argomenti"
          to="/argomenti"
          @click="menuAperto = false"
        />
        <v-list-item
          prepend-icon="mdi-view-grid-outline"
          title="Griglia"
          to="/griglia"
          @click="menuAperto = false"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- ── Area contenuto principale ────────────────────── -->
    <v-main>
      <!-- RouterView inserisce qui la view corrispondente alla rotta corrente -->
      <router-view v-slot="{ Component }">
        <!-- transition aggiunge un effetto di dissolvenza tra le pagine -->
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

  </v-app>
</template>

<script setup>
// ============================================================
// <script setup> è la sintassi moderna di Vue 3 (Composition API)
// Tutto ciò che dichiariamo qui è disponibile nel template sopra
// ============================================================

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAttivitaStore } from './stores/attivita.js'
import { useArgomentiStore } from './stores/argomenti.js'
import { useAzioniStore } from './stores/azioni.js'

const router = useRouter()
const attivitaStore = useAttivitaStore()
const argomentiStore = useArgomentiStore()
const azioniStore = useAzioniStore()

// Stato del menu laterale (aperto/chiuso)
const menuAperto = ref(false)

// Colore del chip dell'argomento corrente
const argomentoColore = computed(() =>
  attivitaStore.argomentoCorrente?.colore ?? '#1976D2'
)

// Nome breve per il chip nella toolbar
const nomeArgomento = computed(() =>
  attivitaStore.argomentoCorrente?.nome ?? '...'
)

// Versione compatta del timer (MM:SS) per la toolbar
const durataBreve = computed(() => {
  const tot = attivitaStore.secondiTrascorsi
  const m = Math.floor(tot / 60)
  const s = tot % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// Al caricamento dell'app, carica tutti i dati dagli store
onMounted(() => {
  argomentiStore.carica()
  azioniStore.carica()
  attivitaStore.caricaCorrente()
  attivitaStore.caricaStorico()
})
</script>

<style>
/* Transizione dissolvenza tra le pagine */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
