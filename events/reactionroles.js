const { Client, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const { reactionRolesCollection } = require('../mongodb');
const { DiscordAPIError } = require('discord.js');

module.exports = (client) => {

    client.on('interactionCreate', async (interaction) => {

        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const { customId, guild, user } = interaction;

        try {
            const member = await guild.members.fetch(user.id);

            if (interaction.isButton()) {

                if (customId.startsWith('reaction_role_')) {
                    const roleId = customId.split('reaction_role_')[1];

                    const role = guild.roles.cache.get(roleId);
                    if (!role) {
                        return interaction.reply({
                            content: '❌ This role no longer exists.',
                            ephemeral: true
                        });
                    }

                    if (!guild.members.me.permissions.has('ManageRoles')) {
                        return interaction.reply({
                            content: '❌ I don\'t have permission to manage roles.',
                            ephemeral: true
                        });
                    }

                    if (role.position >= guild.members.me.roles.highest.position) {
                        return interaction.reply({
                            content: `❌ I can't manage the role **${role.name}** because it's positioned higher than or equal to my highest role.`,
                            ephemeral: true
                        });
                    }

                    try {
                        if (member.roles.cache.has(role.id)) {
                            await member.roles.remove(role);
                            return interaction.reply({
                                content: `🗑️ Removed role **${role.name}**`,
                                ephemeral: true
                            });
                        } else {
                            await member.roles.add(role);
                            return interaction.reply({
                                content: `✅ Added role **${role.name}**`,
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        console.error('Error managing role:', error);
                        return interaction.reply({
                            content: `❌ Failed to toggle role **${role.name}**. Please contact an administrator.`,
                            ephemeral: true
                        });
                    }
                }
            }

            if (interaction.isStringSelectMenu()) {
                if (customId.startsWith('reaction_role_select_')) {
                    const roleId = interaction.values[0];
                    const member = interaction.member;

                    try {
                        const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
                        if (!role) return interaction.reply({ content: '❌ This role no longer exists.', ephemeral: true });

                        if (member.roles.cache.has(roleId)) {
                            await member.roles.remove(roleId).catch(() => {});
                            return interaction.reply({ content: `✅ Removed the ${role.name} role.`, ephemeral: true });
                        } else {
                            await member.roles.add(roleId).catch(() => {});
                            return interaction.reply({ content: `✅ Added the ${role.name} role.`, ephemeral: true });
                        }
                    } catch (err) {
                        console.error('Error toggling role:', err);
                        return interaction.reply({ content: '❌ An error occurred while toggling the role.', ephemeral: true });
                    }
                }
            }
        } catch (err) {
            console.error('Error in reaction role interaction:', err);

            if (err instanceof DiscordAPIError) {
                if (err.code === 50013) {
                    return interaction.reply({
                        content: '❌ I don\'t have the required permissions to manage roles.',
                        ephemeral: true
                    });
                }
            }

            return interaction.reply({
                content: '❌ An error occurred while managing the reaction role.',
                ephemeral: true
            });
        }
    });

    // Cleanup handlers
    client.on('guildDelete', async (guild) => {
        try {
            await reactionRolesCollection.deleteMany({ serverId: guild.id });
        } catch (err) {
            console.error(`Error cleaning up reaction roles for guild ${guild.id}:`, err);
        }
    });

    client.on('channelDelete', async (channel) => {
        try {
            await reactionRolesCollection.deleteMany({ channelId: channel.id });
        } catch (err) {
            console.error(`Error cleaning up reaction roles for channel ${channel.id}:`, err);
        }
    });

    client.on('messageDelete', async (message) => {
        try {
            await reactionRolesCollection.deleteMany({ messageId: message.id });
        } catch (err) {
            console.error(`Error cleaning up reaction roles for message ${message.id}:`, err);
        }
    });
};
