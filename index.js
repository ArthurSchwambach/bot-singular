require('dotenv').config();
const {
  Client, GatewayIntentBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

const db = require('./db');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- CONEXÃO AO INICIAR ---
client.once('ready', () => {
    db.connectDB(); // <--- Agora conecta no Mongo ao ligar
    console.log(`Bot logado como ${client.user.tag}`);
});

/* ========= FUNÇÕES AUXILIARES ========= */
function createInput(id, label, valorAtual, estilo = TextInputStyle.Short) {
    return new ActionRowBuilder().addComponents(
        new TextInputBuilder()
            .setCustomId(id).setLabel(label).setValue(String(valorAtual)).setStyle(estilo).setRequired(true)
    );
}

/* ========= MENUS (AGORA SÃO ASYNC) ========= */

// 1. MENU PRINCIPAL
async function menuPrincipal(id) {
  const f = await db.getFicha(id); // <--- AWAIT: Espera o banco responder
  
  const embed = new EmbedBuilder().setColor(0x00ffaa).setTitle('🔌 Ficha Singular — Interface Neural');
  const row = new ActionRowBuilder();

  if (!f) {
    embed.setDescription('Nenhuma ficha encontrada no banco de dados.');
    row.addComponents(new ButtonBuilder().setCustomId('criar').setLabel('🧬 Criar Personagem').setStyle(ButtonStyle.Success));
  } else {
    embed.setDescription(`Conectado: **${f.nome}**\nOcupação: **${f.ocupacao || 'Indefinido'}**\nSelecione uma operação abaixo.`);
    row.addComponents(
      new ButtonBuilder().setCustomId('ver_tudo').setLabel('📄 Ver Ficha').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('menu_editar').setLabel('⚙️ Editar Personagem').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('pre_apagar').setLabel('⚠️ Apagar').setStyle(ButtonStyle.Danger)
    );
  }
  return { embeds: [embed], components: [row], flags: 64 };
}

// 2. CONFIRMAÇÃO (Simples, não precisa de await pois não lê o banco)
function menuConfirmacao() {
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle('⚠️ ZONA DE PERIGO ⚠️')
        .setDescription('**Você tem certeza?**\nIsso deletará tudo permanentemente.');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirmar_apagar').setLabel('Sim, Deletar!').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('voltar').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [row], flags: 64 };
}

// 3. VER FICHA COMPLETA
async function verFichaCompleta(id) {
    const f = await db.getFicha(id); // <--- AWAIT
    if (!f) return { content: "Erro: Ficha não encontrada.", flags: 64 };

    const a = f.atributos;
    const listaItens = (f.itens && f.itens.length) ? f.itens.join('\n') : '—';
    const listaImplantes = (f.implantes && f.implantes.length) ? f.implantes.join('\n') : '—';
    
    // Barra de vida
    const vidaAtual = f.vida?.atual || 0;
    const vidaMax = f.vida?.max || 10;
    const pct = vidaMax > 0 ? Math.round((vidaAtual / vidaMax) * 10) : 0;
    const barra = '█'.repeat(Math.max(0, Math.min(10, pct))) + '░'.repeat(Math.max(0, 10 - pct));

    const embed = new EmbedBuilder().setColor(0x00aaff)
        .setTitle(`📄 Ficha Singular: ${f.nome}`)
        .setDescription(`**Ocupação:** ${f.ocupacao || 'N/A'}\n**Idade:** ${f.idade} | **Altura:** ${f.altura} | **€$:** ${f.eurodolares}`)
        .addFields(
            { name: '❤️ Status Vital', value: `Vida: ${vidaAtual}/${vidaMax}\n${barra}\n🧠 Neural: ${f.controleNeural || 0}`, inline: false },
            { name: '💪 Atributos', value: `**FOR:** ${a.forca} | **DES:** ${a.destreza} | **CON:** ${a.constitucao}\n**INT:** ${a.inteligencia} | **PER:** ${a.percepcao} | **CAR:** ${a.carisma}`, inline: false },
            { name: '🎒 Itens', value: listaItens, inline: true },
            { name: '🦾 Implantes', value: listaImplantes, inline: true }
        );

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('voltar').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary));
    return { embeds: [embed], components: [row], flags: 64 };
}

// 4. MENU EDITAR
function menuEditar(id) {
    const embed = new EmbedBuilder().setColor(0xffaa00).setTitle('⚙️ Painel de Edição').setDescription('Escolha o setor.');
    const r1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('edit_dados').setLabel('📝 Dados').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('edit_status').setLabel('❤️ Status').setStyle(ButtonStyle.Success)
    );
    const r2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_item').setLabel('🎒 + Item').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_implante').setLabel('🦾 + Implante').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('limpar_inv').setLabel('🗑️ Limpar').setStyle(ButtonStyle.Danger)
    );
    const r3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('edit_fisico').setLabel('💪 Físico').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('edit_mental').setLabel('🧠 Mental').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('voltar').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [r1, r2, r3], flags: 64 };
}

/* ========= EVENTOS ========= */
client.on('interactionCreate', async i => {
  if (!i.isButton() && !i.isModalSubmit() && !i.isChatInputCommand()) return;
  const id = i.user.id;

  // COMANDO DE CHAT
  if (i.isChatInputCommand() && i.commandName === 'singular') {
    return i.reply(await menuPrincipal(id)); // <--- AWAIT IMPORTANTE
  }

  // BOTÕES
  if (i.isButton()) {
    if (i.customId === 'voltar') return i.update(await menuPrincipal(id));
    
    if (i.customId === 'criar') { 
        await db.criarFicha(id, i.user.username); // <--- AWAIT no criar
        return i.update(await menuPrincipal(id)); 
    }
    
    if (i.customId === 'pre_apagar') return i.update(menuConfirmacao());
    
    if (i.customId === 'confirmar_apagar') { 
        await db.apagarFicha(id); // <--- AWAIT no apagar
        return i.update(await menuPrincipal(id)); 
    }

    if (i.customId === 'ver_tudo') return i.update(await verFichaCompleta(id));
    if (i.customId === 'menu_editar') return i.update(menuEditar(id));
    
    if (i.customId === 'limpar_inv') { 
        await db.limparInventario(id); 
        return i.update(await verFichaCompleta(id)); 
    }

    /* --- PREPARAR MODALS (Buscar dados antes de abrir) --- */
    if (i.customId === 'edit_dados') {
        const f = await db.getFicha(id); // Buscamos a ficha atualizada para preencher os campos
        const modal = new ModalBuilder().setCustomId('modal_dados').setTitle('Dados Pessoais');
        modal.addComponents(
            createInput('nome', 'Nome', f.nome),
            createInput('ocupacao', 'Ocupação', f.ocupacao || ''),
            createInput('idade', 'Idade', f.idade),
            createInput('altura', 'Altura', f.altura),
            createInput('euro', 'Eurodólares (€$)', f.eurodolares)
        );
        return i.showModal(modal);
    }

    if (i.customId === 'edit_status') {
        const f = await db.getFicha(id);
        const modal = new ModalBuilder().setCustomId('modal_status').setTitle('Status Vital');
        modal.addComponents(
            createInput('vida_atual', 'Vida Atual', f.vida.atual),
            createInput('vida_max', 'Vida Máxima', f.vida.max),
            createInput('neural', 'Neural', f.controleNeural || 0)
        );
        return i.showModal(modal);
    }

    if (i.customId === 'edit_fisico') {
        const f = await db.getFicha(id);
        const modal = new ModalBuilder().setCustomId('modal_fisico').setTitle('Atributos Físicos');
        modal.addComponents(
            createInput('forca', 'Força', f.atributos.forca),
            createInput('destreza', 'Destreza', f.atributos.destreza),
            createInput('constitucao', 'Const', f.atributos.constitucao)
        );
        return i.showModal(modal);
    }
    
    if (i.customId === 'edit_mental') {
        const f = await db.getFicha(id);
        const modal = new ModalBuilder().setCustomId('modal_mental').setTitle('Atributos Mentais');
        modal.addComponents(
            createInput('inteligencia', 'Int', f.atributos.inteligencia),
            createInput('percepcao', 'Per', f.atributos.percepcao),
            createInput('carisma', 'Car', f.atributos.carisma)
        );
        return i.showModal(modal);
    }
    
    // Modals vazios (não precisam ler o banco)
    if (i.customId === 'add_item') {
        return i.showModal(new ModalBuilder().setCustomId('modal_item').setTitle('Add Item').addComponents(createInput('nome_item', 'Nome', '')));
    }
    if (i.customId === 'add_implante') {
        return i.showModal(new ModalBuilder().setCustomId('modal_implante').setTitle('Add Implante').addComponents(createInput('nome_implante', 'Nome', '')));
    }
  }

  /* --- SALVAR (SUBMIT) --- */
  if (i.isModalSubmit()) {
    // IMPORTANTE: Adicionei await em todos os db.set...
    
    if (i.customId === 'modal_dados') {
        await db.setDadosPessoais(id, i.fields.getTextInputValue('nome'), i.fields.getTextInputValue('ocupacao'), i.fields.getTextInputValue('idade'), i.fields.getTextInputValue('altura'), i.fields.getTextInputValue('euro'));
        return i.update(await verFichaCompleta(id));
    }
    if (i.customId === 'modal_status') {
        await db.setStatus(id, i.fields.getTextInputValue('vida_atual'), i.fields.getTextInputValue('vida_max'), i.fields.getTextInputValue('neural'));
        return i.update(await verFichaCompleta(id));
    }
    if (i.customId === 'modal_item') {
        await db.addItem(id, i.fields.getTextInputValue('nome_item'));
        return i.update(await verFichaCompleta(id));
    }
    if (i.customId === 'modal_implante') {
        await db.addImplante(id, i.fields.getTextInputValue('nome_implante'));
        return i.update(await verFichaCompleta(id));
    }
    if (i.customId === 'modal_fisico') {
        await db.setAtributos(id, { forca: i.fields.getTextInputValue('forca'), destreza: i.fields.getTextInputValue('destreza'), constitucao: i.fields.getTextInputValue('constitucao') });
        return i.update(await verFichaCompleta(id));
    }
    if (i.customId === 'modal_mental') {
        await db.setAtributos(id, { inteligencia: i.fields.getTextInputValue('inteligencia'), percepcao: i.fields.getTextInputValue('percepcao'), carisma: i.fields.getTextInputValue('carisma') });
        return i.update(await verFichaCompleta(id));
    }
  }
});

client.login(process.env.DISCORD_TOKEN);