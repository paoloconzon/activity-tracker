<!--
  GrigliaView.vue — Visualizzazione attività in modalità griglia

  Mostra le attività come cards colorate raggruppate per giorno,
  con filtri per argomento e azione.
-->

<template>
  <v-container class="py-4">

    <h2 class="text-h6 mb-4">
      <v-icon class="mr-1">mdi-view-grid-outline</v-icon>
      Griglia attività
    </h2>

    <!-- Filtri ──────────────────────────────────────────────── -->
    <v-row dense class="mb-4">
      <v-col cols="12" sm="6">
        <v-select
          v-model="filtroArgomento"
          :items="opzioniArgomenti"
          item-title="nome"
          item-value="id"
          label="Filtra per argomento"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="filtroAzione"
          :items="opzioniAzioni"
          item-title="azione"
          item-value="id"
          label="Filtra per azione"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
    </v-row>

    <!-- Nessun risultato -->
    <v-alert v-if="giorniOrdinati.length === 0" type="info" variant="tonal">
      Nessuna attività trovata.
    </v-alert>

    <!-- Gruppi per giorno ───────────────────────────────────── -->
    <div v-for="giorno in giorniOrdinati" :key="giorno">

      <!-- Intestazione giorno -->
      <div class="d-flex align-center mb-2 mt-4">
        <v-chip color="grey-darken-2" size="small" class="mr-2">
          {{ formatGiorno(giorno) }}
        </v-chip>
        <v-divider />
        <span class="text-caption text-grey ml-2">
          {{ totaleGiorno(giorno) }}
        </span>
      </div>

      <!-- Griglia cards del giorno -->
      <v-row dense>
        <v-col
          v-for="att in attivitaPerGiorno[giorno]"
          :key="att.id"
          cols="6"
          sm="4"
          md="3"
        >
          <v-card
            :style="{ borderTop: `4px solid ${coloreArgomento(att.id_argomento)}` }"
            rounded="lg"
            variant="outlined"
            class="pa-2 h-100"
            @click="apriDettaglio(att)"
            style="cursor: pointer;"
          >
            <!-- Argomento -->
            <div class="d-flex align-center mb-1">
              <v-avatar
                :color="coloreArgomento(att.id_argomento)"
                size="8"
                class="mr-1"
              />
              <span class="text-caption font-weight-bold text-truncate">
                {{ nomeArgomento(att.id_argomento) }}
              </span>
            </div>

            <!-- Azione -->
            <v-chip
              size="x-small"
              color="grey-lighten-3"
              class="mb-2"
            >
              {{ nomeAzione(att.id_azione) }}
            </v-chip>

            <!-- Durata -->
            <div class="text-h6 font-weight-bold" :style="{ color: coloreArgomento(att.id_argomento) }">
              {{ durata(att.ora_inizio, att.ora_fine) }}
            </div>

            <!-- Orario -->
            <div class="text-caption text-grey">
              {{ formatOraBreve(att.ora_inizio) }}
              <span v-if="att.ora_fine">→ {{ formatOraBreve(att.ora_fine) }}</span>
              <v-chip v-else size="x-small" color="success" class="ml-1">in corso</v-chip>
            </div>

            <!-- Descrizione (se presente) -->
            <div
              v-if="att.descrizione"
              class="text-caption text-grey-darken-1 mt-1 text-truncate"
            >
              {{ att.descrizione }}
            </div>

          </v-card>
        </v-col>
      </v-row>

    </div>

    <!-- Dialog dettaglio ────────────────────────────────────── -->
    <v-dialog v-model="dialogDettaglio" max-width="400">
      <v-card v-if="attivitaDettaglio" rounded="xl">
        <v-card-title
          class="pa-4 text-white text-h6"
          :style="{ background: coloreArgomento(attivitaDettaglio.id_argomento) }"
        >
          {{ nomeArgomento(attivitaDettaglio.id_argomento) }}
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="mb-2">
            <span class="text-caption text-grey">Azione</span><br>
            <v-chip size="small">{{ nomeAzione(attivitaDettaglio.id_azione) }}</v-chip>
          </div>
          <div class="mb-2">
            <span class="text-caption text-grey">Inizio</span><br>
            <span class="text-body-2">{{ formatOra(attivitaDettaglio.ora_inizio) }}</span>
          </div>
          <div class="mb-2">
            <span class="text-caption text-grey">Fine</span><br>
            <span class="text-body-2">{{ attivitaDettaglio.ora_fine ? formatOra(attivitaDettaglio.ora_fine) : 'In corso' }}</span>
          </div>
          <div class="mb-2">
            <span class="text-caption text-grey">Durata</span><br>
            <span class="text-h5 font-weight-bold" :style="{ color: coloreArgomento(attivitaDettaglio.id_argomento) }">
              {{ durata(attivitaDettaglio.ora_inizio, attivitaDettaglio.ora_fine) }}
            </span>
          </div>
          <div v-if="attivitaDettaglio.descrizione">
            <span class="text-caption text-grey">Descrizione</span><br>
            <span class="text-body-2">{{ attivitaDettaglio.descrizione }}</span>
          </div>
          <div v-if="attivitaDettaglio.note" class="mt-2">
            <span class="text-caption text-grey">Note</span><br>
            <span class="text-body-2">{{ attivitaDettaglio.note }}</span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogDettaglio = false">Chiudi</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAttivitaStore } from '../stores/attivita.js'
import { useArgomentiStore } from '../stores/argomenti.js'
import { useAzioniStore } from '../stores/azioni.js'

const attivitaStore = useAttivitaStore()
const argomentiStore = useArgomentiStore()
const azioniStore = useAzioniStore()

// ── Filtri ────────────────────────────────────────────────
const filtroArgomento = ref(null)
const filtroAzione = ref(null)

const opzioniArgomenti = computed(() => argomentiStore.argomenti)
const opzioniAzioni = computed(() => azioniStore.azioni)

// ── Attività filtrate ─────────────────────────────────────
const attivitaFiltrate = computed(() => {
  return attivitaStore.storico.filter(att => {
    if (filtroArgomento.value && att.id_argomento !== filtroArgomento.value) return false
    if (filtroAzione.value && att.id_azione !== filtroAzione.value) return false
    return true
  })
})

// ── Raggruppamento per giorno ─────────────────────────────
const attivitaPerGiorno = computed(() => {
  const gruppi = {}
  attivitaFiltrate.value.forEach(att => {
    const giorno = att.ora_inizio.slice(0, 10) // "YYYY-MM-DD"
    if (!gruppi[giorno]) gruppi[giorno] = []
    gruppi[giorno].push(att)
  })
  return gruppi
})

// Giorni ordinati dal più recente
const giorniOrdinati = computed(() =>
  Object.keys(attivitaPerGiorno.value).sort((a, b) => b.localeCompare(a))
)

// ── Dialog dettaglio ──────────────────────────────────────
const dialogDettaglio = ref(false)
const attivitaDettaglio = ref(null)

function apriDettaglio(att) {
  attivitaDettaglio.value = att
  dialogDettaglio.value = true
}

// ── Helpers ───────────────────────────────────────────────
function nomeArgomento(id) {
  return argomentiStore.argomenti.find(a => a.id === id)?.nome ?? `#${id}`
}
function coloreArgomento(id) {
  return argomentiStore.argomenti.find(a => a.id === id)?.colore ?? '#9E9E9E'
}
function nomeAzione(id) {
  return azioniStore.azioni.find(a => a.id === id)?.azione ?? `#${id}`
}

function formatGiorno(iso) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

function formatOraBreve(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatOra(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function durata(inizio, fine) {
  if (!fine) return 'in corso'
  const sec = Math.floor((new Date(fine) - new Date(inizio)) / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// Totale tempo del giorno formattato
function totaleGiorno(giorno) {
  const atts = attivitaPerGiorno.value[giorno].filter(a => a.ora_fine)
  const totSec = atts.reduce((acc, a) => {
    return acc + Math.floor((new Date(a.ora_fine) - new Date(a.ora_inizio)) / 1000)
  }, 0)
  const h = Math.floor(totSec / 3600)
  const m = Math.floor((totSec % 3600) / 60)
  return h > 0 ? `totale: ${h}h ${m}m` : `totale: ${m}m`
}

onMounted(() => {
  attivitaStore.caricaStorico()
})
</script>