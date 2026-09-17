import { randomUUID } from "crypto";
import { WhatsAppAdapter } from "../whatsapp-adapter.js";

export class MockWhatsAppAdapter extends WhatsAppAdapter {
  constructor() {
    super();
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    return true;
  }

  async disconnect() {
    this.connected = false;
    return true;
  }

  async getGroups() {
    return [
      { id: "mock-main-group", name: "KELAS TIF" },
      { id: "mock-course-group", name: "DATA MINING" }
    ];
  }

  async sendMessage(groupId, text) {
    if (!this.connected) throw new Error("Adapter not connected");
    if (!groupId) throw new Error("Destination group required");

    console.log(`\n[MOCK WHATSAPP SEND]\nGroup: ${groupId}\nMessage:\n${text}\n`);

    return {
      success: true,
      message_id: `mock-msg-${randomUUID()}`,
      destination: groupId,
      sent_at: new Date().toISOString(),
      error: null
    };
  }

  async sendMessageWithMentions(groupId, text, mentions) {
    if (!this.connected) throw new Error("Adapter not connected");
    if (!groupId) throw new Error("Destination group required");

    console.log(`\n[MOCK WHATSAPP SEND WITH MENTIONS]\nGroup: ${groupId}`);
    console.log(`Mentions: ${mentions.map(m => m.name).join(", ")}`);
    console.log(`Message:\n${text}\n`);

    return {
      success: true,
      message_id: `mock-msg-mention-${randomUUID()}`,
      destination: groupId,
      sent_at: new Date().toISOString(),
      error: null
    };
  }

  isConnected() {
    return this.connected;
  }
}

export default MockWhatsAppAdapter;
