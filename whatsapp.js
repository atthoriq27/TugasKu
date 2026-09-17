import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WhatsAppMessageRouter } from "./src/lib/whatsapp-message-router.js";
import { MockWhatsAppAdapter } from "./src/lib/adapters/mock-whatsapp-adapter.js";
import { PlaywrightWhatsAppAdapter } from "./src/lib/adapters/playwright-whatsapp-adapter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const isPreview = process.argv.includes("--preview");
  const isDryRun = process.argv.includes("--dry-run");
  const isLive = process.argv.includes("--live");

  if (!isPreview && !isDryRun && !isLive) {
    console.log("\n?? TUGASKU WHATSAPP ADAPTER\n");
    console.log("Gunakan salah satu mode:");
    console.log("  node whatsapp.js --preview     : Tampil format pesan (mock)");
    console.log("  node whatsapp.js --dry-run     : Simulasi pengiriman (mock)");
    console.log("  node whatsapp.js --live        : Pengiriman nyata ke WhatsApp (Playwright)\n");
    return;
  }

  const router = new WhatsAppMessageRouter();

  const mockReminderPayload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 1,
    meeting: 1,
    candidates: [
      { nim: "123", nama_mahasiswa: "Ahmad Zacky", reason: ["BELUM_POSTTEST"] },
      { nim: "124", nama_mahasiswa: "Budi Santoso", reason: ["FORUM_BELUM_MEMENUHI"] }
    ]
  };

  const routedMessage = router.routeReminder(mockReminderPayload);

  if (isPreview) {
    console.log("\n" + "=".repeat(70));
    console.log("?? TUGASKU WHATSAPP PREVIEW");
    console.log("=".repeat(70) + "\n");
    console.log(`Destination: ${routedMessage.destination}`);
    console.log(`Course: ${routedMessage.course_id}`);
    console.log(`Group ID: ${routedMessage.group_id || "Not configured"}\n`);
    console.log(`Message Type: ${routedMessage.message_type}\n`);
    console.log("Message Preview:\n");
    console.log(routedMessage.message + "\n");
    console.log(`Mentions: ${routedMessage.mentions.length} students\n`);
    console.log("=".repeat(70) + "\n");
    return;
  }

  if (isDryRun) {
    console.log("\n" + "=".repeat(70));
    console.log("?? TUGASKU WHATSAPP DRY-RUN (Mock Adapter)");
    console.log("=".repeat(70) + "\n");

    const adapter = new MockWhatsAppAdapter();
    await adapter.connect();

    const targetGroup = routedMessage.group_id || "mock-course-group";

    try {
      const result = await adapter.sendMessageWithMentions(
        targetGroup,
        routedMessage.message,
        routedMessage.mentions
      );

      console.log("Dry-Run Result:");
      console.log(JSON.stringify(result, null, 2));
      console.log("\n" + "=".repeat(70) + "\n");
    } catch (err) {
      console.error("Dry-Run Error:", err.message);
    } finally {
      await adapter.disconnect();
    }
    return;
  }

  if (isLive) {
    console.log("\n" + "=".repeat(70));
    console.log("?? LIVE MODE - Real WhatsApp Adapter (Playwright)");
    console.log("=".repeat(70));
    console.log("\n??  WARNING: This will connect to real WhatsApp Web");
    console.log("?? Be prepared to scan QR code on your WhatsApp mobile device\n");
    console.log("=".repeat(70) + "\n");

    const adapter = new PlaywrightWhatsAppAdapter();

    try {
      // Connect (triggers QR scan if needed)
      const connected = await adapter.connect();

      if (!connected) {
        console.error("? Failed to connect to WhatsApp");
        return;
      }

      // Show discovered groups
      const groups = await adapter.getGroups();
      console.log("?? Available Groups:");
      groups.forEach((g, i) => {
        console.log(`  ${i + 1}. ${g.name} (${g.id})`);
      });
      console.log("");

      // Show group mapping suggestions
      const mapper = adapter.getGroupMapper();
      const suggestions = mapper.suggestMapping(groups);

      if (suggestions.length > 0) {
        console.log("?? Group Mapping Suggestions:");
        suggestions.forEach(s => {
          console.log(`  • ${s.type}: ${s.suggestedName} ? ${s.suggestedGroupId}`);
        });
        console.log(
          "\nUpdate config/whatsapp-groups.json dengan mapping di atas\n"
        );
      }

      // For demo purposes, show what WOULD be sent (don't actually send)
      const targetGroup = routedMessage.group_id;

      if (targetGroup) {
        console.log("?? Ready to send to configured group:");
        console.log(`  Group ID: ${targetGroup}`);
        console.log(`  Message: ${routedMessage.message.substring(0, 50)}...\n`);
        console.log(
          "??  NOT SENDING (safety mode) - Update whatsapp-groups.json with actual group IDs first\n"
        );
      } else {
        console.log("??  No group ID configured in whatsapp-groups.json");
        console.log(
          "   Update config with the mapping suggestions above first\n"
        );
      }

      await adapter.disconnect();
    } catch (error) {
      console.error("? Live mode error:", error.message);
    }
  }
}

main().catch(console.error);
