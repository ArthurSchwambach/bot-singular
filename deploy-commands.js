require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'ficha',
        description: 'Abre o terminal neural do personagem',
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registrando comando /ficha...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Sucesso! Comando registrado.');
    } catch (error) {
        console.error(error);
    }
})();
