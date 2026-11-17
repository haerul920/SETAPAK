/** Membuat data/wikidata-heritage-lite.json dari data/wikidata-heritage.json. Dijalankan otomatis oleh `pnpm wikidata`. */
import { writeTracesLite } from "./lib/traces-lite";

console.log(`${writeTracesLite()} jejak ringan ditulis ke data/wikidata-heritage-lite.json`);
