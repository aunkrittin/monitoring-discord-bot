const { ActivityType } = require("discord.js");
const serverMonitor = require("./serverMonitor");

module.exports = async (client) => {
  console.log(
    `Logged to the client ${client.user.username}\n-> Ready on ${client.guilds.cache.size} servers for a total of ${client.users.cache.size} users`
  );

  client.user.setActivity({
    name: "HomeLab Main Server",
    type: ActivityType.Watching,
  });

  await serverMonitor(client);
};
