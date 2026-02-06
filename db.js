const mongoose = require('mongoose');

// --- 1. CONEXÃO ---
const connectDB = async () => {
    try {
        // Ele vai buscar o link lá no seu arquivo .env
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 MongoDB Conectado com Sucesso!');
    } catch (err) {
        console.error('ERRO CRÍTICO NO MONGO:', err);
    }
};

// --- 2. O MOLDE DA FICHA (Schema) ---
// Isso aqui substitui o seu "defaultFicha" antigo
const fichaSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // ID do Discord
    nome: { type: String, required: true },
    ocupacao: { type: String, default: "N/A" },
    idade: { type: String, default: "?" },
    altura: { type: String, default: "?" },
    eurodolares: { type: Number, default: 0 },
    
    controleNeural: { type: Number, default: 0 },

    atributos: {
        forca: { type: Number, default: 0 },
        destreza: { type: Number, default: 0 },
        inteligencia: { type: Number, default: 0 },
        constitucao: { type: Number, default: 0 },
        percepcao: { type: Number, default: 0 },
        carisma: { type: Number, default: 0 }
    },

    itens: { type: [String], default: [] },
    implantes: { type: [String], default: [] },

    vida: {
        atual: { type: Number, default: 10 },
        max: { type: Number, default: 10 }
    }
});

// Cria o modelo
const Ficha = mongoose.model('Ficha', fichaSchema);

// --- 3. FUNÇÕES EXPORTADAS (Tudo virou Async) ---
module.exports = {
    connectDB,

    // Buscar ficha (Substitui o ler()[id])
    getFicha: async (id) => {
        return await Ficha.findOne({ userId: id });
    },
    
    // Criar ficha
    criarFicha: async (id, nomeUser) => {
        const existe = await Ficha.findOne({ userId: id });
        if (existe) return false;
        
        await Ficha.create({ userId: id, nome: nomeUser });
        return true;
    },
    
    // Apagar ficha
    apagarFicha: async (id) => {
        await Ficha.findOneAndDelete({ userId: id });
    },

    // Atualizar Dados Pessoais
    setDadosPessoais: async (id, nome, ocupacao, idade, altura, grana) => {
        await Ficha.findOneAndUpdate({ userId: id }, {
            nome: nome,
            ocupacao: ocupacao,
            idade: idade,
            altura: altura,
            eurodolares: parseInt(grana) || 0
        });
    },

    // Atualizar Status (Vida/Neural)
    setStatus: async (id, vidaAtual, vidaMax, neural) => {
        await Ficha.findOneAndUpdate({ userId: id }, {
            'vida.atual': parseInt(vidaAtual) || 0,
            'vida.max': parseInt(vidaMax) || 1,
            controleNeural: parseInt(neural) || 0
        });
    },

    // Atualizar Atributos (Um pouco mais esperto que o antigo)
    setAtributos: async (id, novosAtributos) => {
        // Monta um objeto de atualização dinâmica
        const update = {};
        for (constKey in novosAtributos) {
            update[`atributos.${constKey}`] = novosAtributos[constKey];
        }
        await Ficha.findOneAndUpdate({ userId: id }, { $set: update });
    },

    // Adicionar Item
    addItem: async (id, item) => {
        await Ficha.findOneAndUpdate({ userId: id }, { $push: { itens: item } });
    },

    // Adicionar Implante
    addImplante: async (id, implante) => {
        await Ficha.findOneAndUpdate({ userId: id }, { $push: { implantes: implante } });
    },

    // Limpar Inventário
    limparInventario: async (id) => {
        await Ficha.findOneAndUpdate({ userId: id }, { itens: [], implantes: [] });
    }
};