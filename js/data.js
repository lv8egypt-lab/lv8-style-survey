window.LV8_SURVEY_DATA = Object.freeze({
  priceRanges: [
    { id: "1000-1500", label: "EGP 1,000–1,500" },
    { id: "1500-2000", label: "EGP 1,500–2,000" },
    { id: "2000-3000", label: "EGP 2,000–3,000" }
  ],
  purchaseIntents: [
    { id: "yes", label: "Yes, I would buy it" },
    { id: "maybe", label: "Maybe—depending on quality and price" },
    { id: "no", label: "Not for me" }
  ],
  styles: [
    {
      id: "men-storm-shell-set",
      code: "M01",
      audience: "men",
      category: "Performance / Outerwear",
      nameAr: "Storm Shell Set",
      nameEn: "Storm Shell Set",
      descriptionAr: "A technical hooded jacket and trouser set with zip details and a small signal-color accent.",
      tags: ["Technical", "Travel", "Changing weather"],
      images: ["assets/styles/men1/1.jpg", "assets/styles/men1/2.jpg"]
    },
    {
      id: "men-signal-panel-shell",
      code: "M02",
      audience: "men",
      category: "Performance / Street",
      nameAr: "Signal Panel Shell",
      nameEn: "Signal Panel Shell",
      descriptionAr: "A lightweight full-zip jacket with distinct color blocking for performance and everyday wear.",
      tags: ["Full zip", "Color block", "Lightweight"],
      images: Array.from({ length: 13 }, (_, index) => `assets/styles/men2/${index + 1}.webp`)
    },
    {
      id: "men-wide-track-pant",
      code: "M03",
      audience: "men",
      category: "Street Sport",
      nameAr: "Wide Track Pant",
      nameEn: "Wide Track Pant",
      descriptionAr: "A wide-leg track pant with a clean side stripe, designed for everyday and street styling.",
      tags: ["Wide leg", "Side stripe", "Street"],
      images: ["assets/styles/men3/1.jpg", "assets/styles/men3/2.jpg"]
    },
    {
      id: "men-pace-short",
      code: "M04",
      audience: "men",
      category: "Performance",
      nameAr: "Pace Short",
      nameEn: "Pace Short",
      descriptionAr: "A lightweight performance short with a movement-first cut and low-contrast LV8 branding.",
      tags: ["Running", "Training", "Lightweight"],
      images: [
        "assets/styles/men4/1175858-VST_1-LV8.png",
        "assets/styles/men4/Codex Image Aug 18, 2026, 04_07_09 PM.png"
      ]
    },
    {
      id: "women-city-track-set",
      code: "W01",
      audience: "women",
      category: "City Movement",
      nameAr: "City Track Set",
      nameEn: "City Track Set",
      descriptionAr: "A lightweight jacket and trouser set with a relaxed silhouette and subtle translucent stripes.",
      tags: ["Matching set", "City", "Relaxed"],
      images: Array.from({ length: 3 }, (_, index) => `assets/styles/women1/${index + 1}.jpeg`)
    },
    {
      id: "women-wide-motion-set",
      code: "W02",
      audience: "women",
      category: "Athleisure",
      nameAr: "Wide Motion Set",
      nameEn: "Wide Motion Set",
      descriptionAr: "A cropped jacket and wide-leg pant with extended side color blocking.",
      tags: ["Wide leg", "Color block", "Matching set"],
      images: ["assets/styles/women2/1.jpeg"]
    },
    {
      id: "women-pace-essential-tee",
      code: "W03",
      audience: "women",
      category: "Performance Essentials",
      nameAr: "Pace Essential Tee",
      nameEn: "Pace Essential Tee",
      descriptionAr: "A clean, straight-cut performance tee designed for training and everyday use.",
      tags: ["T-shirt", "Performance", "Essential"],
      images: Array.from({ length: 7 }, (_, index) => `assets/styles/women3/${index + 1}.webp`)
    },
    {
      id: "women-wrap-training-tank",
      code: "W04",
      audience: "women",
      category: "Performance / Lifestyle",
      nameAr: "Wrap Training Tank",
      nameEn: "Wrap Training Tank",
      descriptionAr: "A sleeveless active top with a side-tie detail and flexible movement-focused cut.",
      tags: ["Training", "Side tie", "Lightweight"],
      images: [
        "assets/styles/women4/1.jpg", "assets/styles/women4/2.jpg", "assets/styles/women4/3.jpg",
        "assets/styles/women4/4.jpg", "assets/styles/women4/5.jpg", "assets/styles/women4/6.jpg",
        "assets/styles/women4/7.webp"
      ]
    },
    {
      id: "women-piped-track-set",
      code: "W05",
      audience: "women",
      category: "Sport Heritage",
      nameAr: "Piped Track Set",
      nameEn: "Piped Track Set",
      descriptionAr: "A high-neck track set with fine piping and a clear sport-heritage character.",
      tags: ["Piping", "Sport heritage", "Matching set"],
      images: Array.from({ length: 15 }, (_, index) => `assets/styles/women5/${index + 1}.webp`)
    },
    {
      id: "women-air-street-set",
      code: "W06",
      audience: "women",
      category: "Street Sport",
      nameAr: "Air Street Set",
      nameEn: "Air Street Set",
      descriptionAr: "A street-sport direction combining lightweight materials with bold, oversized graphics.",
      tags: ["Street", "Graphic", "Lightweight"],
      images: Array.from({ length: 4 }, (_, index) => `assets/styles/women6/${index + 1}.jpg`)
    },
    {
      id: "women-oversized-crew",
      code: "W07",
      audience: "women",
      category: "Premium Essentials",
      nameAr: "Oversized Crew",
      nameEn: "Oversized Crew",
      descriptionAr: "A clean oversized sweatshirt for everyday wear and flexible outfit building.",
      tags: ["Oversized", "Everyday", "Essentials"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women7/${index + 1}.webp`)
    },
    {
      id: "women-modest-colorblock-set",
      code: "W08",
      audience: "women",
      category: "Modest Lifestyle",
      nameAr: "Modest Color-block Set",
      nameEn: "Modest Color-block Set",
      descriptionAr: "A longer hoodie and wide-leg pant offering comfortable coverage with restrained color blocking.",
      tags: ["Modest", "Hoodie", "Wide leg"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women8/${index + 1}.jpg`)
    },
    {
      id: "women-modest-zip-set",
      code: "W09",
      audience: "women",
      category: "Modest City Movement",
      nameAr: "Modest Zip Set",
      nameEn: "Modest Zip Set",
      descriptionAr: "A full-zip hoodie and wide-leg pant with side stripes for movement throughout the day.",
      tags: ["Modest", "Full zip", "City movement"],
      images: ["assets/styles/women9/1.png", "assets/styles/women9/2.png"]
    }
  ],
  comparisons: [
    {
      id: "men-shell-direction",
      audience: "men",
      questionAr: "Which men’s jacket direction is stronger?",
      noteAr: "Choose the one you would realistically wear more often during the week.",
      options: [
        { id: "minimal-shell", styleId: "men-storm-shell-set", labelAr: "Minimal navy" },
        { id: "panel-shell", styleId: "men-signal-panel-shell", labelAr: "Bold color block" }
      ]
    },
    {
      id: "women-track-direction",
      audience: "women",
      questionAr: "Which women’s track-set direction do you prefer?",
      noteAr: "Choose the overall design direction—not the color alone.",
      options: [
        { id: "wide-colorblock", styleId: "women-wide-motion-set", labelAr: "Wide leg + color block" },
        { id: "fine-piping", styleId: "women-piped-track-set", labelAr: "Fine sport piping" }
      ]
    },
    {
      id: "women-modest-closure",
      audience: "women",
      questionAr: "For the modest set: full zip or pullover?",
      noteAr: "Which version would be easier to wear and style?",
      options: [
        { id: "pullover", styleId: "women-modest-colorblock-set", labelAr: "Pullover—no zip" },
        { id: "full-zip", styleId: "women-modest-zip-set", labelAr: "Full zip" }
      ]
    },
    {
      id: "women-performance-top",
      audience: "women",
      questionAr: "Which performance top deserves a place in the first drop?",
      noteAr: "Choose based on how often you would actually use it.",
      options: [
        { id: "essential-tee", styleId: "women-pace-essential-tee", labelAr: "Essential tee" },
        { id: "wrap-tank", styleId: "women-wrap-training-tank", labelAr: "Side-tie tank" }
      ]
    }
  ]
});
