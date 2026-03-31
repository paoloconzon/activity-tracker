<!--
  AzioneView.vue — Selezione dell'azione da svolgere

  Arriva qui dopo aver scelto l'argomento in HomeView.
  Mostra le tiles delle azioni disponibili.
  Alla conferma → chiude l'attività precedente e ne apre una nuova.
-->

<template>
  <v-container class="py-4">

    <!-- Riepilogo argomento scelto -->
    <v-alert
      v-if="argomentoScelto"
      :color="argomentoScelto.colore"
      variant="tonal"
      class="mb-4"
      prepend-icon="mdi-tag-outline"
    >
      <strong>Argomento:</strong> {{ argomentoScelto.nome }}
      <v-btn variant="text" size="small" class="ml-2" @click="router.push('/')">
        Cambia
      </v-btn>
    </v-alert>

    <div class="d-flex align-center mb-3">
      <h2 class="text-h6 mb-0 text-grey-darken-2">
        <v-icon class="mr-1">mdi-lightning-bolt</v-icon>
        Che tipo di attività stai svolgendo?
      </h2>
      <v-spacer />
      <v-btn small variant="tonal" @click="apriCreaAzione">
        <v-icon left>mdi-plus</v-icon>Nuova azione
      </v-btn>
    </div>

    <!-- Tiles delle azioni -->
    <v-row>
      <v-col
        v-for="azione in azioniStore.azioni"
        :key="azione.id"
        cols="6"
        sm="4"
        md="3"
      >
        <v-card
          :variant="azioneScelta?.id === azione.id ? 'elevated' : 'outlined'"
          :color="azioneScelta?.id === azione.id ? 'primary' : ''"
          class="tile pa-3 text-center"
          rounded="lg"
          elevation="1"
          @click="azioneScelta = azione"
          style="cursor: pointer; min-height: 80px;"
        >
          <v-icon
            :color="azioneScelta?.id === azione.id ? 'white' : 'primary'"
            size="24"
            class="mb-1"
          >
            {{ iconaPerAzione(azione.azione) }}
          </v-icon>
          <div
            :class="azioneScelta?.id === azione.id ? 'text-white' : ''"
            class="text-subtitle-2 font-weight-bold"
          >
            {{ azione.azione }}
          </div>
          <div class="text-caption mt-2" :class="azioneScelta?.id === azione.id ? 'text-white' : 'text-grey-darken-2'">
            {{ azione.flag1 }} {{ azione.flag2 }} {{ azione.flag3 }}
          </div>
          <v-btn
            icon
            small
            class="mt-2"
            :color="azioneScelta?.id === azione.id ? 'white' : 'primary'"
            @click.stop="apriModificaAzione(azione)"
          >
            <v-icon size="16">mdi-pencil-outline</v-icon>
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Pulsante conferma -->
    <v-btn
      v-if="azioneScelta && argomentoScelto"
      class="mt-6"
      color="primary"
      size="large"
      block
      prepend-icon="mdi-play"
      @click="conferma"
    >
      Avvia: {{ argomentoScelto.nome }} · {{ azioneScelta.azione }}
    </v-btn>

    <v-dialog v-model="dialogAzione" max-width="480">
      <v-card rounded="xl">
        <v-card-title class="pa-4 text-h6">
          {{ azioneInEdit ? 'Modifica azione' : 'Nuova azione' }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="azioneForm.azione"
            label="Azione"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field v-model="azioneForm.flag1" label="Flag 1" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="azioneForm.flag2" label="Flag 2" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="azioneForm.flag3" label="Flag 3" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogAzione = false">Annulla</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!azioneForm.azione.trim()" @click="salvaAzione">
            Salva
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAzioniStore } from '../stores/azioni.js'
import { useAttivitaStore } from '../stores/attivita.js'
import { useArgomentiStore } from '../stores/argomenti.js'

const router = useRouter()
const azioniStore = useAzioniStore()
const attivitaStore = useAttivitaStore()
const argomentiStore = useArgomentiStore()

// L'argomento scelto nella view precedente (passato via sessionStorage)
const argomentoScelto = ref(null)

// L'azione selezionata dall'utente in questa view
const azioneScelta = ref(null)

const dialogAzione = ref(false)
const azioneInEdit = ref(null)
const azioneForm = ref({ azione: '', flag1: '', flag2: '', flag3: '' })

function apriCreaAzione() {
  azioneInEdit.value = null
  azioneForm.value = { azione: '', flag1: '', flag2: '', flag3: '' }
  dialogAzione.value = true
}

function apriModificaAzione(azione) {
  azioneInEdit.value = azione
  azioneForm.value = {
    azione: azione.azione,
    flag1: azione.flag1 || '',
    flag2: azione.flag2 || '',
    flag3: azione.flag3 || '',
  }
  dialogAzione.value = true
}

function salvaAzione() {
  if (!azioneForm.value.azione.trim()) return

  if (azioneInEdit.value) {
    azioniStore.aggiorna(azioneInEdit.value.id, {
      azione: azioneForm.value.azione.trim(),
      flag1: azioneForm.value.flag1,
      flag2: azioneForm.value.flag2,
      flag3: azioneForm.value.flag3,
    })
  } else {
    azioniStore.crea({
      azione: azioneForm.value.azione.trim(),
      flag1: azioneForm.value.flag1,
      flag2: azioneForm.value.flag2,
      flag3: azioneForm.value.flag3,
    })
  }
  dialogAzione.value = false
}

onMounted(() => {
  const raw = sessionStorage.getItem('argomento_scelto')
  if (!raw) {
    // Se non c'è argomento scelto, torna alla home
    router.replace('/')
    return
  }
  argomentoScelto.value = JSON.parse(raw)
})

function conferma() {
  if (!argomentoScelto.value || !azioneScelta.value) return

  // Avvia la nuova attività (chiude automaticamente la precedente)
  attivitaStore.avvia({
    id_argomento: argomentoScelto.value.id,
    id_azione: azioneScelta.value.id,
    flag1: azioneScelta.value.flag1 || '',
    flag2: azioneScelta.value.flag2 || '',
    flag3: azioneScelta.value.flag3 || '',
  })

  // Pulisce la sessione e reimposta la navigazione argomenti
  sessionStorage.removeItem('argomento_scelto')
  argomentiStore.tornaAllaRadice()

  // Vai alla view dell'attività in corso
  router.push('/attiva')
}

// Mappa nomi → icone Material Design
function iconaPerAzione(nome) {
  const mappa = {
    'Sviluppo': 'mdi-code-braces',
    'Analisi': 'mdi-magnify',
    'Formazione': 'mdi-school-outline',
    'Riunione': 'mdi-account-group-outline',
    'Pausa': 'mdi-coffee-outline',
    'Varie': 'mdi-dots-horizontal-circle-outline',
  }
  return mappa[nome] ?? 'mdi-checkbox-blank-circle-outline'
}
</script>

<style scoped>
.tile {
  transition: transform 0.15s ease;
}
.tile:hover {
  transform: translateY(-2px);
}
</style>
