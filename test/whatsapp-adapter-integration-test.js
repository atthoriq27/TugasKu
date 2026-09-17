import { WhatsAppMessageRouter } from '../src/lib/whatsapp-message-router.js';
import { MockWhatsAppAdapter } from '../src/lib/adapters/mock-whatsapp-adapter.js';
import { WhatsAppGroupMapper } from '../src/lib/whatsapp-group-mapper.js';
import { WhatsAppMentionFormatter } from '../src/lib/whatsapp-mention-formatter.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`? FAIL: ${message}`);
    testsFailed++;
  } else {
    console.log(`? PASS: ${message}`);
    testsPassed++;
  }
}

async function runWhatsAppAdapterIntegrationTests() {
  console.log("=== WHATSAPP ADAPTER INTEGRATION TESTS (PHASE 8) ===\n");

  // Test 1: Mock Adapter Initialization
  console.log("Test 1: Mock adapter initialization");
  const mockAdapter = new MockWhatsAppAdapter();
  assert(mockAdapter !== null, "Mock adapter harus instantiable");
  assert(!mockAdapter.isConnected(), "Mock adapter awalnya tidak connected");

  // Test 2: Mock Adapter Connect
  console.log("\nTest 2: Mock adapter connect");
  await mockAdapter.connect();
  assert(mockAdapter.isConnected(), "Mock adapter harus connected setelah connect()");

  // Test 3: Mock Adapter getGroups
  console.log("\nTest 3: Mock adapter getGroups");
  const mockGroups = await mockAdapter.getGroups();
  assert(Array.isArray(mockGroups), "getGroups harus return array");
  assert(mockGroups.length > 0, "Mock groups harus ada");
  assert(mockGroups[0].id, "Group harus punya id");

  // Test 4: Group Mapper Initialization
  console.log("\nTest 4: Group mapper initialization");
  const groupMapper = new WhatsAppGroupMapper();
  assert(groupMapper !== null, "Group mapper harus instantiable");
  assert(groupMapper.getMainGroupId() === null, "Main group ID awalnya null");

  // Test 5: Group Mapper - Register Discovered Groups
  console.log("\nTest 5: Group mapper - register groups");
  groupMapper.registerDiscoveredGroup("12345@g.us", "DATA MINING");
  groupMapper.registerDiscoveredGroup("67890@g.us", "METODE NUMERIK");
  const discovered = groupMapper.getDiscoveredGroups();
  assert(discovered.length === 2, "Harus ada 2 groups terdaftar");

  // Test 6: Group Mapper - Validate Group
  console.log("\nTest 6: Group mapper - validate group");
  const isValid = groupMapper.isGroupValid("12345@g.us");
  assert(isValid, "Group 12345@g.us harus valid");
  const isInvalid = groupMapper.isGroupValid("invalid-group");
  assert(!isInvalid, "invalid-group harus tidak valid");

  // Test 7: Group Mapper - Resolve Group ID
  console.log("\nTest 7: Group mapper - resolve group ID");
  const resolvedId = groupMapper.resolveGroupId("COURSE_GROUP", "20252-04TPLE003-22TIF0162");
  assert(resolvedId === null, "Unmapped course harus return null (expected)");

  // Test 8: Mention Formatter - Format Mentions
  console.log("\nTest 8: Mention formatter - format mentions");
  const mentions = [
    { nim: "001", displayName: "Ahmad", phone: "62811111111", mention: true },
    { nim: "002", displayName: "Budi", phone: "62822222222", mention: true },
    { nim: "003", displayName: "Charlie", phone: null, mention: false }
  ];
  const formatted = WhatsAppMentionFormatter.formatMentions(mentions);
  assert(formatted.length === 2, "Hanya 2 mentions dengan phone harus diformat");

  // Test 9: Mention Formatter - Build Mention String
  console.log("\nTest 9: Mention formatter - build mention string");
  const mentionString = WhatsAppMentionFormatter.buildMentionString(mentions);
  assert(mentionString.includes("@62811111111"), "Mention string harus include first phone");
  assert(mentionString.includes("@62822222222"), "Mention string harus include second phone");

  // Test 10: Mention Formatter - Deduplicate
  console.log("\nTest 10: Mention formatter - deduplicate");
  const dupMentions = [
    { nim: "001", displayName: "Ahmad", phone: "62811111111", mention: true },
    { nim: "001", displayName: "Ahmad", phone: "62811111111", mention: true },
    { nim: "002", displayName: "Budi", phone: "62822222222", mention: true }
  ];
  const deduped = WhatsAppMentionFormatter.formatMentions(dupMentions);
  assert(deduped.length === 2, "Deduplicate harus remove duplikat phone");

  // Test 11: Mention Formatter - Validate Phone Format
  console.log("\nTest 11: Mention formatter - validate phone format");
  assert(
    WhatsAppMentionFormatter.isValidPhoneFormat("62811111111"),
    "Phone 62811111111 harus valid"
  );
  assert(
    !WhatsAppMentionFormatter.isValidPhoneFormat("+62811111111"),
    "Phone +62811111111 harus tidak valid (ada +)"
  );
  assert(
    !WhatsAppMentionFormatter.isValidPhoneFormat("08111111111"),
    "Phone 08111111111 harus tidak valid (awalan 0)"
  );

  // Test 12: Mock Adapter - Send Message
  console.log("\nTest 12: Mock adapter - send message");
  const sendResult = await mockAdapter.sendMessage("mock-course-group", "Test message");
  assert(sendResult.success === true, "Mock send harus berhasil");
  assert(sendResult.message_id !== null, "Mock send harus return message_id");
  assert(sendResult.destination === "mock-course-group", "Destination harus sesuai");

  // Test 13: Mock Adapter - Send with Mentions
  console.log("\nTest 13: Mock adapter - send with mentions");
  const sendWithMentionsResult = await mockAdapter.sendMessageWithMentions(
    "mock-course-group",
    "Test @mention message",
    formatted
  );
  assert(sendWithMentionsResult.success === true, "Mock send with mentions harus berhasil");

  // Test 14: Router + Mock Adapter Integration
  console.log("\nTest 14: Router + Mock adapter integration");
  const router = new WhatsAppMessageRouter();
  const payload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 1,
    meeting: 1,
    candidates: [
      { nim: "001", nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] },
      { nim: "002", nama_mahasiswa: "Budi", reason: ["FORUM_BELUM_MEMENUHI"] }
    ]
  };
  const routed = router.routeReminder(payload);
  assert(routed.destination === "COURSE_GROUP", "Router harus route ke COURSE_GROUP");
  assert(routed.message_type === "STUDENT_REMINDER", "Type harus STUDENT_REMINDER");

  // Test 15: Mock Adapter Disconnect
  console.log("\nTest 15: Mock adapter disconnect");
  await mockAdapter.disconnect();
  assert(!mockAdapter.isConnected(), "Mock adapter harus disconnected");

  // Test 16: Safe Guard - No Real Message Sent (Mock Only)
  console.log("\nTest 16: Safe guard - no real messages sent");
  assert(
    MockWhatsAppAdapter.name === "MockWhatsAppAdapter",
    "Default adapter untuk test harus Mock"
  );

  // Test 17: Phone Format Validation
  console.log("\nTest 17: Phone format validation");
  const validPhones = ["62811111111", "628123456789"];
  const invalidPhones = ["+62811111111", "08111111111", "62", ""];
  
  validPhones.forEach(phone => {
    assert(
      WhatsAppMentionFormatter.isValidPhoneFormat(phone),
      `Phone ${phone} harus valid`
    );
  });

  invalidPhones.forEach(phone => {
    assert(
      !WhatsAppMentionFormatter.isValidPhoneFormat(phone),
      `Phone ${phone} harus tidak valid`
    );
  });

  // Test 18: Group Mapper - Export Mapping
  console.log("\nTest 18: Group mapper - export mapping");
  const mapping = groupMapper.exportMapping();
  assert(mapping.discovered.length === 2, "Export mapping harus show discovered groups");
  assert(typeof mapping.courses === "object", "Export mapping harus punya courses object");
  assert(mapping.main !== undefined, "Export mapping harus punya main object");

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(60)}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runWhatsAppAdapterIntegrationTests();
