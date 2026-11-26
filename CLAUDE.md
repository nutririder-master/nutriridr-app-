# Nutririder, app per l'evento: contesto di progetto

Questo file è il punto della situazione. Va letto all'inizio di ogni sessione e aggiornato ogni volta che cambia qualcosa (decisioni, lavoro fatto, domande aperte).

## Il progetto

Il cliente è Nutririder. Il founder si chiama Jordan. Noi (l'agenzia) costruiamo uno strumento da usare durante un evento.

Il flusso richiesto:

1. Il visitatore scansiona un QR e apre una pagina web.
2. Inserisce nome, cognome e contatto (email, eventualmente telefono).
3. Scrive le sue preferenze alimentari, cosa non gli piace e le sue necessità. Le necessità vanno mappate con Jordan: per esempio essere in forma, mangiare cibi che fanno bene al cuore, dieta ipocalorica, chetogenica.
4. Preme invia. Lato nostro i dati finiscono in un foglio (Google Sheets, al posto di Excel) con nome, cognome, contatti e risposte.
5. Lato visitatore arrivano i due piatti Nutririder più adatti a lui. La lista dei piatti la fornisce Nutririder.
6. Lo stesso risultato arriva via email, con una call to action in fondo sul tema "ti ricordi cosa hai mangiato ieri a pranzo?".

Vincoli: precisione quasi massima, zero budget, niente API a pagamento di modelli AI.

## Decisioni prese

- Il risultato non deve per forza comparire subito sul telefono. Va bene che arrivi via email qualche tempo dopo (decisione del 25/11/2026).
- Gli artefatti di Claude con chiamate a Claude dentro la pagina non vanno bene: usano l'account Claude di chi visita la pagina, e i visitatori dell'evento non ce l'hanno.
- Flusso confermato il 26/11/2026: modulo su Cloudflare (pagina statica in `public/index.html`), che manda i dati a uno script Google Apps Script collegato al foglio. Lo script scrive la riga nella scheda Risposte con stato "nuovo" e chiama subito l'attività Claude tramite il suo indirizzo API. L'attività legge le righe in attesa, sceglie i due piatti, li scrive sul foglio e manda l'email con Brevo. Niente Worker Cloudflare: il suo lavoro lo fa Apps Script, che l'utente preferisce perché resta tutto attorno al foglio.
- L'elaborazione deve partire su richiesta, non ogni ora (richiesta del 25/11/2026). Le attività pianificate a orario non scendono sotto l'ora, quindi si usa il trigger API: POST a `https://api.anthropic.com/v1/claude_code/routines/<trigger-id>/fire` con token bearer dell'attività, header `anthropic-beta: experimental-cc-routine-2026-04-01` e `anthropic-version: 2023-06-01`, corpo `{"text": "..."}` facoltativo. Limiti dichiarati nella documentazione: 30 avvii all'ora per singola attività, 100 all'ora per account, funzione sperimentale. Ogni avvio è una sessione nuova (qualche minuto di avvio) e consuma l'abbonamento. Ogni esecuzione deve quindi lavorare tutti i contatti in attesa, non solo l'ultimo, e un'esecuzione oraria fa da rete di sicurezza per gli avvii rifiutati.
- Alternativa tenuta di riserva: algoritmo a regole (dizionario di sinonimi, negazioni, tolleranza ai refusi, filtro rigido sugli allergeni e punteggio sugli obiettivi) dentro Apps Script, con risultato immediato e senza dipendere da Claude.
- Allergie e intolleranze vanno raccolte come caselle da spuntare, non solo come testo libero: un errore lì è un rischio per la salute. I piatti con un allergene dichiarato vanno esclusi in modo rigido.
- Le email ai visitatori partono da un indirizzo Nutririder, mai da quello dell'agenzia (decisione del 25/11/2026). L'agenzia lavora dietro le quinte. L'invio si fa con Brevo, su un account che l'utente crea per Nutririder (proposta del 25/11/2026). Il mittente deve stare su un dominio Nutririder autenticato su Brevo, non su @gmail.com. Piano gratuito: 300 email al giorno. Le chiavi API non passano mai dalla chat: per Claude si salvano con il modulo sicuro delle credenziali, Il token dell'attività Claude si salva nelle Proprietà script di Apps Script, non nel codice.
- Privacy: allergie ed esigenze di salute sono dati sanitari per il GDPR. Servono un consenso esplicito al trattamento e un consenso separato per il marketing. L'informativa deve dire che le risposte vengono elaborate con Claude (Anthropic).

## Repository

- Repository di lavoro: `nutririder-master/nutriridr-app-` (il trattino finale fa parte del nome). Tutto il lavoro va pubblicato qui.
- Il push funziona dal 25/11/2026, dopo che l'utente ha sistemato i ruoli su GitHub.
- Struttura: progetto Cloudflare Workers con soli file statici. `wrangler.jsonc` pubblica la cartella `public/`. All'inizio c'era solo `public/index.html`, una pagina segnaposto "Nutririder App, In arrivo...".
- Il sito ha il noindex dal 25/11/2026: meta robots in `public/index.html` e header `X-Robots-Tag` in `public/_headers`. Nessun `robots.txt` che blocca la scansione, altrimenti i motori non vedono il noindex. Ogni nuova pagina deve avere lo stesso meta tag.
- Pubblicazione: Cloudflare Workers Builds (worker "app") costruisce e pubblica da solo ogni push su `main`. Lo stato si vede nei check del commit su GitHub (`gh api repos/nutririder-master/nutriridr-app-/commits/<sha>/check-runs`). Il 26/11/2026 il modulo è stato pubblicato su `main` (commit abf382d), ancora senza `ENDPOINT`.
- `beecogh/nutririder-app` è un vecchio repository vuoto, da non usare più.
- Branch: `main` è la versione da pubblicare, cioè il prodotto finito. Il lavoro si fa nel branch `contesto-progetto`. Questo `CLAUDE.md` serve solo a Claude per costruire: resta nel branch di lavoro e non va mai portato su `main`. Quando si pubblica su `main`, si portano solo i file del prodotto.

## Foglio Google

- "Database app nutririder": `118uNUi9MdJXpmeo85UPwosVJh6xVQ0Ru35Lfmzm0HNY`. Lingua italiana e fuso Europe/Rome (impostati il 26/11/2026, prima era es_MX). L'account dell'agenzia lo legge e lo modifica tramite il connettore Google Sheets.
- Scheda Risposte, colonne A-U: ricevuta_il, id, nome, cognome, email, telefono, obiettivi (i profili), allergie, cosa_ti_piace, cosa_non_ti_piace, altre_esigenze, consenso_privacy, consenso_marketing, avvio_claude, stato, piatto_1, piatto_2, spiegazione, email_inviata_il, note, cosa_complica_il_pranzo. Stati: nuovo, in lavorazione, pronta (piatti scelti, email non inviata), inviata, errore.
- Scheda Piatti, colonne A-M: id, nome, descrizione, ingredienti, allergeni, adatto_a, kcal, proteine_g, carboidrati_g, grassi_g, attivo, note, si_mangia_freddo. Dal 26/11/2026 contiene i 20 piatti veri (N01-N20) del PDF di Nutririder "NutriRider_piatti": 10 profili con 2 piatti ciascuno, menù invernale gennaio-febbraio. Il PDF dà solo i nomi: ingredienti, allergeni e tag `adatto_a` aggiuntivi li ho dedotti io, e sono segnati "da confermare con Nutririder" nella colonna note. kcal e macro sono vuoti.
- Scheda Impostazioni: invio_attivo (ora "no": Claude sceglie i piatti ma non manda email), email_test (se compilato, tutte le email vanno lì), mittente_email (info@nutririder.com, da confermare che sia attivo), mittente_nome (Nutririder), oggetto_email, link_cta (https://nutririder.com), logo_url (vuoto finché il modulo non è online).
- Codici condivisi tra modulo, script e foglio. Profili (colonna obiettivi): vegano, vegetariano, sportivo, digeribile, gravidanza, alta densità, ridotta densità. I profili Nutririder "celiaco", "intollerante al lattosio" e "privo di allergeni" passano dalle caselle allergie; nei piatti sono i tag senza glutine, senza lattosio, privo di allergeni. Cosa complica il pranzo (dalle "necessità generiche" del PDF): non posso riscaldare, pausa breve, budget limitato, non riesco a prepararlo, non posso uscire, non trovo cosa mi soddisfa, voglio sapere cosa mangio, voglio decidere prima. Allergeni (i 14 UE): glutine, crostacei, uova, pesce, arachidi, soia, latte, frutta a guscio, sedano, senape, sesamo, solfiti, lupini, molluschi.

- Scheda per Jordan: "Nutririder, scheda piatti da completare", `1zIz1vm4_d-LIGWMvQyfe6alOqQQZ8JZcA3AtHxPjRog`, nella cartella Drive del cliente. Creata il 26/11/2026 perché Jordan ha chiesto a noi di preparare il file da compilare. Scheda "Come compilare" con le istruzioni e scheda "Piatti": 20 piatti con le nostre ipotesi su ingredienti e allergeni (una casella per ognuno dei 14 allergeni), colonne per kcal e macro, "si mangia freddo", "adatto in gravidanza", "confermato", "note per noi", più 4 righe vuote (N21-N24) per i piatti che coprono le combinazioni scoperte. Quando torna compilata, i dati vanno riportati nella scheda Piatti del database (allergeni da caselle a testo, tag `adatto_a` da ricalcolare).

## File del progetto

- `public/index.html`: il modulo. La costante `ENDPOINT` nello script va riempita con l'indirizzo dell'applicazione web Apps Script.
- `public/_headers`: noindex.
- `public/logo.png`: logo Nutririder.
- `apps-script/Codice.gs`: lo script da incollare nel foglio (Estensioni > Apps Script) e pubblicare come applicazione web. Legge `CLAUDE_FIRE_URL` e `CLAUDE_FIRE_TOKEN` dalle Proprietà script.
- `automazione/istruzioni-attivita.md`: le istruzioni dell'attività Claude. Se cambiano, vanno aggiornate anche nell'attività (update_trigger).
- Attività Claude: "Nutririder, piatti per i visitatori", id `trig_01AstyDXpML5UUuo7fa7kALh`, creata il 26/11/2026, senza orario (parte solo su chiamata), una sessione nuova a ogni avvio. Il 26/11/2026 l'utente ha aggiunto il connettore Google Sheets e il trigger API con token (indirizzo `https://api.anthropic.com/v1/claude_code/routines/trig_01AstyDXpML5UUuo7fa7kALh/fire`). Prova di avvio da Apps Script alle 13:40 riuscita: la sessione ha letto il foglio con il connettore e non ha trovato righe. Le istruzioni chiedono di rispondere in italiano.

## Brand Nutririder

Fonti: cartella Drive del cliente `1CpgttkT5fuhUu_nmMAvY2lqSOOJqY2d7` (documento "XC_MediaKit_Nutririder", la cartella "Logo pack" era vuota il 26/11/2026) e il sito nutririder.com, che il media kit indica come riferimento visivo per tutti i materiali.

- Il nome si scrive Nutririder: una parola, solo la prima lettera maiuscola. Mai NutriRider.
- Payoff: "Mangiare bene, anche senza tempo."
- Contatti pubblici: info@nutririder.com, nutririder.com. Founder: Leo Giordan Kenfack Gouadjio (Jordan). Sede Siena. Startup del Batch 1 di X Combinator.
- Stadio: pre-pilot, nessun cliente, niente piatti reali in vendita. Il dietista non c'è ancora: mai scrivere che i piatti sono pensati o approvati da un dietista.
- Tono: semplice con base scientifica, frasi sotto le 20 parole, "tu" verso le persone. Niente promesse di dimagrimento o benessere generico. Numeri solo con fonte.
- Font: Poppins (titoli, 500/600/700) e Lora (testo, 400/600), da Google Fonts.
- Colori del sito: sfondo `#FAF4E8`, fascia `#F3EADA`, superfici `#FFFFFF`, verde `#2F6B4F`, verde chiaro `#8FB59F`, verde tenue `#E6EEE8`, arancio `#F28C38`, arancio tenue `#FCE3CC`, testo `#1F2A24`, testo secondario `#4F5A52`, linee `#E7DFCF`. Nel media kit è aperta l'ipotesi di un accento giallo al posto dell'arancio.
- Stile: molto bianco e forme pulite, il colore per le persone e i loro pasti. Niente foto stock di piatti.
- Logo: `public/logo.png`, 225x120, preso dal sito.

## Regole di scrittura per i testi rivolti alle persone

Valgono per pagine, email, documenti, in italiano e in inglese.

- Niente trattini lunghi o medi come incisi, niente puntini centrali, virgolette e apostrofi dritti.
- Niente elenchi con etichetta in grassetto seguita dai due punti. Liste solo quando il contenuto è davvero una lista.
- Niente maiuscole a ogni parola nei titoli, niente emoji decorative, niente righe di separazione.
- Evitare "non solo X, ma anche Y", "non è X, è Y", terzetti di aggettivi, frasi chiuse da un gerundio di commento, chiusure riassuntive, attribuzioni vaghe.
- Parole da evitare: cruciale, fondamentale, chiave come aggettivo, panorama, scenario, approfondire, valorizzare, sottolineare, evidenziare, robusto, dinamico, coinvolgente, seamless, leverage e simili.
- Dettagli concreti al posto degli aggettivi. Se manca un'informazione, chiederla.

## Lavoro fatto

- 25/11/2026: analisi di fattibilità, confronto tra algoritmo a regole e attività pianificata Claude, verifica dei limiti degli artefatti, clonazione del repository, verifica dell'accesso in scrittura, creazione di questo file. Deciso che `CLAUDE.md` resta fuori da `main` e che le email partono da un indirizzo Nutririder. Impostato il noindex e pubblicato su `main`. Ricevuto il foglio Google da usare come database. Verificato nella documentazione il trigger API delle attività pianificate.
- 26/11/2026: confermato il flusso. Preparato il foglio (tre schede, piatti di esempio), scritto il modulo, lo script Apps Script e le istruzioni dell'attività, creata l'attività Claude. Ricevuta la cartella del brand: modulo ridisegnato sullo stile del sito (font, colori, logo), nome corretto in Nutririder ovunque, istruzioni dell'email allineate al tono del media kit. Ricevuti i 20 piatti veri: caricati sul foglio, modulo, script e istruzioni allineati ai 10 profili, aggiunta la domanda su cosa complica il pranzo.

## Domande aperte

- Ingredienti completi e allergeni dei 20 piatti, confermati da Nutririder, e se possibile kcal e macro: in attesa della scheda per Jordan compilata.
- Combinazioni senza piatti adatti (calcolo del 26/11/2026): sportivo + vegetariano nessun piatto col profilo, alta densità + glutine o latte nessuno, gravidanza + glutine o pesce uno solo, vegano o vegetariano + celiaco tre. Servono 3-4 piatti in più o si accetta il "da gestire a mano".
- Quante persone si aspettano all'evento e la data.
- Autenticazione del dominio nutririder.com su Brevo. info@nutririder.com è attivo?
- Qual è l'indirizzo pubblico del sito (dominio o workers.dev)? Serve per il QR e per `logo_url`.
- Piano Claude dell'account che esegue l'attività: con molti visitatori i limiti d'uso contano.
- Informativa privacy completa di Nutririder (ragione sociale, contatti del titolare). Nel modulo c'è un testo breve provvisorio.
- Link per il bottone in fondo all'email (link_cta).

## Prossimi passi

1. Fatto il 26/11/2026: connettore, token, script incollato nel foglio con le Proprietà script, prova di avvio riuscita. Lo script è installato con un account Google diverso da quello predefinito nel browser dell'utente (l'altro dava "Impossibile aprire il file").
2. L'utente pubblica lo script come applicazione web (Esegui come: Me, Chi ha accesso: Chiunque) e passa l'indirizzo `/exec`, più l'indirizzo della pagina del modulo.
3. Inserire l'indirizzo in `ENDPOINT` e pubblicare su `main` (il modulo è già online, manca solo il collegamento).
4. Test con `invio_attivo` su "no": invio dal modulo, riga sul foglio, avvio di Claude, piatti scritti.
5. Chiave Brevo salvata con il modulo sicuro delle credenziali (host api.brevo.com, header api-key), poi test con `email_test` compilato.
6. Conferma ingredienti dei piatti, test con frasi realistiche, rete di sicurezza oraria prima dell'evento, QR con il link definitivo.
