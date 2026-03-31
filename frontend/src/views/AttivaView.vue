<!--
  AttivaView.vue — Attività in corso

  Mostra:
  - Argomento e azione correnti
  - Timer live (HH:MM:SS)
  - Campo descrizione editabile in tempo reale
  - Pulsante Pausa
  - Pulsante Chiudi (torna alla selezione argomento)
-->

<template>
  <v-container class="py-4 text-center" style="max-width: 600px;">

    <!-- Nessuna attività aperta -->
    <template v-if="!store.corrente">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-timer-off-outline</v-icon>
      <div class="text-h6 text-grey mb-4">Nessuna attività in corso</div>
      <v-btn color="primary" prepend-icon="mdi-play" to="/">
        Inizia un'attività
      </v-btn>
    </template>

    <!-- Attività in corso ────────────────────────────────── -->
    <template v-else>

      <!-- Card principale -->
      <v-card
        :style="{ borderTop: `6px solid ${store.argomentoCorrente?.colore ?? '#1976D2'}` }"
        rounded="xl"
        elevation="3"
        class="mb-4 pa-4"
      >

        <!-- Badge PAUSA -->
        <v-chip
          v-if="store.inPausa"
          color="orange"
          class="mb-3"
          prepend-icon="mdi-coffee-outline"
          size="small"
        >
          In pausa
        </v-chip>

        <!-- Argomento -->
        <div class="text-caption text-grey mb-1 text-uppercase letter-spacing-wider">
          Argomento
        </div>
        <div class="text-h5 font-weight-bold mb-1">
          <v-icon :color="store.argomentoCorrente?.colore" class="mr-1">mdi-tag</v-icon>
          {{ store.argomentoCorrente?.nome ?? '...' }}
        </div>

        <!-- Azione -->
        <v-chip color="grey-lighten-3" class="mb-4" size="small">
          {{ store.azioneCorrente?.azione ?? '...' }}
        </v-chip>

        <!-- Timer ──────────────────────────────────────── -->
        <div
          class="text-h2 font-weight-bold mb-1 font-monospace"
          :class="store.inPausa ? 'text-orange' : 'text-primary'"
        >
          {{ store.durataFormattata }}
        </div>
        <div class="text-caption text-grey mb-3">
          Iniziata alle {{ oraInizio }}
        </div>

        <!-- Azioni ─────────────────────────────────────── -->
        <v-row dense class="mb-4">
          <v-col cols="4">
            <v-btn
              v-if="!store.inPausa"
              color="orange"
              variant="outlined"
              block
              prepend-icon="mdi-coffee-outline"
              @click="mettInPausa"
            >
              Pausa
            </v-btn>
            <v-btn
              v-else
              color="primary"
              variant="outlined"
              block
              prepend-icon="mdi-play"
              @click="riprendiDaPausa"
            >
              Riprendi
            </v-btn>
          </v-col>
          <v-col cols="4">
            <v-btn
              color="error"
              variant="outlined"
              block
              prepend-icon="mdi-stop"
              @click="chiudiDialog = true"
            >
              Chiudi
            </v-btn>
          </v-col>
        </v-row>

        <!-- Campo descrizione ──────────────────────────── -->
        <v-textarea
          v-model="descrizione"
          label="Descrizione (opzionale, radice)"
          variant="outlined"
          density="compact"
          rows="2"
          auto-grow
          hide-details
          class="mb-3 text-left"
          @update:model-value="store.aggiornaDescrizione($event)"
        />

        <v-text-field
          v-model="flag1"
          label="Flag 1"
          variant="outlined"
          density="compact"
          class="mb-2"
          @update:model-value="store.aggiornaFlag1($event)"
        />
        <v-text-field
          v-model="flag2"
          label="Flag 2"
          variant="outlined"
          density="compact"
          class="mb-2"
          @update:model-value="store.aggiornaFlag2($event)"
        />
        <v-text-field
          v-model="flag3"
          label="Flag 3"
          variant="outlined"
          density="compact"
          class="mb-4"
          @update:model-value="store.aggiornaFlag3($event)"
        />

        <v-textarea
          v-model="note"
          label="Note (solo attività corrente)"
          variant="outlined"
          density="compact"
          rows="2"
          auto-grow
          hide-details
          class="mb-4 text-left"
          @update:model-value="store.aggiornaNote($event)"
        />

      </v-card>

      <!-- Info ora inizio -->
      <div class="text-caption text-grey">
        Attività #{{ store.corrente.id }}
      </div>

    </template>

    <!-- Dialog conferma chiusura ────────────────────────── -->
    <v-dialog v-model="chiudiDialog" max-width="360">
      <v-card rounded="xl">
        <v-card-title class="text-h6 pa-4">Chiudi attività</v-card-title>
        <v-card-text>
          Vuoi chiudere l'attività corrente e tornare alla selezione?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="chiudiDialog = false">Annulla</v-btn>
          <v-btn color="error" variant="flat" @click="chiudi">Chiudi</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAttivitaStore } from '../stores/attivita.js'
import { useArgomentiStore } from '../stores/argomenti.js'
import { argomentiDb, azioniDb } from '../db/localStorage.js'

const router = useRouter()
const store = useAttivitaStore()
const argomentiStore = useArgomentiStore()

// Stato locale
const chiudiDialog = ref(false)
const descrizione = ref('')
const flag1 = ref('')
const flag2 = ref('')
const flag3 = ref('')
const note = ref('')

// Salva i dati dell'attività pre-pausa per poterla riprendere
const attivitaPrePausa = ref(null)

// Ora di inizio formattata (HH:MM)
const oraInizio = computed(() => {
  if (!store.corrente) return ''
  return new Date(store.corrente.ora_inizio).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

// Sincronizza i campi con l'attività corrente
watch(
  () => store.corrente,
  (val) => {
    const root = store.trovaRadice?.(val) || val
    descrizione.value = root?.descrizione ?? ''
    flag1.value = val?.flag1 || ''
    flag2.value = val?.flag2 || ''
    flag3.value = val?.flag3 || ''
    note.value = val?.note || ''
  },
  { immediate: true }
)

function chiudi() {
  store.chiudi()
  chiudiDialog.value = false
  argomentiStore.tornaAllaRadice()
  router.push('/')
}

function mettInPausa() {
  // Salva i dati dell'attività corrente prima della pausa
  attivitaPrePausa.value = {
    id_argomento: store.corrente.id_argomento,
    id_azione: store.corrente.id_azione,
  }
  sessionStorage.setItem('attivita_pre_pausa', JSON.stringify(attivitaPrePausa.value))

  // Trova l'argomento e l'azione "Pausa"
  const argPausa = argomentiDb.getAll().find(a => a.nome === 'Pausa')
  const azPausa = azioniDb.getAll().find(a => a.azione === 'Pausa')

  if (!argPausa || !azPausa) {
    alert('Crea un argomento e un\'azione chiamati "Pausa" per usare questa funzione.')
    return
  }

  store.mettInPausa(argPausa.id, azPausa.id)
}

function riprendiDaPausa() {
  const raw = sessionStorage.getItem('attivita_pre_pausa')
  if (!raw) {
    // Se non c'è nulla in sessione, chiudi e torna alla home
    chiudi()
    return
  }
  const precedente = JSON.parse(raw)
  sessionStorage.removeItem('attivita_pre_pausa')
  store.riprendiDaPausa(precedente)
}
</script>

<style scoped>
.font-monospace {
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 2px;
}
</style>
