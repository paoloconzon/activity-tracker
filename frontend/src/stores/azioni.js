import { defineStore } from 'pinia'
import { ref } from 'vue'
import { azioniDb } from '../db/localStorage.js'

export const useAzioniStore = defineStore('azioni', () => {

  const azioni = ref([])

  function carica() {
    azioni.value = azioniDb.getAll()
  }

  function crea(dati) {
    azioniDb.crea(dati)
    carica()
  }

  function aggiorna(id, campi) {
    azioniDb.aggiorna(id, campi)
    carica()
  }

  function elimina(id) {
    azioniDb.elimina(id)
    carica()
  }

  return { azioni, carica, crea, aggiorna, elimina }
})
