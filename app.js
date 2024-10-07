// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// |                                                                   Ogólne                                                                      | 
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

require('dotenv').config(); // Ładowanie zmiennych z .env
const { Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType, TextChannel, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Inicjalizacja klienta Discorda
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

const TOKEN = process.env.DISCORD_TOKEN;

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Funkcja do aktualizacji statusu bota co minutę
    const updateStatus = () => {
        const statusOptions = [
            { name: '🤖 Słuchamy czy są nowe partnerstwa', type: 0 },   // Type 0 is "Playing"
            { name: '🆙 Robimy cały czas update', type: 3 } // Type 3 is "Watching"
        ];

        const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];

        client.user.setPresence({
            activities: [{ name: randomStatus.name, type: randomStatus.type }],
            status: 'online'
        });

        console.log(`Status updated: ${randomStatus.name}`);
    };

    // Inicjalna aktualizacja statusu
    updateStatus();

    // Ustawienie interwału do aktualizacji statusu co minutę (60000 ms)
    setInterval(updateStatus, 60000);
});

// Funkcja do logowania błędów do pliku
function logError(error, errorCode) {
    const logMessage = `[${new Date().toISOString()}] Błąd ${errorCode}: ${error.message}\n`;
    fs.appendFileSync(path.join('./bot.txt'), logMessage, 'utf8');
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// |                                                    # Kategoria Prywatność #                                                                   | 
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// |                                                    ! Funkcje do Partnestwa                                                                    | 
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

// Gdy dołącza na serwer gracz to będzie wyświetlać na na kanale admina co zrobić z tym gracze i będą takie menu; Partnestwo, Ignoruj, Informuj

// Wysyła wiadomość do tego nowego użytkownika warunki prywatności, regulamin (zawsze wysyłaj wiadomość z linkiem do regulaminu i warunków prywatności)

// Wysyła wiadomość do tego nowego użytkownika o warunki partnestwa, regulamin partnestwa (tylko gdy kliknie partnestwo)

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// |                                                      Partnestwa System                                                                        | 
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

// Komenda do otwierania modalu
client.on(Events.MessageCreate, async message => {
    if (message.content === '!partners') {
        const button = new ButtonBuilder()
            .setCustomId('openPartnerModal')
            .setLabel('Otwórz formularz')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);
        await message.reply({ content: 'Kliknij przycisk, aby otworzyć formularz:', components: [row] });
    }
});

// Odpowiedź na interakcję przycisku
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.customId === 'openPartnerModal') {
        const modal = new ModalBuilder()
            .setCustomId('partnerModal')
            .setTitle('Nowe Partnerstwo');

        const playerIdInput = new TextInputBuilder()
            .setCustomId('playerId')
            .setLabel('Podaj ID gracza')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const playerNickInput = new TextInputBuilder()
            .setCustomId('playerNick')
            .setLabel('Podaj nick gracza')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(playerIdInput),
            new ActionRowBuilder().addComponents(playerNickInput)
        );

        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'partnerModal') {
        await interaction.deferReply({ ephemeral: true });

        const playerId = interaction.fields.getTextInputValue('playerId');
        const playerNick = interaction.fields.getTextInputValue('playerNick');

        try {
            const user = await client.users.fetch(playerId); // Pobranie użytkownika

            if (!user || user.bot) {
                logError(new Error('Nie znaleziono gracza o podanym ID lub jest to bot.'), 100);
                return await interaction.followUp('Nie znaleziono gracza o podanym ID lub jest to bot.');
            }

            // Wysyłanie wiadomości do DM
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Nowa Reklama')
                .setDescription(`Cześć ${playerNick}, prosimy o przesłanie treści reklamy do administracji HTG - Sieć.`)
                .setImage('http://htgloggers.great-site.net/wp-content/uploads/2024/10/Purple-Pink-Grainy-Pastel-Minimal-Discord-Profile-Banner.gif')
                .setTimestamp()
                .setFooter({ text: 'HTG - Sieć' });

            await user.send({ embeds: [embed] });

            // Wysłanie testowej wiadomości do kanału serwera
            const testChannelId = '1292101681693327434'; // ID kanału testowego
            const testChannel = await client.channels.fetch(testChannelId);

            if (!(testChannel instanceof TextChannel)) {
                logError(new Error('Kanał testowy nie jest kanałem tekstowym lub nie znaleziono kanału.'), 101);
                return await interaction.followUp('Nie znaleziono kanału testowego.');
            }

            await testChannel.send(`Wysłano wiadomość do użytkownika: ${playerNick} (${playerId}).`);

            // Czekanie na odpowiedź od użytkownika
            const filter = m => m.author.id === playerId;
            const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 300000 }).catch(() => null); // Czeka do 5 minut

            if (!collected || collected.size === 0) {
                logError(new Error('Nie otrzymano odpowiedzi od użytkownika.'), 200);
                return await interaction.followUp('Czas na odpowiedź wygasł. Spróbuj ponownie.');
            }

            const adContent = collected.first().content;

            // Wysłanie reklamy do kanału administracji
            const adminChannelId = '1292101669596823647'; // ID kanału administracji
            const adminChannel = await client.channels.fetch(adminChannelId);

            if (adminChannel instanceof TextChannel) {
                const adMessage = await adminChannel.send(`Reklama od ${playerNick}: ${adContent}`);

                // Dodanie przycisków do akceptacji/odrzucenia reklamy
                const acceptButton = new ButtonBuilder()
                    .setCustomId(`acceptAd-${adMessage.id}`)
                    .setLabel('Potwierdzam')
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`rejectAd-${adMessage.id}`)
                    .setLabel('Anuluj')
                    .setStyle(ButtonStyle.Danger);

                const buttonRow = new ActionRowBuilder().addComponents(acceptButton, rejectButton);
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Reklama do przeglądu od ${playerNick}:`)
                    .setDescription(`Treść: ${adContent}`)
                    .addFields(
                        { name: 'ID Gracza:', value: playerId, inline: true },
                        { name: 'Nick Gracza:', value: playerNick, inline: true }
                    )
                    .setImage('http://htgloggers.great-site.net/wp-content/uploads/2024/10/Purple-Pink-Grainy-Pastel-Minimal-Discord-Profile-Banner.gif')
                    .setTimestamp()
                    .setFooter({ text: 'HTG - Sieć' });

                await adminChannel.send({ embeds: [embed], components: [buttonRow] });
                await interaction.followUp(`Reklama została wysłana do administracji na kanale ${adminChannel}.`);
            } else {
                logError(new Error('Nie mogę znaleźć kanału administracji.'), 102);
                await interaction.followUp('Nie mogę znaleźć kanału administracji.');
            }
        } catch (error) {
            logError(error, 500); // Ogólny błąd
            await interaction.followUp('Wystąpił błąd podczas przetwarzania reklamy.');
        }
    }

    if (interaction.customId.startsWith('acceptAd-')) {
        const messageId = interaction.customId.split('-')[1];
        const serverAdModal = new ModalBuilder()
            .setCustomId(`serverAdModal-${messageId}`)
            .setTitle('Reklama Serwerowa');

        const serverAdInput = new TextInputBuilder()
            .setCustomId('serverAdContent')
            .setLabel('Podaj treść reklamy serwerowej')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const playerIdInput = new TextInputBuilder()
            .setCustomId('playerIdToNotify')
            .setLabel('Podaj ID gracza, do którego wysłać wiadomość')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        serverAdModal.addComponents(
            new ActionRowBuilder().addComponents(serverAdInput),
            new ActionRowBuilder().addComponents(playerIdInput)
        );

        await interaction.showModal(serverAdModal);
    }

    if (interaction.customId.startsWith('rejectAd-')) {
        const messageId = interaction.customId.split('-')[1];
        const reasonModal = new ModalBuilder()
            .setCustomId(`rejectReasonModal-${messageId}`)
            .setTitle('Odrzucenie Reklamy');

        const reasonInput = new TextInputBuilder()
            .setCustomId('rejectReason')
            .setLabel('Podaj powód odrzucenia reklamy')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        reasonModal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(reasonModal);
    }
});

// Wysłanie odpowiedzi do gracza w przypadku odrzucenia reklamy
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.type === InteractionType.ModalSubmit) {
        const messageId = interaction.customId.split('-')[1];
        if (interaction.customId.startsWith('rejectReasonModal-')) {
            const reason = interaction.fields.getTextInputValue('rejectReason');

            const adminChannel = await client.channels.fetch('1292101669596823647'); // ID kanału administracji
            const adMessage = await adminChannel.messages.fetch(messageId);

            const playerId = adMessage.embeds[0].description.match(/\d+/)[0]; // Wyciągnięcie ID gracza z opisu reklamy

            const user = await client.users.fetch(playerId);
            await user.send(`Twoja reklama została odrzucona z powodu: ${reason}`);

            await adMessage.reply(`Reklama odrzucona przez ${interaction.user.tag}.`);
            await interaction.followUp('Reklama została odrzucona i użytkownik został powiadomiony.');

            // Dodatkowy embed informacyjny o odrzuceniu
            const rejectEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Reklama odrzucona')
                .setDescription(`Reklama od ${adMessage.embeds[0].author.name} została odrzucona.`)
                .addFields(
                    { name: 'Powód:', value: reason, inline: false },
                    { name: 'ID Gracza:', value: playerId, inline: true },
                    { name: 'Nick Gracza:', value: adMessage.embeds[0].title, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'HTG - Sieć' });

            await adminChannel.send({ embeds: [rejectEmbed] });

        }

        if (interaction.customId.startsWith('serverAdModal-')) {
            const serverAdContent = interaction.fields.getTextInputValue('serverAdContent');
            const playerId = interaction.fields.getTextInputValue('playerIdToNotify');

            const user = await client.users.fetch(playerId);
            await user.send(`Twoja reklama serwerowa: ${serverAdContent}`);

            await interaction.followUp('Reklama serwerowa została wysłana do gracza.');
        }
    }
});

client.login(TOKEN);
