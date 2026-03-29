// ============================================================
// localStorage.js — Il nostro "database" locale
//
// Struttura salvata nel browser:
//   at_argomenti  → array di { id, nome, id_padre, descrizione, colore, seChiuso }
//   at_azioni     → array di { id, azione }
//   at_attivita   → array di { id, id_argomento, id_azione, ora_inizio, ora_fine, descrizione, note }
//   at_next_id    → oggetto con i contatori degli ID per ogni tabella
// ============================================================

// ── Helpers interni ──────────────────────────────────────────

// Legge un array dal localStorage (restituisce [] se vuoto)
function leggi(chiave) {
  const raw = localStorage.getItem(chiave)
  return raw ? JSON.parse(raw) : []
}

// Scrive un array nel localStorage
function scrivi(chiave, dati) {
  localStorage.setItem(chiave, JSON.stringify(dati))
}

// Genera un nuovo ID univoco per la tabella indicata
function nuovoId(tabella) {
  const ids = JSON.parse(localStorage.getItem('at_next_id') || '{}')
  const id = (ids[tabella] || 0) + 1
  ids[tabella] = id
  localStorage.setItem('at_next_id', JSON.stringify(ids))
  return id
}

// ── ARGOMENTI ─────────────────────────────────────────────────

export const argomentiDb = {
  // Restituisce tutti gli argomenti
  getAll() {
    return leggi('at_argomenti')
  },

  // Restituisce gli argomenti figli di un dato id_padre
  // Se id_padre è null → restituisce le radici (argomenti senza padre)
  getByPadre(idPadre = null) {
    return leggi('at_argomenti').filter(a =>
      idPadre === null ? !a.id_padre : a.id_padre === idPadre
    )
  },

  // Restituisce un singolo argomento per ID
  getById(id) {
    return leggi('at_argomenti').find(a => a.id === id) || null
  },

  // Crea un nuovo argomento
  crea({ nome, id_padre = null, descrizione = '', colore = '#1976D2', seChiuso = false }) {
    const lista = leggi('at_argomenti')
    const nuovo = {
      id: nuovoId('argomenti'),
      nome,
      id_padre,
      descrizione,
      colore,
      seChiuso,
    }
    lista.push(nuovo)
    scrivi('at_argomenti', lista)
    return nuovo
  },

  // Aggiorna un argomento esistente (passare solo i campi da modificare)
  aggiorna(id, campi) {
    const lista = leggi('at_argomenti')
    const idx = lista.findIndex(a => a.id === id)
    if (idx === -1) return null
    lista[idx] = { ...lista[idx], ...campi }
    scrivi('at_argomenti', lista)
    return lista[idx]
  },

  // Elimina un argomento (e i suoi figli, ricorsivamente)
  elimina(id) {
    let lista = leggi('at_argomenti')
    // Raccoglie tutti gli id da eliminare (l'argomento + tutti i discendenti)
    const daEliminare = new Set()
    const raccogli = (parentId) => {
      daEliminare.add(parentId)
      lista.filter(a => a.id_padre === parentId).forEach(a => raccogli(a.id))
    }
    raccogli(id)
    lista = lista.filter(a => !daEliminare.has(a.id))
    scrivi('at_argomenti', lista)
    return true
  },
}

// ── AZIONI ────────────────────────────────────────────────────

export const azioniDb = {
  getAll() {
    return leggi('at_azioni')
  },

  getById(id) {
    return leggi('at_azioni').find(a => a.id === id) || null
  },

  crea({ azione }) {
    const lista = leggi('at_azioni')
    const nuovo = { id: nuovoId('azioni'), azione }
    lista.push(nuovo)
    scrivi('at_azioni', lista)
    return nuovo
  },

  aggiorna(id, campi) {
    const lista = leggi('at_azioni')
    const idx = lista.findIndex(a => a.id === id)
    if (idx === -1) return null
    lista[idx] = { ...lista[idx], ...campi }
    scrivi('at_azioni', lista)
    return lista[idx]
  },

  elimina(id) {
    const lista = leggi('at_azioni').filter(a => a.id !== id)
    scrivi('at_azioni', lista)
    return true
  },
}

// ── ATTIVITÀ ──────────────────────────────────────────────────

export const attivitaDb = {
  getAll() {
    // Restituisce in ordine cronologico inverso (la più recente prima)
    return leggi('at_attivita').sort((a, b) =>
      new Date(b.ora_inizio) - new Date(a.ora_inizio)
    )
  },

  // Restituisce l'attività corrente (quella senza ora_fine)
  getCorrente() {
    return leggi('at_attivita').find(a => !a.ora_fine) || null
  },

  getById(id) {
    return leggi('at_attivita').find(a => a.id === id) || null
  },

  // Avvia una nuova attività:
  // 1. Chiude quella in corso (se esiste) valorizzando ora_fine
  // 2. Crea la nuova con ora_inizio = adesso
  avvia({ id_argomento, id_azione, descrizione = '', note = '' }) {
    const lista = leggi('at_attivita')
    const adesso = new Date().toISOString()

    // Chiudi l'eventuale attività aperta
    const aperta = lista.find(a => !a.ora_fine)
    if (aperta) {
      aperta.ora_fine = adesso
    }

    // Crea la nuova
    const nuova = {
      id: nuovoId('attivita'),
      id_argomento,
      id_azione,
      ora_inizio: adesso,
      ora_fine: null,
      descrizione,
      note,
    }
    lista.push(nuova)
    scrivi('at_attivita', lista)
    return nuova
  },

  // Chiude l'attività corrente senza aprirne una nuova
  chiudiCorrente() {
    const lista = leggi('at_attivita')
    const aperta = lista.find(a => !a.ora_fine)
    if (aperta) {
      aperta.ora_fine = new Date().toISOString()
      scrivi('at_attivita', lista)
      return aperta
    }
    return null
  },

  // Aggiorna campi di una attività (utile per descrizione/note al volo)
  aggiorna(id, campi) {
    const lista = leggi('at_attivita')
    const idx = lista.findIndex(a => a.id === id)
    if (idx === -1) return null
    lista[idx] = { ...lista[idx], ...campi }
    scrivi('at_attivita', lista)
    return lista[idx]
  },

  elimina(id) {
    const lista = leggi('at_attivita').filter(a => a.id !== id)
    scrivi('at_attivita', lista)
    return true
  },
}

// ── SEED (dati iniziali di esempio) ──────────────────────────
// Chiamata una volta sola al primo avvio se il DB è vuoto

export function seedDatiIniziali() {
  // Non fare nulla se ci sono già dati
  if (leggi('at_azioni').length > 0) return

  // Azioni di default
  ;['Sviluppo', 'Analisi', 'Formazione', 'Riunione', 'Varie', 'Pausa'].forEach(
    nome => azioniDb.crea({ azione: nome })
  )

  // Argomenti di esempio con gerarchia
  const prog = argomentiDb.crea({ nome: 'Programmazione', colore: '#1976D2', descrizione: 'Attività di sviluppo software' })
  argomentiDb.crea({ nome: 'Frontend', id_padre: prog.id, colore: '#42A5F5' })
  argomentiDb.crea({ nome: 'Backend', id_padre: prog.id, colore: '#1565C0' })

  const admin = argomentiDb.crea({ nome: 'Amministrazione', colore: '#388E3C', descrizione: 'Gestione e organizzazione' })
  argomentiDb.crea({ nome: 'Email', id_padre: admin.id, colore: '#66BB6A' })

  // Argomento speciale Pausa (usato dal tasto pausa)
  argomentiDb.crea({ nome: 'Pausa', colore: '#FF9800', descrizione: 'Pausa / interruzione' })
}
