# activity-tracker
webapp-vue for tracking activity day by day

Ambito: Plugin WordPress con interfaccia Single Page Application (SPA).
Stack Tecnologico: Vue.js 3 (Composition API), Vuetify 3 (Material Design), WordPress REST API, MySQL.

1. Architettura Database (Schema Relazionale)
Il sistema si appoggia su tre tabelle custom nel database WordPress:

wp_tf_argomenti: Gestione gerarchica delle categorie.

id (PK), nome, id_padre (FK self-referencing), descrizione, colore, seChiuso (boolean).

wp_tf_azioni: Tipologie di attività predefinite.

id (PK), azione (es. Sviluppo, Analisi, Pausa, Formazione).

wp_tf_attivita: Registro transazionale dei log temporali.

id (PK), id_argomento (FK), id_azione (FK), ora_inizio (datetime), ora_fine (datetime), descrizione (text), note (text).

2. Logica Funzionale del Frontend (Vue 3 + Vuetify)
A. Navigazione e Selezione (Tile-based):

Interfaccia a "mattonelle" per la selezione dell'Argomento.

Logica di drill-down: visualizzazione iniziale degli argomenti con id_padre nullo, seguita dai figli dell'elemento selezionato.

Selezione dell'Azione tramite Tiles dedicate.

B. Gestione Sessioni (Time Tracking):

Avvio: Al click su "OK" dopo la selezione, il sistema chiude l'attività precedente (inserendo ora_fine) e apre la nuova (inserendo ora_inizio).

Monitoraggio: Dashboard persistente con timer in tempo reale (calcolo durata dall'inizio della sessione attiva).

Funzione Pausa: Pulsante dedicato che interrompe l'attività corrente e avvia una sessione con Argomento "PAUSA" e Azione "PAUSA". Al termine della pausa, il sistema deve ripristinare automaticamente l'ultimo binomio Argomento/Azione precedente.

C. Moduli CRUD:

Gestione completa (Inserimento, Lettura, Modifica, Cancellazione) per la tabella Argomenti.

Interfaccia di consultazione e correzione storica per la tabella Attività.

3. Integrazione Sviluppo (Visual Studio Code)
Il progetto è configurato per lo sviluppo in VS Code, integrando il supporto AI per la generazione e il debugging dei sorgenti (PHP per la parte plugin/REST e JavaScript/Vue per la parte client).

4. Come usare come plugin WordPress
- Copia l'intera cartella `activity-tracker` in `wp-content/plugins/`.
- Esegui `cd frontend && npm install && npm run build`.
- Attiva il plugin da WP Admin > Plugin.
- Nel menu laterale admin troverai "Activity Tracker".
- La UI SPA sarà caricata su quella pagina in `<div id="app">`.

5. Note sul deploy
- Il JavaScript generato si trova in `frontend/dist` e viene registrato tramite `frontend/dist/manifest.json`.
- Se vuoi aggiornare a REST API completa, aggiungi endpoint in `activity-tracker.php` sotto `register_rest_endpoints()`.

