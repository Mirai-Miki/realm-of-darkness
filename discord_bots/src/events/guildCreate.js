"use strict";
require(`${process.cwd()}/alias`);
const { Events, GatewayIntentBits } = require("discord.js");
const setActivity = require("@modules/setActivity");
const API = require("@api");

module.exports = {
  name: Events.GuildCreate,
  once: false,
  async execute(guild) {
    await setActivity(guild.client);
    await API.updateGuild(guild);

    if (!guild.client.options.intents.has(GatewayIntentBits.GuildMembers)) {
      return;
    }

    // Update all existing guild members to create member relations
    try {
      // Fetch all members of the guild
      const members = await guild.members.fetch();

      // Process members in batches to avoid overwhelming the API
      const batchSize = 50;
      const memberArray = Array.from(members.values());

      for (let i = 0; i < memberArray.length; i += batchSize) {
        const batch = memberArray.slice(i, i + batchSize);

        // Process batch in parallel
        const promises = batch.map(async (member) => {
          // Skip bots
          if (member.user.bot) return;

          try {
            // Update user with create = false to only link existing users
            const CREATE_USER = false; // Indicates that only existing users should be linked
            await API.updateUser(member, CREATE_USER);
          } catch (error) {
            console.error(
              `Failed to update member during GuildCreate ${member.user.username} (${member.user.id}):`,
              error
            );
          }
        });

        await Promise.all(promises);

        // Add a small delay between batches to be respectful to the API
        if (i + batchSize < memberArray.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Clear the members cache to free up memory for large guilds
      guild.members.cache.clear();
    } catch (error) {
      console.error(
        `Error updating members for guildCreate ${guild.name} (${guild.id}):`,
        error
      );
    }
  },
};
