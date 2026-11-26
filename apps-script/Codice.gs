/**
 * NutriRider, ricezione del modulo dell'evento.
 *
 * Va incollato nell'editor Apps Script del foglio "Database app nutririder"
 * (Estensioni > Apps Script) e pubblicato come applicazione web.
 *
 * Cosa fa a ogni invio del modulo:
 * 1. scrive una riga nella scheda "Risposte" con stato "nuovo";
 * 2. fa partire l'attività di Claude chiamando il suo indirizzo API;
 * 3. annota nella colonna "avvio_claude" se l'avvio è riuscito.
 *
 * Il token dell'attività di Claude NON va scritto qui dentro: si salva in
 * Impostazioni progetto > Proprietà script, con questi due nomi:
 *   CLAUDE_FIRE_URL    l'indirizzo "Fire URL" dell'attività
 *   CLAUDE_FIRE_TOKEN  il token generato insieme all'indirizzo
 */

var SCHEDA_RISPOSTE = 'Risposte';

var OBIETTIVI_AMMESSI = ['in forma', 'proteico', 'cuore', 'ipocalorica', 'chetogenica', 'vegetariana', 'vegana'];
var ALLERGENI_AMMESSI = ['glutine', 'crostacei', 'uova', 'pesce', 'arachidi', 'soia', 'latte', 'frutta a guscio',
  'sedano', 'senape', 'sesamo', 'solfiti', 'lupini', 'molluschi'];

function doPost(e) {
  try {
    var dati = JSON.parse(e.postData.contents);

    // Campo trappola per i bot: una persona non lo vede e non lo compila.
    if (dati.sito_web) return risposta({ ok: true });

    var errore = controlla(dati);
    if (errore) return risposta({ ok: false, errore: errore });

    var id = Utilities.getUuid().slice(0, 8);
    var riga = [
      new Date(),
      id,
      pulisci(dati.nome, 80),
      pulisci(dati.cognome, 80),
      pulisci(dati.email, 120).toLowerCase(),
      pulisci(dati.telefono, 30),
      filtra(dati.obiettivi, OBIETTIVI_AMMESSI).join(', '),
      filtra(dati.allergie, ALLERGENI_AMMESSI).join(', '),
      pulisci(dati.cosa_ti_piace, 600),
      pulisci(dati.cosa_non_ti_piace, 600),
      pulisci(dati.altre_esigenze, 600),
      dati.consenso_privacy === true ? 'sì' : 'no',
      dati.consenso_marketing === true ? 'sì' : 'no',
      '', // avvio_claude
      'nuovo'
    ];

    var foglio = SpreadsheetApp.getActive().getSheetByName(SCHEDA_RISPOSTE);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    var numeroRiga;
    try {
      foglio.appendRow(riga);
      numeroRiga = foglio.getLastRow();
    } finally {
      lock.releaseLock();
    }

    var avvio = avviaClaude('Nuova risposta alla riga ' + numeroRiga + ' (id ' + id + ').');
    foglio.getRange(numeroRiga, 14).setValue(avvio);

    return risposta({ ok: true });
  } catch (err) {
    console.error(err);
    return risposta({ ok: false, errore: 'Errore del server, riprova tra poco.' });
  }
}

// Risponde anche alle aperture dal browser, utile per controllare che lo script sia online.
function doGet() {
  return risposta({ ok: true, servizio: 'modulo NutriRider' });
}

function avviaClaude(testo) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('CLAUDE_FIRE_URL');
  var token = props.getProperty('CLAUDE_FIRE_TOKEN');
  if (!url || !token) return 'non configurato';

  try {
    var r = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + token,
        'anthropic-beta': 'experimental-cc-routine-2026-04-01',
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({ text: testo }),
      muteHttpExceptions: true
    });
    var codice = r.getResponseCode();
    if (codice >= 200 && codice < 300) return 'ok ' + Utilities.formatDate(new Date(), 'Europe/Rome', 'HH:mm:ss');
    // 429 = troppi avvii in un'ora. La riga resta "nuovo" e la prende l'esecuzione successiva.
    return 'rifiutato ' + codice;
  } catch (err) {
    return 'errore rete';
  }
}

function controlla(d) {
  if (!pulisci(d.nome, 80)) return 'Scrivi il tuo nome.';
  if (!pulisci(d.cognome, 80)) return 'Scrivi il tuo cognome.';
  var email = pulisci(d.email, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Controlla l\'indirizzo email.';
  if (d.consenso_privacy !== true) return 'Serve il consenso al trattamento dei dati.';
  return '';
}

function pulisci(valore, max) {
  if (valore === undefined || valore === null) return '';
  var s = String(valore).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
  // Evita che un testo che inizia con = + - @ venga letto dal foglio come formula.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function filtra(lista, ammessi) {
  if (!Array.isArray(lista)) return [];
  return lista.filter(function (v) { return ammessi.indexOf(v) !== -1; });
}

function risposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Da lanciare a mano dall'editor per provare l'avvio di Claude senza passare dal modulo. */
function provaAvvioClaude() {
  console.log(avviaClaude('Prova di avvio manuale dall\'editor Apps Script.'));
}
