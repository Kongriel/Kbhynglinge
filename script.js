/* ========================================
   KBH YNGLINGE – SCRIPT.JS
   FORENINGSAKTIVITET 2026/2027
======================================== */

// ========================================
// SUPABASE
// ========================================

const db = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY);

// ========================================
// ELEMENTER
// ========================================

const splash = document.querySelector("#splashScreen");
const formScreen = document.querySelector("#formScreen");
const successScreen = document.querySelector("#successScreen");

const form = document.querySelector("#questionnaire");

const activeFields = document.querySelector("#activeFields");
const inactiveFields = document.querySelector("#inactiveFields");

const associationField = document.querySelector("#associationField");
const associationInput = document.querySelector("#association");

const submitBtn = document.querySelector("#submitBtn");
const formError = document.querySelector("#formError");

// ========================================
// INTRO – DANSENDE SKELET
// ========================================

// 1.0 = normal hastighed
// 1.2 = 20 % hurtigere
// 1.5 = 50 % hurtigere

const danceSpeed = 1.2;

// Kontroller brugerens animationsindstillinger

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Skelettets hoved bruges til at registrere
// det sidste hop.

const head = splash.querySelector(".skeleton .head");

// Forhindrer at overgangen starter flere gange

let pulling = false;
let introFinished = false;

let backupStart;
let backupEnd;

// ========================================
// AFSLUT INTROEN
// ========================================

function finishIntro() {
  if (introFinished) return;

  introFinished = true;

  clearTimeout(backupStart);
  clearTimeout(backupEnd);

  // Fjern animationen fra formularen

  formScreen.classList.remove("form-dropping");

  // Skjul startskærmen

  splash.hidden = true;

  // Vis formularen

  formScreen.hidden = false;

  // Giv scroll tilbage til brugeren

  document.body.classList.remove("intro-locked");

  // Start øverst på formularen

  window.scrollTo(0, 0);
}

// ========================================
// TRÆK FORMULAREN NED FRA TOPPEN
// ========================================

function pullFormDown() {
  if (pulling || introFinished) return;

  pulling = true;

  clearTimeout(backupStart);

  // Lås scrolling under overgangen

  document.body.classList.add("intro-locked");

  // Klargør faldeanimationen

  formScreen.classList.add("form-dropping");

  // Vis formularen oven på introen
  // CSS starter dens fald fra toppen

  formScreen.hidden = false;

  // Backup hvis animationend ikke registreres

  backupEnd = setTimeout(() => {
    finishIntro();
  }, 1700);
}

// ========================================
// START DANSEN
// ========================================

if (reduceMotion) {
  // Spring animationer over, hvis brugeren
  // har fravalgt bevægelser.

  finishIntro();
} else {
  // ======================================
  // DANS 20 % HURTIGERE
  // ======================================

  splash.getAnimations({ subtree: true }).forEach((animation) => {
    animation.playbackRate = danceSpeed;
  });

  // ======================================
  // VENT TIL SKELETTET LANDER
  // ======================================

  // Vi lytter IKKE til animationstart.
  //
  // Dermed begynder formularen ikke
  // at falde, mens skelettet hopper.
  //
  // Vi venter på animationend fra
  // det sidste skeletonJump.

  head.addEventListener("animationend", (event) => {
    // Ignorer alle andre animationer

    if (event.target !== head || event.animationName !== "skeletonJump") {
      return;
    }

    // ==================================
    // BOOOOM! SKELETTET LANDER!
    // ==================================

    // Giv startskærmen et lille stød

    splash.classList.add("has-impact");

    // FØRST NU starter formularens fald

    pullFormDown();
  });

  // ======================================
  // NÅR FORMULAREN ER FALDET PÅ PLADS
  // ======================================

  formScreen.addEventListener("animationend", (event) => {
    if (event.target !== formScreen || event.animationName !== "formRipDrop") {
      return;
    }

    // Formularen er landet.
    // Fjern den gamle startskærm.

    finishIntro();
  });

  // ======================================
  // SIKKERHEDS-BACKUP
  // ======================================

  // Hvis browseren ikke registrerer
  // skelettets landing, skal brugeren
  // stadig kunne komme til formularen.

  backupStart = setTimeout(() => {
    pullFormDown();
  }, 6500);
}

// ========================================
// HENT VALGTE CHECKBOXES
// ========================================

const checkedValues = (name) => {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
};

// ========================================
// VIS RELEVANTE SPØRGSMÅL
// ========================================

function updateFields() {
  const isActive = form.querySelector('input[name="isActive"]:checked')?.value;

  // Hvis gymnasten svarer JA

  activeFields.hidden = isActive !== "yes";

  // Hvis gymnasten svarer NEJ

  inactiveFields.hidden = isActive !== "no";

  // Skal feltet med foreningsnavn vises?

  const needsAssociation = isActive === "yes" && checkedValues("activeRoles").some((role) => ["instructor", "gymnast", "board"].includes(role));

  associationField.hidden = !needsAssociation;

  associationInput.required = needsAssociation;
}

// ========================================
// NÅR JA / NEJ ÆNDRES
// ========================================

form.querySelectorAll('input[name="isActive"]').forEach((input) => {
  input.addEventListener("change", () => {
    // Nulstil tidligere aktiviteter

    form.querySelectorAll('input[name="activeRoles"], input[name="desiredRoles"]').forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Nulstil foreningsnavnet

    associationInput.value = "";

    // Opdater de synlige spørgsmål

    updateFields();

    // Skjul eventuel fejlbesked

    formError.hidden = true;
  });
});

// ========================================
// NÅR FORENINGSAKTIVITETER ÆNDRES
// ========================================

form.querySelectorAll('input[name="activeRoles"]').forEach((input) => {
  input.addEventListener("change", updateFields);
});

// ========================================
// VIS FEJLBESKED
// ========================================

function showError(message) {
  formError.textContent = message;

  formError.hidden = false;

  formError.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// ========================================
// SEND FORMULAR TIL SUPABASE
// ========================================

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  formError.hidden = true;

  // ====================================
  // ER GYMNASTEN FORENINGSAKTIV?
  // ====================================

  const isActive = form.querySelector('input[name="isActive"]:checked')?.value;

  // ====================================
  // AKTIVE ROLLER
  // ====================================

  const activeRoles = isActive === "yes" ? checkedValues("activeRoles") : [];

  // ====================================
  // ØNSKEDE ROLLER
  // ====================================

  const desiredRoles = isActive === "no" ? checkedValues("desiredRoles") : [];

  // ====================================
  // ALDER
  // ====================================

  const age = Number(form.querySelector("#age").value);

  // ====================================
  // VALIDERING
  // ====================================

  if (!Number.isInteger(age) || age < 1 || age > 110) {
    return showError("Indtast din alder som et helt tal.");
  }

  if (isActive === "yes" && activeRoles.length === 0) {
    return showError("Vælg mindst én måde, du er foreningsaktiv på.");
  }

  if (isActive === "no" && desiredRoles.length === 0) {
    return showError("Vælg mindst én måde, du gerne vil være foreningsaktiv på.");
  }

  if (associationInput.required && !associationInput.value.trim()) {
    return showError("Skriv hvilken forening, du er aktiv i.");
  }

  // ====================================
  // FORBERED DATA TIL SUPABASE
  // ====================================

  const payload = {
    name: form.querySelector("#name").value.trim(),

    age,

    is_active: isActive === "yes",

    active_roles: activeRoles,

    association_name: associationInput.required ? associationInput.value.trim() : null,

    desired_roles: desiredRoles,

    media_consent: form.querySelector('input[name="mediaConsent"]:checked').value === "yes",

    aspirant_vejle: form.querySelector('input[name="aspirant"]:checked').value === "yes",
  };

  // ====================================
  // FORHINDR DOBBELT INDSENDELSE
  // ====================================

  submitBtn.disabled = true;

  submitBtn.textContent = "Sender dine svar…";

  // ====================================
  // SEND DATA TIL SUPABASE
  // ====================================

  try {
    const { error } = await db.from("ynglinge_activity_responses").insert(payload);

    if (error) {
      throw error;
    }

    // ==================================
    // VIS TAKKESKÆRM
    // ==================================

    formScreen.hidden = true;

    successScreen.hidden = false;

    window.scrollTo(0, 0);
  } catch (error) {
    console.error("Kunne ikke gemme svar:", error);

    showError("Vi kunne ikke sende dine svar. " + "Tjek forbindelsen og prøv igen.");
  } finally {
    submitBtn.disabled = false;

    submitBtn.innerHTML = 'Send mine svar <span aria-hidden="true">→</span>';
  }
});
