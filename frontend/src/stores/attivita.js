// ============================================================
// stores/attivita.js
//
// Gestisce l'attività corrente e il timer live.
// Il timer si aggiorna ogni secondo con setInterval.
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { attivitaDb, argomentiDb, azioniDb } from '../db/localStorage.js'

export const useAttivitaStore = defineStore('attivita', () => {

  // ── STATE ────────────────────────────────────────────────

  // L'attività attualmente aperta (null se nessuna)
  const corrente = ref(null)

  // Lista di tutte le attività (per lo storico)
  const storico = ref([])

  // Tick del timer: ogni secondo viene aggiornato con new Date()
  // I componenti che lo usano si aggiornano automaticamente
  const tick = ref(new Date())

  // Riferimento all'interval del timer (serve per fermarlo)
  let timerInterval = null

  // ── GETTERS ──────────────────────────────────────────────

  // Secondi trascorsi dall'inizio dell'attività corrente
  const secondiTrascorsi = computed(() => {
    if (!corrente.value) return 0
    const inizio = new Date(corrente.value.ora_inizio)
    return Math.floor((tick.value - inizio) / 1000)
  })

  // Durata formattata come HH:MM:SS
  const durataFormattata = computed(() => {
    const tot = secondiTrascorsi.value
    const h = Math.floor(tot / 3600)
    const m = Math.floor((tot % 3600) / 60)
    const s = tot % 60
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
  })

  // Argomento corrente (oggetto completo)
  const argomentoCorrente = computed(() => {
    if (!corrente.value) return null
    return argomentiDb.getById(corrente.value.id_argomento)
  })

  // Azione corrente (oggetto completo)
  const azioneCorrente = computed(() => {
    if (!corrente.value) return null
    return azioniDb.getById(corrente.value.id_azione)
  })

  // Indica se siamo in pausa (argomento o azione si chiama "Pausa")
  const inPausa = computed(() => {
    if (!argomentoCorrente.value || !azioneCorrente.value) return false
    return (
      argomentoCorrente.value.nome === 'Pausa' ||
      azioneCorrente.value.azione === 'Pausa'
    )
  })

  // ── ACTIONS ──────────────────────────────────────────────

  function caricaCorrente() {
    corrente.value = attivitaDb.getCorrente()
    if (corrente.value) avviaTimer()
    else fermaTimer()
  }

  function caricaStorico() {
    storico.value = attivitaDb.getAll()
  }

  // Avvia una nuova attività
  function avvia({ id_argomento, id_azione }) {
    corrente.value = attivitaDb.avvia({ id_argomento, id_azione })
    avviaTimer()
    caricaStorico()
  }

  // Chiude l'attività corrente (senza aprirne una nuova)
  function chiudi() {
    attivitaDb.chiudiCorrente()
    corrente.value = null
    fermaTimer()
    caricaStorico()
  }

  // Mette in pausa: chiude la corrente e apre una "Pausa/Pausa"
  // Restituisce l'attività pre-pausa così possiamo riprenderla
  function mettInPausa(idArgPausa, idAzPausa) {
    // Salva i dati dell'attività corrente prima di chiuderla
    const precedente = { ...corrente.value }
    attivitaDb.avvia({ id_argomento: idArgPausa, id_azione: idAzPausa })
    caricaCorrente()
    caricaStorico()
    return precedente
  }

  // Riprende un'attività dopo la pausa
  function riprendiDaPausa(idArgomento, idAzione) {
    attivitaDb.avvia({ id_argomento: idArgomento, id_azione: idAzione })
    caricaCorrente()
    caricaStorico()
  }

  // Aggiorna la descrizione dell'attività corrente in tempo reale
  function aggiornaDescrizione(testo) {
    if (!corrente.value) return
    attivitaDb.aggiorna(corrente.value.id, { descrizione: testo })
    corrente.value.descrizione = testo
  }

  // CRUD sullo storico
  function aggiornaStorico(id, campi) {
    attivitaDb.aggiorna(id, campi)
    caricaStorico()
    caricaCorrente()
  }

  function eliminaDaStorico(id) {
    attivitaDb.elimina(id)
    caricaStorico()
    caricaCorrente()
  }

  // ── TIMER ─────────────────────────────────────────────────

  function avviaTimer() {
    fermaTimer() // Evita timer duplicati
    timerInterval = setInterval(() => {
      tick.value = new Date()
    }, 1000)
  }

  function fermaTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  return {
    corrente,
    storico,
    secondiTrascorsi,
    durataFormattata,
    argomentoCorrente,
    azioneCorrente,
    inPausa,
    caricaCorrente,
    caricaStorico,
    avvia,
    chiudi,
    mettInPausa,
    riprendiDaPausa,
    aggiornaDescrizione,
    aggiornaStorico,
    eliminaDaStorico,
  }
})
