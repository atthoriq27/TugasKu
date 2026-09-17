import { chromium } from "playwright";
import path from "path";
import WhatsAppAdapter from "../whatsapp-adapter.js";
import WhatsAppSessionManager from "./whatsapp-session-manager.js";
import WhatsAppGroupMapper from "../whatsapp-group-mapper.js";
import WhatsAppMentionFormatter from "../whatsapp-mention-formatter.js";

export class PlaywrightWhatsAppAdapter extends WhatsAppAdapter {
  constructor({ sessionDir = null, groupsConfigPath = null } = {}) {
    super();
    
    this.browser = null; // In persistent context, this refers to the context itself
    this.page = null;
    this.context = null;
    this.connected = false;
    
    this.sessionManager = new WhatsAppSessionManager(sessionDir);
    this.groupMapper = new WhatsAppGroupMapper(groupsConfigPath);
    this.mentionFormatter = WhatsAppMentionFormatter;
    
    // Setup persistent user data directory
    this.userDataDir = path.join(this.sessionManager.getSessionDirectory(), "browser-data");
    
    this.loginTimeout = 120000;
    this.messageTimeout = 30000;
    this.rateLimitDelay = 5000;
    
    this.lastMessageTime = 0;

    this.selectors = {
      authenticated: {
        primary: '[data-testid="side"]',
        fallback: '#side, [data-testid="intro-text"], #pane-side' 
      },
      loading: {
        primary: '[data-testid="loading-screen"]',
        fallback: 'progress, [data-testid="initial-sync-message"]'
      },
      chatList: {
        primary: '[role="gridcell"]',
        fallback: '[data-testid="chat-list-item"], #pane-side > div > div > div > div'
      },
      messageInput: {
        primary: '[data-testid="msg-input"]',
        fallback: 'footer input, [contenteditable="true"]'
      },
      qrCode: {
        primary: 'canvas[aria-label*="QR"]',
        fallback: 'canvas'
      }
    };
  }

  async findElement(selectorConfig, timeout = 10000) {
    try {
      return await this.page.waitForSelector(selectorConfig.primary, { timeout });
    } catch (e) {
      console.warn(`⚠️  Primary selector failed: ${selectorConfig.primary}, trying fallback...`);
      try {
        return await this.page.waitForSelector(selectorConfig.fallback, { timeout });
      } catch (e2) {
        throw new Error(`All selectors failed: ${selectorConfig.primary} and ${selectorConfig.fallback}`);
      }
    }
  }

  async connect() {
    try {
      console.log("\n📱 Connecting to WhatsApp Web (Persistent Session)...\n");
      
      // Use launchPersistentContext to automatically manage cookies, localStorage and cache
      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        headless: false,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage"
        ],
        viewport: { width: 1280, height: 720 }
      });

      // Get existing page or create new one
      this.page = this.context.pages()[0] || await this.context.newPage();

      await this.page.goto("https://web.whatsapp.com/", { waitUntil: "networkidle" });
      
      await this.waitForAuth();
      await this.discoverGroups();
      
      this.connected = true;
      console.log("✓ Successfully connected to WhatsApp\n");
      return true;
    } catch (error) {
      console.error("❌ Connection failed:", error.message);
      await this.cleanup();
      return false;
    }
  }

  async waitForAuth() {
    try {
      console.log("🔍 Detecting authentication state...");
      const state = await Promise.race([
        this.page.waitForSelector(this.selectors.authenticated.primary, { timeout: 20000 }).then(() => 'AUTH'),
        this.page.waitForSelector(this.selectors.authenticated.fallback, { timeout: 20000 }).then(() => 'AUTH'),
        this.page.waitForSelector(this.selectors.qrCode.primary, { timeout: 15000 }).then(() => 'QR'),
        this.page.waitForSelector(this.selectors.loading.primary, { timeout: 15000 }).then(() => 'LOADING')
      ]).catch(() => 'UNKNOWN');

      if (state === 'AUTH') {
        console.log("✓ Already authenticated (Session restored)\n");
        return true;
      }
      
      if (state === 'LOADING') {
        console.log("⏳ WhatsApp is loading/syncing, waiting...");
        await this.page.waitForSelector(this.selectors.authenticated.primary, { timeout: 60000 });
        return true;
      }
      
      console.log("📲 Session not found or expired. Waiting for QR code scan...");
      await Promise.race([
        this.page.waitForSelector(this.selectors.authenticated.primary, { timeout: this.loginTimeout }),
        this.page.waitForSelector(this.selectors.authenticated.fallback, { timeout: this.loginTimeout })
      ]);
      
      console.log("✓ Authentication successful. Session will be saved automatically.\n");
      return true;
    } catch (error) {
      console.error("Authentication timeout/error:", error.message);
      throw error;
    }
  }

  async discoverGroups() {
    try {
      console.log("🔍 Discovering WhatsApp groups...\n");
      const sidebarSelector = '#pane-side';
      await this.page.waitForSelector(sidebarSelector, { timeout: 10000 }).catch(() => {});

      await this.page.evaluate(async (selector) => {
        const sidebar = document.querySelector(selector);
        if (!sidebar) return;
        let lastHeight = 0;
        let attempts = 0;
        while (attempts < 5) {
          sidebar.scrollTop += 500;
          await new Promise(r => setTimeout(r, 800));
          if (sidebar.scrollTop === lastHeight) break;
          lastHeight = sidebar.scrollTop;
          attempts++;
        }
        sidebar.scrollTop = 0;
      }, sidebarSelector);

      const chats = await this.page.evaluate(() => {
        const results = [];
        const elements = document.querySelectorAll('div[data-chat-id], div[data-testid="chat-list-item"], div[role="row"]');
        elements.forEach(el => {
          const id = el.getAttribute('data-chat-id') || el.getAttribute('data-id') || null;
          const titleEl = el.querySelector('span[title]') || el.querySelector('div[title]');
          let name = titleEl ? titleEl.getAttribute('title') : null;
          if(!name && el.innerText) {
             const parts = el.innerText.split('\n');
             if(parts.length > 0) name = parts[0];
          }
          let cleanId = id;
          let isGroup = false;
          if (id && id.includes('@g.us')) {
             isGroup = true;
             const match = id.match(/([0-9-]{10,30}@g\.us)/);
             if (match) cleanId = match[1];
          }
          if (cleanId && name && isGroup) {
            results.push({ id: cleanId, name, isGroup });
          }
        });
        return results;
      });

      const uniqueGroups = new Map();
      chats.forEach(g => {
        if (!uniqueGroups.has(g.id)) uniqueGroups.set(g.id, g);
      });

      const groups = Array.from(uniqueGroups.values());
      console.log(`Found ${groups.length} groups:`);
      groups.forEach(g => {
        console.log(`  • ${g.name} (${g.id})`);
        this.groupMapper.registerDiscoveredGroup(g.id, g.name);
      });
      console.log("\n");
      return groups;
    } catch (error) {
      console.error("Error discovering groups:", error.message);
      return [];
    }
  }

  async getGroups() {
    if (!this.connected) throw new Error("Not connected");
    return this.groupMapper.getDiscoveredGroups();
  }

  async sendMessage(groupId, text) {
    if (!this.connected) throw new Error("Adapter not connected");
    const timeSinceLastMessage = Date.now() - this.lastMessageTime;
    if (timeSinceLastMessage < this.rateLimitDelay) {
      await this.page.waitForTimeout(this.rateLimitDelay - timeSinceLastMessage);
    }
    try {
      console.log(`\n📤 Sending message to group: ${groupId}`);
      if (!this.groupMapper.isGroupValid(groupId)) throw new Error(`Group ${groupId} not found`);
      await this.openGroupChat(groupId);
      const messageInput = await this.findElement(this.selectors.messageInput, 5000);
      await this.page.fill(this.selectors.messageInput.primary, text).catch(async () => {
        await this.page.fill(this.selectors.messageInput.fallback, text);
      });
      await this.page.press(this.selectors.messageInput.primary, 'Enter').catch(async () => {
        await this.page.press(this.selectors.messageInput.fallback, 'Enter');
      });
      await this.page.waitForTimeout(1000);
      this.lastMessageTime = Date.now();
      return { success: true, message_id: `msg-${Date.now()}`, destination: groupId, sent_at: new Date().toISOString(), error: null };
    } catch (error) {
      console.error(`✗ Failed to send message: ${error.message}`);
      return { success: false, message_id: null, destination: groupId, sent_at: new Date().toISOString(), error: error.message };
    }
  }

  async sendMessageWithMentions(groupId, text, mentions) {
    if (!this.connected) throw new Error("Adapter not connected");
    try {
      const deduped = this.mentionFormatter.formatMentions(mentions);
      console.log(`\n📤 Sending message with ${deduped.length} mentions to ${groupId}`);
      if (!this.groupMapper.isGroupValid(groupId)) throw new Error(`Group ${groupId} not found`);
      await this.openGroupChat(groupId);
      await this.page.fill(this.selectors.messageInput.primary, text).catch(async () => {
        await this.page.fill(this.selectors.messageInput.fallback, text);
      });
      await this.page.press(this.selectors.messageInput.primary, 'Enter').catch(async () => {
        await this.page.press(this.selectors.messageInput.fallback, 'Enter');
      });
      await this.page.waitForTimeout(1000);
      this.lastMessageTime = Date.now();
      return { success: true, message_id: `msg-${Date.now()}`, destination: groupId, sent_at: new Date().toISOString(), mentions_count: deduped.length, error: null };
    } catch (error) {
      console.error(`✗ Failed to send message with mentions: ${error.message}`);
      return { success: false, message_id: null, destination: groupId, sent_at: new Date().toISOString(), error: error.message };
    }
  }

  async openGroupChat(groupId) {
    try {
      await this.page.click(`div[data-chat-id$="${groupId}"]`).catch(async () => {
        const group = Array.from(this.groupMapper.discoveredGroups.values()).find(g => g.id === groupId);
        if (group && group.name) await this.page.click(`span[title="${group.name}"]`);
        else throw new Error("Selector fallback failed");
      });
      await this.findElement(this.selectors.messageInput, 5000);
      return true;
    } catch (error) {
      throw new Error(`Failed to open group chat ${groupId}: ${error.message}`);
    }
  }

  isConnected() { return this.connected && this.context !== null; }
  
  async disconnect() {
    try { 
      await this.cleanup(); 
      this.connected = false; 
      console.log("✓ Disconnected from WhatsApp\n"); 
      return true; 
    }
    catch (error) { 
      console.error("Error disconnecting:", error.message); 
      return false; 
    }
  }

  async cleanup() {
    try {
      if (this.page) { await this.page.close().catch(()=>{}); this.page = null; }
      if (this.context) { await this.context.close().catch(()=>{}); this.context = null; }
    } catch (error) {
      console.error("Error during cleanup:", error.message);
    }
  }
  
  getGroupMapper() { return this.groupMapper; }
  getSessionManager() { return this.sessionManager; }
}

export default PlaywrightWhatsAppAdapter;