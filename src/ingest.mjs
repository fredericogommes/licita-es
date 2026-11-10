// Coleta de editais do PNCP para um intervalo de datas e conjunto de modalidades.
// Uso:
//   node src/ingest.mjs --de 2026-11-01 --ate 2026-11-10
//   node src/ingest.mjs --de 2026-11-01 --ate 2026-11-10 --modalidades 6,8 --uf MG
import { listarTudoPorPublicacao, toPncpDate } from './pncp.mjs';
import { normalizarContratacao } from './normalize.mjs';
import { salvarEditais, carregarEditais, DATA_PATH } from './store.mjs';
import { MODALIDADES_PADRAO, nomeModalidade } from './modalidades.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) { a[k.slice(2)] = argv[i + 1]; i++; }
  }
  return a;
}

function hojeISO() { return new Date().toISOString().slice(0, 10); }

async function main() {
  const args = parseArgs(process.argv);
  const de = args.de ?? hojeISO();
  const ate = args.ate ?? de;
  const modalidades = args.modalidades
    ? args.modalidades.split(',').map((s) => Number(s.trim()))
    : MODALIDADES_PADRAO;
  const uf = args.uf;
  const municipioIbge = args.municipio;

  console.log(`Coletando editais do PNCP: ${de} a ${ate}`);
  console.log(`Modalidades: ${modalidades.map((m) => `${m} (${nomeModalidade(m)})`).join(', ')}`);
  if (uf) console.log(`UF: ${uf}`);

  const dataInicial = toPncpDate(de);
  const dataFinal = toPncpDate(ate);

  const porId = new Map();
  // Se --merge, acumula sobre o que já foi coletado antes.
  if (args.merge) {
    for (const e of await carregarEditais()) porId.set(e.id, e);
    console.log(`Base atual: ${porId.size} editais (modo --merge).`);
  }

  for (const codigoModalidadeContratacao of modalidades) {
    const crus = await listarTudoPorPublicacao(
      { dataInicial, dataFinal, codigoModalidadeContratacao, uf, codigoMunicipioIbge: municipioIbge },
      {
        onPagina: ({ pagina, total, registros, recebidos }) =>
          process.stdout.write(`\r  modalidade ${codigoModalidadeContratacao}: página ${pagina}/${total ?? '?'} (${recebidos}/${registros ?? '?'})   `),
      },
    );
    process.stdout.write('\n');
    for (const c of crus) {
      const e = normalizarContratacao(c);
      porId.set(e.id, e); // numeroControlePNCP é único: dedup automático
    }
  }

  const editais = [...porId.values()];
  await salvarEditais(editais);
  console.log(`\nTotal: ${editais.length} editais salvos em ${DATA_PATH}`);
}

main().catch((e) => { console.error('\nErro:', e.message); process.exit(1); });
