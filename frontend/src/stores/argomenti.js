// ============================================================
// stores/argomenti.js
//
// Questo è uno "store" Pinia: un contenitore reattivo di dati
// condiviso tra tutti i componenti Vue dell'app.
//
// Pinia è l'equivalente moderno di Vuex — gestisce lo stato globale.
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { argomentiDb } from '../db/localStorage.js'

export const useArgomentiStore = defineStore('argomenti', () => {

  // ── STATE ────────────────────────────────────────────────
  // ref() rende la variabile "reattiva": quando cambia, Vue aggiorna la UI

  // Lista completa degli argomenti
  const argomenti = ref([])

  // Percorso di navigazione corrente (breadcrumb)
  // Es: [{ id: 1, nome: 'Programmazione' }, { id: 3, nome: 'Frontend' }]
  const breadcrumb = ref([])

  // ID del livello che stiamo visualizzando (null = radice)
  const livelloCorrente = ref(null)

  // ── GETTERS (computed) ───────────────────────────────────
  // computed() calcola un valore derivato e lo aggiorna automaticamente

  // Argomenti del livello corrente (figli del nodo selezionato)
  const argomentiVisibili = computed(() =>
    argomenti.value.filter(a =>
      livelloCorrente.value === null
        ? !a.id_padre
        : a.id_padre === livelloCorrente.value
    ).filter(a => !a.seChiuso) // Nascondi quelli chiusi
  )

  // Verifica se ci sono figli per un dato argomento
  const haFigli = (id) =>
    argomenti.value.some(a => a.id_padre === id && !a.seChiuso)

  // ── ACTIONS ──────────────────────────────────────────────

  // Carica tutti gli argomenti dal localStorage
  function carica() {
    argomenti.value = argomentiDb.getAll()
  }

  // Naviga dentro un argomento (scende di un livello)
  function entra(argomento) {
    breadcrumb.value.push({ id: argomento.id, nome: argomento.nome })
    livelloCorrente.value = argomento.id
  }

  // Torna alla radice (resetta la navigazione)
  function tornaAllaRadice() {
    breadcrumb.value = []
    livelloCorrente.value = null
  }

  // Naviga a un livello specifico del breadcrumb
  function tornaA(indice) {
    breadcrumb.value = breadcrumb.value.slice(0, indice + 1)
    livelloCorrente.value = breadcrumb.value[indice]?.id ?? null
  }

  // CRUD
  function crea(dati) {
    argomentiDb.crea(dati)
    carica()
  }

  function aggiorna(id, campi) {
    argomentiDb.aggiorna(id, campi)
    carica()
  }

  function elimina(id) {
    argomentiDb.elimina(id)
    carica()
  }

  return {
    argomenti,
    breadcrumb,
    livelloCorrente,
    argomentiVisibili,
    haFigli,
    carica,
    entra,
    tornaAllaRadice,
    tornaA,
    crea,
    aggiorna,
    elimina,
  }
})
