const fs = require('fs');
const path = './fichas.json';

const defaultFicha = {
    nome: "Desconhecido",
    ocupacao: "N/A", // Novo campo padrão
    idade: "?",
    altura: "?",
    eurodolares: 0,
    
    controleNeural: 0, 

    atributos: {
        forca: 0,
        destreza: 0,
        inteligencia: 0,
        constitucao: 0,
        percepcao: 0,
        carisma: 0
    },

    itens: [],
    implantes: [],

    vida: {
        atual: 10,
        max: 10
    }
};

function ler() { 
    try { return JSON.parse(fs.readFileSync(path)); } 
    catch (e) { return {}; }
}
function salvar(data) { fs.writeFileSync(path, JSON.stringify(data, null, 2)); }

if (!fs.existsSync(path)) salvar({});

module.exports = {
    getFicha: (id) => ler()[id] || null,
    
    criarFicha: (id, nomeUser) => {
        const dados = ler();
        if (dados[id]) return false;
        dados[id] = { ...defaultFicha, nome: nomeUser };
        salvar(dados);
        return true;
    },
    
    apagarFicha: (id) => {
        const dados = ler();
        delete dados[id];
        salvar(dados);
    },

    // --- ATUALIZADO: Agora recebe 'ocupacao' ---
    setDadosPessoais: (id, nome, ocupacao, idade, altura, grana) => {
        const dados = ler();
        if (!dados[id]) return;
        dados[id].nome = nome;
        dados[id].ocupacao = ocupacao; // Salva a ocupação
        dados[id].idade = idade;
        dados[id].altura = altura;
        dados[id].eurodolares = parseInt(grana) || 0;
        salvar(dados);
    },

    setStatus: (id, vidaAtual, vidaMax, neural) => {
        const dados = ler();
        if (!dados[id]) return;
        dados[id].vida.atual = parseInt(vidaAtual) || 0;
        dados[id].vida.max = parseInt(vidaMax) || 1;
        dados[id].controleNeural = parseInt(neural) || 0;
        salvar(dados);
    },

    setAtributos: (id, novosAtributos) => {
        const dados = ler();
        if (!dados[id]) return;
        dados[id].atributos = { ...dados[id].atributos, ...novosAtributos };
        salvar(dados);
    },

    addItem: (id, item) => {
        const dados = ler();
        if (!dados[id]) return;
        if (!dados[id].itens) dados[id].itens = []; 
        dados[id].itens.push(item);
        salvar(dados);
    },

    addImplante: (id, implante) => {
        const dados = ler();
        if (!dados[id]) return;
        dados[id].implantes.push(implante);
        salvar(dados);
    },

    limparInventario: (id) => {
        const dados = ler();
        if (!dados[id]) return;
        dados[id].itens = [];
        dados[id].implantes = [];
        salvar(dados);
    }
};