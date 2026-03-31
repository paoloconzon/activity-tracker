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

  // Trova la radice di un'attività (catena id_prev)
  function trovaRadice(att) {
    if (!att) return null
    let root = att
    while (root.id_prev) {
      const parent = attivitaDb.getById(root.id_prev)
      if (!parent) break
      root = parent
    }
    return root
  }

  // Avvia una nuova attività
  function avvia({ id_argomento, id_azione, id_prev = null, descrizione = '', flag1 = '', flag2 = '', flag3 = '' }) {
    corrente.value = attivitaDb.avvia({
      id_argomento,
      id_azione,
      id_prev,
      descrizione,
      flag1,
      flag2,
      flag3,
    })
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
    if (!corrente.value) return null

    const precedente = { ...corrente.value }
    const root = trovaRadice(precedente)
    const descrizioneRadice = root?.descrizione || ''

    attivitaDb.avvia({
      id_argomento: idArgPausa,
      id_azione: idAzPausa,
      id_prev: null, // pausa non eredita da precedente per non estendere la catena
      descrizione: descrizioneRadice,
      flag1: root?.flag1 || '',
      flag2: root?.flag2 || '',
      flag3: root?.flag3 || '',
    })

    caricaCorrente()
    caricaStorico()
    return precedente
  }

  // Riprende un'attività dopo la pausa (o da storico)
  function riprendiDaPausa(precedenteAttivita) {
    if (!precedenteAttivita) return

    const root = trovaRadice(precedenteAttivita)
    const descrizioneRadice = root?.descrizione || ''

    corrente.value = attivitaDb.avvia({
      id_argomento: precedenteAttivita.id_argomento,
      id_azione: precedenteAttivita.id_azione,
      id_prev: precedenteAttivita.id,
      descrizione: descrizioneRadice,
      flag1: root?.flag1 || '',
      flag2: root?.flag2 || '',
      flag3: root?.flag3 || '',
    })

    avviaTimer()
    caricaStorico()
  }

  // Riprendi direttamente da storico: usa l'attività scelta come precedente
  function riprendiDaStorico(att) {
    if (!att) return

    // Se c'è una corrente aperta, chiudila a prescindere
    if (corrente.value) {
      attivitaDb.chiudiCorrente()
    }

    riprendiDaPausa(att)
  }

  // Aggiorna la descrizione della radice di catena attuale in tempo reale
  function aggiornaDescrizione(testo) {
    if (!corrente.value) return
    const root = trovaRadice(corrente.value)
    if (!root) return

    attivitaDb.aggiorna(root.id, { descrizione: testo })
    if (corrente.value.id === root.id) {
      corrente.value.descrizione = testo
    }
  }

  // Aggiorna i flag sull'attività corrente
  function aggiornaFlag1(val) {
    if (!corrente.value) return
    attivitaDb.aggiorna(corrente.value.id, { flag1: val })
    corrente.value.flag1 = val
  }

  function aggiornaFlag2(val) {
    if (!corrente.value) return
    attivitaDb.aggiorna(corrente.value.id, { flag2: val })
    corrente.value.flag2 = val
  }

  function aggiornaFlag3(val) {
    if (!corrente.value) return
    attivitaDb.aggiorna(corrente.value.id, { flag3: val })
    corrente.value.flag3 = val
  }

  // Aggiorna le note solo sull'attività corrente
  function aggiornaNote(val) {
    if (!corrente.value) return
    attivitaDb.aggiorna(corrente.value.id, { note: val })
    corrente.value.note = val
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
    riprendiDaStorico,
    trovaRadice,
    aggiornaDescrizione,
    aggiornaFlag1,
    aggiornaFlag2,
    aggiornaFlag3,
    aggiornaNote,
    aggiornaStorico,
    eliminaDaStorico,
  }
})
