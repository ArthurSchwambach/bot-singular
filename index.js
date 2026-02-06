require('dotenv').config();
const {
  Client, GatewayIntentBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

const db = require('./db');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/* ========= FUNÇÕES AUXILIARES ========= */

function createInput(id, label, valorAtual, estilo = TextInputStyle.Short) {
    return new ActionRowBuilder().addComponents(
        new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setValue(String(valorAtual)) 
            .setStyle(estilo)
            .setRequired(true)
    );
}

/* ========= MENUS (TELAS) ========= */

// 1. MENU PRINCIPAL
function menuPrincipal(id) {
  const f = db.getFicha(id);
  
  const embed = new EmbedBuilder()
    .setColor(0x00ffaa)
    .setTitle('🔌 Ficha Singular — Interface Neural');

  const row = new ActionRowBuilder();

  if (!f) {
    embed.setDescription('Nenhuma ficha encontrada no banco de dados.');
    row.addComponents(new ButtonBuilder().setCustomId('criar').setLabel('🧬 Criar Personagem').setStyle(ButtonStyle.Success));
  } else {
    embed.setDescription(`Conectado: **${f.nome}**\nOcupação: **${f.ocupacao || 'Indefinido'}**\nSelecione uma operação abaixo.`);
    
    row.addComponents(
      new ButtonBuilder().setCustomId('ver_tudo').setLabel('📄 Ver Ficha').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('menu_editar').setLabel('⚙️ Editar Personagem').setStyle(ButtonStyle.Secondary),
      // Botão leva para o "Pré-Apagar" (Segurança)
      new ButtonBuilder().setCustomId('pre_apagar').setLabel('⚠️ Apagar').setStyle(ButtonStyle.Danger)
    );
  }

  return { embeds: [embed], components: [row], flags: 64 };
}

// 2. TELA DE CONFIRMAÇÃO DE APAGAR (Segurança)
function menuConfirmacao() {
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('⚠️ ZONA DE PERIGO ⚠️')
        .setDescription('**Você tem certeza que deseja apagar sua ficha?**\n\nIsso deletará permanentemente seus Atributos, Itens e Status.\nEssa ação não tem volta, tchumba.');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirmar_apagar').setLabel('Sim, Deletar tudo!').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('voltar').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row], flags: 64 };
}

// 3. VER FICHA COMPLETA
function verFichaCompleta(id) {
    const f = db.getFicha(id);
    const a = f.atributos;
    
    const listaItens = (f.itens && f.itens.length) ? f.itens.join('\n') : '—';
    const listaImplantes = (f.implantes && f.implantes.length) ? f.implantes.join('\n') : '—';

    const pct = f.vida.max > 0 ? Math.round((f.vida.atual / f.vida.max) * 10) : 0;
    const barra = '█'.repeat(Math.max(0, Math.min(10, pct))) + '░'.repeat(Math.max(0, 10 - pct));

    const embed = new EmbedBuilder()
        .setColor(0x00aaff)
        .setTitle(`📄 Ficha Singular: ${f.nome}`)
        .setDescription(`**Ocupação:** ${f.ocupacao || 'N/A'}\n**Idade:** ${f.idade} | **Altura:** ${f.altura} | **€$:** ${f.eurodolares}`)
        .addFields(
            { name: '❤️ Status Vital', value: `Vida: ${f.vida.atual}/${f.vida.max}\n${barra}\n🧠 Controle Neural: ${f.controleNeural || 0}`, inline: false },
            { name: '💪 Atributos', value: 
              `**FOR:** ${a.forca} | **DES:** ${a.destreza} | **CON:** ${a.constitucao}\n` +
              `**INT:** ${a.inteligencia} | **PER:** ${a.percepcao} | **CAR:** ${a.carisma}`, inline: false },
            { name: '🎒 Itens Importantes', value: listaItens, inline: true },
            { name: '🦾 Implantes', value: listaImplantes, inline: true }
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('voltar').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [row], flags: 64 };
}

// 4. MENU DE EDIÇÃO (Hub)
function menuEditar(id) {
    const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('⚙️ Painel de Edição')
        .setDescription('Escolha qual setor você deseja modificar.');

    // Linha 1: Dados
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('edit_dados').setLabel('📝 Dados & Ocupação').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('edit_status').setLabel('❤️ Vida & Neural').setStyle(ButtonStyle.Success),
    );

    // Linha 2: Inventário
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_item').setLabel('🎒 + Item').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_implante').setLabel('🦾 + Implante').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('limpar_inv').setLabel('🗑️ Limpar Inv.').setStyle(ButtonStyle.Danger),
    );

    // Linha 3: Atributos
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('edit_fisico').setLabel('💪 Físico').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('edit_mental').setLabel('🧠 Mental').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('voltar').setLabel('⬅️ Menu Principal').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2, row3], flags: 64 };
}

/* ========= EVENTOS ========= */

client.on('interactionCreate', async i => {
  if (!i.isButton() && !i.isModalSubmit() && !i.isChatInputCommand()) return;

  const id = i.user.id;

  if (i.isChatInputCommand() && i.commandName === 'ficha') {
    return i.reply(menuPrincipal(id));
  }

  /* --- BOTÕES --- */
  if (i.isButton()) {
    // Navegação Geral
    if (i.customId === 'voltar') return i.update(menuPrincipal(id));
    if (i.customId === 'criar') { db.criarFicha(id, i.user.username); return i.update(menuPrincipal(id)); }
    
    // --- LÓGICA DE APAGAR COM SEGURANÇA ---
    if (i.customId === 'pre_apagar') return i.update(menuConfirmacao());
    if (i.customId === 'confirmar_apagar') { 
        db.apagarFicha(id); 
        return i.update(menuPrincipal(id)); 
    }

    // Menus
    if (i.customId === 'ver_tudo') return i.update(verFichaCompleta(id));
    if (i.customId === 'menu_editar') return i.update(menuEditar(id));
    if (i.customId === 'limpar_inv') { db.limparInventario(id); return i.update(verFichaCompleta(id)); }

    /* --- ABERTURA DE MODALS (FORMULÁRIOS) --- */

    if (i.customId === 'edit_dados') {
        const f = db.getFicha(id);
        const modal = new ModalBuilder().setCustomId('modal_dados').setTitle('Dados Pessoais');
        
        // 5 Campos (Máximo permitido pelo Discord)
        modal.addComponents(
            createInput('nome', 'Nome', f.nome),
            createInput('ocupacao', 'Ocupação / Classe', f.ocupacao || ''),
            createInput('idade', 'Idade', f.idade),
            createInput('altura', 'Altura', f.altura),
            createInput('euro', 'Eurodólares (€$)', f.eurodolares)
        );
        return i.showModal(modal);
    }

    if (i.customId === 'edit_status') {
        const f = db.getFicha(id);
        const modal = new ModalBuilder().setCustomId('modal_status').setTitle('Status Vital');
        modal.addComponents(
            createInput('vida_atual', 'Vida Atual', f.vida.atual),
            createInput('vida_max', 'Vida Máxima', f.vida.max),
            createInput('neural', 'Controle Neural (Valor)', f.controleNeural || 0)
        );
        return i.showModal(modal);
    }

    if (i.customId === 'add_item') {
        const modal = new ModalBuilder().setCustomId('modal_item').setTitle('Adicionar Item');
        modal.addComponents(createInput('nome_item', 'Nome do Item', ''));
        return i.showModal(modal);
    }

    if (i.customId === 'add_implante') {
        const modal = new ModalBuilder().setCustomId('modal_implante').setTitle('Instalar Implante');
        modal.addComponents(createInput('nome_implante', 'Nome do Implante', ''));
        return i.showModal(modal);
    }

    if (i.customId === 'edit_fisico') {
        const f = db.getFicha(id);
        const modal = new ModalBuilder().setCustomId('modal_fisico').setTitle('Atributos Físicos');
        modal.addComponents(
            createInput('forca', 'Força', f.atributos.forca),
            createInput('destreza', 'Destreza', f.atributos.destreza),
            createInput('constitucao', 'Constituição', f.atributos.constitucao)
        );
        return i.showModal(modal);
    }

    if (i.customId === 'edit_mental') {
        const f = db.getFicha(id);
        const modal = new ModalBuilder().setCustomId('modal_mental').setTitle('Atributos Mentais');
        modal.addComponents(
            createInput('inteligencia', 'Inteligência', f.atributos.inteligencia),
            createInput('percepcao', 'Percepção', f.atributos.percepcao),
            createInput('carisma', 'Carisma', f.atributos.carisma)
        );
        return i.showModal(modal);
    }
  }

  /* --- SALVAR DADOS (SUBMIT) --- */
  if (i.isModalSubmit()) {
    
    if (i.customId === 'modal_dados') {
        db.setDadosPessoais(id, 
            i.fields.getTextInputValue('nome'),
            i.fields.getTextInputValue('ocupacao'), // Salva a ocupação
            i.fields.getTextInputValue('idade'),
            i.fields.getTextInputValue('altura'),
            i.fields.getTextInputValue('euro')
        );
        return i.update(verFichaCompleta(id));
    }

    if (i.customId === 'modal_status') {
        db.setStatus(id,
            i.fields.getTextInputValue('vida_atual'),
            i.fields.getTextInputValue('vida_max'),
            i.fields.getTextInputValue('neural')
        );
        return i.update(verFichaCompleta(id));
    }

    if (i.customId === 'modal_item') {
        db.addItem(id, i.fields.getTextInputValue('nome_item'));
        return i.update(verFichaCompleta(id));
    }

    if (i.customId === 'modal_implante') {
        db.addImplante(id, i.fields.getTextInputValue('nome_implante'));
        return i.update(verFichaCompleta(id));
    }

    if (i.customId === 'modal_fisico') {
        db.setAtributos(id, {
            forca: parseInt(i.fields.getTextInputValue('forca')),
            destreza: parseInt(i.fields.getTextInputValue('destreza')),
            constitucao: parseInt(i.fields.getTextInputValue('constitucao'))
        });
        return i.update(verFichaCompleta(id));
    }

    if (i.customId === 'modal_mental') {
        db.setAtributos(id, {
            inteligencia: parseInt(i.fields.getTextInputValue('inteligencia')),
            percepcao: parseInt(i.fields.getTextInputValue('percepcao')),
            carisma: parseInt(i.fields.getTextInputValue('carisma'))
        });
        return i.update(verFichaCompleta(id));
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
