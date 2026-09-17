export class WhatsAppMentionFormatter {
  /**
   * Format mention array untuk WhatsApp Web API
   * Input: array of {nim, displayName, phone, mention}
   * Output: deduplicated phone numbers untuk mention
   */
  static formatMentions(mentions) {
    if (!mentions || !Array.isArray(mentions)) {
      return [];
    }

    const phoneSet = new Set();
    const formatted = [];

    for (const mention of mentions) {
      if (!mention.phone || !mention.mention) {
        continue;
      }

      // Deduplicate by phone
      if (!phoneSet.has(mention.phone)) {
        phoneSet.add(mention.phone);
        formatted.push({
          phone: mention.phone,
          displayName: mention.displayName || `NIM: ${mention.nim}`,
          nim: mention.nim
        });
      }
    }

    return formatted;
  }

  /**
   * Build mention string untuk pesan format
   * Contoh: "@62811111111 @62822222222"
   */
  static buildMentionString(mentions) {
    if (!mentions || mentions.length === 0) {
      return "";
    }

    const deduped = this.formatMentions(mentions);
    return deduped.map(m => `@${m.phone}`).join(" ");
  }

  /**
   * Validate phone format (harus awalan 62, no + atau 0)
   */
  static isValidPhoneFormat(phone) {
    if (!phone || typeof phone !== "string") {
      return false;
    }

    // Must start with 62, followed by digits
    return /^62\d{9,}$/.test(phone);
  }

  /**
   * Get unique contact list dari mentions
   * Gunakan untuk getContacts() API call
   */
  static getUniqueContacts(mentions) {
    const contacts = new Map();

    if (!mentions || !Array.isArray(mentions)) {
      return Array.from(contacts.values());
    }

    for (const mention of mentions) {
      if (mention.phone && !contacts.has(mention.phone)) {
        contacts.set(mention.phone, {
          phone: mention.phone,
          displayName: mention.displayName || `NIM: ${mention.nim}`,
          nim: mention.nim
        });
      }
    }

    return Array.from(contacts.values());
  }

  /**
   * Log mention stats untuk debugging
   */
  static logMentionStats(mentions) {
    if (!mentions || mentions.length === 0) {
      console.log("?? Mention stats: 0 mentions");
      return;
    }

    const deduped = this.formatMentions(mentions);
    const withPhone = mentions.filter(m => m.phone).length;
    const missingPhone = mentions.filter(m => !m.phone).length;

    console.log(`?? Mention stats:`);
    console.log(`   Total: ${mentions.length}`);
    console.log(`   With phone: ${withPhone}`);
    console.log(`   Missing phone: ${missingPhone}`);
    console.log(`   After deduplicate: ${deduped.length}`);
  }
}

export default WhatsAppMentionFormatter;
