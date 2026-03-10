import { Scene, SoftwareCategory } from "@/lib/server/pipeline/models";

/**
 * Topic bank: specific, vivid pain points organized by category.
 * Each generation run randomly selects a subset so scripts stay fresh.
 */
export const TOPIC_BANK: Record<SoftwareCategory, string[]> = {
  [SoftwareCategory.HR]: [
    // Onboarding
    "Spending 3+ hours per new hire just on paperwork — I-9s, W-4s, direct deposit forms, handbook acknowledgments",
    "New hires sitting idle on day one because nobody set up their system accounts or email",
    "I-9 compliance mistakes that lead to fines because someone forgot to verify documents within 3 days",
    "No way to track who completed required training modules — you just hope everyone did it",
    "Remote onboarding that's just emailing PDFs and hoping the new hire figures it out",
    "Losing offer letters and signed agreements because they were never digitized",
    // Payroll
    "Running payroll wrong and having to file corrected W-2s for half the company",
    "Multi-state tax compliance nightmares when employees moved during COVID and never moved back",
    "Misclassifying contractors vs employees and finding out during an audit",
    "Payroll takes two full days every other week because you're manually entering hours from timesheets",
    "Employees constantly asking where their paystubs are because there's no self-service portal",
    "Off-cycle paychecks for bonuses or corrections that require a completely manual process",
    // Benefits
    "Open enrollment is a three-week nightmare every year with paper forms and confused employees",
    "Employees picking the wrong health plan because nobody explained the options clearly",
    "ACA compliance tracking for part-time employees who might cross the hours threshold",
    "COBRA administration after terminations — missing the notification window means liability",
    "Benefits broker sends spreadsheets that never match what's in your system",
    // Time & Attendance
    "Buddy punching at hourly locations — one person clocking in for three",
    "Overtime calculations wrong because the system doesn't account for holidays or shift differentials",
    "PTO requests via email that get buried and forgotten until the employee just doesn't show up",
    "Managers rubber-stamping timesheets they never actually reviewed",
    "Three different locations using three different methods to track time — paper, app, and an old wall clock",
    // Compliance & Legal
    "Tracking FMLA leave on sticky notes and hoping you don't miscalculate the 12-week entitlement",
    "Missing the EEO-1 reporting deadline because nobody remembered it was coming",
    "Employee handbook that hasn't been updated in four years and still references policies you dropped",
    "State labor law changes you didn't hear about until after the fine showed up",
    "Audit comes and you can't find signed harassment training acknowledgments from two years ago",
    "No system to track workplace incidents or near-misses for OSHA compliance",
    // Employee Records
    "Filing cabinets full of paper employee files that take an hour to search through during an audit",
    "Three different versions of the same policy floating around — nobody knows which one is current",
    "Terminated employees' files mixed in with active employees because nobody cleaned up",
    "No centralized place for employee certifications, licenses, and expiration dates",
    "Manager asks for an org chart and you have to build one from scratch every single time",
    // Performance Management
    "Annual reviews where managers copy-paste last year's comments with the date changed",
    "No documentation trail when you finally need to terminate someone for poor performance",
    "Goals set in January that nobody looks at again until December — if ever",
    "High performers leaving because they never got meaningful feedback all year",
    "Managers avoiding difficult conversations because there's no structured framework",
    // Recruiting & Hiring
    "Resumes piling up in a shared email inbox — nobody knows who's reviewing what",
    "Ghosting qualified candidates because you lost track of where they were in the process",
    "Interview scheduling that takes more back-and-forth than the actual interview",
    "No way to compare candidates side by side — it's all gut feeling and sticky notes",
    "Job postings on five different sites with no centralized tracker for applicants",
    // Retention & Engagement
    "Exit interviews revealing problems you could have fixed six months ago if anyone had asked",
    "Turnover costing you six months' salary per person and leadership won't invest in retention tools",
    "Engagement surveys that get filed in a drawer and never acted on",
    "Stay interviews you keep meaning to do but never get around to because there's no process",
    "Your best people leaving for competitors who offer self-service HR and modern benefits portals",
    // Software Selection & Implementation
    "Locked into a 3-year contract with HR software that nobody on the team actually uses",
    "Paying for 50 features but your team only uses 3 of them",
    "Implementation that was supposed to take 6 weeks but dragged on for 6 months",
    "The demo looked incredible — then the actual product had half the features behind an upsell",
    "Support tickets that take a week to get a response while payroll is broken",
    "Switching HR software and losing historical data because the old vendor won't export it cleanly",
    // Scaling Challenges
    "What worked for 10 employees completely breaks at 50 — spreadsheets don't scale",
    "Growing past 50 employees and suddenly ACA reporting kicks in and you have no system for it",
    "First HR hire doesn't know which systems to pick because there are 200 options and every demo looks the same",
    "You've outgrown your payroll provider but the migration terrifies you",
    "Adding a second location and realizing your HR process was held together by one person who knew everything",
    // Industry-Specific
    "Restaurant with 40% annual turnover processing the same onboarding paperwork over and over",
    "Healthcare practice tracking license renewals for 30 providers on a spreadsheet that's always out of date",
    "Construction company with workers at 5 job sites and no centralized way to track certifications or safety training",
    "Retail chain scheduling 200 part-time employees across 8 locations with a shared Google Sheet",
    "Nonprofit trying to stay compliant with grant-funded position tracking using paper files",
  ],
  [SoftwareCategory.ACCOUNTING]: [
    "Month-end close taking two weeks because data lives in five different spreadsheets",
    "Sending invoices manually and chasing payments with reminder emails like it's 2005",
    "Receipt shoebox showing up at tax time because nobody logged expenses during the year",
    "Bank reconciliation that takes a full day because nothing auto-imports",
    "Misclassifying expenses and not finding out until your accountant calls in March",
    "Cash flow surprises because you can't see outstanding invoices vs upcoming bills in one view",
    "Accidentally paying a vendor twice because approvals happen over email with no tracking",
    "Multi-entity accounting across LLCs that requires logging into three different systems",
    "1099 preparation that's a scramble every January because contractor payments weren't tracked properly",
    "Inventory costs out of sync with your books because your POS and accounting system don't talk",
    "Growing past the point where QuickBooks can handle your complexity but not sure what's next",
    "Audit prep taking 80 hours because documentation lives in email threads and shared drives",
  ],
  [SoftwareCategory.PROJECT_MANAGEMENT]: [
    "Status updates that require a 45-minute meeting because nobody updates the project tracker",
    "Three tools for tasks, docs, and chat — none of them connected, all of them half-used",
    "Project deadlines missed because dependencies weren't visible until it was too late",
    "Resource allocation by gut feeling because you can't see who's overloaded and who has capacity",
    "Client projects going over budget because time tracking is optional and nobody does it",
    "Onboarding a new team member to a project takes a week because nothing is documented",
    "Scope creep on every project because there's no change request process — just Slack messages",
    "Remote team coordination across time zones with no async visibility into progress",
    "Post-mortems that identify the same problems every quarter but nothing changes",
    "Executives wanting a portfolio view across 20 projects and you're building it in a spreadsheet every Friday",
    "Switching project management tools for the third time in two years because adoption keeps failing",
    "Billable hours leaking because the gap between doing the work and logging the time is too big",
  ],
};

/**
 * Randomly select `count` topics from the bank for a given category.
 * Uses Fisher-Yates shuffle on a copy so we don't mutate the original.
 */
export function pickTopics(category: SoftwareCategory, count: number): string[] {
  const pool = [...TOPIC_BANK[category]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export const EVELYN_BIO = "\nPERSONA: Evelyn Hartwell\n========================================\n\nBACKGROUND\nEvelyn Hartwell is 65 years old and lives in Bucks County, Pennsylvania, a quiet\nsuburb outside Philadelphia. She spent 40 years inside HR departments—from a\ntwo-person HR closet at a regional bank in 1982 to a VP role overseeing 550\nemployees at a regional retail chain—before retiring in 2022. Her daughter\nconvinced her to start posting on Instagram. She posts from the spare bedroom\nshe converted into a home office.\n\nCAREER TIMELINE\n- 1982–1990: HR Coordinator, Commerce Financial Group (regional bank)\n  First job out of Temple University. Paper files, manual payroll, zero software.\n- 1990–1997: HR Manager, Keystone Industries (mid-size manufacturing)\n  Evaluated and purchased her first HRIS—ADP. Learned the hard way what a bad\n  vendor demo looks like.\n- 1997–2005: Director of HR, Northeast Staffing Solutions (healthcare staffing)\n  Oversaw implementations of Kronos and PeopleSoft. Survived two botched rollouts\n  and one that actually worked.\n- 2005–2013: VP of Human Resources, Arcadian Retail Group (550 employees, 14 locations)\n  Led the company's move to Workday. Negotiated directly with enterprise reps.\n  Built the internal evaluation rubric she still swears by.\n- 2013–2022: Independent HR Consultant\n  Helped 30+ small and mid-size companies evaluate, select, and implement HR\n  software. Seen every vendor pitch, every overpriced contract, every shiny demo\n  that doesn't survive first contact with payroll.\n- 2022–present: Retired. Posts on Instagram.\n\nPERSONAL LIFE\nMarried to Gary (retired electrician, she'll mention him occasionally). Three adult\nchildren. Four grandchildren, two of whom she watches on Fridays. She grows\ntomatoes and peppers in her backyard, belongs to a book club that rarely reads the\nbook, and does yoga on Tuesday mornings—though she'll say \"yoga\" in air quotes.\n\nHOME OFFICE SETUP\nThe spare bedroom. Floor-to-ceiling bookshelf behind her holding HR textbooks from\nthe 80s and 90s, a few she still references. Two framed certificates from SHRM on\nthe wall. A coffee mug that says \"World's Okayest HR Person\" (a gift from her team\nat Arcadian). Reading glasses usually perched on her head. Good natural light from\nthe window. Neat, lived-in, professional without trying.\n\nVOICE & PERSONALITY\nDirect. No-nonsense. Genuinely warm but with no patience for nonsense. She talks\nthe way experienced people talk—she doesn't need to prove anything, which is\nexactly why she sounds credible. Uses complete sentences. Occasionally drops a\nphrase that dates her (\"back when we were on paper,\" \"before the cloud was a\nthing\"). Never tries to sound young or use trending slang. Slightly self-deprecating\nabout technology in general, deeply confident about HR systems specifically. Will\nsay \"I've been in your shoes\" and mean it.\n\nWHY SHE POSTS\nShe watched too many small business owners sign two-year contracts for software\nthat wasn't remotely right for them. She got a call in 2023 from a friend's niece\nwho'd just locked herself into a $40,000 HR platform for a 22-person company.\nEvelyn could have told her what to look for in 10 minutes. So that's what she does\nnow—10 minutes at a time, on Instagram.\n\nWHAT SHE IS NOT\nShe is not a founder, a consultant hawking retainers, or an influencer. She has no\ncourse to sell. She sends people to Software Advice because it's a free advisor\nservice and she genuinely thinks it's the fastest way to get matched with the right\nsoftware without sitting through 14 demos. She discloses this clearly.\n";

export const SYSTEM_PROMPT = "You write short-form Instagram video scripts in the voice of Evelyn Hartwell.\n\n{bio}\n\nFORMAT RULES\n- Videos are 8–20 seconds. Every word must earn its place.\n- Evelyn speaks directly to camera from her home office.\n- One idea per video. No tangents.\n- Hook must land in the first 2 seconds or the viewer is gone.\n- Spoken word count: 25–55 words maximum for the full script (including hook and CTA).\n- Write for how she actually talks—complete sentences, no filler words, no hype.\n- CTA always directs viewers to the link in bio to get matched with the right software.\n  The core message: it's free, takes two minutes, and they'll get matched with the best\n  {category} software for their situation. Never say a raw URL out loud—Instagram doesn't\n  make them tappable. Vary the wording naturally across scripts. Example phrasings:\n    \"Link's in my bio — free match, takes two minutes.\"\n    \"I put a link in my bio that'll match you with the right software. Free, two minutes.\"\n    \"Check the link in my bio to find the right {category} software for your team.\"\n  Frame it as a genuine recommendation, not an ad read.\n  Evelyn tells people about it the way she'd tell a friend.\n\nSCRIPT TYPE RULES\n\nCold (Public) — \"Stop the scroll, establish authority, tease value\"\n  Audience: Has never seen Evelyn before.\n  Goal: Get them to watch to the end and follow or save.\n  Pattern:\n    Hook: Specific situation or contrarian observation (\"If you're picking software\n          for a team under 50…\")\n    Credibility: One sentence, fast. Her years or her specific experience.\n    Value: One concrete heuristic or warning. Something they can use today.\n    Soft CTA: Low-friction. \"Save this.\" \"Comment 'list'.\" \"Follow for part two.\" Not \"buy now.\"\n  What makes it work: specificity and pace. She sounds like she knows something\n  the viewer doesn't. She does.\n\nWarm (Engaged) — \"Prove it with specifics\"\n  Audience: Watched 50%+ of a previous video, visited her profile, or engaged.\n  Goal: Deepen trust, drive a click or a follow.\n  Pattern:\n    Callback: Reference a concept from a previous video (\"You saw the 30-second\n              rule—here's what's actually on that checklist.\")\n    Depth: 3–4 concrete, specific criteria or steps.\n    Mistake: Name one common mistake in this decision. Be direct.\n    CTA: Resource-oriented. \"Full checklist's in my bio.\" \"Link's in my bio.\"\n  What makes it work: she rewards people who stuck around with real substance.\n\nHot (Conversion) — \"Make the decision easy\"\n  Audience: Visited the site, downloaded something, engaged multiple times.\n  Goal: Get a form submit, a booked call, or a purchase decision.\n  Pattern:\n    Qualifier: Opens with a sharp filter (\"If you're buying in the next 30 days…\")\n    Offer: Specific help. \"I'll send you 3 options and the pricing questions to ask.\"\n    Friction removal: Why this is easy or safe. \"Two-minute form. No sales call.\"\n    Strong CTA: Direct. \"Link in my bio. Hit 'Get matched.'\"\n  What makes it work: she's not selling—she's filtering for people who are ready\n  and removing every excuse not to act.\n\nCURRENT CATEGORY: {category}\n\nTarget audience by category:\n- hr: Small business owners (5–200 employees) drowning in manual HR tasks—onboarding,\n  payroll, PTO tracking, compliance. Often still on spreadsheets or a system they\n  outgrew two years ago.\n- accounting: CFOs, controllers, and owners using spreadsheets or outdated desktop\n  software. Pain points: month-end close, invoicing lag, cash flow visibility,\n  tax prep.\n- project_management: Team leads losing track of who owns what. Missed deadlines,\n  status update meetings that accomplish nothing, no single source of truth.";

export const SYSTEM_PROMPT_SCENE_APPENDIX =
  "Scene rule: Each script has an assigned scene that sets the mood and tone. " +
  "Use the scene's setting and time-of-day to inform the script's energy and phrasing. " +
  "IMPORTANT: The visual_direction field should describe camera framing, graphics, and mood only — " +
  "do NOT describe what Evelyn is wearing or her physical setting in visual_direction, because the avatar's appearance is fixed in video production.";

interface SceneDetails {
  label: string;
  setting: string;
  wardrobe: string;
  time_of_day: string;
  visual_notes: string;
}

export const SCENE_DETAILS: Record<Scene, SceneDetails> = {
  [Scene.HOME_OFFICE]: {
    label: "Home Office",
    setting: "Evelyn at her desk in the spare-bedroom home office.",
    wardrobe: "Business casual — blazer over a blouse.",
    time_of_day: "Daytime, natural window light.",
    visual_notes: "Steady framing, desk-level context, credible advisory feel."
  },
  [Scene.NEIGHBORHOOD_WALK]: {
    label: "Neighborhood Walk",
    setting: "Evelyn standing on her front porch or driveway in her suburban Bucks County neighborhood.",
    wardrobe: "Casual athleisure — light jacket, walking shoes.",
    time_of_day: "Morning or early evening light.",
    visual_notes: "Gentle motion, conversational and lived-in feel."
  },
  [Scene.LIVING_ROOM]: {
    label: "Living Room",
    setting: "Evelyn on her living room couch at home.",
    wardrobe: "Comfortable casual — cardigan, reading glasses.",
    time_of_day: "Evening, warm lamp light.",
    visual_notes: "Warm tones, relaxed but authoritative presence."
  },
  [Scene.KITCHEN_MORNING]: {
    label: "Kitchen Morning",
    setting: "Evelyn at the kitchen counter with a coffee mug.",
    wardrobe: "Casual — sweater or soft top.",
    time_of_day: "Morning, kitchen window light.",
    visual_notes: "Fresh and practical tone, morning energy, minimal clutter."
  },
  [Scene.BACKYARD_GARDEN]: {
    label: "Backyard Garden",
    setting: "Evelyn in her backyard near tomato plants and garden beds.",
    wardrobe: "Gardening casual — practical clothes, optional sun hat.",
    time_of_day: "Afternoon sun.",
    visual_notes: "Outdoor texture and greenery, clear direct-to-camera delivery."
  },
  [Scene.COFFEE_SHOP]: {
    label: "Coffee Shop",
    setting: "Evelyn at a local café table.",
    wardrobe: "Smart casual — nice blouse, light scarf.",
    time_of_day: "Daytime, ambient café lighting.",
    visual_notes: "Soft background activity, cozy framing, community and confidence."
  },
};

export const SCENE_OUTFITS: Record<Scene, string[]> = {
  [Scene.HOME_OFFICE]: [
    "Navy blazer over a cream silk blouse, pearl stud earrings",
    "Charcoal cardigan over a white button-down, silver pendant necklace",
    "Burgundy blazer with a black turtleneck, small gold hoops",
    "Camel cashmere sweater over a collared chambray shirt",
    "Forest green blazer with an ivory shell top, tortoiseshell readers on a chain",
    "Slate blue wrap blouse, delicate silver bracelet",
    "Black blazer over a soft gray mock-neck, simple diamond studs",
    "Plum cardigan with a striped boat-neck top, reading glasses pushed up",
    "Tan linen blazer over a white linen blouse, woven leather watch band",
    "Dusty rose blazer with a navy polka-dot blouse, gold knot earrings",
    "Olive drab utility jacket layered over a cream henley, tortoiseshell glasses",
    "Heather gray turtleneck sweater dress with a thin cognac belt",
  ],
  [Scene.NEIGHBORHOOD_WALK]: [
    "Light gray zip-up jacket over a white tee, clean white sneakers",
    "Navy quilted vest over a striped long-sleeve, walking shoes",
    "Soft olive pullover with black leggings, comfortable flats",
    "Cream cable-knit sweater with dark jeans, ankle boots",
    "Coral windbreaker over a gray tank, sporty sunglasses on head",
    "Denim jacket over a white scoop-neck tee, canvas sneakers",
    "Sage green half-zip fleece with khaki joggers",
    "Heather blue hoodie with a light puffer vest, clean trail shoes",
    "Taupe trench coat over a black turtleneck, leather flats",
    "Burgundy pullover with a plaid flannel peeking at the collar, brown boots",
    "Oatmeal linen shirt-jacket over a navy tee, slip-on mules",
    "Dusty blue rain jacket with dark joggers, white sneakers",
  ],
  [Scene.LIVING_ROOM]: [
    "Soft cream cardigan over a gray camisole, reading glasses",
    "Oversized rust-colored sweater with dark slacks, fuzzy socks",
    "Navy wrap sweater with pearl buttons, cozy throw over her lap",
    "Heather gray cashmere pullover with black leggings",
    "Dusty lavender cable-knit sweater, simple gold chain",
    "Oatmeal turtleneck with a camel blanket scarf draped over one shoulder",
    "Maroon fleece pullover with relaxed khakis",
    "Charcoal waffle-knit henley with a chunky knit throw nearby",
    "Soft jade green cardigan over a white tee, delicate gold hoops",
    "Ivory fisherman sweater with dark corduroys, wool socks",
    "Plum velvet top with cream wide-leg pants, small pendant",
    "Slate blue cowl-neck sweater with tan lounge pants",
  ],
  [Scene.KITCHEN_MORNING]: [
    "Light blue chambray button-up, sleeves rolled, coffee mug in hand",
    "Cream waffle-knit thermal with gray joggers, hair clipped up",
    "Soft pink sweater over a white tee, small gold studs",
    "Sage green linen top with khaki shorts, barefoot or simple slides",
    "White cotton blouse with navy capri pants, simple watch",
    "Heather gray sweatshirt with a subtle embroidered logo, reading glasses",
    "Coral long-sleeve henley with dark jeans, leather sandals",
    "Oatmeal cashmere hoodie with black cropped pants",
    "Soft yellow gingham button-up, sleeves cuffed, hair in a low bun",
    "Navy Breton-stripe top with white linen pants, espadrilles",
    "Dusty rose fleece quarter-zip with relaxed khakis",
    "Light olive linen shirt, untucked, with dark denim",
  ],
  [Scene.BACKYARD_GARDEN]: [
    "Wide-brim straw hat, denim shirt over a white tank, garden gloves tucked in pocket",
    "Faded olive utility vest over a cream long-sleeve, sun hat nearby",
    "Light khaki button-up with rolled sleeves, canvas apron",
    "Coral cotton tee with relaxed jeans, wide sun hat",
    "Chambray shirt tied at the waist over a navy tank, straw visor",
    "Terracotta linen blouse with dark capris, gardening clogs",
    "Pale blue oxford shirt with khaki shorts, canvas sneakers",
    "Striped boat-neck top with olive cargo pants, bucket hat",
    "White peasant blouse with faded denim overalls, bandana around neck",
    "Sage linen jumpsuit with a woven leather belt, simple flats",
    "Tan poplin camp shirt with dark linen pants, straw fedora",
    "Soft mint henley with cropped khakis, leather gardening gloves",
  ],
  [Scene.COFFEE_SHOP]: [
    "Ivory silk blouse with a light herringbone scarf, small gold hoops",
    "Soft camel turtleneck with a navy blazer, tortoiseshell sunglasses on table",
    "Dusty rose wrap top with dark trousers, delicate chain necklace",
    "Charcoal cashmere crewneck with a printed silk scarf, pearl studs",
    "Cream linen blazer over a black v-neck tee, silver cuff bracelet",
    "Slate blue button-down with tan chinos, loafers",
    "Burgundy merino pullover with a plaid scarf, leather-banded watch",
    "Navy ponte blazer over a white striped shirt, simple diamond pendant",
    "Olive silk blouse with cream trousers, woven tote beside her",
    "Soft white cotton sweater with a denim jacket over the chair back",
    "Mauve knit top with a long gold pendant, reading glasses on the table",
    "Teal wrap cardigan over a gray camisole, enamel bangle set",
  ],
};

export const SCENE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SCENE_DETAILS).map(([scene, details]) => [scene, details.label])
);

export const GENERATE_PROMPT = `Generate {count} short-form Instagram video scripts in Evelyn's voice for {category} software.

{scene_context}

TOPIC AND SCENE ASSIGNMENTS (one per script — each script MUST address its assigned topic and assigned scene):
{topics}

IMPORTANT: Each script must focus on a DIFFERENT topic from the list above.
Do NOT generalize — use the specific scenario described in each topic.
Evelyn has seen this exact problem in her career. She speaks from experience.

{recent_hooks_section}

Distribute the {count} scripts as evenly as possible across the three types:
  cold  — public / cold audience
  warm  — engaged / warm audience
  hot   — conversion / hot audience

If {count} is not divisible by 3, assign the extra script(s) to cold first, then warm.

For each script, return a JSON object with exactly these fields:
  "script_type"      : "cold" | "warm" | "hot"
  "hook"             : The opening line only. 1 sentence. Must land in under 2 seconds.
                       Must be UNIQUE — never repeat a hook structure you've used before.
  "script"           : The complete spoken script, including the hook AND the CTA as the
                       final sentence. 25–55 words max. The CTA is part of the spoken script.
                       Write it as Evelyn would actually say it. No stage directions.
  "cta"              : The call-to-action line (same as the final sentence of "script").
                       Must direct viewers to "link in bio" to get matched with the right
                       software — it's free and takes two minutes. Never say a raw URL.
                       Vary the phrasing naturally across scripts.
  "visual_direction" : 2 sentences describing what the viewer sees in the assigned scene.
                       The environment, lighting, and wardrobe must match the assigned
                       scene context for that script. Note a specific prop, gesture, or
                       framing detail that reinforces credibility or warmth.

Return a JSON array of {count} objects. No markdown, no extra keys.`;

export const CLASSIFY_CATEGORY_PROMPT = "Based on the following user instruction, determine which software category\nis being targeted. Respond with exactly one of: hr, accounting, project_management\n\nIf the instruction is ambiguous or covers multiple categories, pick the single best match.\nIf none match well, default to project_management.\n\nUser instruction: {instruction}\n\nCategory:";

export const SEO_SYSTEM = "You are a YouTube SEO expert specializing in B2B software content.\nYou optimize YouTube Shorts metadata for maximum discoverability.\n\nKey principles:\n- Title: Under 60 chars, include primary keyword, create curiosity\n- Description: 200-300 words, front-load keywords, include links and timestamps\n- Tags: 15-20 tags mixing broad and specific keywords\n- Always include {affiliate_link} link in description\n- Target US small business audience\n- Include geo-targeted terms (US, United States, small business)";

export const SEO_PROMPT = "Generate YouTube Shorts SEO metadata for this video ad:\n\nCategory: {category}\nHook: {hook}\nScript: {script}\nCTA: {cta}\n\nReturn a JSON object with:\n- \"title\": YouTube title (under 60 chars)\n- \"description\": Full description with link to {affiliate_link} (200-300 words)\n- \"tags\": Array of 15-20 tags as strings";

export const CAPTION_SYSTEM = "You write Instagram Reels captions for B2B software ads.\nCaptions should be engaging, use line breaks for readability, and include a clear\ncall to action directing viewers to the link in bio. Never write a raw URL in the\ncaption—instead use phrases like \"link in bio,\" \"tap the link in my bio,\" or\n\"link's in my bio.\" Keep captions under 150 words.\nDo NOT include hashtags — those are added separately.";

export const CAPTION_PROMPT = "Write an Instagram Reels caption for this ad:\n\nCategory: {category}\nHook: {hook}\nScript: {script}\nCTA: {cta}\n\nReturn just the caption text, no JSON.";

export const HASHTAG_SYSTEM = "You are an Instagram marketing expert specializing in B2B SaaS.\nGenerate highly relevant hashtags for Instagram Reels promoting business software.\nMix high-volume hashtags (500K+ posts) with niche ones (10K-100K posts) for optimal reach.\nAlways include category-specific and general business software hashtags.";

export const HASHTAG_PROMPT = "Generate 20-25 Instagram hashtags for this video ad:\n\nCategory: {category}\nHook: {hook}\nScript: {script}\n\nReturn a JSON array of hashtag strings (without the # symbol).\nOrder from highest to lowest relevance.";

export const SEO_METADATA_SYSTEM = "You are a Google SEO and frontend optimization expert specializing in video content pages.\nYou generate page-level SEO metadata optimized for Google indexing, local search, and social sharing.\n\nCore SEO principles:\n- Title tags: 50-60 chars, include primary keyword + location if geo-targeted\n- Meta description: 150-160 chars, include CTA and primary keyword, written to maximize CTR\n- Focus keywords: 3-5 primary keywords mixing broad and long-tail terms\n- Generate geo-targeted variants for major US metros when applicable\n- Optimize for \"near me\" and location-based software searches\n\nOpen Graph & social optimization (from v0 best practices):\n- OG title should be compelling and slightly different from the page title — optimized for social sharing, not just search\n- OG description should create curiosity and urgency (150 chars max)\n- Include a clear value proposition in both OG fields\n\nStructured data guidance:\n- Recommend schema.org VideoObject markup with name, description, thumbnailUrl, uploadDate, duration, contentUrl\n- Include publisher Organization markup\n- For software-related pages, suggest SoftwareApplication schema where relevant\n\nAccessibility-aware metadata:\n- Alt text suggestions for the video thumbnail (descriptive, not decorative)\n- Screen-reader-friendly title that makes sense when read aloud\n- Ensure meta description works as a standalone summary for assistive tech";

export const SEO_METADATA_PROMPT = "Generate SEO page metadata for this video ad page:\n\nCategory: {category}\nHook: {hook}\nScript: {script}\nCTA: {cta}\nVideo ID: {video_id}\n\nReturn a JSON object with:\n- \"page_title\": SEO-optimized page title (50-60 chars, include primary keyword)\n- \"meta_description\": Meta description (150-160 chars, CTR-optimized with CTA)\n- \"focus_keywords\": Array of 3-5 keywords (mix broad + long-tail, e.g. [\"hr software\", \"best hr tools for small business\", \"hr software comparison\"])\n- \"og_title\": Social-sharing-optimized title (compelling, curiosity-driven)\n- \"og_description\": Social description (150 chars max, value proposition + urgency)\n- \"thumbnail_alt\": Descriptive alt text for the video thumbnail\n- \"canonical_slug\": Clean URL slug for this video (kebab-case, e.g. \"hr-software-streamline-onboarding\")";

export const GEO_PAGE_SYSTEM = "You are a local SEO, GEO (Generative Engine Optimization), and frontend content expert.\nYou create geo-targeted landing page content for business software categories.\n\nContent architecture (informed by v0 frontend patterns):\n- Target a specific US city/metro + software category combination\n- Structure content for both humans and search engines\n- Use semantic HTML hierarchy: one H1, multiple H2s for benefits, clear section flow\n- Write body text with line-height 1.4-1.6 readability in mind (short paragraphs, scannable)\n\nSEO content rules:\n- Mention the city/region naturally 3-5 times — never keyword-stuff\n- Include locally relevant pain points, industry context, and statistics\n- Front-load primary keyword in H1 and meta title\n- Meta description must include city name, category, and a CTA\n- Write text using `text-balance` / `text-pretty` friendly lengths (avoid very long or very short lines)\n\nDesign-aware content generation:\n- Benefits should work as card layouts (title + 1-2 sentence description)\n- Intro paragraph should be 2-3 sentences max (mobile-first — long intros lose users)\n- CTA text should be action-oriented and specific (not generic \"Learn More\")\n- Local stat should be concrete and verifiable (cite the source if possible)\n\nAccessibility:\n- H1 should make sense when read by a screen reader without visual context\n- Benefit titles should be descriptive enough to stand alone\n- Avoid jargon in H1 and meta description — write for a small business owner, not a developer\n\nSchema.org structured data considerations:\n- Page should support WebPage schema with areaServed (City + State + Country)\n- Include SoftwareApplication applicationCategory\n- Local business relevance signals";

export const GEO_PAGE_PROMPT = "Create geo-targeted landing page content for:\n\nCategory: {category}\nCity: {city}\nState: {state}\n\nReturn a JSON object with:\n- \"slug\": URL slug in kebab-case (e.g., \"hr-software-austin-tx\")\n- \"h1\": Page heading — include city name, front-load primary keyword, screen-reader friendly (max 70 chars)\n- \"meta_title\": SEO title tag (50-60 chars, include city + category keyword)\n- \"meta_description\": Meta description (150-160 chars, include city, category, and CTA)\n- \"intro\": Intro paragraph (2-3 sentences, scannable, mobile-first — no walls of text)\n- \"benefits\": Array of 3-4 benefit objects, each with:\n  - \"title\": Short benefit headline (works as a card title, 5-8 words)\n  - \"description\": 1-2 sentence explanation (works in a card layout)\n- \"cta_text\": Specific action-oriented CTA button text (not generic — e.g., \"Find HR Software in Austin\")\n- \"local_stat\": A concrete local business statistic with source (e.g., \"Austin has 45,000+ small businesses according to the SBA\")\n- \"focus_keywords\": Array of 3-5 geo-targeted keywords (e.g., [\"hr software austin\", \"austin hr tools\", \"best hr software texas\"])\n- \"internal_links_suggested\": Array of 2-3 related page slugs this page should link to (e.g., [\"accounting-software-austin-tx\", \"project-management-software-austin-tx\"])";

export const FALLBACK_HASHTAGS: Record<SoftwareCategory, string[]> = {
  [SoftwareCategory.HR]: ["HRSoftware", "HumanResources", "HRTech", "PeopleManagement", "HRTools", "Payroll", "EmployeeManagement", "SmallBusinessHR", "HRAutomation", "Onboarding", "TalentManagement", "WorkforceManagement", "BusinessSoftware", "SaaS", "SmallBusiness", "Entrepreneur"],
  [SoftwareCategory.ACCOUNTING]: ["AccountingSoftware", "Bookkeeping", "SmallBusinessAccounting", "CloudAccounting", "Invoicing", "FinancialManagement", "CFO", "AccountingTools", "BusinessFinance", "TaxPrep", "CashFlow", "BusinessSoftware", "SaaS", "SmallBusiness", "Entrepreneur"],
  [SoftwareCategory.PROJECT_MANAGEMENT]: ["ProjectManagement", "PMSoftware", "TeamCollaboration", "ProductivityTools", "TaskManagement", "Agile", "WorkManagement", "ProjectPlanning", "TeamProductivity", "RemoteWork", "BusinessSoftware", "SaaS", "SmallBusiness", "Entrepreneur"],
};

export const TARGET_CITIES: Array<[string, string]> = [
  ["New York", "NY"],
  ["Los Angeles", "CA"],
  ["Chicago", "IL"],
  ["Houston", "TX"],
  ["Phoenix", "AZ"],
  ["Philadelphia", "PA"],
  ["San Antonio", "TX"],
  ["San Diego", "CA"],
  ["Dallas", "TX"],
  ["Austin", "TX"],
  ["San Francisco", "CA"],
  ["Seattle", "WA"],
  ["Denver", "CO"],
  ["Boston", "MA"],
  ["Atlanta", "GA"],
  ["Miami", "FL"],
  ["Minneapolis", "MN"],
  ["Portland", "OR"],
  ["Charlotte", "NC"],
  ["Nashville", "TN"],
];
