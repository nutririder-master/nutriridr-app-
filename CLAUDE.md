# NutriRider, app per l'evento: contesto di progetto

Questo file è il punto della situazione. Va letto all'inizio di ogni sessione e aggiornato ogni volta che cambia qualcosa (decisioni, lavoro fatto, domande aperte).

## Il progetto

Il cliente è NutriRider. Il founder si chiama Jordan. Noi (l'agenzia) costruiamo uno strumento da usare durante un evento.

Il flusso richiesto:

1. Il visitatore scansiona un QR e apre una pagina web.
2. Inserisce nome, cognome e contatto (email, eventualmente telefono).
3. Scrive le sue preferenze alimentari, cosa non gli piace e le sue necessità. Le necessità vanno mappate con Jordan: per esempio essere in forma, mangiare cibi che fanno bene al cuore, dieta ipocalorica, chetogenica.
4. Preme invia. Lato nostro i dati finiscono in un foglio (Google Sheets, al posto di Excel) con nome, cognome, contatti e risposte.
5. Lato visitatore arrivano i due piatti NutriRider più adatti a lui. La lista dei piatti la fornisce NutriRider.
6. Lo stesso risultato arriva via email, con una call to action in fondo sul tema "ti ricordi cosa hai mangiato ieri a pranzo?".

Vincoli: precisione quasi massima, zero budget, niente API a pagamento di modelli AI.

## Decisioni prese

- Il risultato non deve per forza comparire subito sul telefono. Va bene che arrivi via email qualche tempo dopo (decisione del 25/11/2026).
- Gli artefatti di Claude con chiamate a Claude dentro la pagina non vanno bene: usano l'account Claude di chi visita la pagina, e i visitatori dell'evento non ce l'hanno.
- Direzione attuale (proposta del 25/11/2026, in attesa di conferma): modulo su Cloudflare, un Worker che salva il visitatore su Brevo e fa partire subito un'attività pianificata Claude tramite il suo endpoint API. L'attività legge da Brevo i contatti nuovi, li copia sul foglio Google, sceglie i due piatti e manda l'email con un template Brevo dal mittente NutriRider. Così non si pagano token e il testo libero viene capito senza dizionario di parole.
- L'elaborazione deve partire su richiesta, non ogni ora (richiesta del 25/11/2026). Le attività pianificate a orario non scendono sotto l'ora, quindi si usa il trigger API: POST a `https://api.anthropic.com/v1/claude_code/routines/<trigger-id>/fire` con token bearer dell'attività, header `anthropic-beta: experimental-cc-routine-2026-04-01` e `anthropic-version: 2023-06-01`, corpo `{"text": "..."}` facoltativo. Limiti dichiarati nella documentazione: 30 avvii all'ora per singola attività, 100 all'ora per account, funzione sperimentale. Ogni avvio è una sessione nuova (qualche minuto di avvio) e consuma l'abbonamento. Ogni esecuzione deve quindi lavorare tutti i contatti in attesa, non solo l'ultimo, e un'esecuzione oraria fa da rete di sicurezza per gli avvii rifiutati.
- Alternativa tenuta di riserva: algoritmo a regole (dizionario di sinonimi, negazioni, tolleranza ai refusi, filtro rigido sugli allergeni e punteggio sugli obiettivi) dentro il Worker Cloudflare, con risultato immediato e senza dipendere da Claude.
- Allergie e intolleranze vanno raccolte come caselle da spuntare, non solo come testo libero: un errore lì è un rischio per la salute. I piatti con un allergene dichiarato vanno esclusi in modo rigido.
- Le email ai visitatori partono da un indirizzo NutriRider, mai da quello dell'agenzia (decisione del 25/11/2026). L'agenzia lavora dietro le quinte. L'invio si fa con Brevo, su un account che l'utente crea per NutriRider (proposta del 25/11/2026). Il mittente deve stare su un dominio NutriRider autenticato su Brevo, non su @gmail.com. Piano gratuito: 300 email al giorno. Le chiavi API non passano mai dalla chat: per Claude si salvano con il modulo sicuro delle credenziali, per il Worker come secret Cloudflare. Due chiavi separate.
- Privacy: allergie ed esigenze di salute sono dati sanitari per il GDPR. Servono un consenso esplicito al trattamento e un consenso separato per il marketing. L'informativa deve dire che le risposte vengono elaborate con Claude (Anthropic).

## Repository

- Repository di lavoro: `nutririder-master/nutriridr-app-` (il trattino finale fa parte del nome). Tutto il lavoro va pubblicato qui.
- Il push funziona dal 25/11/2026, dopo che l'utente ha sistemato i ruoli su GitHub.
- Struttura: progetto Cloudflare Workers con soli file statici. `wrangler.jsonc` pubblica la cartella `public/`. All'inizio c'era solo `public/index.html`, una pagina segnaposto "Nutririder App, In arrivo...".
- Colori del brand presi dalla pagina segnaposto: sfondo crema `#FAF4E8`, verde `#2F6B4F`, arancio `#F28C38`.
- Il sito ha il noindex dal 25/11/2026: meta robots in `public/index.html` e header `X-Robots-Tag` in `public/_headers`. Nessun `robots.txt` che blocca la scansione, altrimenti i motori non vedono il noindex. Ogni nuova pagina deve avere lo stesso meta tag.
- `beecogh/nutririder-app` è un vecchio repository vuoto, da non usare più.
- Branch: `main` è la versione da pubblicare, cioè il prodotto finito. Il lavoro si fa nel branch `contesto-progetto`. Questo `CLAUDE.md` serve solo a Claude per costruire: resta nel branch di lavoro e non va mai portato su `main`. Quando si pubblica su `main`, si portano solo i file del prodotto.

## Foglio Google

- "Database app nutririder": `118uNUi9MdJXpmeo85UPwosVJh6xVQ0Ru35Lfmzm0HNY`. Il 25/11/2026 era vuoto, con una sola scheda chiamata "Hoja 1" (impostazione in spagnolo). L'account dell'agenzia lo legge tramite il connettore Google Sheets.

## Regole di scrittura per i testi rivolti alle persone

Valgono per pagine, email, documenti, in italiano e in inglese.

- Niente trattini lunghi o medi come incisi, niente puntini centrali, virgolette e apostrofi dritti.
- Niente elenchi con etichetta in grassetto seguita dai due punti. Liste solo quando il contenuto è davvero una lista.
- Niente maiuscole a ogni parola nei titoli, niente emoji decorative, niente righe di separazione.
- Evitare "non solo X, ma anche Y", "non è X, è Y", terzetti di aggettivi, frasi chiuse da un gerundio di commento, chiusure riassuntive, attribuzioni vaghe.
- Parole da evitare: cruciale, fondamentale, chiave come aggettivo, panorama, scenario, approfondire, valorizzare, sottolineare, evidenziare, robusto, dinamico, coinvolgente, seamless, leverage e simili.
- Dettagli concreti al posto degli aggettivi. Se manca un'informazione, chiederla.

## Lavoro fatto

- 25/11/2026: analisi di fattibilità, confronto tra algoritmo a regole e attività pianificata Claude, verifica dei limiti degli artefatti, clonazione del repository, verifica dell'accesso in scrittura, creazione di questo file. Deciso che `CLAUDE.md` resta fuori da `main` e che le email partono da un indirizzo NutriRider. Impostato il noindex e pubblicato su `main`. Ricevuto il foglio Google da usare come database. Verificato nella documentazione il trigger API delle attività pianificate.

## Domande aperte

- La lista dei piatti NutriRider, con ingredienti, allergeni e, se ci sono, kcal e macro.
- Le necessità da mappare con Jordan.
- Quante persone si aspettano all'evento (serve per i limiti di invio email).
- Conferma del flusso con Brevo e trigger API.
- NutriRider ha un dominio suo, e qualcuno può modificarne i DNS per autenticarlo su Brevo?
- Il repository è collegato a Cloudflare con pubblicazione automatica da `main`?
- Piano Claude dell'account che esegue le attività: con molti visitatori i limiti d'uso contano.
- Data dell'evento.

## Prossimi passi

1. Pagina del modulo in `public/index.html`, nei colori del brand, pensata per il telefono, con noindex.
2. Worker Cloudflare: riceve il modulo, salva il contatto su Brevo, chiama il trigger API.
3. Foglio Google con due schede: "Risposte" e "Piatti" (i piatti modificabili dal team senza toccare codice).
4. Istruzioni dell'attività pianificata: leggere i contatti in attesa, escludere i piatti incompatibili, scegliere i due migliori, mandare l'email con Brevo, segnare il contatto come servito, aggiornare il foglio.
5. Test con frasi realistiche prima dell'evento, poi generazione del QR con il link definitivo.
