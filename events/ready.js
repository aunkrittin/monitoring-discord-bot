const { ActivityType } = require("discord.js");
const serverMonitor = require("./serverMonitor");

module.exports = async (client) => {
  console.log(
    `Logged to the client ${client.user.username}\n-> Ready on ${client.guilds.cache.size} servers for a total of ${client.users.cache.size} users`
  );

  client.user.setActivity({
    name: "HomeLab Main Server",
    type: ActivityType.Watching,
    // url: "https://www.twitch.tv/icutmyhair_",
  });

  // Ensure all async functions are awaited
  // await anotherAsyncFunction(client); // example async function
  
  // Uncomment these lines if you need to bulk delete messages
  // const channel = client.channels.cache.get("1250319312242348083");
  // const fetched = await channel.messages.fetch({ limit: 100 });
  // const filtered = fetched.filter((m) => m.id !== "1090453725484683284");
  // channel.bulkDelete(filtered);

  await serverMonitor(client);
};
