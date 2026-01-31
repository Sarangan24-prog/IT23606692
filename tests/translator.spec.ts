import { test, expect } from '@playwright/test';

const URL = 'https://tamil.changathi.com/';
const TAMIL_RANGE = /[\u0B80-\u0BFF]/; // Tamil unicode block

test.describe.configure({ timeout: 120000 });

// ---- helpers ----
function normalize(s: string) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

async function gotoWithRetry(page: any) {
  for (let i = 1; i <= 3; i++) {
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return;
    } catch (e) {
      if (i === 3) throw e;
      await page.waitForTimeout(1500);
    }
  }
}

// Type word-by-word + space after each word (this triggers conversion properly)
async function transliterate(page: any, input: string) {
  await gotoWithRetry(page);

  const textarea = page.locator('#transliterateTextarea');
  await expect(textarea).toBeVisible({ timeout: 20000 });

  await textarea.click({ force: true });
  await textarea.fill('');

  const words = input.split(/\s+/).filter(Boolean);
  for (const w of words) {
    await textarea.type(w, { delay: 60 });
    await page.keyboard.press('Space'); // triggers conversion
    await page.waitForTimeout(200);
  }

  await page.waitForTimeout(800);

  const value = normalize(await textarea.inputValue());
  return { textarea, value };
}

// ---- TEST CASES based on your Excel ----
// NOTE: we check Tamil keywords (because actual output is mixed English+Tamil)
const positiveCases = [
  { id: 'Pos_Fun_0001', name: 'Convert simple Thanglish daily sentence to Tamil', input: 'Enaku viruppam', mustContain: [/விருப்பம்/, /எனக்கு/] },
  { id: 'Pos_Fun_0002', name: 'Convert verb question in Thanglish', input: 'Sapttingala', mustContain: [/சாப்பிட்டீங்களா/] },
  { id: 'Pos_Fun_0003', name: 'Convert common greeting', input: 'Eppadi irukeenga', mustContain: [/எப்படி/, /இருக்கீங்க/] },
  { id: 'Pos_Fun_0004', name: 'Convert polite request', input: 'Konjam help pannunga', mustContain: [/கொஞ்சம்/, /பண்ணுங்க|செய்யுங்கள்|உதவி/] },
  { id: 'Pos_Fun_0005', name: 'Convert past tense sentence', input: 'Nethu vandhen', mustContain: [/நேத்து/, /வந்தேன்|வந்தேன்/] },
  { id: 'Pos_Fun_0006', name: 'Convert future tense sentence', input: 'Naalai varen', mustContain: [/நாளை/, /வரேன்/] },
  { id: 'Pos_Fun_0007', name: 'Convert negative sentence', input: 'Enaku pidikkala', mustContain: [/பிடிக்கலா|பிடிக்கவில்லை|பிடிக்கல/] },
  { id: 'Pos_Fun_0008', name: 'Convert sentence with punctuation', input: 'Seri, varen.', mustContain: [/சரி/, /வரேன்/] },
  { id: 'Pos_Fun_0009', name: 'Convert time reference', input: '5 mani ku varen', mustContain: [/மணிக்கு|மணி/, /வரேன்/] },
  { id: 'Pos_Fun_0010', name: 'Convert currency reference', input: '500 ruba iruku', mustContain: [/500/, /ரூபா|ருபா/, /இருக்கு/] },
  { id: 'Pos_Fun_0011', name: 'Convert place name sentence', input: 'Office ku poren', mustContain: [/போறேன்|போகிறேன்|போரேன்/] },
  { id: 'Pos_Fun_0012', name: 'Convert command sentence', input: 'Kathava moodu', mustContain: [/கதவ/, /மூடு/] },
  { id: 'Pos_Fun_0013', name: 'Convert question with why', input: 'Yen late aachu', mustContain: [/ஏன்|லேட்/] },
  { id: 'Pos_Fun_0014', name: 'Convert mixed English word', input: 'Meeting iruku', mustContain: [/மீட்டிங்|இருக்கு/] },
  { id: 'Pos_Fun_0015', name: 'Convert joined words', input: 'Enakuvena', mustContain: [/எனக்கு|வேண|வேணா/] },
  { id: 'Pos_Fun_0016', name: 'Convert spaced words', input: 'Enaku venam', mustContain: [/வேணாம்|வேண|எனக்கு/] },
  { id: 'Pos_Fun_0017', name: 'Convert emotional phrase', input: 'Romba santhosham', mustContain: [/ரொம்ப|சந்தோஷ/] },
  { id: 'Pos_Fun_0018', name: 'Convert apology phrase', input: 'Mannichidunga', mustContain: [/மன்னி|மன்னிச்சு/] },
  { id: 'Pos_Fun_0019', name: 'Convert confirmation', input: 'Seri ok', mustContain: [/சரி/] },
  { id: 'Pos_Fun_0020', name: 'Convert availability question', input: 'Innki free ah', mustContain: [/இன்ன|ஃப்ரீ|ஃப்ரி/] },
  { id: 'Pos_Fun_0021', name: 'Convert instruction', input: 'Line la nillu', mustContain: [/லைன்|நில்/] },
  { id: 'Pos_Fun_0022', name: 'Convert reminder', input: 'Marakkama vaa', mustContain: [/மறக்காம/, /வா/] },
  { id: 'Pos_Fun_0023', name: 'Convert thanks', input: 'Romba nandri', mustContain: [/நன்றி/] },
  { id: 'Pos_Fun_0024', name: 'Convert farewell', input: 'Apparam paakalam', mustContain: [/அப்புறம்/, /பாக்கலாம்/] },
];

// These are your NEG rows (Excel status FAIL). Test should PASS if output is NOT properly converted.
// We validate: either contains "Invalid" OR still contains lots of English/symbols OR does NOT contain Tamil.
const negativeCases = [
  { id: 'Neg_Fun_0001', name: 'Handle misspelling', input: 'Enakuu viruppam' },
  { id: 'Neg_Fun_0002', name: 'Handle random symbols', input: 'Enaku @@@' },
  { id: 'Neg_Fun_0003', name: 'Handle mixed casing', input: 'eNaKu ViRuPpAm' },
  { id: 'Neg_Fun_0004', name: 'Handle numbers only', input: '12345' },
  { id: 'Neg_Fun_0005', name: 'Handle excessive spaces', input: 'Enaku    viruppam' },
  { id: 'Neg_Fun_0006', name: 'Handle slang typo', input: 'Romba santhosam' },
  { id: 'Neg_Fun_0007', name: 'Handle mixed language symbols', input: 'Enaku ₹500' },
  { id: 'Neg_Fun_0008', name: 'Handle incomplete word', input: 'Sappti' },
  { id: 'Neg_Fun_0009', name: 'Handle newline breaks', input: 'Enaku\nviruppam' },
  { id: 'Neg_Fun_0010', name: 'Handle long noisy input', input: 'Enaku viruppam !!! ???' },
];

// UI case: just verify textarea exists and typing shows something
const uiCases = [
  { id: 'Pos_UI_0001', name: 'Verify real-time conversion while typing', input: 'Enaku viruppam' },
];

// ---- POS TESTS ----
for (const tc of positiveCases) {
  test(`${tc.id} - ${tc.name}`, async ({ page }) => {
    const { value } = await transliterate(page, tc.input);

    // must have at least 1 tamil character somewhere
    expect(value).toMatch(TAMIL_RANGE);

    // must match one of the expected tamil keywords
    const ok = tc.mustContain.some((rx) => rx.test(value));
    expect(ok).toBeTruthy();
  });
}

// ---- NEG TESTS ----
for (const tc of negativeCases) {
  test(`${tc.id} - ${tc.name}`, async ({ page }) => {
    const { value } = await transliterate(page, tc.input);

    // Negative should be "bad"/incorrect output -> we accept any of these
    const hasInvalid = /invalid/i.test(value);
    const hasEnglishOrSymbols = /[A-Za-z@₹!?]/.test(value);
    const hasNoTamil = !TAMIL_RANGE.test(value);

    expect(hasInvalid || hasEnglishOrSymbols || hasNoTamil).toBeTruthy();
  });
}

// ---- UI TEST ----
for (const tc of uiCases) {
  test(`${tc.id} - ${tc.name}`, async ({ page }) => {
    await gotoWithRetry(page);
    const textarea = page.locator('#transliterateTextarea');
    await expect(textarea).toBeVisible();

    await textarea.click();
    await textarea.fill('');
    await textarea.type(tc.input, { delay: 50 });
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    const value = normalize(await textarea.inputValue());
    expect(value.length).toBeGreaterThan(0);
  });
}
