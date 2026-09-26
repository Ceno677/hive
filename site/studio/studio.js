(() => {
  // trait-names.json
  var trait_names_default = {
    head: {
      label: "CRANIUM",
      choices: {
        balanced: "PRIME",
        longoval: "ELONGATE",
        fullcheeks: "PLENUM",
        narrow: "NEEDLE",
        broadjaw: "BULWARK",
        taperedjaw: "KEEL",
        highforehead: "CEREBRAL",
        softchin: "SOFTCAST",
        highcheeks: "RIDGELINE",
        gaunt: "REVENANT",
        roundface: "LUNAR",
        heartface: "VALENT",
        pearface: "UNDERTOW",
        slenderchin: "FILAMENT",
        heavybrow: "OVERHANG",
        compact: "KERNEL",
        widetemple: "HORIZON",
        softlong: "DRIFTER"
      }
    },
    surface: {
      label: "DERMIS",
      choices: {
        matte: "CARBON VEIL",
        etched: "MICROETCH",
        plated: "LAMINATE",
        circuit: "NEURAL TRACE",
        molten: "LIQUID ALLOY"
      }
    },
    pixelMaterial: {
      label: "FRAGMENT",
      choices: {
        solid: "HARDPOINT",
        soft: "SOFT STATIC",
        scanline: "RASTER",
        mosaic: "SHARDWORK",
        neon: "ARC LIGHT"
      }
    },
    eyes: {
      label: "OPTIC EMISSION",
      choices: {
        dim: "LOW SIGNAL",
        glow: "AFTERGLOW",
        beam: "PHOTON LANCE",
        burning: "CORE IGNITION"
      }
    },
    colorway: {
      label: "CHROMA",
      choices: {
        chrome: "MIRROR CHROME",
        graphite: "GRAPHITE ZERO",
        ion: "ION STREAM",
        violet: "ULTRAVIOLET",
        acid: "ACID CHARGE",
        rose: "ROSE PULSE",
        copper: "COPPER FLUX",
        gold: "AURIC"
      }
    },
    background: {
      label: "FIELD",
      choices: {
        void: "NULLSPACE",
        silver: "SILVER FOG",
        cobalt: "COBALT DEPTH",
        wine: "OXBLOOD",
        forest: "DEEP VERDIGRIS",
        orchid: "ORCHID HAZE",
        orange: "SIGNAL FLARE",
        ice: "CRYOSPHERE"
      }
    },
    face: {
      label: "VISAGE",
      choices: {
        classic: "ORIGIN",
        cyclops: "MONOCULAR",
        triple: "TRIAD",
        slit: "KNIFE SIGHT",
        square: "QUAD LENS",
        cross: "CROSSHAIR",
        grin: "CHESHIRE",
        hollow: "HOLLOW ECHO"
      }
    }
  };

  // src/presets/traitDefinitions.ts
  function getParams(traits, key) {
    return traits.selections[key].params;
  }
  var TRAIT_DEFINITIONS = [
    {
      key: "body",
      label: "Body",
      choices: [
        { id: "slim", label: "Slim", tier: "common", params: { shoulder: 0.26, hip: 0.165, armR: 0.048, legR: 0.075, neckR: 0.05 } },
        { id: "standard", label: "Standard", tier: "common", params: { shoulder: 0.3, hip: 0.185, armR: 0.054, legR: 0.085, neckR: 0.055 } },
        { id: "broad", label: "Broad", tier: "common", params: { shoulder: 0.345, hip: 0.2, armR: 0.06, legR: 0.092, neckR: 0.06 } },
        { id: "heavy", label: "Heavy", tier: "uncommon", params: { shoulder: 0.36, hip: 0.23, armR: 0.068, legR: 0.1, neckR: 0.065 } },
        { id: "wraith", label: "Wraith", tier: "uncommon", params: { shoulder: 0.225, hip: 0.145, armR: 0.04, legR: 0.065, neckR: 0.045 } },
        { id: "colossus", label: "Colossus", tier: "rare", params: { shoulder: 0.4, hip: 0.24, armR: 0.075, legR: 0.108, neckR: 0.07 } }
      ]
    },
    {
      key: "head",
      label: "Head",
      choices: [
        { id: "rounded", label: "Rounded", tier: "common", params: { headId: "rounded" } },
        { id: "tapered", label: "Tapered", tier: "common", params: { headId: "tapered" } },
        { id: "domed", label: "Domed", tier: "uncommon", params: { headId: "domed" } },
        { id: "visor", label: "Visor", tier: "uncommon", params: { headId: "visor" } },
        { id: "antenna", label: "Antenna", tier: "rare", params: { headId: "antenna" } },
        { id: "crowned", label: "Crowned", tier: "legendary", params: { headId: "crowned" } }
      ]
    },
    {
      key: "pose",
      label: "Pose",
      choices: [
        { id: "rest", label: "At Rest", tier: "common", params: { poseId: "rest", turn: 0.12, lean: 0 } },
        { id: "offaxis", label: "Off Axis", tier: "common", params: { poseId: "offaxis", turn: 0.35, lean: 0.045 } },
        { id: "akimbo", label: "Akimbo", tier: "common", params: { poseId: "akimbo", turn: 0.1, lean: 0 } },
        { id: "guarded", label: "Guarded", tier: "uncommon", params: { poseId: "guarded", turn: 0.18, lean: 0 } },
        { id: "vigil", label: "Vigil", tier: "uncommon", params: { poseId: "vigil", turn: 0, lean: 0 } },
        { id: "salute", label: "Salute", tier: "uncommon", params: { poseId: "salute", turn: 0.15, lean: 0 } },
        { id: "stride", label: "Stride", tier: "uncommon", params: { poseId: "stride", turn: 0.3, lean: 0.05 } },
        { id: "hail", label: "Hail", tier: "rare", params: { poseId: "hail", turn: 0.22, lean: 0.02 } },
        { id: "brawler", label: "Brawler", tier: "rare", params: { poseId: "brawler", turn: 0.2, lean: 0.015 } },
        { id: "directive", label: "Directive", tier: "rare", params: { poseId: "directive", turn: 0.25, lean: 0.01 } },
        { id: "ascendant", label: "Ascendant", tier: "legendary", params: { poseId: "ascendant", turn: 0, lean: 0 } }
      ]
    },
    {
      key: "surface",
      label: "Surface",
      choices: [
        { id: "matte", label: "Matte", tier: "common", params: { surfaceId: "matte", shimmer: 0 } },
        { id: "etched", label: "Etched", tier: "common", params: { surfaceId: "etched", shimmer: 0 } },
        { id: "plated", label: "Plated", tier: "uncommon", params: { surfaceId: "plated", shimmer: 0 } },
        { id: "circuit", label: "Circuit", tier: "uncommon", params: { surfaceId: "circuit", shimmer: 0.15 } },
        { id: "molten", label: "Molten", tier: "rare", params: { surfaceId: "molten", shimmer: 0.45 } }
      ]
    },
    {
      key: "pixelMaterial",
      label: "Pixel Material",
      choices: [
        { id: "solid", label: "Solid", tier: "common", params: { mode: 0, cellMult: 1, bigChance: 0.08, smallChance: 0.12 } },
        { id: "soft", label: "Soft", tier: "common", params: { mode: 1, cellMult: 1.08, bigChance: 0.06, smallChance: 0.1 } },
        { id: "scanline", label: "Scanline", tier: "uncommon", params: { mode: 2, cellMult: 0.95, bigChance: 0.05, smallChance: 0.15 } },
        { id: "mosaic", label: "Mosaic", tier: "uncommon", params: { mode: 3, cellMult: 1.05, bigChance: 0.2, smallChance: 0.08 } },
        { id: "neon", label: "Neon", tier: "rare", params: { mode: 4, cellMult: 1.1, bigChance: 0.07, smallChance: 0.12 } }
      ]
    },
    {
      key: "fragmentation",
      label: "Fragmentation",
      choices: [
        { id: "intact", label: "Intact", tier: "common", params: { frag: 0.15, detachDist: 0.06, erosionBase: 0.15, cycles: 2 } },
        { id: "shedding", label: "Shedding", tier: "common", params: { frag: 0.4, detachDist: 0.12, erosionBase: 0.3, cycles: 2 } },
        { id: "fractured", label: "Fractured", tier: "uncommon", params: { frag: 0.62, detachDist: 0.18, erosionBase: 0.45, cycles: 3 } },
        { id: "splintered", label: "Splintered", tier: "rare", params: { frag: 0.85, detachDist: 0.26, erosionBase: 0.6, cycles: 3 } }
      ]
    },
    {
      key: "motion",
      label: "Motion",
      choices: [
        { id: "still", label: "Still", tier: "common", params: { motionScale: 0.55, breath: 6e-3, sway: 0.012, flicker: 0.1, bandAmp: 4e-3, bandSpeed: 1, glitch: 0 } },
        { id: "breathing", label: "Breathing", tier: "common", params: { motionScale: 1, breath: 0.011, sway: 0.022, flicker: 0.16, bandAmp: 7e-3, bandSpeed: 2, glitch: 0 } },
        { id: "restless", label: "Restless", tier: "uncommon", params: { motionScale: 1.35, breath: 0.014, sway: 0.03, flicker: 0.24, bandAmp: 0.011, bandSpeed: 2, glitch: 4e-3 } },
        { id: "surging", label: "Surging", tier: "rare", params: { motionScale: 1.7, breath: 0.017, sway: 0.036, flicker: 0.3, bandAmp: 0.016, bandSpeed: 3, glitch: 8e-3 } }
      ]
    },
    {
      key: "background",
      label: "Background",
      choices: [
        { id: "void", label: "Void", tier: "common", params: { bgMode: 0 } },
        { id: "haze", label: "Depth Haze", tier: "common", params: { bgMode: 1 } },
        { id: "static", label: "Static Field", tier: "uncommon", params: { bgMode: 3 } },
        { id: "halo", label: "Halo", tier: "rare", params: { bgMode: 4 } }
      ]
    },
    {
      key: "palette",
      label: "Palette",
      choices: [
        { id: "mono", label: "Monochrome", tier: "common", weight: 170, params: { paletteId: "mono" } },
        { id: "porcelain", label: "Porcelain Inverse", tier: "uncommon", params: { paletteId: "porcelain" } },
        { id: "ember", label: "Ember Accent", tier: "uncommon", params: { paletteId: "ember" } },
        { id: "ion", label: "Ion Accent", tier: "uncommon", params: { paletteId: "ion" } },
        { id: "verdigris", label: "Verdigris Accent", tier: "uncommon", params: { paletteId: "verdigris" } },
        { id: "ultraviolet", label: "Ultraviolet Accent", tier: "uncommon", params: { paletteId: "ultraviolet" } },
        { id: "cobalt", label: "Cobalt Field", tier: "uncommon", params: { paletteId: "cobalt" } },
        { id: "alabaster", label: "Alabaster Cobalt", tier: "uncommon", params: { paletteId: "alabaster" } },
        { id: "sepia", label: "Archive Sepia", tier: "uncommon", params: { paletteId: "sepia" } },
        { id: "hazard", label: "Hazard", tier: "uncommon", params: { paletteId: "hazard" } },
        { id: "blaze", label: "Blaze", tier: "uncommon", params: { paletteId: "blaze" } },
        { id: "orchid", label: "Orchid Accent", tier: "rare", params: { paletteId: "orchid" } },
        { id: "acid", label: "Acid Accent", tier: "rare", params: { paletteId: "acid" } },
        { id: "rose", label: "Rose Accent", tier: "rare", params: { paletteId: "rose" } },
        { id: "crimson", label: "Crimson Field", tier: "rare", params: { paletteId: "crimson" } },
        { id: "matrix", label: "Signal Green", tier: "rare", params: { paletteId: "matrix" } },
        { id: "amberfield", label: "Amber Field", tier: "rare", params: { paletteId: "amberfield" } },
        { id: "blueprint", label: "Blueprint", tier: "rare", params: { paletteId: "blueprint" } },
        { id: "wasp", label: "Wasp Inverse", tier: "rare", params: { paletteId: "wasp" } },
        { id: "alarm", label: "Alarm", tier: "rare", params: { paletteId: "alarm" } },
        { id: "royalvolt", label: "Royal Volt", tier: "rare", params: { paletteId: "royalvolt" } },
        { id: "gilded", label: "Gilded", tier: "legendary", params: { paletteId: "gilded" } },
        { id: "hologram", label: "Hologram", tier: "legendary", params: { paletteId: "hologram" } }
      ]
    },
    {
      key: "eyes",
      label: "Eyes",
      choices: [
        { id: "dim", label: "Dim", tier: "common", params: { intensity: 0.75, blink: 0, stretch: 0, colorId: "palette" } },
        { id: "glow", label: "Glow", tier: "common", params: { intensity: 1.5, blink: 0, stretch: 0, colorId: "palette" } },
        { id: "blink", label: "Blink", tier: "uncommon", params: { intensity: 1.4, blink: 1, stretch: 0, colorId: "palette" } },
        { id: "beam", label: "Beam", tier: "rare", params: { intensity: 1.8, blink: 0, stretch: 6, colorId: "palette" } },
        { id: "burning", label: "Burning", tier: "legendary", params: { intensity: 2.3, blink: 0, stretch: 0, colorId: "burning" } }
      ]
    },
    {
      key: "ambient",
      label: "Ambient Field",
      choices: [
        { id: "dust", label: "Dust", tier: "common", params: { ambientMode: 0, countMult: 1 } },
        { id: "motes", label: "Motes", tier: "common", params: { ambientMode: 1, countMult: 0.8 } },
        { id: "rain", label: "Data Rain", tier: "uncommon", params: { ambientMode: 2, countMult: 1.4 } },
        { id: "ash", label: "Ash Drift", tier: "uncommon", params: { ambientMode: 3, countMult: 1.1 } },
        { id: "swarm", label: "Swarm", tier: "rare", params: { ambientMode: 4, countMult: 1.6 } }
      ]
    },
    {
      key: "mutation",
      label: "Mutation",
      choices: [
        { id: "none", label: "None", tier: "common", weight: 900, params: { mutationId: "none" } },
        { id: "ghostLimb", label: "Ghost Limb", tier: "rare", params: { mutationId: "ghostLimb" } },
        { id: "doubleExposure", label: "Double Exposure", tier: "rare", params: { mutationId: "doubleExposure" } },
        { id: "signalLoss", label: "Signal Loss", tier: "rare", params: { mutationId: "signalLoss" } },
        { id: "chromaticRift", label: "Chromatic Rift", tier: "legendary", params: { mutationId: "chromaticRift" } }
      ]
    }
  ];
  var TRAIT_DEFINITION_MAP = Object.fromEntries(
    TRAIT_DEFINITIONS.map((d) => [d.key, d])
  );
  var BACKGROUND_CHOICES = TRAIT_DEFINITION_MAP["background"].choices;

  // src/generator/rarity.ts
  var TIER_WEIGHTS = {
    common: 100,
    uncommon: 38,
    rare: 11,
    legendary: 2.5
  };
  function choiceWeight(choice) {
    return choice.weight ?? TIER_WEIGHTS[choice.tier];
  }
  function totalWeight(choices) {
    return choices.reduce((sum, c) => sum + choiceWeight(c), 0);
  }
  function weightedPick(rng, choices) {
    const total = totalWeight(choices);
    let r = rng.float() * total;
    for (const choice of choices) {
      r -= choiceWeight(choice);
      if (r < 0) return choice;
    }
    return choices[choices.length - 1];
  }

  // src/generator/seededRandom.ts
  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
    }
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^ h >>> 16) >>> 0;
  }
  var Rng = class {
    state;
    constructor(seed, stream = "") {
      this.state = hashString(`${seed}::${stream}`);
      if (this.state === 0) this.state = 2654435769;
    }
    /** mulberry32 step: uniform float in [0, 1). */
    float() {
      this.state = this.state + 1831565813 >>> 0;
      let t = this.state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    /** Uniform float in [min, max). */
    range(min, max) {
      return min + (max - min) * this.float();
    }
    /** Uniform integer in [min, max] inclusive. */
    int(min, max) {
      return min + Math.floor(this.float() * (max - min + 1));
    }
    chance(p) {
      return this.float() < p;
    }
    pick(arr) {
      return arr[Math.floor(this.float() * arr.length)];
    }
    sign() {
      return this.float() < 0.5 ? -1 : 1;
    }
    /** Cheap bell-ish distribution centered on 0, range roughly [-1, 1]. */
    bell() {
      return (this.float() + this.float() + this.float()) / 1.5 - 1;
    }
    /** Random unit vector in 2D. */
    unit2() {
      const a = this.float() * Math.PI * 2;
      return [Math.cos(a), Math.sin(a)];
    }
  };

  // src/generator/version.ts
  var GENERATOR_VERSION = "1.5.0";
  var GENERATOR_MAJOR = GENERATOR_VERSION.split(".")[0];

  // src/generator/generateTraits.ts
  function generateTraits(seed) {
    const selections = {};
    for (const def of TRAIT_DEFINITIONS) {
      const rng = new Rng(seed, `v${GENERATOR_MAJOR}:trait:${def.key}`);
      const choice = weightedPick(rng, def.choices);
      selections[def.key] = {
        key: def.key,
        traitLabel: def.label,
        choiceId: choice.id,
        choiceLabel: choice.label,
        tier: choice.tier,
        params: choice.params
      };
    }
    return { seed, generatorVersion: GENERATOR_VERSION, selections };
  }

  // config.ts
  var catalog = ["head", "surface", "pixelMaterial", "eyes"].map((key) => {
    const d = TRAIT_DEFINITIONS.find((d2) => d2.key === key);
    return { ...d, choices: d.choices.filter((c) => c.id !== "blink").map((c) => ({ ...c, weight: { common: 50, uncommon: 24, rare: 8, legendary: 2 }[c.tier] })) };
  });
  var colors = [["chrome", "Chrome", [0.96, 0.96, 0.98], 35], ["graphite", "Graphite", [0.6, 0.63, 0.67], 25], ["ion", "Ion Blue", [0.25, 0.85, 1], 15], ["violet", "Ultraviolet", [0.75, 0.45, 1], 12], ["acid", "Acid", [0.77, 1, 0.25], 8], ["rose", "Rose", [1, 0.4, 0.65], 8], ["copper", "Copper", [1, 0.63, 0.3], 8], ["gold", "Gilded", [1, 0.86, 0.4], 2]];
  var backgrounds = [["void", "Void", [0.025, 0.025, 0.028], 40], ["silver", "Silver", [0.82, 0.83, 0.84], 25], ["cobalt", "Cobalt", [0.04, 0.14, 0.55], 15], ["wine", "Oxblood", [0.29, 0.035, 0.075], 12], ["forest", "Deep Green", [0.025, 0.22, 0.16], 12], ["orchid", "Orchid", [0.39, 0.16, 0.53], 7], ["orange", "Signal Orange", [0.85, 0.25, 0.055], 6], ["ice", "Ice", [0.63, 0.82, 0.88], 3]];
  for (const [key, label, rows] of [["colorway", "Colorway", colors], ["background", "Background", backgrounds]]) catalog.push({ key, label, choices: rows.map(([id, label2, rgb, weight]) => ({ id, label: label2, rgb, weight, tier: weight >= 25 ? "common" : weight >= 12 ? "uncommon" : weight >= 6 ? "rare" : "legendary" })) });
  var organicHeads = [
    ["balanced", "Balanced Oval", 30, 0.128, 0.174, 0.02, 0.02, -0.06],
    ["longoval", "Long Oval", 24, 0.113, 0.205, 0.02, -0.03, -0.06],
    ["fullcheeks", "Full Cheeks", 24, 0.14, 0.17, -0.02, 0.15, 0.02],
    ["narrow", "Narrow Face", 22, 0.102, 0.185, 0.04, -0.04, -0.12],
    ["broadjaw", "Broad Jaw", 20, 0.136, 0.176, -0.04, 0.01, 0.23],
    ["taperedjaw", "Tapered Jaw", 24, 0.129, 0.184, 0.07, 0.04, -0.28],
    ["highforehead", "High Forehead", 20, 0.126, 0.211, 0.16, -0.025, -0.12],
    ["softchin", "Soft Chin", 25, 0.126, 0.17, 0, 0.015, 0.1],
    ["highcheeks", "High Cheekbones", 20, 0.131, 0.183, -0.04, 0.21, -0.17],
    ["gaunt", "Gaunt", 14, 0.11, 0.205, 0.06, -0.16, -0.13],
    ["roundface", "Round Face", 24, 0.153, 0.165, -0.025, 0.025, 0.075],
    ["heartface", "Heart Face", 18, 0.135, 0.182, 0.13, 0.06, -0.3],
    ["pearface", "Full Lower Face", 16, 0.135, 0.176, -0.17, 0.04, 0.25],
    ["slenderchin", "Slender Chin", 18, 0.12, 0.2, 0.07, 0.085, -0.25],
    ["heavybrow", "Heavy Brow", 16, 0.143, 0.182, 0.09, -0.05, 0.075],
    ["compact", "Compact Face", 22, 0.133, 0.153, 0.01, 0.04, 0.03],
    ["widetemple", "Wide Temples", 18, 0.145, 0.183, 0.19, -0.06, -0.13],
    ["softlong", "Soft Long Face", 18, 0.123, 0.208, -0.04, 0.02, 0.14]
  ];
  var heads = catalog.find((d) => d.key === "head");
  heads.choices = organicHeads.map(([id, label, weight, rx, ry, forehead, cheek, jaw]) => ({ id, label, weight, tier: Number(weight) >= 24 ? "common" : Number(weight) >= 18 ? "uncommon" : "rare", params: { headId: id, rx, ry, forehead, cheek, jaw } }));
  catalog.push({ key: "face", label: "Face Architecture", choices: [["classic", "Classic", 35], ["cyclops", "Cyclops", 22], ["triple", "Tri Optic", 18], ["slit", "Narrow Slits", 24], ["square", "Square Optics", 25], ["cross", "Cross Optics", 12], ["grin", "Wide Grin", 20], ["hollow", "Hollow Mask", 14]].map(([id, label, weight]) => ({ id, label, weight, tier: Number(weight) >= 24 ? "common" : Number(weight) >= 18 ? "uncommon" : "rare", params: {} })) });
  for (const d of catalog) {
    d.label = trait_names_default[d.key].label;
    for (const c of d.choices) c.label = trait_names_default[d.key].choices[c.id];
  }
  function traitsFor(seed, selected) {
    const t = generateTraits(seed);
    for (const key of ["head", "surface", "pixelMaterial", "eyes"]) {
      const c = catalog.find((d) => d.key === key).choices.find((c2) => c2.id === selected[key]);
      t.selections[key] = { ...t.selections[key], choiceId: c.id, choiceLabel: c.label, params: { ...c.params } };
    }
    for (const [key, id] of Object.entries({ body: "standard", pose: "vigil", mutation: "none", palette: "mono", fragmentation: "intact" })) {
      const c = TRAIT_DEFINITIONS.find((d) => d.key === key).choices.find((c2) => c2.id === id);
      t.selections[key] = { ...t.selections[key], choiceId: c.id, choiceLabel: c.label, params: { ...c.params } };
    }
    t.formFace = selected.face;
    return t;
  }

  // src/generator/config.ts
  var BASE_CELL = 0.01;
  var SAMPLE_BOUNDS = { minX: -0.78, maxX: 0.78, minY: -1.14, maxY: 1.05 };
  var QUALITY_PRESETS = {
    draft: { id: "draft", label: "Draft", cellScale: 1.7, ambientScale: 0.35 },
    preview: { id: "preview", label: "Preview", cellScale: 1.25, ambientScale: 0.7 },
    high: { id: "high", label: "High", cellScale: 1, ambientScale: 1 },
    export: { id: "export", label: "Export", cellScale: 0.8, ambientScale: 1.2 }
  };

  // src/generator/noise.ts
  function hashLattice(ix, iy, seed) {
    let h = Math.imul(ix, 668265261) ^ Math.imul(iy, 374761393) ^ Math.imul(seed, 2654435769);
    h = Math.imul(h ^ h >>> 15, 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function smoother(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function valueNoise2(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const a = hashLattice(ix, iy, seed);
    const b = hashLattice(ix + 1, iy, seed);
    const c = hashLattice(ix, iy + 1, seed);
    const d = hashLattice(ix + 1, iy + 1, seed);
    const ux = smoother(fx);
    const uy = smoother(fy);
    const top = a + (b - a) * ux;
    const bot = c + (d - c) * ux;
    return top + (bot - top) * uy;
  }
  function fbm2(x, y, seed, octaves = 3) {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * valueNoise2(x * freq + o * 17.13, y * freq - o * 9.7, seed + o * 101);
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return sum / norm;
  }

  // src/character/silhouette.ts
  var REGION = {
    TORSO: 0,
    HEAD: 1,
    FACE: 2,
    EYE: 3,
    ARM_L: 4,
    ARM_R: 5,
    LEG: 6,
    NECK: 7,
    EXTRA: 8
  };
  var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  function sdCircle(x, y, cx, cy, r) {
    return Math.hypot(x - cx, y - cy) - r;
  }
  function sdSeg(x, y, ax, ay, bx, by, r) {
    const dx = x - ax;
    const dy = y - ay;
    const ex = bx - ax;
    const ey = by - ay;
    const h = clamp01((dx * ex + dy * ey) / (ex * ex + ey * ey));
    return Math.hypot(dx - ex * h, dy - ey * h) - r;
  }
  function sdTaper(x, y, cx, y1, y2, r1, r2) {
    const lo = Math.min(y1, y2);
    const hi = Math.max(y1, y2);
    const t = clamp01((y - y1) / (y2 - y1));
    const r = r1 + (r2 - r1) * t;
    const yy = y < lo ? lo : y > hi ? hi : y;
    return Math.hypot(x - cx, y - yy) - r;
  }
  function smin(a, b, k) {
    const h = clamp01(0.5 + 0.5 * (b - a) / k);
    return b + (a - b) * h - k * h * (1 - h);
  }
  var REST_ARM = (sw, s) => ({
    elbow: [s * (sw + 0.045), 0.07],
    wrist: [s * (sw + 0.06), -0.24],
    hand: [s * (sw + 0.055), -0.3]
  });
  function armJoints(poseId, sw, s) {
    switch (poseId) {
      case "offaxis":
        if (s < 0) {
          return {
            elbow: [-(sw + 0.1), 0.1],
            wrist: [-(sw + 0.155), -0.17],
            hand: [-(sw + 0.165), -0.225]
          };
        }
        return { elbow: [sw + 0.03, 0.06], wrist: [sw + 0.04, -0.25], hand: [sw + 0.038, -0.31] };
      case "guarded":
        return {
          elbow: [s * (sw + 0.095), 0.11],
          wrist: [-s * 0.06, 0.1],
          hand: [-s * 0.1, 0.115]
        };
      case "vigil":
        return {
          elbow: [s * (sw + 0.015), 0.05],
          wrist: [s * (sw + 5e-3), -0.27],
          hand: [s * sw, -0.33]
        };
      case "hail":
        if (s > 0) {
          return { elbow: [sw + 0.1, 0.55], wrist: [sw + 0.135, 0.82], hand: [sw + 0.14, 0.885] };
        }
        return REST_ARM(sw, s);
      case "akimbo":
        return { elbow: [s * (sw + 0.125), 0.13], wrist: [s * 0.155, -0.085], hand: [s * 0.12, -0.105] };
      case "salute":
        if (s > 0) {
          return { elbow: [sw + 0.115, 0.38], wrist: [0.115, 0.7], hand: [0.085, 0.73] };
        }
        return REST_ARM(sw, s);
      case "stride":
        if (s < 0) {
          return { elbow: [-(sw + 0.075), 0.06], wrist: [-(sw + 0.1), -0.22], hand: [-(sw + 0.105), -0.28] };
        }
        return { elbow: [sw + 0.02, 0.05], wrist: [sw - 0.01, -0.26], hand: [sw - 0.02, -0.32] };
      case "brawler":
        return {
          elbow: [s * (sw + 0.075), 0.06],
          wrist: [s * 0.105, 0.4],
          hand: [s * 0.085, 0.49],
          handScale: 1.3
        };
      case "directive":
        if (s > 0) {
          return {
            elbow: [sw + 0.15, 0.36],
            wrist: [sw + 0.28, 0.355],
            hand: [sw + 0.315, 0.35],
            handScale: 1.1
          };
        }
        return REST_ARM(sw, s);
      case "ascendant":
        return { elbow: [s * (sw + 0.09), 0.55], wrist: [s * (sw + 0.15), 0.83], hand: [s * (sw + 0.16), 0.89] };
      case "rest":
      default:
        return REST_ARM(sw, s);
    }
  }
  function legJoints(poseId, hx, s) {
    switch (poseId) {
      case "stride":
        if (s > 0) {
          return { knee: [hx + 0.06, -0.58], ankle: [hx + 0.15, -1.12] };
        }
        return { knee: [hx - 0.03, -0.64], ankle: [hx - 0.115, -1.2] };
      case "brawler":
        return { knee: [hx + s * 0.045, -0.6], ankle: [hx + s * 0.105, -1.2] };
      case "akimbo":
        return { knee: [hx + s * 0.03, -0.62], ankle: [hx + s * 0.08, -1.22] };
      default:
        return { knee: [hx + s * 0.018, -0.62], ankle: [hx + s * 0.05, -1.22] };
    }
  }
  function buildSilhouette(traits) {
    const seed = traits.seed;
    const rng = new Rng(seed, `v${GENERATOR_MAJOR}:body`);
    const bp = getParams(traits, "body");
    const hp = getParams(traits, "head");
    const pp = getParams(traits, "pose");
    const sw = bp.shoulder * (1 + rng.range(-0.04, 0.04));
    const hip = bp.hip * (1 + rng.range(-0.04, 0.04));
    const armR = bp.armR * (1 + rng.range(-0.05, 0.05));
    const legR = bp.legR * (1 + rng.range(-0.05, 0.05));
    const neckR = bp.neckR * (1 + rng.range(-0.05, 0.05));
    const turn = pp.turn * (1 + rng.range(-0.15, 0.15)) * rng.sign();
    const headDx = pp.lean * 0.7 + turn * 0.02;
    const shoulderTilt = pp.poseId === "offaxis" ? 0.016 : rng.range(-6e-3, 6e-3);
    const parts = [];
    const hcx = headDx;
    const hcy = 0.72;
    let hrx = 0.125;
    let hry = 0.163;
    let visor = false;
    const anatomy = hp;
    hrx = anatomy.rx;
    hry = anatomy.ry;
    const gaussian = (t, center, spread) => Math.exp(-Math.pow((t - center) / spread, 2));
    parts.push({ region: REGION.HEAD, sdf: (x, y) => {
      const t = (y - hcy) / hry;
      if (Math.abs(t) >= 1) return Math.hypot(x - hcx, Math.max(0, Math.abs(y - hcy) - hry));
      const fullness = 1 + anatomy.forehead * gaussian(t, 0.52, 0.4) + anatomy.cheek * gaussian(t, -0.03, 0.28) + anatomy.jaw * gaussian(t, -0.56, 0.3);
      const width = hrx * Math.sqrt(1 - t * t) * fullness;
      return Math.max(Math.abs(x - hcx) - width, Math.abs(y - hcy) - hry);
    } });
    parts.push({ region: REGION.NECK, sdf: (x, y) => sdSeg(x, y, hcx * 0.5, 0.6, 0, 0.46, neckR) });
    const chestR = sw * 0.75;
    const waistR = Math.max(hip * 0.88, chestR * 0.55);
    parts.push({
      region: REGION.TORSO,
      sdf: (x, y) => sdSeg(x, y, -sw + 0.06, 0.385 + shoulderTilt, sw - 0.06, 0.385 - shoulderTilt, 0.07)
    });
    parts.push({ region: REGION.TORSO, sdf: (x, y) => sdTaper(x, y, 0, 0.36, 0.05, chestR, waistR) });
    parts.push({ region: REGION.TORSO, sdf: (x, y) => sdTaper(x, y, 0, 0.05, -0.14, waistR, hip) });
    for (const s of [-1, 1]) {
      const region = s < 0 ? REGION.ARM_L : REGION.ARM_R;
      const shoulder = [s * (sw - 0.015), 0.375 + shoulderTilt * -s];
      const j = armJoints(pp.poseId, sw, s);
      const handR = armR * 0.85 * (j.handScale ?? 1);
      parts.push({ region, sdf: (x, y) => sdSeg(x, y, shoulder[0], shoulder[1], j.elbow[0], j.elbow[1], armR) });
      parts.push({ region, sdf: (x, y) => sdSeg(x, y, j.elbow[0], j.elbow[1], j.wrist[0], j.wrist[1], armR * 0.88) });
      parts.push({ region, sdf: (x, y) => sdCircle(x, y, j.hand[0], j.hand[1], handR) });
    }
    for (const s of [-1, 1]) {
      const hx = s * hip * 0.52;
      const lj = legJoints(pp.poseId, hx, s);
      parts.push({ region: REGION.LEG, sdf: (x, y) => sdSeg(x, y, hx, -0.13, lj.knee[0], lj.knee[1], legR) });
      parts.push({
        region: REGION.LEG,
        sdf: (x, y) => sdSeg(x, y, lj.knee[0], lj.knee[1], lj.ankle[0], lj.ankle[1], legR * 0.78)
      });
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].region !== REGION.HEAD && parts[i].region !== REGION.EXTRA) parts.splice(i, 1);
    const faceX = hcx + turn * 0.05;
    const eyeY = hcy + hry * 0.12;
    const eyeGap = hrx * 0.42;
    const head = {
      cx: hcx,
      cy: hcy,
      rx: hrx,
      ry: hry,
      faceX,
      eyeY,
      eyeR: hrx * 0.16,
      eyeLX: faceX - eyeGap * (1 + turn * 0.22),
      eyeRX: faceX + eyeGap * (1 - turn * 0.22),
      mouthY: hcy - hry * 0.42,
      visor,
      turn
    };
    const anchors = {
      neckPivot: [hcx * 0.5, 0.5],
      hipPivot: [0, -0.14],
      headCenter: [hcx, hcy],
      eyeL: [head.eyeLX, eyeY],
      eyeR: [head.eyeRX, eyeY]
    };
    const K = 0.026;
    return {
      sdf(x, y) {
        let d = 1e9;
        for (const part of parts) d = smin(d, part.sdf(x, y), K);
        return d;
      },
      regionAt(x, y) {
        let best = Infinity;
        let region = REGION.TORSO;
        for (const part of parts) {
          const d = part.sdf(x, y);
          if (d < best) {
            best = d;
            region = part.region;
          }
        }
        return region;
      },
      anchors,
      head
    };
  }

  // src/presets/palettes.ts
  var PALETTES = {
    mono: {
      id: "mono",
      label: "Monochrome",
      bgTop: [0.055, 0.06, 0.07],
      bgBottom: [0.016, 0.018, 0.022],
      colorA: [0.1, 0.105, 0.115],
      colorB: [0.93, 0.945, 0.96],
      accent: [1, 1, 1],
      accentAmount: 0,
      ambient: [0.62, 0.65, 0.68],
      eye: [1, 1, 1]
    },
    porcelain: {
      id: "porcelain",
      label: "Porcelain Inverse",
      bgTop: [0.93, 0.92, 0.895],
      bgBottom: [0.8, 0.79, 0.765],
      colorA: [0.72, 0.71, 0.685],
      colorB: [0.055, 0.06, 0.075],
      accent: [0.78, 0.16, 0.1],
      accentAmount: 0.02,
      ambient: [0.3, 0.3, 0.32],
      eye: [0.08, 0.08, 0.1]
    },
    ember: {
      id: "ember",
      label: "Ember Accent",
      bgTop: [0.06, 0.05, 0.048],
      bgBottom: [0.02, 0.014, 0.012],
      colorA: [0.115, 0.1, 0.095],
      colorB: [0.95, 0.93, 0.9],
      accent: [1, 0.32, 0.14],
      accentAmount: 0.028,
      ambient: [0.72, 0.58, 0.48],
      eye: [1, 0.42, 0.18]
    },
    ion: {
      id: "ion",
      label: "Ion Accent",
      bgTop: [0.045, 0.058, 0.066],
      bgBottom: [0.012, 0.018, 0.024],
      colorA: [0.09, 0.105, 0.115],
      colorB: [0.91, 0.95, 0.965],
      accent: [0.22, 0.93, 1],
      accentAmount: 0.028,
      ambient: [0.52, 0.68, 0.72],
      eye: [0.45, 0.96, 1]
    },
    orchid: {
      id: "orchid",
      label: "Orchid Accent",
      bgTop: [0.06, 0.048, 0.066],
      bgBottom: [0.018, 0.012, 0.022],
      colorA: [0.11, 0.095, 0.115],
      colorB: [0.95, 0.92, 0.96],
      accent: [1, 0.26, 0.92],
      accentAmount: 0.03,
      ambient: [0.7, 0.55, 0.7],
      eye: [1, 0.4, 0.95]
    },
    acid: {
      id: "acid",
      label: "Acid Accent",
      bgTop: [0.05, 0.058, 0.042],
      bgBottom: [0.014, 0.018, 0.01],
      colorA: [0.1, 0.11, 0.09],
      colorB: [0.93, 0.955, 0.9],
      accent: [0.76, 1, 0.22],
      accentAmount: 0.03,
      ambient: [0.62, 0.7, 0.5],
      eye: [0.82, 1, 0.35]
    },
    crimson: {
      id: "crimson",
      label: "Crimson Field",
      bgTop: [0.055, 0.012, 0.01],
      bgBottom: [0.018, 2e-3, 2e-3],
      colorA: [0.16, 0.035, 0.028],
      colorB: [1, 0.38, 0.28],
      accent: [1, 0.82, 0.34],
      accentAmount: 0.012,
      ambient: [0.75, 0.32, 0.26],
      eye: [1, 0.85, 0.55]
    },
    gilded: {
      id: "gilded",
      label: "Gilded",
      bgTop: [0.055, 0.048, 0.036],
      bgBottom: [0.018, 0.014, 9e-3],
      colorA: [0.12, 0.1, 0.075],
      colorB: [0.97, 0.91, 0.78],
      accent: [1, 0.78, 0.28],
      accentAmount: 0.05,
      ambient: [0.78, 0.68, 0.48],
      eye: [1, 0.85, 0.4]
    },
    cobalt: {
      id: "cobalt",
      label: "Cobalt Field",
      bgTop: [0.04, 0.05, 0.078],
      bgBottom: [0.01, 0.013, 0.03],
      colorA: [0.08, 0.1, 0.17],
      colorB: [0.74, 0.85, 1],
      accent: [0.38, 0.68, 1],
      accentAmount: 0.02,
      ambient: [0.5, 0.6, 0.82],
      eye: [0.62, 0.85, 1]
    },
    verdigris: {
      id: "verdigris",
      label: "Verdigris Accent",
      bgTop: [0.042, 0.058, 0.054],
      bgBottom: [0.012, 0.018, 0.016],
      colorA: [0.09, 0.11, 0.105],
      colorB: [0.92, 0.955, 0.93],
      accent: [0.24, 0.9, 0.72],
      accentAmount: 0.028,
      ambient: [0.52, 0.7, 0.64],
      eye: [0.4, 0.95, 0.78]
    },
    ultraviolet: {
      id: "ultraviolet",
      label: "Ultraviolet Accent",
      bgTop: [0.052, 0.045, 0.07],
      bgBottom: [0.014, 0.011, 0.024],
      colorA: [0.1, 0.09, 0.125],
      colorB: [0.94, 0.925, 0.97],
      accent: [0.6, 0.38, 1],
      accentAmount: 0.03,
      ambient: [0.62, 0.55, 0.78],
      eye: [0.72, 0.5, 1]
    },
    alabaster: {
      id: "alabaster",
      label: "Alabaster Cobalt",
      bgTop: [0.9, 0.9, 0.885],
      bgBottom: [0.78, 0.79, 0.775],
      colorA: [0.68, 0.69, 0.675],
      colorB: [0.095, 0.105, 0.13],
      accent: [0.1, 0.34, 0.8],
      accentAmount: 0.025,
      ambient: [0.32, 0.34, 0.4],
      eye: [0.08, 0.3, 0.75]
    },
    sepia: {
      id: "sepia",
      label: "Archive Sepia",
      bgTop: [0.058, 0.048, 0.035],
      bgBottom: [0.02, 0.015, 0.01],
      colorA: [0.13, 0.105, 0.072],
      colorB: [0.9, 0.82, 0.67],
      accent: [0.86, 0.6, 0.34],
      accentAmount: 0.02,
      ambient: [0.7, 0.6, 0.45],
      eye: [0.95, 0.8, 0.55]
    },
    matrix: {
      id: "matrix",
      label: "Signal Green",
      bgTop: [0.015, 0.045, 0.022],
      bgBottom: [4e-3, 0.014, 7e-3],
      colorA: [0.035, 0.1, 0.05],
      colorB: [0.45, 1, 0.55],
      accent: [0.85, 1, 0.6],
      accentAmount: 0.015,
      ambient: [0.35, 0.8, 0.45],
      eye: [0.7, 1, 0.7]
    },
    amberfield: {
      id: "amberfield",
      label: "Amber Field",
      bgTop: [0.055, 0.035, 0.012],
      bgBottom: [0.017, 0.01, 3e-3],
      colorA: [0.14, 0.085, 0.03],
      colorB: [1, 0.72, 0.34],
      accent: [1, 0.9, 0.6],
      accentAmount: 0.015,
      ambient: [0.85, 0.6, 0.3],
      eye: [1, 0.82, 0.45]
    },
    blueprint: {
      id: "blueprint",
      label: "Blueprint",
      bgTop: [0.09, 0.16, 0.33],
      bgBottom: [0.045, 0.085, 0.2],
      colorA: [0.22, 0.32, 0.5],
      colorB: [0.93, 0.96, 1],
      accent: [1, 1, 1],
      accentAmount: 0.02,
      ambient: [0.7, 0.8, 0.95],
      eye: [1, 1, 1]
    },
    rose: {
      id: "rose",
      label: "Rose Accent",
      bgTop: [0.058, 0.045, 0.05],
      bgBottom: [0.017, 0.012, 0.014],
      colorA: [0.11, 0.095, 0.1],
      colorB: [0.955, 0.93, 0.94],
      accent: [1, 0.45, 0.62],
      accentAmount: 0.03,
      ambient: [0.75, 0.55, 0.62],
      eye: [1, 0.55, 0.7]
    },
    hazard: {
      id: "hazard",
      label: "Hazard",
      bgTop: [0.05, 0.05, 0.045],
      bgBottom: [0.015, 0.015, 0.012],
      colorA: [0.15, 0.125, 0.02],
      colorB: [1, 0.85, 0.05],
      accent: [1, 1, 1],
      accentAmount: 0.02,
      ambient: [0.8, 0.7, 0.2],
      eye: [1, 0.95, 0.5]
    },
    wasp: {
      id: "wasp",
      label: "Wasp Inverse",
      bgTop: [0.95, 0.78, 0.08],
      bgBottom: [0.8, 0.62, 0.03],
      colorA: [0.55, 0.44, 0.06],
      colorB: [0.05, 0.05, 0.05],
      accent: [0.88, 0.12, 0.06],
      accentAmount: 0.022,
      ambient: [0.28, 0.22, 0.04],
      eye: [0.9, 0.15, 0.08]
    },
    blaze: {
      id: "blaze",
      label: "Blaze",
      bgTop: [0.05, 0.04, 0.035],
      bgBottom: [0.015, 0.01, 8e-3],
      colorA: [0.14, 0.06, 0.015],
      colorB: [1, 0.46, 0.08],
      accent: [1, 1, 1],
      accentAmount: 0.018,
      ambient: [0.85, 0.5, 0.2],
      eye: [1, 0.62, 0.25]
    },
    alarm: {
      id: "alarm",
      label: "Alarm",
      bgTop: [0.3, 0.03, 0.03],
      bgBottom: [0.11, 0.01, 0.01],
      colorA: [0.36, 0.09, 0.07],
      colorB: [1, 0.97, 0.94],
      accent: [1, 0.85, 0.2],
      accentAmount: 0.02,
      ambient: [0.9, 0.5, 0.4],
      eye: [1, 0.9, 0.3]
    },
    royalvolt: {
      id: "royalvolt",
      label: "Royal Volt",
      bgTop: [0.14, 0.06, 0.28],
      bgBottom: [0.05, 0.02, 0.12],
      colorA: [0.21, 0.13, 0.36],
      colorB: [0.95, 1, 0.25],
      accent: [1, 1, 1],
      accentAmount: 0.02,
      ambient: [0.6, 0.5, 0.85],
      eye: [0.98, 1, 0.55]
    },
    hologram: {
      id: "hologram",
      label: "Hologram",
      bgTop: [0.02, 0.05, 0.06],
      bgBottom: [5e-3, 0.015, 0.02],
      colorA: [0.05, 0.1, 0.13],
      colorB: [0.55, 0.95, 1],
      accent: [1, 0.3, 0.9],
      accentAmount: 0.045,
      ambient: [0.4, 0.75, 0.85],
      eye: [0.75, 1, 1]
    }
  };
  var PALETTE_LIST = Object.values(PALETTES);

  // src/particles/particleData.ts
  var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  function pushParticle(acc, x, y, z, size, bright, phase, suscept, region, dx, dy, erode, edge, accent) {
    acc.home.push(x, y, z);
    acc.size.push(size);
    acc.bright.push(bright);
    acc.phase.push(phase);
    acc.suscept.push(suscept);
    acc.region.push(region);
    acc.detach.push(dx, dy);
    acc.erode.push(erode);
    acc.edge.push(edge);
    acc.accent.push(accent);
    acc.count++;
  }
  function buildEntity(seed, traits, options2) {
    const sil = buildSilhouette(traits);
    const preset = QUALITY_PRESETS[options2.quality];
    const pm = getParams(traits, "pixelMaterial");
    const surface = getParams(traits, "surface");
    const paletteId = getParams(traits, "palette").paletteId;
    const palette = PALETTES[paletteId];
    const mutation = getParams(traits, "mutation").mutationId;
    const cell = BASE_CELL * preset.cellScale * pm.cellMult * clamp(options2.pixelScale, 0.4, 2.5);
    const rng = new Rng(seed, `v${GENERATOR_MAJOR}:particles`);
    const noiseSeed = hashString(`${seed}::v${GENERATOR_MAJOR}:field`) | 0;
    const lightDir = new Rng(seed, `v${GENERATOR_MAJOR}:shade`).sign();
    const mutRng = new Rng(seed, `v${GENERATOR_MAJOR}:mutation`);
    const ghostRegion = mutRng.sign() < 0 ? REGION.ARM_L : REGION.ARM_R;
    const exposureDir = mutRng.sign();
    const acc = {
      home: [],
      size: [],
      bright: [],
      phase: [],
      suscept: [],
      region: [],
      detach: [],
      erode: [],
      edge: [],
      accent: [],
      count: 0
    };
    const { minX, maxX, minY, maxY } = SAMPLE_BOUNDS;
    const cols = Math.floor((maxX - minX) / cell);
    const rows = Math.floor((maxY - minY) / cell);
    const head = sil.head;
    for (let iy = 0; iy < rows; iy++) {
      const y = minY + (iy + 0.5) * cell;
      for (let ix = 0; ix < cols; ix++) {
        const x = minX + (ix + 0.5) * cell;
        const d = sil.sdf(x, y);
        if (d >= 0) continue;
        const edge = clamp(1 + d / (cell * 4), 0, 1);
        if (edge < 0.6 && rng.chance(0.04)) continue;
        let region = sil.regionAt(x, y);
        let isEye = false;
        if (region === REGION.HEAD) {
          if (head.visor) {
            if (Math.abs(y - head.eyeY) < 0.021 && Math.abs(x - head.cx) < head.rx * 0.78) isEye = true;
          } else if (Math.hypot(x - head.eyeLX, y - head.eyeY) < head.eyeR || Math.hypot(x - head.eyeRX, y - head.eyeY) < head.eyeR) {
            isEye = true;
          }
          const face2 = traits.formFace || "classic";
          const ex = Math.min(Math.abs(x - head.eyeLX), Math.abs(x - head.eyeRX)), ey = Math.abs(y - head.eyeY);
          if (face2 === "cyclops") isEye = Math.hypot(x - head.faceX, y - head.eyeY) < head.rx * 0.24;
          if (face2 === "triple") isEye = ex * ex + (y - head.eyeY + 0.016) ** 2 < head.eyeR ** 2 || Math.hypot(x - head.faceX, y - head.eyeY - 0.057) < head.eyeR;
          if (face2 === "slit") isEye = ex < head.rx * 0.23 && ey < 7e-3;
          if (face2 === "square") isEye = ex < 0.024 && ey < 0.024;
          if (face2 === "cross") isEye = ex < 9e-3 && ey < 0.035 || ex < 0.031 && ey < 9e-3;
          if (face2 === "hollow") isEye = Math.abs(Math.hypot(ex, y - head.eyeY) - 0.027) < 5e-3;
          if (isEye) {
            region = REGION.EYE;
          } else {
            const fx = (x - head.faceX) / (head.rx * 0.66);
            const fy = (y - (head.cy - 0.012)) / (head.ry * 0.8);
            if (fx * fx + fy * fy < 1) region = REGION.FACE;
          }
        }
        let bright = 0.52;
        bright += 0.1 * clamp((y + 1.1) / 2, 0, 1);
        bright -= 0.09 * clamp(x * lightDir / 0.5, -1, 1);
        bright += edge * 0.22;
        switch (surface.surfaceId) {
          case "etched":
            bright += Math.sin(y * 150 + fbm2(x * 2.2, y * 2.2, noiseSeed + 3) * 7) * 0.08;
            break;
          case "plated": {
            const q = Math.floor(fbm2(x * 4.6, y * 4.6, noiseSeed + 11) * 4.999) / 4;
            bright += (q - 0.4) * 0.22;
            break;
          }
          case "circuit": {
            const v = fbm2(x * 5.5, y * 5.5, noiseSeed + 21, 3);
            bright += Math.abs(v - 0.5) < 0.035 ? 0.14 : -0.04;
            break;
          }
          case "molten":
            bright += (fbm2(x * 4, y * 4, noiseSeed + 7, 4) - 0.5) * 0.34;
            break;
          case "matte":
          default:
            bright += (fbm2(x * 6, y * 6, noiseSeed) - 0.5) * 0.15;
            break;
        }
        if (region === REGION.FACE) {
          bright += 0.08;
          const dl = Math.hypot(x - head.eyeLX, y - head.eyeY);
          const dr = Math.hypot(x - head.eyeRX, y - head.eyeY);
          if (dl > head.eyeR && dl < head.eyeR * 1.9 || dr > head.eyeR && dr < head.eyeR * 1.9) {
            bright -= 0.14;
          }
          if (y > head.eyeY + 0.024 && y < head.eyeY + 0.038 && Math.abs(x - head.faceX) < 0.08) {
            bright -= 0.1;
          }
          if (Math.abs(y - head.mouthY) < 9e-3 && Math.abs(x - head.faceX) < 0.033) {
            bright -= 0.3;
          }
        }
        const face = traits.formFace || "classic";
        const mx = x - head.faceX, my = y - head.mouthY;
        if (face === "grin" && Math.abs(mx) < head.rx * 0.62 && Math.abs(my + 0.023 * (1 - (mx / (head.rx * 0.62)) ** 2)) < 0.014) bright = Math.floor(mx / 0.012) % 2 === 0 ? 0.95 : 0.08;
        if (face === "hollow" && Math.abs(mx) < head.rx * 0.25 && Math.abs(my) < 0.027) bright = 0.04;
        if (face === "cyclops" && Math.abs(mx) < 0.035 && Math.abs(my) < 6e-3) bright = 0.08;
        bright += rng.range(-0.05, 0.05);
        bright = clamp(bright, 0.06, 1.25);
        const tierRoll = rng.float();
        let size = cell * 0.98;
        if (tierRoll < pm.bigChance) size = cell * 1.85;
        else if (tierRoll < pm.bigChance + pm.smallChance) size = cell * 0.62;
        let z = rng.range(-0.02, 0.02);
        if (region === REGION.EYE) {
          size = cell * 1.1;
          bright = 1.2;
          z = 0.05;
        } else if (region === REGION.EXTRA) {
          z = 0.01;
        }
        const protectFace = region === REGION.FACE || region === REGION.EYE;
        let suscept = 0.55 * fbm2(x * 2.6 + 9.1, y * 2.6 - 4.3, noiseSeed ^ 81) + 0.3 * rng.float() + edge * 0.18;
        if (protectFace) suscept *= 0.35;
        suscept = clamp(suscept, 0, 1);
        let erode = 0.75 * fbm2(x * 3.1 - 7.7, y * 3.1 + 5.9, noiseSeed ^ 158) + 0.25 * rng.float();
        if (protectFace) erode *= 0.25;
        else if (region === REGION.HEAD) erode *= 0.6;
        erode = clamp(erode, 0, 1);
        let ddx = x * 1.5 + rng.bell() * 0.7;
        let ddy = 0.3 + rng.bell() * 0.6;
        const dlen = Math.hypot(ddx, ddy) || 1;
        ddx /= dlen;
        ddy /= dlen;
        const phase = rng.float();
        let accent = 0;
        if (region !== REGION.EYE && palette.accentAmount > 0 && rng.chance(palette.accentAmount)) {
          accent = 1;
        }
        if (mutation === "ghostLimb" && region === ghostRegion) {
          bright *= 0.45;
          suscept = clamp(suscept + 0.35, 0, 1);
          erode = clamp(erode + 0.25, 0, 1);
        }
        pushParticle(acc, x, y, z, size, bright, phase, suscept, region, ddx, ddy, erode, edge, accent);
        if (mutation === "doubleExposure" && acc.count % 7 === 0) {
          pushParticle(
            acc,
            x + exposureDir * 0.055,
            y,
            z - 0.03,
            size,
            bright * 0.35,
            phase,
            clamp(suscept + 0.35, 0, 1),
            region,
            ddx,
            ddy,
            erode,
            edge,
            0
          );
        }
        if (mutation === "chromaticRift" && acc.count % 9 === 0) {
          pushParticle(acc, x - 8e-3, y, z - 0.03, size, bright * 0.55, phase, suscept, region, ddx, ddy, erode, edge, 2);
          pushParticle(acc, x + 8e-3, y, z - 0.03, size, bright * 0.55, phase, suscept, region, ddx, ddy, erode, edge, 3);
        }
      }
    }
    const particles = {
      count: acc.count,
      home: new Float32Array(acc.home),
      size: new Float32Array(acc.size),
      bright: new Float32Array(acc.bright),
      phase: new Float32Array(acc.phase),
      suscept: new Float32Array(acc.suscept),
      region: new Float32Array(acc.region),
      detach: new Float32Array(acc.detach),
      erode: new Float32Array(acc.erode),
      edge: new Float32Array(acc.edge),
      accent: new Float32Array(acc.accent)
    };
    return {
      seed,
      particles,
      ambient: buildAmbient(seed, traits, preset.ambientScale),
      anchors: sil.anchors
    };
  }
  function buildAmbient(seed, traits, ambientScale) {
    const ap = getParams(traits, "ambient");
    const rng = new Rng(seed, `v${GENERATOR_MAJOR}:ambient`);
    const count = Math.max(24, Math.round(240 * ambientScale * ap.countMult));
    const center = new Float32Array(count * 2);
    const radius = new Float32Array(count);
    const speed = new Float32Array(count);
    const phase0 = new Float32Array(count);
    const size = new Float32Array(count);
    const bright = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = rng.float() * Math.PI * 2;
      const rad = 0.35 + rng.float() * 0.75;
      center[i * 2] = Math.cos(angle) * rad * 0.95;
      center[i * 2 + 1] = clamp(0.1 + Math.sin(angle) * rad * 0.95, -1.05, 1.05);
      radius[i] = 0.02 + rng.float() * 0.09;
      speed[i] = rng.int(1, 3) * rng.sign();
      phase0[i] = rng.float();
      size[i] = 45e-4 + rng.float() * 8e-3;
      bright[i] = 0.25 + rng.float() * 0.55;
    }
    return { count, center, radius, speed, phase0, size, bright };
  }

  // renderer.ts
  var clamp012 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  var mix = (a, b, t) => a + (b - a) * t;
  function renderEntity(seed, selected, SIZE = 480) {
    const SS = 1;
    const traits = traitsFor(seed, selected);
    const built = buildEntity(seed, traits, { quality: "export", pixelScale: 0.55 });
    const color = catalog.find((d) => d.key === "colorway").choices.find((c) => c.id === selected.colorway);
    const bg = catalog.find((d) => d.key === "background").choices.find((c) => c.id === selected.background);
    const pal = { bgTop: bg.rgb, bgBottom: bg.rgb, colorA: color.rgb.map((c) => c * 0.12), colorB: color.rgb, accent: color.rgb, ambient: color.rgb };
    const paletteId = color.id;
    const W = SIZE * SS, H = SIZE * SS;
    const buf = new Uint8Array(W * H * 3);
    for (let y = 0; y < H; y++) {
      const t = y / (H - 1);
      const r = mix(pal.bgTop[0], pal.bgBottom[0], t) * 255 | 0;
      const g = mix(pal.bgTop[1], pal.bgBottom[1], t) * 255 | 0;
      const b = mix(pal.bgTop[2], pal.bgBottom[2], t) * 255 | 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
      }
    }
    const P = built.particles;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < P.count; i++) {
      if (![1, 2, 3, 8].includes(P.region[i])) continue;
      const x = P.home[i * 3], y = P.home[i * 3 + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const spanY = maxY - minY || 1;
    const spanX = maxX - minX || 1;
    const pad2 = 0.14;
    const scale = Math.min(W * (1 - pad2 * 2) / spanX, H * (1 - pad2 * 2) / spanY);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const toPx = (x, y) => [W / 2 + (x - cx) * scale, H / 2 - (y - cy) * scale];
    for (let i = 0; i < P.count; i++) {
      if (![1, 2, 3, 8].includes(P.region[i])) continue;
      const [px, py] = toPx(P.home[i * 3], P.home[i * 3 + 1]);
      const s = Math.max(1, P.size[i] * scale);
      const br = clamp012(P.bright[i]);
      const acc = P.accent[i] | 0;
      let col;
      if (acc === 1) col = pal.accent;
      else if (acc === 2) col = [0.85, 0.85, 0.85];
      else if (acc === 3) col = [0.65, 0.65, 0.65];
      else col = [
        mix(pal.colorA[0], pal.colorB[0], br),
        mix(pal.colorA[1], pal.colorB[1], br),
        mix(pal.colorA[2], pal.colorB[2], br)
      ];
      if (P.region[i] === 3) {
        col = selected.eyes === "dim" ? color.rgb.map((c) => c * 0.35) : selected.eyes === "burning" ? [1, 0.35, 0.12] : [0.98, 0.98, 1];
        if (selected.eyes === "beam") paintSquare(buf, W, H, px, py, s * 2.1, col.map((c) => c * 0.5));
      }
      const boost = 1 + (P.edge ? P.edge[i] * 0.35 : 0);
      paintSquare(buf, W, H, px, py, s, col.map((c) => c * boost));
    }
    return { buf, W, H, traits, paletteId, pal };
  }
  function paintSquare(buf, W, H, cx, cy, s, rgb) {
    const half = s / 2;
    const x0 = Math.max(0, Math.floor(cx - half)), x1 = Math.min(W - 1, Math.ceil(cx + half));
    const y0 = Math.max(0, Math.floor(cy - half)), y1 = Math.min(H - 1, Math.ceil(cy + half));
    const r = clamp012(rgb[0]) * 255, g = clamp012(rgb[1]) * 255, b = clamp012(rgb[2]) * 255;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * W + x) * 3;
        buf[i] = Math.min(255, buf[i] * 0.25 + r * 0.85);
        buf[i + 1] = Math.min(255, buf[i + 1] * 0.25 + g * 0.85);
        buf[i + 2] = Math.min(255, buf[i + 2] * 0.25 + b * 0.85);
      }
    }
  }

  // studio.ts
  var $ = (s) => document.querySelector(s);
  var data;
  var page = 0;
  var filtered = [];
  var activeId = 1;
  var comboPage = 0;
  var labTimer;
  var pageSize = 40;
  var comboSize = 50;
  var filters = {};
  var format = (n) => n.toLocaleString();
  var pad = (n) => String(n).padStart(3, "0");
  function view(name) {
    for (const id of ["gallery", "traits", "lab", "combinations"]) $("#" + id).hidden = id !== name;
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === name)));
    if (name === "lab") renderLab();
    if (name === "combinations") renderCombos();
  }
  document.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => view(b.dataset.view));
  function options(d, all = false) {
    return (all ? '<option value="">All ' + d.label.toLowerCase() + "</option>" : "") + d.choices.map((c) => `<option value="${c.id}">${c.label}${all ? " (" + data.counts[d.key][c.id] + ")" : ""}</option>`).join("");
  }
  function setup() {
    $("#possible").textContent = format(data.possible);
    $("#validation").textContent = `[ ${data.validation.uniqueImages} UNIQUE IMAGES / ${data.validation.uniqueTraitCombinations} UNIQUE TRAIT SETS ]`;
    $("#rarity-method").textContent = data.rarityMethod;
    $("#filters").innerHTML = data.catalog.map((d) => `<label>${d.label.toUpperCase()}<select data-filter="${d.key}">${options(d, true)}</select></label>`).join("");
    document.querySelectorAll("[data-filter]").forEach((e) => e.onchange = () => {
      filters[e.dataset.filter] = e.value;
      page = 0;
      renderGallery();
    });
    $("#lab-fields").innerHTML = data.catalog.map((d) => `<label>${d.label.toUpperCase()}<select data-lab="${d.key}">${options(d)}</select></label>`).join("");
    document.querySelectorAll("[data-lab]").forEach((e) => e.onchange = scheduleLab);
    $("#lab-seed").oninput = scheduleLab;
    $("#combo-jump").max = data.possible;
    $("#combo-count").textContent = `${format(data.possible)} combinations / 888 selected`;
    $("#combo-head").innerHTML = "<tr><th>INDEX</th>" + data.catalog.map((d) => `<th>${d.label.toUpperCase()}</th>`).join("") + "<th></th></tr>";
    renderTraits();
    renderGallery();
    setLab(data.items[45]);
    $("#loading").hidden = true;
    view("gallery");
  }
  function renderGallery() {
    const q = $("#search").value.trim().toLowerCase().replace(/^#/, "");
    filtered = data.items.filter((i) => data.catalog.every((d) => !filters[d.key] || i.selected[d.key] === filters[d.key]) && (!q || (/^\d+$/.test(q) ? i.id === Number(q) : i.attributes.some((a) => a.value.toLowerCase().includes(q)))));
    const sort = $("#sort").value;
    filtered.sort((a, b) => sort === "rare" ? a.rank - b.rank : sort === "common" ? b.rank - a.rank : a.id - b.id);
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pages - 1);
    $("#result-count").textContent = `${filtered.length} / 888 IDENTITIES`;
    $("#grid").innerHTML = filtered.slice(page * pageSize, (page + 1) * pageSize).map((i) => `<button class="nft" data-id="${i.id}" aria-label="Inspect hive.md Agent ${pad(i.id)}, rarity rank ${i.rank}"><img src="${i.image}" alt="${i.attributes[4].value} ${i.attributes[0].value} face on ${i.attributes[5].value}" loading="lazy" width="480" height="480"><div class="card-meta"><span>hive.md / ${pad(i.id)}</span><span class="rank">RANK #${i.rank}</span></div><div class="card-bottom">${i.attributes[4].value.toUpperCase()} / ${i.attributes[5].value.toUpperCase()}</div></button>`).join("") || '<div class="empty">[ NO MATCHING IDENTITIES ]<br>Try clearing a filter or searching another trait.</div>';
    document.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => openDetail(Number(b.dataset.id)));
    $("#page-label").textContent = `PAGE ${page + 1} / ${pages}`;
    $("#prev").disabled = page === 0;
    $("#next").disabled = page >= pages - 1;
  }
  $("#search").oninput = () => {
    page = 0;
    renderGallery();
  };
  $("#sort").onchange = () => {
    page = 0;
    renderGallery();
  };
  $("#reset").onclick = () => {
    for (const k in filters) delete filters[k];
    document.querySelectorAll("[data-filter]").forEach((e) => e.value = "");
    $("#search").value = "";
    $("#sort").value = "id";
    page = 0;
    renderGallery();
  };
  $("#prev").onclick = () => {
    page--;
    renderGallery();
    $("#grid").scrollIntoView({ block: "start" });
  };
  $("#next").onclick = () => {
    page++;
    renderGallery();
    $("#grid").scrollIntoView({ block: "start" });
  };
  function openDetail(id) {
    activeId = id;
    const i = data.items[id - 1];
    $("#detail-title").textContent = `hive.md / AGENT ${pad(id)}`;
    $("#detail-image").src = i.image;
    $("#detail-image").alt = `Agent ${id}: ${i.attributes.map((a) => a.value).join(", ")}`;
    $("#detail-summary").innerHTML = `<span>RANK <b>#${i.rank} / 888</b></span><span>SCORE ${i.score.toFixed(2)}</span>`;
    $("#detail-traits").innerHTML = i.attributes.map((a) => `<div class="detail-attribute"><div>${a.value}<span>${a.trait_type.toUpperCase()} / ${a.designTier.toUpperCase()}</span></div><div>${a.percent}%<span>${a.count} OF 888</span></div></div>`).join("");
    $("#download-art").href = i.image;
    $("#download-art").download = `hive-${pad(id)}.png`;
    $("#download-meta").href = `metadata/${id}.json`;
    $("#download-meta").download = `hive-${pad(id)}.json`;
    $("#detail-seed").textContent = `SEED ${i.seed} / SHA256 ${i.hash}`;
    $("#detail-prev").disabled = id === 1;
    $("#detail-next").disabled = id === 888;
    if (!$("#detail").open) $("#detail").showModal();
  }
  $("#close").onclick = () => $("#detail").close();
  $("#detail-prev").onclick = () => openDetail(activeId - 1);
  $("#detail-next").onclick = () => openDetail(activeId + 1);
  $("#detail").addEventListener("click", (e) => {
    if (e.target === $("#detail")) {
      const r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
    }
  });
  $("#open-lab").onclick = () => {
    setLab(data.items[activeId - 1]);
    $("#detail").close();
    view("lab");
  };
  function renderTraits() {
    $("#trait-tables").innerHTML = data.catalog.map((d) => `<article class="trait-panel"><h3>${d.label} / ${d.choices.length}</h3>${d.choices.map((c) => {
      const n = data.counts[d.key][c.id], percent = n / 888 * 100;
      return `<button class="trait-row" data-category="${d.key}" data-choice="${c.id}"><div class="trait-name"><span>${c.rgb ? `<i class="swatch" style="background:rgb(${c.rgb.map((v) => Math.round(v * 255)).join(",")})"></i>` : ""}${c.label}</span><span>${percent.toFixed(2)}%</span></div><div class="trait-sub"><span>${c.tier.toUpperCase()} / WEIGHT ${c.weight}</span><span>${n} / 888</span></div><div class="meter"><i style="width:${percent}%"></i></div></button>`;
    }).join("")}</article>`).join("");
    document.querySelectorAll("[data-category]").forEach((b) => b.onclick = () => {
      $("#reset").click();
      filters[b.dataset.category] = b.dataset.choice;
      $(`[data-filter="${b.dataset.category}"]`).value = b.dataset.choice;
      renderGallery();
      view("gallery");
    });
  }
  function setLab(item) {
    for (const [k, v] of Object.entries(item.selected)) $(`[data-lab="${k}"]`).value = v;
    $("#lab-seed").value = item.seed;
  }
  function scheduleLab() {
    clearTimeout(labTimer);
    labTimer = setTimeout(renderLab, 120);
  }
  function renderLab() {
    const seed = Number($("#lab-seed").value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 999999) {
      $("#lab-status").textContent = "Enter a whole-number seed from 1 to 999,999.";
      $("#save-png").disabled = true;
      return;
    }
    const selected = Object.fromEntries([...document.querySelectorAll("[data-lab]")].map((e) => [e.dataset.lab, e.value]));
    const { buf, W, H } = renderEntity(seed, selected, 480);
    const ctx = $("#lab-canvas").getContext("2d");
    const image = ctx.createImageData(W, H);
    for (let i = 0, j = 0; i < buf.length; i += 3, j += 4) {
      image.data[j] = buf[i];
      image.data[j + 1] = buf[i + 1];
      image.data[j + 2] = buf[i + 2];
      image.data[j + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    const match = data.items.find((i) => data.catalog.every((d) => i.selected[d.key] === selected[d.key]));
    $("#lab-status").textContent = match ? `TRAIT SET MATCH / AGENT ${pad(match.id)} / COLLECTION SEED ${match.seed}` : "CUSTOM COMBINATION / OUTSIDE THE 888-PIECE COLLECTION";
    $("#save-png").disabled = false;
  }
  $("#randomize").onclick = () => {
    document.querySelectorAll("[data-lab]").forEach((e) => e.selectedIndex = Math.floor(Math.random() * e.options.length));
    $("#lab-seed").value = Math.floor(Math.random() * 999999) + 1;
    renderLab();
  };
  $("#save-png").onclick = () => {
    $("#lab-canvas").toBlob((blob) => {
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `hive-lab-${$("#lab-seed").value}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    });
  };
  function combination(n) {
    const selected = {};
    for (let i = data.catalog.length - 1; i >= 0; i--) {
      const d = data.catalog[i];
      selected[d.key] = d.choices[n % d.choices.length].id;
      n = Math.floor(n / d.choices.length);
    }
    return selected;
  }
  function renderCombos() {
    const start = comboPage * comboSize, end = Math.min(data.possible, start + comboSize);
    let html = "";
    for (let n = start; n < end; n++) {
      const selected = combination(n);
      html += `<tr><td>${format(n + 1)}</td>` + data.catalog.map((d) => `<td>${d.choices.find((c) => c.id === selected[d.key]).label}</td>`).join("") + `<td><button data-combo="${n}">INSPECT \u2197</button></td></tr>`;
    }
    $("#combo-body").innerHTML = html;
    $("#combo-page").textContent = `${format(start + 1)}\u2013${format(end)} / ${format(data.possible)}`;
    $("#combo-prev").disabled = comboPage === 0;
    $("#combo-next").disabled = end >= data.possible;
    document.querySelectorAll("[data-combo]").forEach((b) => b.onclick = () => {
      setLab({ seed: 46, selected: combination(Number(b.dataset.combo)) });
      view("lab");
    });
  }
  $("#combo-prev").onclick = () => {
    comboPage--;
    renderCombos();
  };
  $("#combo-next").onclick = () => {
    comboPage++;
    renderCombos();
  };
  $("#jump").onclick = () => {
    const n = Number($("#combo-jump").value);
    if (!Number.isInteger(n) || n < 1 || n > data.possible) {
      $("#combo-jump").setCustomValidity(`Enter 1 to ${data.possible}.`);
      $("#combo-jump").reportValidity();
      return;
    }
    $("#combo-jump").setCustomValidity("");
    comboPage = Math.floor((n - 1) / comboSize);
    renderCombos();
  };
  $("#combo-jump").oninput = () => $("#combo-jump").setCustomValidity("");
  fetch("collection.json?v=locked").then((r) => {
    if (!r.ok) throw Error("Collection missing");
    return r.json();
  }).then((d) => {
    data = d;
    setup();
  }).catch((e) => {
    $("#loading").textContent = "Unable to load collection. Refresh to retry.";
    console.error(e);
  });
})();
