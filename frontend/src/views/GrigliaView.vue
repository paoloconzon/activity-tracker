<!--
  GrigliaView.vue — Visualizzazione attività in modalità tabella Excel

  Colonne: Data | Ora Inizio | Tempo | Argomento (path) | Attività | Descrizione
  Funzionalità:
  - Filtro per intervallo date (preimpostato su oggi)
  - Filtro testo generico case-insensitive su tutti i campi
  - Modifica inline di argomento, azione e descrizione
  - Totale tempo in fondo
-->

<template>
  <v-container fluid class="py-4">

    <h2 class="text-h6 mb-4">
      <v-icon class="mr-1">mdi-table</v-icon>
      Griglia attività
    </h2>

    <!-- Filtri ──────────────────────────────────────────────── -->
    <v-row dense class="mb-3" align="center">

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="filtroDal"
          label="Dal"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>

      <v-col cols="12" sm="2">
        <v-text-field
          v-model="filtroAl"
          label="Al"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>

      <v-col cols="12" sm="6">
        <v-text-field
          v-model="filtroTesto"
          label="Cerca (argomento, attività, descrizione…)"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
        />
      </v-col>

      <v-col cols="12" sm="2" class="d-flex justify-end">
        <v-btn variant="tonal" size="small" @click="resetFiltri">
          <v-icon start>mdi-refresh</v-icon>Oggi
        </v-btn>
      </v-col>

    </v-row>

    <!-- Nessun risultato -->
    <v-alert v-if="attivitaFiltrate.length === 0" type="info" variant="tonal">
      Nessuna attività trovata.
    </v-alert>

    <!-- Tabella ──────────────────────────────────────────────── -->
    <div v-else class="tabella-wrapper">
      <table class="excel-table">
        <thead>
          <tr>
            <th style="width:90px">Data</th>
            <th style="width:68px">Inizio</th>
            <th style="width:72px">Tempo</th>
            <th style="min-width:200px">Argomento</th>
            <th style="width:120px">Attività</th>
            <th style="min-width:220px">Descrizione</th>
            <th style="width:36px"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(att, idx) in attivitaFiltrate" :key="att.id">

            <!-- Separatore di giorno -->
            <tr
              v-if="idx === 0 || giornoOf(att) !== giornoOf(attivitaFiltrate[idx - 1])"
              class="row-day-header"
            >
              <td colspan="7">
                <span class="day-label">{{ formatGiorno(att.ora_inizio) }}</span>
                <span class="day-total">{{ totaleGiorno(giornoOf(att)) }}</span>
              </td>
            </tr>

            <!-- Riga attività -->
            <tr
              :class="['row-att', { 'row-in-corso': !att.ora_fine }]"
              :style="{ borderLeft: `3px solid ${coloreArgomento(att.id_argomento)}` }"
            >
              <!-- Data -->
              <td class="cell-date">{{ formatData(att.ora_inizio) }}</td>

              <!-- Ora inizio -->
              <td class="cell-time">{{ formatOra(att.ora_inizio) }}</td>

              <!-- Durata -->
              <td class="cell-dur">
                <span v-if="att.ora_fine">{{ durata(att.ora_inizio, att.ora_fine) }}</span>
                <v-chip v-else size="x-small" color="success">in corso</v-chip>
              </td>

              <!-- Argomento (path) — inline edit -->
              <td class="cell-arg">
                <template v-if="editArgId === att.id">
                  <v-autocomplete
                    v-model="editArgValore"
                    :items="argomentiStore.argomenti.filter(a => !a.seChiuso)"
                    item-title="nome"
                    item-value="id"
                    variant="plain"
                    density="compact"
                    hide-details
                    autofocus
                    auto-select-first
                    class="edit-field"
                    @update:modelValue="salvaEditArg(att)"
                    @blur="annullaEditArg"
                    @keyup.esc="annullaEditArg"
                  >
                    <template #item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template #prepend>
                          <v-avatar :color="item.raw.colore" size="10" class="mr-2" />
                        </template>
                        <template #title>
                          <span class="text-caption">{{ pathArgomento(item.raw.id).join(' / ') }}</span>
                        </template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                </template>
                <template v-else>
                  <div class="arg-path editable-cell" @click="avviaEditArg(att)" title="Clicca per modificare">
                    <template v-for="(parte, i) in pathArgomento(att.id_argomento)" :key="i">
                      <span
                        class="path-part"
                        :class="{ 'path-last': i === pathArgomento(att.id_argomento).length - 1 }"
                        :style="i === pathArgomento(att.id_argomento).length - 1
                          ? { color: coloreArgomento(att.id_argomento) }
                          : {}"
                      >{{ parte }}</span>
                      <span
                        v-if="i < pathArgomento(att.id_argomento).length - 1"
                        class="path-sep"
                      > / </span>
                    </template>
                  </div>
                </template>
              </td>

              <!-- Azione — inline edit -->
              <td class="cell-az">
                <template v-if="editAzId === att.id">
                  <v-autocomplete
                    v-model="editAzValore"
                    :items="azioniStore.azioni"
                    item-title="azione"
                    item-value="id"
                    variant="plain"
                    density="compact"
                    hide-details
                    autofocus
                    auto-select-first
                    class="edit-field"
                    @update:modelValue="salvaEditAz(att)"
                    @blur="annullaEditAz"
                    @keyup.esc="annullaEditAz"
                  />
                </template>
                <template v-else>
                  <v-chip
                    size="x-small"
                    color="grey-lighten-2"
                    text-color="grey-darken-3"
                    class="editable-chip"
                    @click="avviaEditAz(att)"
                    title="Clicca per modificare"
                  >
                    {{ nomeAzione(att.id_azione) }}
                  </v-chip>
                </template>
              </td>

              <!-- Descrizione — inline edit -->
              <td class="cell-desc">
                <template v-if="editDescId === att.id">
                  <v-text-field
                    v-model="editDescValore"
                    variant="plain"
                    density="compact"
                    hide-details
                    autofocus
                    class="edit-field"
                    @blur="salvaEditDesc(att)"
                    @keyup.enter="salvaEditDesc(att)"
                    @keyup.esc="annullaEditDesc"
                  />
                </template>
                <template v-else>
                  <span
                    class="desc-text editable-cell"
                    :class="{ 'desc-vuota': !att.descrizione }"
                    @click="avviaEditDesc(att)"
                    title="Clicca per modificare"
                  >
                    {{ att.descrizione || '—' }}
                  </span>
                </template>
              </td>

              <!-- Tasto elimina -->
              <td class="cell-act">
                <v-btn icon size="x-small" variant="text" color="grey" @click="chiediElimina(att)">
                  <v-icon size="14">mdi-delete-outline</v-icon>
                </v-btn>
              </td>

            </tr>

          </template>
        </tbody>

        <!-- Totale ────────────────────────────────────────────── -->
        <tfoot>
          <tr class="row-totale">
            <td colspan="2" class="text-right pr-2 text-caption text-grey">Totale:</td>
            <td class="cell-dur font-weight-bold">{{ formatDurataTot(totaleMinuti) }}</td>
            <td colspan="4" class="text-caption text-grey pl-2">
              su {{ attivitaFiltrate.filter(a => a.ora_fine).length }} attività completate
            </td>
          </tr>
        </tfoot>

      </table>
    </div>

    <!-- Dialog conferma eliminazione ───────────────────────── -->
    <v-dialog v-model="dialogElimina" max-width="360">
      <v-card rounded="xl">
        <v-card-title class="text-h6 pa-4">Elimina attività</v-card-title>
        <v-card-text class="px-4 pb-2">
          Sei sicuro di voler eliminare questa attività? L'operazione non è reversibile.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialogElimina = false">Annulla</v-btn>
          <v-btn color="error" variant="tonal" @click="confermaElimina">Elimina</v-btn>
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

const attivitaStore  = useAttivitaStore()
const argomentiStore = useArgomentiStore()
const azioniStore    = useAzioniStore()

// ── Helpers data ────────────────────────────────────────────
function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Filtri (oggi preimpostato) ──────────────────────────────
const filtroDal   = ref(oggiISO())
const filtroAl    = ref(oggiISO())
const filtroTesto = ref('')

function resetFiltri() {
  filtroDal.value   = oggiISO()
  filtroAl.value    = oggiISO()
  filtroTesto.value = ''
}

// ── Attività filtrate ───────────────────────────────────────
const attivitaFiltrate = computed(() => {
  const testo = filtroTesto.value.trim().toLowerCase()

  return attivitaStore.storico
    .filter(att => {
      const data = att.ora_inizio.slice(0, 10)
      if (filtroDal.value && data < filtroDal.value) return false
      if (filtroAl.value  && data > filtroAl.value)  return false

      if (testo) {
        const path   = pathArgomento(att.id_argomento).join(' ').toLowerCase()
        const azione = nomeAzione(att.id_azione).toLowerCase()
        const desc   = (att.descrizione || '').toLowerCase()
        const note   = (att.note || '').toLowerCase()
        if (!path.includes(testo) && !azione.includes(testo) &&
            !desc.includes(testo) && !note.includes(testo)) return false
      }

      return true
    })
    .slice()
    .sort((a, b) => new Date(b.ora_inizio) - new Date(a.ora_inizio))
})

// ── Totale minuti (solo completate) ────────────────────────
const totaleMinuti = computed(() =>
  attivitaFiltrate.value
    .filter(a => a.ora_fine)
    .reduce((acc, a) =>
      acc + Math.floor((new Date(a.ora_fine) - new Date(a.ora_inizio)) / 60000), 0)
)

function totaleGiorno(giorno) {
  const min = attivitaFiltrate.value
    .filter(a => giornoOf(a) === giorno && a.ora_fine)
    .reduce((acc, a) =>
      acc + Math.floor((new Date(a.ora_fine) - new Date(a.ora_inizio)) / 60000), 0)
  return formatDurataTot(min)
}

// ── Path argomento ──────────────────────────────────────────
function pathArgomento(id) {
  const path = []
  let nodo = argomentiStore.argomenti.find(a => a.id === id)
  while (nodo) {
    path.unshift(nodo.nome)
    nodo = nodo.id_padre
      ? argomentiStore.argomenti.find(a => a.id === nodo.id_padre)
      : null
  }
  return path.length ? path : [`#${id}`]
}

function coloreArgomento(id) {
  return argomentiStore.argomenti.find(a => a.id === id)?.colore ?? '#9E9E9E'
}
function nomeAzione(id) {
  return azioniStore.azioni.find(a => a.id === id)?.azione ?? `#${id}`
}

// ── Formato date ────────────────────────────────────────────
function giornoOf(att) { return att.ora_inizio.slice(0, 10) }

function formatData(iso) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function formatOra(iso) {
  return iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''
}
function formatGiorno(iso) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}
function durata(inizio, fine) {
  if (!fine) return '—'
  const min = Math.floor((new Date(fine) - new Date(inizio)) / 60000)
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
function formatDurataTot(min) {
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

// ── Edit inline: ARGOMENTO ──────────────────────────────────
const editArgId     = ref(null)
const editArgValore = ref(null)

function avviaEditArg(att) {
  editArgId.value     = att.id
  editArgValore.value = att.id_argomento
}
function salvaEditArg(att) {
  if (editArgValore.value && editArgValore.value !== att.id_argomento) {
    attivitaStore.aggiornaStorico(att.id, { id_argomento: editArgValore.value })
  }
  annullaEditArg()
}
function annullaEditArg() {
  editArgId.value     = null
  editArgValore.value = null
}

// ── Edit inline: AZIONE ─────────────────────────────────────
const editAzId     = ref(null)
const editAzValore = ref(null)

function avviaEditAz(att) {
  editAzId.value     = att.id
  editAzValore.value = att.id_azione
}
function salvaEditAz(att) {
  if (editAzValore.value && editAzValore.value !== att.id_azione) {
    attivitaStore.aggiornaStorico(att.id, { id_azione: editAzValore.value })
  }
  annullaEditAz()
}
function annullaEditAz() {
  editAzId.value     = null
  editAzValore.value = null
}

// ── Edit inline: DESCRIZIONE ────────────────────────────────
const editDescId     = ref(null)
const editDescValore = ref('')

function avviaEditDesc(att) {
  editDescId.value     = att.id
  editDescValore.value = att.descrizione || ''
}
function salvaEditDesc(att) {
  attivitaStore.aggiornaStorico(att.id, { descrizione: editDescValore.value })
  annullaEditDesc()
}
function annullaEditDesc() {
  editDescId.value     = null
  editDescValore.value = ''
}

// ── Elimina ─────────────────────────────────────────────────
const dialogElimina       = ref(false)
const attivitaDaEliminare = ref(null)

function chiediElimina(att) {
  attivitaDaEliminare.value = att
  dialogElimina.value = true
}
function confermaElimina() {
  if (attivitaDaEliminare.value)
    attivitaStore.eliminaDaStorico(attivitaDaEliminare.value.id)
  dialogElimina.value = false
  attivitaDaEliminare.value = null
}

// ── Mount ───────────────────────────────────────────────────
onMounted(() => {
  attivitaStore.caricaStorico()
  argomentiStore.carica()
})
</script>

<style scoped>
.tabella-wrapper {
  overflow-x: auto;
  border: 1px solid rgba(0,0,0,0.10);
  border-radius: 8px;
}

.excel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  table-layout: fixed;
}

/* Intestazioni */
.excel-table thead tr {
  background: rgba(0,0,0,0.04);
  position: sticky;
  top: 0;
  z-index: 1;
}
.excel-table th {
  padding: 7px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #666;
  border-bottom: 2px solid rgba(0,0,0,0.10);
  white-space: nowrap;
}

/* Separatore giorno */
.row-day-header td {
  padding: 6px 10px 2px;
  background: transparent;
  border-top: 1px solid rgba(0,0,0,0.07);
}
.day-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #444;
  text-transform: capitalize;
}
.day-total {
  margin-left: 10px;
  font-size: 0.72rem;
  color: #999;
}

/* Righe attività */
.row-att td {
  padding: 5px 10px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  vertical-align: middle;
}
.row-att:hover td { background: rgba(0,0,0,0.02); }
.row-in-corso td  { background: rgba(76,175,80,0.04); }

/* Celle */
.cell-date { color: #888; white-space: nowrap; font-size: 0.75rem; }
.cell-time { font-variant-numeric: tabular-nums; white-space: nowrap; }
.cell-dur  { font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; }
.cell-az   { white-space: nowrap; }
.cell-desc { overflow: hidden; }
.cell-act  { width: 36px; padding: 0 4px !important; text-align: center; }
.cell-arg  { overflow: hidden; }

/* Path argomento */
.arg-path {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
}
.path-part {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.78rem;
  color: #aaa;
  max-width: 80px;
}
.path-last { font-weight: 600; max-width: 120px; }
.path-sep  { color: #ddd; flex-shrink: 0; font-size: 0.7rem; padding: 0 1px; }

/* Descrizione */
.desc-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 60px;
}
.desc-vuota { color: #ccc; }

/* Celle editabili */
.editable-cell,
.editable-chip {
  cursor: text;
  border-radius: 3px;
  padding: 2px 4px;
}
.editable-cell:hover {
  background: rgba(25,118,210,0.07);
  outline: 1px dashed rgba(25,118,210,0.4);
}
.editable-chip { cursor: pointer !important; }
.editable-chip:hover { opacity: 0.75; }

.edit-field { font-size: 0.8rem; }

/* Riga totale */
.row-totale td {
  padding: 8px 10px;
  border-top: 2px solid rgba(0,0,0,0.12);
  background: rgba(0,0,0,0.02);
}
</style>
