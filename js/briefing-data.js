// Perguntas do briefing, agrupadas por família, da mais fácil para a mais detalhada.
// A lista está em projetos/craftomakers/docs/briefing-perguntas.md.
// optional: pode ficar em branco; as outras precisam de resposta para avançar.
// when(respostas): a pergunta só aparece quando devolve true. from: as opções são as marcadas nessa
// outra pergunta. alt: uma caixa que responde no lugar do texto. help: passos que abrem no "?".
// optional também pode ser uma função das respostas. multi: várias respostas em etiquetas.
// answers: cada opção marcada abre "o que você responde?". list: sugestões enquanto digita.
// pairs: uma linha por item com dois campos (fields); choices faz do primeiro uma lista para escolher.
export const SUGGEST = "Não sei, sugiram";

const CLIENTES = ["Pessoas", "Empresas", "Escolas e instituições", "Governo"];
const principal = (d) => d.principal || (d.clientes.length === 1 ? d.clientes[0] : "");
const paraPessoas = (d) => ["", "Pessoas"].includes(principal(d));
// Imóveis (CRECI) e saúde (CFM, CRO, CRP): a Meta limita a segmentação por idade, gênero e distância.
const segmentaLivre = (d) => !/CRECI|CFM|CRO|CRP/.test(d.regras);
const anuncia = (d) => d.anunciar !== "Agora não";
const hasManual = (d) => d.manual === "Tenho manual de marca";
const hasBrand = (d) => d.manual === "Tenho logo e cores, sem manual";

// O link de cada rede precisa ser do site dela. handle: o link do perfil, para quem escreve só o @.
// Sem regra (Outra), basta um link.
const REDES = {
  Instagram: { hosts: ["instagram.com"], handle: "https://www.instagram.com/{}/" },
  Facebook: { hosts: ["facebook.com", "fb.com", "fb.me"], handle: "https://www.facebook.com/{}" },
  TikTok: { hosts: ["tiktok.com"], handle: "https://www.tiktok.com/@{}" },
  YouTube: { hosts: ["youtube.com", "youtu.be"], handle: "https://www.youtube.com/@{}" },
  LinkedIn: { hosts: ["linkedin.com"] },
  Pinterest: { hosts: ["pinterest.com", "pinterest.com.br", "pin.it"], handle: "https://br.pinterest.com/{}/" },
  Kwai: { hosts: ["kwai.com", "kwai.app"], handle: "https://www.kwai.com/@{}" },
};

export const SECTIONS = [
  { id: "negocio", title: "O que é o seu negócio", hint: "", qs: [
    { id: "natureza", t: "Seu negócio é…", type: "radio", opts: ["Comércio: vendo produtos", "Serviço: faço para o cliente", "Fabricação: produzo o que vendo", "Digital: app, curso ou software", "Agro", "Organização ou causa"] },
    { id: "ramo", t: "Em que ramo?", other: "Qual outro ramo?", type: "check", opts: ["Saúde", "Beleza", "Casa e construção", "Alimentação", "Moda", "Educação", "Jurídico e contábil", "Tecnologia", "Eventos", "Pets", "Imóveis", "Automotivo", "Fitness", "Outro"] },
    { id: "frase", t: "O que você vende ou faz, numa frase", type: "text", max: 160, ex: "O que você vende e para quem" },
    { id: "oferece", t: "Liste o que você vende ou faz", type: "textarea", ex: "Um por linha. Ex.: cozinhas, closets, banheiros" },
    { id: "onde", t: "Onde você atende o cliente?", type: "check", opts: ["No meu espaço", "Vou até o cliente", "Online", "Entrego ou envio"] },
    { id: "cidade", t: "Em quais cidades você atende?", type: "text", multi: true, ex: "Digite e escolha na lista", list: "data/cidades.json", when: (d) => d.onde.join() !== "Online" },
    { id: "regras", t: "Sua profissão tem regras de propaganda?", type: "radio", opts: ["Advocacia (OAB)", "Medicina (CFM)", "Odontologia (CRO)", "Psicologia (CRP)", "Imóveis (CRECI)", "Contabilidade (CFC)", "Outra", "Não"], when: (d) => ["Saúde", "Jurídico e contábil", "Imóveis", "Outro"].some((r) => d.ramo.includes(r)) },
  ] },
  { id: "cliente", title: "Para quem", hint: "", qs: [
    { id: "clientes", t: "Seus clientes são…", type: "check", opts: CLIENTES },
    { id: "principal", t: "Qual é o principal?", type: "radio", opts: CLIENTES, from: "clientes", when: (d) => d.clientes.length > 1 },
    { id: "decide", t: "Quem escolhe é quem usa?", type: "radio", opts: ["Sim", "Não, são os pais ou a família", "Não, é o dono ou o gerente", "Não, é um setor da empresa"] },
    { id: "gatilho", t: "Em que situação o cliente te procura? (até 3)", type: "check", max: 3, when: paraPessoas, opts: ["Uma mudança de vida (casa, casamento, filho)", "Um problema que apareceu", "Vontade de melhorar algo", "Uma data ou evento", "Precisa sempre (rotina)", "Indicação de outro profissional", "Outro"] },
    { id: "gatilho_empresa", t: "Em que situação o cliente te procura? (até 3)", type: "check", max: 3, when: (d) => !paraPessoas(d), opts: ["Está crescendo", "Algo está desorganizado ou dando prejuízo", "Exigência de lei ou de cliente", "Quer economizar", "Quer melhorar a imagem", "Outro"] },
    { id: "ganha", t: "O que o cliente quer resolver quando te procura?", type: "text", ex: "O problema ou o desejo que ele traz" },
  ] },
  { id: "filtro", title: "Quem não é seu cliente", hint: "", qs: [
    { id: "nao", t: "Quem você não quer atender?", type: "check", opts: ["Quem quer um serviço que eu não faço", "Quem só compara preço", "Quem precisa para ontem", "Quem é de fora da minha região", "Quem só quer uma ideia, sem contratar", "Quem não quer vir até mim ou quer tudo pelo WhatsApp", "Quem não é o meu tipo de cliente (pessoa ou empresa)", "Outro"] },
    { id: "antes", t: "O que precisa acontecer antes de fechar?", type: "check", opts: ["Uma conversa", "Uma visita", "Agendar com antecedência", "Pagar um sinal", "Nada"] },
    { id: "concorrentes", optional: true, t: "Com quem o cliente te compara?", type: "text", ex: "Outras lojas, quem vende pela internet, quem faz sozinho" },
    { id: "perde", optional: true, t: "Onde você perde cliente para os concorrentes?", type: "text", ex: "Preço, prazo, quem aparece primeiro no Google" },
  ] },
  { id: "dor", title: "O que o site resolve", hint: "", qs: [
    { id: "resolver", t: "O que você quer que o site resolva? (até 2)", type: "check", max: 2, opts: ["Pouca gente me encontra", "Só vivo de indicação", "O Instagram não traz cliente", "Chega contato que não é meu cliente", "Recebo contato, mas não fecha", "Não tenho onde mostrar meu trabalho", "Vou lançar algo novo", "Outro"] },
    { id: "hoje", optional: true, t: "Conte como isso acontece hoje", type: "textarea", ex: "De onde vêm seus clientes hoje e o que está faltando" },
  ] },
  { id: "diferencial", title: "Por que você", hint: "", qs: [
    { id: "diferencial", optional: true, t: "O que você faz que os outros não fazem?", type: "text", ex: "Um jeito de atender, uma garantia, um cuidado a mais" },
    { id: "elogios", t: "O que seus clientes mais elogiam? (até 3)", type: "check", max: 3, opts: ["Resultado bonito", "Escuta o que eu quero", "Cumpre prazo", "Explica tudo", "Resolve tudo por mim", "Atende rápido", "Conhece muito do assunto", "Outro"] },
    { id: "futuro", t: "Depois de te contratar, o que melhora para o cliente? (até 2)", type: "check", max: 2, opts: ["Ganha tempo", "Fica sem preocupação", "Fica mais bonito", "Ganha dinheiro", "Fica mais organizado", "Fica mais saudável", "Outro"] },
  ] },
  // A base da oferta, em perguntas simples: o cliente responde fatos, e o rascunho da oferta
  // (no Resultado e no PDF) é montado com eles.
  { id: "prova", title: "Sua prova", hint: "", qs: [
    { id: "google", t: "Você tem avaliações no Google?", type: "radio", opts: ["Sim", "Não"] },
    { id: "google_nota", parent: "google", t: "Qual a nota e quantas avaliações?", type: "text", ex: "5,0 com 23 avaliações", when: (d) => d.google === "Sim" },
    { id: "google_link", parent: "google", optional: true, t: "Link do seu perfil no Google", type: "url", ex: "Copie em Compartilhar, no Google Maps", when: (d) => d.google === "Sim" },
    { id: "depoimento", optional: true, t: "Algum cliente já te elogiou por mensagem? Cole aqui, com o nome dele", type: "textarea", ex: "Só de quem deixa publicar" },
    { id: "mostrar", t: "O que você quer mostrar no site?", type: "check", opts: ["Trabalhos prontos", "Antes e depois", "Produtos, materiais ou acabamentos", "O seu espaço (loja, escritório, consultório)", "Você e a equipe", "O trabalho sendo feito", "Clientes usando", "Outro"] },
    { id: "fotos", t: "Envie fotos e logo (link de uma pasta)", type: "url", ex: "Link da pasta, sem abrir para todos", alt: "Mando depois",
      help: ["Crie uma pasta no Google Drive, Dropbox ou OneDrive e coloque o logo e as fotos.", "Copie o link da pasta e cole aqui. Não precisa abrir a pasta para todos.", "A gente pede acesso pelo nosso e-mail. Você recebe um aviso e é só aprovar.", "Envie só fotos que você pode publicar."] },
  ] },
  { id: "experiencia", title: "Sua experiência", hint: "", qs: [
    { id: "atende", optional: true, t: "Quem atende o cliente? Nome e o que faz", type: "text", ex: "Iris, arquiteta" },
    { id: "anos", t: "Há quanto tempo você faz isso?", type: "radio", opts: ["Menos de 1 ano", "1 a 3 anos", "4 a 10 anos", "Mais de 10 anos"] },
    { id: "atendidos", t: "Quantos clientes você já atendeu, mais ou menos?", type: "radio", opts: ["Até 10", "10 a 50", "51 a 200", "Mais de 200"] },
    { id: "formacao", t: "Você tem formação, curso ou registro na área?", type: "radio", opts: ["Sim", "Não"] },
    { id: "formacao_qual", parent: "formacao", t: "Qual?", type: "text", ex: "Arquitetura e Urbanismo", when: (d) => d.formacao === "Sim" },
    { id: "empresas", t: "Já atendeu alguma empresa conhecida?", type: "radio", opts: ["Sim", "Não"] },
    { id: "empresas_quais", parent: "empresas", t: "Quais podem aparecer no site? (só as que autorizaram)", type: "text", ex: "Padaria Central, Hotel Sol", when: (d) => d.empresas === "Sim" },
    { id: "parceiros", t: "Você tem parceiros que podem aparecer no site?", type: "radio", opts: ["Sim", "Não"] },
    { id: "parceiros_quais", parent: "parceiros", t: "Quais? (só os que autorizaram)", type: "pairs", add: "Adicionar parceiro", fields: ["Nome", "Link do site ou Instagram"], when: (d) => d.parceiros === "Sim" },
  ] },
  { id: "funciona", title: "Como funciona", hint: "", qs: [
    { id: "fluxo", t: "Seu atendimento parece com qual?", type: "radio", opts: ["Conversa → proposta → execução", "Conversa → visita → proposta → execução", "Medição → projeto → produção → instalação", "Agenda → atendimento → retorno", "Pedido → entrega", "Demonstração → teste → contrato", "Baixa → instala → usa", "Outro"] },
    { id: "cuidado", t: "O que você faz antes de começar, para não dar errado?", type: "check", opts: ["Visito e meço", "Mostro um desenho ou projeto", "Detalho o orçamento", "Faço amostra ou teste", "Combino tudo por escrito", "Outro"] },
    { id: "garantia", t: "E se o cliente não gostar?", type: "radio", opts: ["Ajusto até ficar bom", "Devolvo o dinheiro", "Dou garantia por um prazo", "Não tenho garantia"] },
    { id: "garantia_tempo", parent: "garantia", t: "Garantia de quanto tempo?", type: "text", ex: "5 anos", when: (d) => d.garantia === "Dou garantia por um prazo" },
    { id: "desistem", optional: true, t: "Por que alguns desistem de fechar?", type: "check", opts: ["Prazo", "Desconfiança", "Comparou com outro", "Não entendeu o serviço", "Outro"] },
    { id: "duvidas", t: "O que mais te perguntam antes de fechar?", type: "check", answers: true, opts: ["Preço", "Prazo", "Como funciona", "Se atende o meu caso", "Onde atende", "Forma de pagamento", "Garantia", "Quem faz ou fabrica", "Dá para personalizar", "Pós-venda", "Aceita convênio ou plano", "Entrega ou frete", "Requisitos e compatibilidade", "Integrações", "Segurança dos dados", "Dá para cancelar", "Tem data livre", "Outro"] },
  ] },
  { id: "chamada", title: "A chamada", hint: "", qs: [
    { id: "acao", t: "O que o visitante deve fazer?", type: "radio", opts: ["Chamar no WhatsApp", "Agendar", "Pedir orçamento", "Comprar", "Ligar", "Baixar", "Testar grátis", "Agendar demonstração", "Ver cardápio ou fazer pedido", "Fazer matrícula", "Apoiar ou doar", "Como chegar (mapa)"] },
    { id: "nome", t: "Nome da marca", type: "text", ex: "Como aparece no logo e na fachada" },
    { id: "marca_nome", optional: true, t: "Como os clientes chamam vocês?", type: "text", ex: "Se for mais curto que o nome" },
    { id: "link", t: "WhatsApp ou link", type: "text", ex: "Número com DDD ou link" },
    { id: "contar", optional: true, t: "Quando o cliente chamar, o que ele já deve contar?", type: "check", opts: ["Nome", "Cidade e bairro", "O que precisa", "Tipo de imóvel ou local", "Para quando precisa", "Nada, é só chamar", "Outro"] },
    { id: "redes", optional: true, t: "Suas redes sociais", type: "pairs", add: "Adicionar rede", choices: ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Pinterest", "Kwai", "Outra"], fields: ["Rede", "Link do perfil"], rules: REDES },
    { id: "endereco", t: "Endereço e horário", type: "textarea", ex: "Rua, número, bairro e horário de atendimento", when: (d) => d.onde.includes("No meu espaço") },
    { id: "cnpj", optional: true, t: "CNPJ", type: "text", ex: "Aparece no rodapé do site" },
    { id: "idiomas", t: "Em quais idiomas?", type: "check", opts: ["Português", "Inglês", "Espanhol", "Outro"] },
  ] },
  // O cliente diz o que a marca já tem. O que ele ainda não definiu (estilo, vibe, paleta, letra) é
  // opcional: se ficar em branco, a Craftomakers cria. Com o manual, só o link: logo, cores e fontes
  // já estão nele.
  { id: "marca", title: "Sua marca", hint: "", qs: [
    { id: "manual", t: "O que a sua marca já tem?", type: "radio", opts: ["Tenho manual de marca", "Tenho logo e cores, sem manual", "Não tenho nada definido"] },
    { id: "manual_link", parent: "manual", t: "Link do manual", type: "url", ex: "Link do arquivo, sem abrir para todos", alt: "Vai junto na pasta das fotos", when: hasManual },
    { id: "logo", t: "Seu logo", type: "radio", opts: ["Tenho em vetor (SVG, AI, PDF)", "Tenho em imagem (PNG, JPG)", "Tenho, mas quero refazer", "Não tenho, criem um"], when: (d) => !hasManual(d) },
    { id: "cores", optional: (d) => !hasBrand(d), t: "Cores da marca: a primeira é a principal", type: "palette", when: (d) => !hasManual(d) },
    { id: "fonte", t: "Você tem uma fonte da marca?", type: "radio", opts: ["Sim", "Não"], when: hasBrand },
    { id: "fontenome", parent: "fonte", t: "Nome das fontes (pode ser mais de uma)", type: "text", ex: "Inter e Montserrat", when: (d) => hasBrand(d) && d.fonte === "Sim" },
    { id: "letra", optional: true, t: "Que tipo de letra combina com você?", type: "radio", opts: ["Sem serifa, moderna", "Com serifa, clássica", "Arredondada", SUGGEST], when: (d) => !hasManual(d) && !(hasBrand(d) && d.fonte === "Sim") },
    { id: "slogan", optional: true, t: "Slogan, se tiver", type: "text", ex: "A frase da sua marca" },
    { id: "chamada", optional: true, t: "Tem uma frase que chama o cliente? A primeira coisa que ele deveria ler", type: "text", ex: "Você não está comprando um móvel. Está decidindo como quer viver." },
    { id: "tom", optional: hasManual, t: "Como você fala com o cliente?", type: "radio", opts: ["Com formalidade", "Como um amigo", "Com leveza e humor"] },
    { id: "estilo", optional: true, t: "Qual estilo combina com a sua marca?", type: "radio", opts: ["Moderno e limpo", "Clássico", "Luxuoso", "Acolhedor", "Divertido", "Técnico", "Artesanal", SUGGEST] },
    { id: "clima", optional: true, t: "Que vibe o site deve passar?", type: "radio", opts: ["Claro e arejado", "Escuro e marcante", "Sério e corporativo", "Quente e acolhedor", "Natural", SUGGEST] },
    { id: "naopode", optional: true, t: "O que o site não pode dizer?", type: "textarea", ex: "Falar em preço baixo, prometer prazo fixo, citar concorrente" },
    { id: "gosta", optional: true, t: "Até 3 sites ou perfis que você gosta, e por quê", type: "textarea", ex: "Link e o que você gosta nele" },
    { id: "naogosta", optional: true, t: "O que você não quer de jeito nenhum", type: "textarea", ex: "Cores, fotos ou estilos que não combinam com você" },
  ] },
  { id: "anuncios", title: "Anúncios", hint: "", qs: [
    { id: "anunciar", t: "Quer anunciar no Instagram e no Facebook?", type: "radio", opts: ["Já anuncio", "Agora não", "Quero conhecer a solução da Craftomakers"] },
    { id: "anunciou", t: "Já anunciou?", type: "radio", opts: ["Nunca", "Já tentei"], when: (d) => d.anunciar === "Quero conhecer a solução da Craftomakers" },
    { id: "objetivo", optional: true, t: "O que você quer do anúncio?", type: "radio", opts: ["Mensagens no WhatsApp", "Visitas no site", "Ser conhecido na região"], when: anuncia },
    { id: "raio", optional: true, t: "Até onde seu cliente pode estar?", type: "radio", opts: ["Meu bairro (5 km)", "Minha cidade (15 km)", "Cidade e região (40 km)", "Estado", "Brasil"], when: (d) => anuncia(d) && segmentaLivre(d) },
    { id: "idade", t: "Idade do seu cliente", type: "check", opts: ["18–24", "25–34", "35–44", "45–54", "55+"], when: (d) => anuncia(d) && segmentaLivre(d) },
    { id: "genero", t: "Seu cliente é mais…", type: "radio", opts: ["Mulheres", "Homens", "Tanto faz"], when: (d) => anuncia(d) && segmentaLivre(d) },
    { id: "interesses", optional: true, t: "Do que seu cliente gosta? (até 3)", type: "check", max: 3, opts: ["Casa e decoração", "Família", "Saúde", "Beleza", "Gastronomia", "Viagens", "Negócios", "Pets", "Esportes", "Arte e design"], when: anuncia },
    { id: "verba", t: "Quanto por dia?", type: "radio", opts: ["Até R$ 20", "R$ 20–50", "R$ 50–100", "Mais de R$ 100", "Não sei"], when: anuncia },
    { id: "tempo", t: "Por quanto tempo?", type: "radio", opts: ["2 semanas", "1 mês", "Contínuo", "Não sei"], when: anuncia },
    { id: "base", t: "Você já tem…", type: "check", opts: ["Lista de contatos de clientes", "Instagram com seguidores", "Nada disso"], when: anuncia },
  ] },
  { id: "fim", title: "Fim", hint: "", qs: [
    { id: "mais", optional: true, t: "Mais alguma coisa?", type: "textarea", ex: "O que mais a gente precisa saber" },
  ] },
];

// As fases: o cliente faz as três, uma de cada vez. Cada uma junta famílias de pergunta; no fim de
// cada fase, uma pausa mostra que está salvo e que dá para parar ali e voltar depois.
export const PARTS = [
  { title: "Seu negócio", text: "O que você faz, para quem e o que o site resolve", ids: ["negocio", "cliente", "filtro", "dor"] },
  { title: "Seu valor", text: "Por que te escolhem e como funciona", ids: ["diferencial", "prova", "experiencia", "funciona", "chamada"] },
  { title: "Sua marca", text: "Logo, cores, jeito e anúncios", ids: ["marca", "anuncios", "fim"] },
];
