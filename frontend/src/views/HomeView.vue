<!--
  HomeView.vue — Selezione argomento tramite tiles gerarchiche

  Flusso:
  1. Mostra gli argomenti radice (senza id_padre)
  2. Cliccando su uno con figli → scende di livello (mostra i figli)
  3. Cliccando su uno foglia (senza figli) → lo seleziona e passa a /azione
  4. Il breadcrumb permette di tornare indietro
-->

<template>
  <v-container class="py-4">

    <!-- Titolo e breadcrumb ────────────────────────────────── -->
    <div class="d-flex align-center mb-4 flex-wrap gap-1">
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-home"
        @click="store.tornaAllaRadice()"
      >
        Radice
      </v-btn>

      <!-- Breadcrumb: mostra il percorso di navigazione -->
      <template v-for="(nodo, i) in store.breadcrumb" :key="nodo.id">
        <v-icon size="small" color="grey">mdi-chevron-right</v-icon>
        <v-btn
          variant="text"
          size="small"
          @click="store.tornaA(i)"
        >
          {{ nodo.nome }}
        </v-btn>
      </template>
    </div>

    <!-- Titolo contestuale -->
    <h2 class="text-h6 mb-4 text-grey-darken-2">
      <v-icon class="mr-1">mdi-folder-open-outline</v-icon>
      {{
        store.breadcrumb.length === 0
          ? 'Di cosa ti stai occupando?'
          : `Sotto-argomenti di: ${store.breadcrumb[store.breadcrumb.length - 1].nome}`
      }}
    </h2>

    <!-- Griglia di tiles ───────────────────────────────────── -->
    <v-row v-if="store.argomentiVisibili.length > 0">
      <v-col
        v-for="arg in store.argomentiVisibili"
        :key="arg.id"
        cols="6"
        sm="4"
        md="3"
      >
        <!--
          Ogni tile è una card cliccabile.
          - Se ha figli → naviga dentro (entra)
          - Se è foglia → la seleziona e va alla scelta azione
        -->
        <v-card
          :color="arg.colore"
          class="tile pa-3 text-center"
          rounded="lg"
          elevation="2"
          @click="seleziona(arg)"
          style="cursor: pointer; min-height: 100px;"
        >
          <!-- Icona figli (indica che c'è un livello sotto) -->
          <v-icon
            v-if="store.haFigli(arg.id)"
            class="mb-1"
            color="white"
            size="28"
          >
            mdi-folder-open-outline
          </v-icon>
          <v-icon
            v-else
            class="mb-1"
            color="white"
            size="28"
          >
            mdi-tag-outline
          </v-icon>

          <!-- Nome argomento -->
          <div class="text-white text-subtitle-1 font-weight-bold text-wrap">
            {{ arg.nome }}
          </div>

          <!-- Indicatore figli -->
          <div v-if="store.haFigli(arg.id)" class="text-white text-caption opacity-80">
            Entra →
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Messaggio se non ci sono argomenti -->
    <v-alert v-else type="info" variant="tonal" class="mt-4">
      Nessun argomento disponibile in questo livello.
      <v-btn variant="text" to="/argomenti" class="ml-2">Aggiungine uno</v-btn>
    </v-alert>

  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useArgomentiStore } from '../stores/argomenti.js'

const router = useRouter()
const store = useArgomentiStore()

function seleziona(arg) {
  if (store.haFigli(arg.id)) {
    // Ha figli: scende di livello
    store.entra(arg)
  } else {
    // È una foglia: lo salva come argomento scelto e vai a /azione
    // Usiamo sessionStorage per passare la scelta alla view successiva
    sessionStorage.setItem('argomento_scelto', JSON.stringify(arg))
    router.push('/azione')
  }
}
</script>

<style scoped>
.tile {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tile:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
}
</style>
