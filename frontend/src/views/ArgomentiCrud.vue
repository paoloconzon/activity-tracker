<!--
  ArgomentiCrud.vue — Gestione completa degli argomenti

  Mostra l'albero gerarchico degli argomenti con possibilità di:
  - Creare nuovi argomenti (radice o figli)
  - Modificare nome, colore, descrizione
  - Chiudere/riaprire un argomento
  - Eliminare (con eliminazione ricorsiva dei figli)
-->

<template>
  <v-container class="py-4">

    <div class="d-flex align-center mb-4">
      <h2 class="text-h6 flex-grow-1">
        <v-icon class="mr-1">mdi-folder-outline</v-icon>
        Gestione argomenti
      </h2>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        size="small"
        @click="apriCrea(null)"
      >
        Nuovo argomento
      </v-btn>
    </div>

    <!-- Albero argomenti (renderizza solo le radici, i figli vengono annidati) -->
    <template v-for="arg in radici" :key="arg.id">
      <ArgomentoNodo
        :argomento="arg"
        :tutti="store.argomenti"
        @modifica="apriModifica"
        @elimina="eliminaConferma"
        @crea-figlio="apriCrea"
        @toggle-chiuso="toggleChiuso"
      />
    </template>

    <v-alert v-if="radici.length === 0" type="info" variant="tonal">
      Nessun argomento. Creane uno con il pulsante in alto.
    </v-alert>

    <!-- Dialog crea / modifica ──────────────────────────── -->
    <v-dialog v-model="dialog" max-width="480">
      <v-card rounded="xl">
        <v-card-title class="pa-4 text-h6">
          {{ editando ? 'Modifica argomento' : 'Nuovo argomento' }}
        </v-card-title>
        <v-card-text>

          <v-text-field
            v-model="form.nome"
            label="Nome *"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-textarea
            v-model="form.descrizione"
            label="Descrizione"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
          />

          <!-- Selezione padre (solo in creazione) -->
          <v-select
            v-if="!editando"
            v-model="form.id_padre"
            :items="opzioniPadre"
            item-title="nome"
            item-value="id"
            label="Argomento padre (lascia vuoto per radice)"
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
          />

          <!-- Colore -->
          <div class="mb-3">
            <div class="text-caption text-grey mb-2">Colore</div>
            <div class="d-flex flex-wrap gap-2">
              <v-btn
                v-for="c in coloriPreset"
                :key="c"
                :color="c"
                size="small"
                :variant="form.colore === c ? 'flat' : 'outlined'"
                icon
                @click="form.colore = c"
                style="width: 36px; height: 36px; min-width: 36px;"
              >
                <v-icon v-if="form.colore === c" size="16">mdi-check</v-icon>
              </v-btn>
            </div>
          </div>

        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Annulla</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!form.nome.trim()"
            @click="salva"
          >
            {{ editando ? 'Salva' : 'Crea' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog elimina -->
    <v-dialog v-model="dialogElimina" max-width="400">
      <v-card rounded="xl">
        <v-card-title class="pa-4">Elimina argomento</v-card-title>
        <v-card-text>
          Eliminare <strong>{{ daEliminare?.nome }}</strong>?
          Verranno eliminati anche tutti i suoi argomenti figli.
        </v-card-text>
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
import { ref, computed, defineComponent, h, resolveComponent } from 'vue'
import { useArgomentiStore } from '../stores/argomenti.js'

const store = useArgomentiStore()

// ── Stato ─────────────────────────────────────────────────

const dialog = ref(false)
const dialogElimina = ref(false)
const editando = ref(null) // null = creazione, altrimenti ID da modificare
const daEliminare = ref(null)

const form = ref({
  nome: '',
  descrizione: '',
  colore: '#1976D2',
  id_padre: null,
})

const coloriPreset = [
  '#1976D2', '#388E3C', '#D32F2F', '#F57C00',
  '#7B1FA2', '#0097A7', '#5D4037', '#455A64',
]

// ── Computed ──────────────────────────────────────────────

const radici = computed(() =>
  store.argomenti.filter(a => !a.id_padre)
)

// Opzioni per la select del padre (tutti gli argomenti tranne l'argomento stesso)
const opzioniPadre = computed(() =>
  store.argomenti.filter(a => a.id !== editando.value)
)

// ── Azioni ────────────────────────────────────────────────

function apriCrea(idPadre = null) {
  editando.value = null
  form.value = { nome: '', descrizione: '', colore: '#1976D2', id_padre: idPadre }
  dialog.value = true
}

function apriModifica(arg) {
  editando.value = arg.id
  form.value = { ...arg }
  dialog.value = true
}

function salva() {
  if (editando.value) {
    store.aggiorna(editando.value, form.value)
  } else {
    store.crea(form.value)
  }
  dialog.value = false
}

function eliminaConferma(arg) {
  daEliminare.value = arg
  dialogElimina.value = true
}

function eseguiElimina() {
  store.elimina(daEliminare.value.id)
  dialogElimina.value = false
}

function toggleChiuso(arg) {
  store.aggiorna(arg.id, { seChiuso: !arg.seChiuso })
}
</script>

<!--
  Componente ricorsivo per visualizzare l'albero degli argomenti.
  Viene definito separatamente e usato nel template sopra.
  La ricorsione avviene: ArgomentoNodo chiama se stesso per i figli.
-->
<script>
// Definiamo il componente ArgomentoNodo nello stesso file per semplicità
export const ArgomentoNodo = defineComponent({
  name: 'ArgomentoNodo',
  props: {
    argomento: Object,
    tutti: Array, // Tutti gli argomenti (per trovare i figli)
  },
  emits: ['modifica', 'elimina', 'crea-figlio', 'toggle-chiuso'],
  setup(props, { emit }) {
    const aperto = ref(true)
    const figli = computed(() =>
      props.tutti.filter(a => a.id_padre === props.argomento.id)
    )
    return () => {
      const VCard = resolveComponent('v-card')
      const VBtn = resolveComponent('v-btn')
      const VChip = resolveComponent('v-chip')
      const VIcon = resolveComponent('v-icon')

      return h('div', { class: 'mb-2' }, [
        h(VCard, {
          variant: 'outlined',
          rounded: 'lg',
          style: { borderLeft: `4px solid ${props.argomento.colore}` },
          class: props.argomento.seChiuso ? 'opacity-50' : '',
        }, {
          default: () => h('div', { class: 'd-flex align-center pa-3' }, [
            // Espandi/comprimi figli
            figli.value.length > 0
              ? h(VBtn, {
                  icon: true,
                  size: 'x-small',
                  variant: 'text',
                  onClick: () => { aperto.value = !aperto.value },
                }, { default: () => h(VIcon, { size: 18 }, { default: () => aperto.value ? 'mdi-chevron-down' : 'mdi-chevron-right' }) })
              : h('div', { style: 'width:28px' }),

            // Avatar colore
            h('div', {
              style: `width:12px;height:12px;border-radius:50%;background:${props.argomento.colore};margin-right:10px;flex-shrink:0`,
            }),

            // Nome + descrizione
            h('div', { class: 'flex-grow-1' }, [
              h('span', { class: 'text-body-2 font-weight-bold' }, props.argomento.nome),
              props.argomento.seChiuso
                ? h(VChip, { size: 'x-small', class: 'ml-2' }, { default: () => 'chiuso' })
                : null,
              props.argomento.descrizione
                ? h('div', { class: 'text-caption text-grey' }, props.argomento.descrizione)
                : null,
            ]),

            // Azioni
            h(VBtn, { icon: true, size: 'x-small', variant: 'text', onClick: () => emit('crea-figlio', props.argomento.id) },
              { default: () => h(VIcon, { size: 16 }, { default: () => 'mdi-plus' }) }),
            h(VBtn, { icon: true, size: 'x-small', variant: 'text', onClick: () => emit('modifica', props.argomento) },
              { default: () => h(VIcon, { size: 16 }, { default: () => 'mdi-pencil-outline' }) }),
            h(VBtn, { icon: true, size: 'x-small', variant: 'text', onClick: () => emit('toggle-chiuso', props.argomento) },
              { default: () => h(VIcon, { size: 16 }, { default: () => props.argomento.seChiuso ? 'mdi-eye-outline' : 'mdi-eye-off-outline' }) }),
            h(VBtn, { icon: true, size: 'x-small', variant: 'text', color: 'error', onClick: () => emit('elimina', props.argomento) },
              { default: () => h(VIcon, { size: 16 }, { default: () => 'mdi-delete-outline' }) }),
          ]),
        }),

        // Figli (indentati) — ricorsione
        aperto.value && figli.value.length > 0
          ? h('div', { style: 'padding-left: 24px;' },
              figli.value.map(figlio =>
                h(ArgomentoNodo, {
                  key: figlio.id,
                  argomento: figlio,
                  tutti: props.tutti,
                  onModifica: (a) => emit('modifica', a),
                  onElimina: (a) => emit('elimina', a),
                  onCreaFiglio: (id) => emit('crea-figlio', id),
                  onToggleChiuso: (a) => emit('toggle-chiuso', a),
                })
              )
            )
          : null,
      ])
    }
  },
})
</script>

<style scoped>
.gap-2 { gap: 8px; }
</style>
