// Rascunho da oferta, montado só com as respostas do briefing: nenhuma frase traz fato que o
// cliente não deu. Segue a estrutura da oferta da Craftomakers (valor = oportunidade − risco): o
// que o cliente ganha, e as provas que tiram o medo de contratar. O que não tem base vai para
// "O que falta", com a dica do que fazer. Quem lê é o dono do negócio, por isso "seu cliente".

const filled = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));

// Texto livre do cliente, sem a pontuação final (a frase põe o ponto).
const bare = (v) => String(v).trim().replace(/[.!;,\s]+$/, "");

// Troca "Outro" pelo que a pessoa escreveu em "Qual outro?".
function list(data, id) {
  return [].concat(data[id] || []).map((v) => (v === "Outro" || v === "Outra" ? data[`${id}_outro`] : v)).filter(filled).map(bare);
}

// "a, b e c", com a primeira letra de cada item em minúscula.
const low = (v) => v.charAt(0).toLowerCase() + v.slice(1);
function join(items) {
  const l = items.map(low);
  return l.length > 1 ? `${l.slice(0, -1).join(", ")} e ${l.at(-1)}` : l[0] || "";
}

// O que a pessoa faz antes de começar, dito como coisa e não em primeira pessoa.
const CARE = {
  "Visito e meço": "visita e medição",
  "Mostro um desenho ou projeto": "desenho ou projeto para aprovar",
  "Detalho o orçamento": "orçamento detalhado",
  "Faço amostra ou teste": "amostra ou teste",
  "Combino tudo por escrito": "tudo combinado por escrito",
};

// O id da resposta de uma dúvida do FAQ, pelo nome da opção (o briefing usa o mesmo).
export const answerId = (id, option) => `${id}_r_${option.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

export function buildOffer(data) {
  const blocks = [];
  const missing = [];
  const add = (title, items) => { const real = items.filter(Boolean); if (real.length) blocks.push({ title, items: real }); };

  // O topo: a marca, o slogan e a chamada (a frase que abre o site), se o cliente tiver. Sem slogan, o
  // subtítulo usa o que o cliente ganha, ou o que o negócio faz.
  const h1 = filled(data.nome) ? bare(data.nome) : "";
  const h2 = [data.slogan, data.ganha, data.frase].filter(filled).map(bare)[0] || "";
  if (!h1) missing.push("Marca: diga o nome da marca.");
  const call = filled(data.chamada) ? data.chamada.trim() : "";

  // O que o negócio oferece, um item por linha.
  add("O que você oferece", String(data.oferece || "").split(/\n+/).map(bare).filter(Boolean));
  if (!filled(data.slogan)) missing.push("Subtítulo: sem slogan, usamos o que o cliente ganha. Se tiver um slogan, ele entra aqui.");

  // Oportunidade: o futuro bom que o cliente compra.
  const when = list(data, data.gatilho?.length ? "gatilho" : "gatilho_empresa").filter((v) => v !== "Indicação de outro profissional");
  add("O que seu cliente ganha", [
    filled(data.ganha) && bare(data.ganha) !== h2 && `${bare(data.ganha)}.`,
    list(data, "futuro").length && `No fim, seu cliente ${join(list(data, "futuro"))}.`,
    when.length && `Quando te procuram: ${join(when)}.`,
  ]);

  // Prova social.
  const testimony = filled(data.depoimento) ? data.depoimento.trim() : "";
  add("O que seus clientes dizem", [
    data.google === "Sim" && filled(data.google_nota) && `Nota no Google: ${bare(data.google_nota)}.`,
    testimony && `“${testimony.length > 400 ? `${testimony.slice(0, 400)}…` : testimony}”`,
    list(data, "elogios").length && `O que mais elogiam: ${join(list(data, "elogios"))}.`,
  ]);
  if (data.google === "Sim" && !filled(data.google_nota)) {
    missing.push("Prova de clientes: informe a nota e o número de avaliações no Google.");
  } else if (data.google !== "Sim" && !testimony) {
    missing.push("Prova de clientes: peça a 2 ou 3 clientes uma avaliação no Google ou um print de mensagem elogiando.");
  }

  // Autoridade. "Menos de 1 ano" e "Até 10" enfraquecem a oferta e ficam de fora.
  add("Quem faz", [
    filled(data.atende) && `Quem atende: ${bare(data.atende)}.`,
    filled(data.anos) && data.anos !== "Menos de 1 ano" && `${data.anos} de experiência.`,
    {
      "10 a 50": "10 a 50 clientes atendidos.",
      "51 a 200": "Mais de 50 clientes atendidos.",
      "Mais de 200": "Mais de 200 clientes atendidos.",
    }[data.atendidos],
    data.formacao === "Sim" && filled(data.formacao_qual) && `Formação e registro: ${bare(data.formacao_qual)}.`,
    data.empresas === "Sim" && filled(data.empresas_quais) && `Empresas atendidas: ${bare(data.empresas_quais)}.`,
    data.parceiros === "Sim" && filled(data.parceiros_quais) && `Parceiros: ${[].concat(data.parceiros_quais).map((p) => bare(p.nome || p)).filter(Boolean).join(", ")}.`,
    filled(data.diferencial) && `Diferencial: ${bare(data.diferencial)}.`,
  ]);
  if (data.anos === "Menos de 1 ano" && data.formacao !== "Sim" && data.empresas !== "Sim") {
    missing.push("Experiência: mostre fotos dos primeiros trabalhos e conte como você começou.");
  }

  // Prova lógica: o método.
  const care = list(data, "cuidado").map((v) => CARE[v] || low(v));
  add("Como funciona", [
    list(data, "fluxo").length && `Passo a passo: ${low(list(data, "fluxo")[0])}.`,
    care.length && `Antes de começar: ${join(care)}.`,
  ]);

  // Garantia.
  const timed = data.garantia === "Dou garantia por um prazo";
  add("Garantia", [
    {
      "Ajusto até ficar bom": "Ajustes até ficar como seu cliente quer.",
      "Devolvo o dinheiro": "Dinheiro de volta se seu cliente não gostar.",
    }[data.garantia],
    timed && filled(data.garantia_tempo) && `Garantia de ${bare(data.garantia_tempo)}.`,
  ]);
  if (timed && !filled(data.garantia_tempo)) missing.push("Garantia: diga o prazo.");
  if (data.garantia === "Não tenho garantia") {
    missing.push("Garantia: um ajuste sem custo ou um prazo de garantia tira o medo de contratar.");
  }

  // Respostas das dúvidas: viram o FAQ do site.
  const unanswered = [].concat(data.duvidas || []).filter((o) => o !== "Outro" && !filled(data[answerId("duvidas", o)]));
  if (unanswered.length) missing.push(`Dúvidas: escreva como você responde sobre ${join(unanswered)}. Vira a seção de perguntas frequentes.`);

  // O próximo passo, com o contato.
  add("Próximo passo", [filled(data.acao) && (filled(data.link) ? `${data.acao}: ${bare(data.link)}.` : `${data.acao}.`)]);

  return { h1, h2, call, blocks, missing };
}
