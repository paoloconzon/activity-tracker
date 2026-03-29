<!--
  StoricoView.vue — Lista e gestione dello storico attività

  Permette di:
  - Vedere tutte le attività in ordine cronologico inverso
  - Modificare descrizione, note, ora inizio/fine
  - Eliminare un'attività
-->

<template>
  <v-container class="py-4">

    <h2 class="text-h6 mb-4">
      <v-icon class="mr-1">mdi-history</v-icon>
      Storico attività
    </h2>

    <!-- Nessuna attività -->
    <v-alert v-if="store.storico.length === 0" type="info" variant="tonal">
      Nessuna attività registrata ancora.
    </v-alert>

    <!-- Lista attività -->
    <v-card
      v-for="att in store.storico"
      :key="att.id"
      class="mb-3"
      rounded="lg"
      variant="outlined"
    >
      <v-card-title class="d-flex align-center pa-3 pb-0">
        <!-- Pallino colore argomento -->
        <v-avatar
          :color="coloreArgomento(att.id_argomento)"
          size="10"
          class="mr-2"
        />
        <span class="text-body-1 font-weight-bold">
          {{ nomeArgomento(att.id_argomento) }}
        </span>
        <v-chip size="x-small" class="ml-2" color="grey-lighten-3">
          {{ nomeAzione(att.id_azione) }}
        </v-chip>
        <v-spacer />
        <!-- Badge "in corso" -->
        <v-chip v-if="!att.ora_fine" color="success" size="x-small" prepend-icon="mdi-circle">
          In corso
        </v-chip>
      </v-card-title>

      <v-card-text class="pa-3">
        <!-- Orari -->
        <div class="text-caption text-grey mb-1">
          {{ formatOra(att.ora_inizio) }}
          →
          {{ att.ora_fine ? formatOra(att.ora_fine) : 'in corso' }}
          <span v-if="att.ora_fine" class="ml-2">
            ({{ durata(att.ora_inizio, att.ora_fine) }})
          </span>
        </div>

        <!-- Descrizione (se presente) -->
        <div v-if="att.descrizione" class="text-body-2 mb-1">
          {{ att.descrizione }}
        </div>
        <div v-if="att.note" class="text-caption text-grey">
          Note: {{ att.note }}
        </div>
      </v-card-text>

      <v-card-actions class="pa-2 pt-0">
        <v-btn
          size="small"
          variant="text"
          prepend-icon="mdi-pencil-outline"
          @click="apriModifica(att)"
        >
          Modifica
        </v-btn>
        <v-btn
          size="small"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-outline"
          @click="eliminaConferma(att)"
        >
          Elimina
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Dialog modifica ──────────────────────────────────── -->
    <v-dialog v-model="dialogModifica" max-width="480">
      <v-card v-if="attivitaInEdit" rounded="xl">
        <v-card-title class="pa-4 text-h6">Modifica attività #{{ attivitaInEdit.id }}</v-card-title>
        <v-card-text>

          <v-text-field
            v-model="attivitaInEdit.ora_inizio"
            label="Ora inizio"
            type="datetime-local"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model="attivitaInEdit.ora_fine"
            label="Ora fine"
            type="datetime-local"
            variant="outlined"
            density="compact"
            class="mb-3"
            clearable
          />
          <v-textarea
            v-model="attivitaInEdit.descrizione"
            label="Descrizione"
            variant="outlined"
            density="compact"
            rows="2"
            auto-grow
            class="mb-3"
          />
          <v-textarea
            v-model="attivitaInEdit.note"
            label="Note"
            variant="outlined"
            density="compact"
            rows="2"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogModifica = false">Annulla</v-btn>
          <v-btn color="primary" variant="flat" @click="salvaModifica">Salva</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog conferma elimina -->
    <v-dialog v-model="dialogElimina" max-width="360">
      <v-card rounded="xl">
        <v-card-title class="pa-4">Elimina attività</v-card-title>
        <v-card-text>Sei sicuro di voler eliminare questa attività?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogElimina = false">Annulla</v-btn>
          <v-btn color="error" variant="flat" @click="eseguiElimina">Elimina</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAttivitaStore } from '../stores/attivita.js'
import { useArgomentiStore } from '../stores/argomenti.js'
import { useAzioniStore } from '../stores/azioni.js'

const store = useAttivitaStore()
const argomentiStore = useArgomentiStore()
const azioniStore = useAzioniStore()

// Dialog state
const dialogModifica = ref(false)
const dialogElimina = ref(false)
const attivitaInEdit = ref(null)
const attivitaDaEliminare = ref(null)

onMounted(() => store.caricaStorico())

// ── Helpers display ───────────────────────────────────────

function nomeArgomento(id) {
  return argomentiStore.argomenti.find(a => a.id === id)?.nome ?? `#${id}`
}

function coloreArgomento(id) {
  return argomentiStore.argomenti.find(a => a.id === id)?.colore ?? '#9E9E9E'
}

function nomeAzione(id) {
  return azioniStore.azioni.find(a => a.id === id)?.azione ?? `#${id}`
}

function formatOra(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function durata(inizio, fine) {
  const sec = Math.floor((new Date(fine) - new Date(inizio)) / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── CRUD ──────────────────────────────────────────────────

function apriModifica(att) {
  // Converte ISO → formato datetime-local (richiesto dall'input HTML)
  attivitaInEdit.value = {
    ...att,
    ora_inizio: isoToLocal(att.ora_inizio),
    ora_fine: att.ora_fine ? isoToLocal(att.ora_fine) : null,
  }
  dialogModifica.value = true
}

function salvaModifica() {
  const { id, ...campi } = attivitaInEdit.value
  // Riconverte datetime-local → ISO
  store.aggiornaStorico(id, {
    ...campi,
    ora_inizio: new Date(campi.ora_inizio).toISOString(),
    ora_fine: campi.ora_fine ? new Date(campi.ora_fine).toISOString() : null,
  })
  dialogModifica.value = false
}

function eliminaConferma(att) {
  attivitaDaEliminare.value = att
  dialogElimina.value = true
}

function eseguiElimina() {
  store.eliminaDaStorico(attivitaDaEliminare.value.id)
  dialogElimina.value = false
}

// Converte ISO string in formato compatibile con <input type="datetime-local">
function isoToLocal(iso) {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d - offset).toISOString().slice(0, 16)
}
</script>
