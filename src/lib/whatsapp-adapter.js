export class WhatsAppAdapter {
  async connect() {
    throw new Error("Method not implemented.");
  }

  async disconnect() {
    throw new Error("Method not implemented.");
  }

  async getGroups() {
    throw new Error("Method not implemented.");
  }

  async sendMessage(groupId, text) {
    throw new Error("Method not implemented.");
  }

  async sendMessageWithMentions(groupId, text, mentions) {
    throw new Error("Method not implemented.");
  }

  isConnected() {
    throw new Error("Method not implemented.");
  }
}

export default WhatsAppAdapter;
