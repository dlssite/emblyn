/*

☆.。.:*・°☆.。.:*・°☆.。.:*・°☆.。.:*・°☆
                                                 
  _________ ___ ___ ._______   _________    
 /   _____//   |   \|   \   \ /   /  _  \   
 \_____  \/    ~    \   |\   Y   /  /_\  \  
 /        \    Y    /   | \     /    |    \ 
/_______  /\___|_  /|___|  \___/\____|__  / 
        \/       \/                     \/  
                    
DISCORD :  https://discord.com/invite/xQF9f9yUEM                   
YouTube : https://www.youtube.com/@Katsumi_Studio                         

Command Verified : ✓  
Website        : ssrr.tech  
Test Passed    : ✓

☆.。.:*・°☆.。.:*・°☆.。.:*・°☆.。.:*・°☆
*/


const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { hentaiCommandCollection } = require('../../mongodb'); 
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-hentai')
        .setDescription('Configure or view hentai commands configuration')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        // Subcommand to set (enable/disable) hentai commands.
        .addSubcommand(sub =>
            sub
                .setName('set')
                .setDescription('Enable or disable hentai commands for a specific channel')
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable (true) or disable (false) hentai commands')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel where hentai commands will be allowed')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        // Subcommand to view the current configuration.
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View the current hentai commands configuration')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const subcommand = interaction.options.getSubcommand();
            const serverId = interaction.guild.id;
            const guild = interaction.guild;
            if (!await checkPermissions(interaction)) return;
            if (subcommand === 'set') {
                // Permission check
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('You do not have permission to use this command.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }
                
                const status = interaction.options.getBoolean('status');
                const channel = interaction.options.getChannel('channel');

                if (status === null) {
                    return interaction.reply({
                        content: 'Invalid input. Please provide a valid status.',
                        flags: 64
                    });
                }
                
                const serverId = interaction.guild.id; 
                const guild = interaction.guild;
            

                const serverOwnerId = guild.ownerId;
                await hentaiCommandCollection.updateOne(
                    { serverId },
                    { $set: { serverId, status, ownerId: serverOwnerId, channelId: channel.id } },
                    { upsert: true }
                );
                
                const replyMessage = status
                    ? `Hentai commands have been **enabled** for ${channel}.`
                    : 'Hentai commands have been **disabled**.';

                return interaction.reply({
                    content: replyMessage,
                    flags: 64
                });

            } else if (subcommand === 'view') {
                const configData = await hentaiCommandCollection.findOne({ serverId });
                let description;
                if (configData) {
                    const channel = configData.channelId ? `<#${configData.channelId}>` : 'Not set';
                    description = `**Status:** ${configData.status ? 'Enabled' : 'Disabled'}\n**Channel:** ${channel}\n**Owner ID:** ${configData.ownerId}`;
                } else {
                    description = 'No configuration found. Please set up hentai commands using `/setup-hentai set`.';
                }
                
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('Hentai Commands Configuration')
                    .setDescription(description)
                    .setTimestamp();
                    
                return interaction.reply({ embeds: [embed], flags: 64 });
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/sanctyr"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-hentai`')
                .setTimestamp();
    
            await interaction.reply({ embeds: [embed] });
        }
    }
};
