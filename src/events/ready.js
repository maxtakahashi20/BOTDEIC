module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    // eslint-disable-next-line no-console
    console.log(`✅ Logado como ${client.user.tag}`);
  }
};
