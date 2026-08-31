window.LV8_SURVEY_DATA = Object.freeze({
  priceRanges: [
    { id: "1000-1500", label: "EGP 1,000-1,500" },
    { id: "1500-2000", label: "EGP 1,500-2,000" },
    { id: "2000-3000", label: "EGP 2,000-3,000" }
  ],
  purchaseIntents: [
    { id: "yes", label: "Yes, I would buy it" },
    { id: "maybe", label: "Maybe - depending on quality and price" },
    { id: "no", label: "Not for me" }
  ],
  styles: [
    {
      id: "men-storm-shell-set", code: "M01", audience: "men", category: "Performance / Outerwear",
      nameAr: "Storm Shell Set", nameEn: "Storm Shell Set",
      descriptionAr: "A technical hooded jacket and trouser set with clean paneling and signal-color zip details.",
      tags: ["Technical", "Travel", "Changing weather"],
      images: ["assets/styles/men1/1.jpg", "assets/styles/men1/2.jpg", "assets/styles/men1/3.png"]
    },
    {
      id: "men-signal-panel-shell", code: "M02", audience: "men", category: "Performance / Street",
      nameAr: "Signal Panel Shell", nameEn: "Signal Panel Shell",
      descriptionAr: "A lightweight full-zip jacket with strong color blocking for movement and everyday wear.",
      tags: ["Full zip", "Color block", "Lightweight"],
      images: Array.from({ length: 13 }, (_, index) => `assets/styles/men2/${index + 1}.webp`)
    },
    {
      id: "men-air-panel-track-set", code: "M03", audience: "men", category: "Street Sport / Shell",
      nameAr: "Air Panel Track Set", nameEn: "Air Panel Track Set",
      descriptionAr: "A green-and-black shell set with wide trousers, bold side graphics, and a street-sport attitude.",
      tags: ["Wide leg", "Graphic", "Street sport"],
      images: ["assets/styles/men3/1.png", "assets/styles/men3/2.jpg", "assets/styles/men3/3.jpg", "assets/styles/men3/4.jpg", "assets/styles/men3/5.jpg"]
    },
    {
      id: "men-pace-short", code: "M04", audience: "men", category: "Performance",
      nameAr: "Pace Short", nameEn: "Pace Short",
      descriptionAr: "A lightweight performance short with a movement-first cut and low-contrast LV8 branding.",
      tags: ["Running", "Training", "Lightweight"],
      images: ["assets/styles/men4/1.png", "assets/styles/men4/2.png"]
    },
    {
      id: "men-blue-yoke-shell-set", code: "M05", audience: "men", category: "Active Travel / Shell",
      nameAr: "Blue Yoke Shell Set", nameEn: "Blue Yoke Shell Set",
      descriptionAr: "A two-tone blue hooded shell and trouser set with a lighter shoulder yoke and compact LV8-FIT badge.",
      tags: ["Hooded shell", "Two tone", "Travel"],
      images: ["assets/styles/men5-v1/1.webp", "assets/styles/men5-v1/2.webp", "assets/styles/men5-v1/3.webp", "assets/styles/men5-v1/4.webp", "assets/styles/men5-v1/5.webp", "assets/styles/men5-v1/6.png"]
    },
    {
      id: "men-graphite-yoke-shell-set", code: "M06", audience: "men", category: "Active Travel / Shell",
      nameAr: "Graphite Yoke Shell Set", nameEn: "Graphite Yoke Shell Set",
      descriptionAr: "A graphite two-tone hooded shell set balancing a technical finish with an easy everyday palette.",
      tags: ["Hooded shell", "Graphite", "Versatile"],
      images: ["assets/styles/men5-v2/1.webp", "assets/styles/men5-v2/2.jpg", "assets/styles/men5-v2/3.webp", "assets/styles/men5-v2/4.webp", "assets/styles/men5-v2/5.webp", "assets/styles/men5-v2/6.webp", "assets/styles/men5-v2/7.webp", "assets/styles/men5-v2/8.png"]
    },
    {
      id: "men-minimal-black-shell-set", code: "M07", audience: "men", category: "Performance / Minimal",
      nameAr: "Minimal Black Shell Set", nameEn: "Minimal Black Shell Set",
      descriptionAr: "A clean black lightweight shell set with tonal construction and understated performance styling.",
      tags: ["Minimal", "All black", "Lightweight"],
      images: ["assets/styles/men5-v3/1.webp", "assets/styles/men5-v3/2.webp", "assets/styles/men5-v3/3.webp", "assets/styles/men5-v3/4.webp", "assets/styles/men5-v3/5.webp", "assets/styles/men5-v3/6.png"]
    },
    {
      id: "men-wide-hooded-sweat-set", code: "M08", audience: "men", category: "Street Essentials",
      nameAr: "Wide Hooded Sweat Set", nameEn: "Wide Hooded Sweat Set",
      descriptionAr: "A black zip hoodie and extra-wide sweatpant set built around volume, comfort, and clean street styling.",
      tags: ["Wide leg", "Zip hoodie", "Oversized"],
      images: Array.from({ length: 4 }, (_, index) => `assets/styles/men6/${index + 1}.webp`)
    },
    {
      id: "women-city-track-set", code: "W01", audience: "women", category: "Modest City Movement",
      nameAr: "City Track Set", nameEn: "City Track Set",
      descriptionAr: "A relaxed jacket and wide-trouser set with long lines, sport striping, and modest everyday coverage.",
      tags: ["Modest", "Matching set", "City"],
      images: ["assets/styles/women1/1.jpeg", "assets/styles/women1/2.jpeg", "assets/styles/women1/3.jpeg", "assets/styles/women1/4.png"]
    },
    {
      id: "women-wide-motion-set", code: "W02", audience: "women", category: "Athleisure / City",
      nameAr: "Wide Motion Set", nameEn: "Wide Motion Set",
      descriptionAr: "A full-zip jacket and wide-leg pant with extended side color blocking for an active day in the city.",
      tags: ["Wide leg", "Color block", "Matching set"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women2/${index + 1}.png`)
    },
    {
      id: "women-pace-essential-tee", code: "W03", audience: "women", category: "Performance Essentials",
      nameAr: "Pace Essential Tee", nameEn: "Pace Essential Tee",
      descriptionAr: "A clean, straight-cut performance tee designed for training and everyday use.",
      tags: ["T-shirt", "Performance", "Essential"],
      images: [
        "assets/styles/women3/1.png",
        ...Array.from({ length: 6 }, (_, index) => `assets/styles/women3/${index + 2}.webp`)
      ]
    },
    {
      id: "women-asymmetric-modest-top", code: "W04", audience: "women", category: "Modest Performance",
      nameAr: "Asymmetric Modest Training Top", nameEn: "Asymmetric Modest Training Top",
      descriptionAr: "A long-sleeve performance top with an asymmetric hem, extended coverage, and a fitted lower layer.",
      tags: ["Long sleeve", "Modest", "Asymmetric"],
      images: ["assets/styles/women4/1.png", "assets/styles/women4/2.jpg", "assets/styles/women4/3.jpg", "assets/styles/women4/4.jpg", "assets/styles/women4/5.jpg", "assets/styles/women4/6.jpg", "assets/styles/women4/7.jpg", "assets/styles/women4/8.png"]
    },
    {
      id: "women-piped-track-set", code: "W05", audience: "women", category: "Sport Heritage",
      nameAr: "Piped Track Set", nameEn: "Piped Track Set",
      descriptionAr: "A high-neck track set with fine piping and a clear sport-heritage character.",
      tags: ["Piping", "Sport heritage", "Matching set"],
      images: Array.from({ length: 15 }, (_, index) => `assets/styles/women5/${index + 1}.webp`)
    },
    {
      id: "women-oversized-crew", code: "W06", audience: "women", category: "Premium Essentials",
      nameAr: "Oversized Crew", nameEn: "Oversized Crew",
      descriptionAr: "A relaxed crew-neck sweatshirt direction for everyday comfort and simple outfit building.",
      tags: ["No zip", "Oversized", "Everyday"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women7-v1/${index + 1}.webp`)
    },
    {
      id: "women-half-zip-crew", code: "W07", audience: "women", category: "Premium Essentials",
      nameAr: "Half-Zip Oversized Pullover", nameEn: "Half-Zip Oversized Pullover",
      descriptionAr: "A relaxed red half-zip pullover that adds adjustable styling while keeping the oversized silhouette.",
      tags: ["Half zip", "Oversized", "Layering"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women7-v2/${index + 1}.png`)
    },
    {
      id: "women-full-zip-crew", code: "W08", audience: "women", category: "Premium Essentials",
      nameAr: "Full-Zip Oversized Jacket", nameEn: "Full-Zip Oversized Jacket",
      descriptionAr: "A relaxed red full-zip layer that offers the most flexible styling of the three closure directions.",
      tags: ["Full zip", "Oversized", "Layering"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women7-v3/${index + 1}.png`)
    },
    {
      id: "women-modest-colorblock-set", code: "W09", audience: "women", category: "Modest Lifestyle",
      nameAr: "Modest Color-Block Set", nameEn: "Modest Color-Block Set",
      descriptionAr: "A longer hoodie and wide-leg pant offering comfortable coverage with restrained color blocking.",
      tags: ["Modest", "Pullover", "Wide leg"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women8/${index + 1}.jpg`)
    },
    {
      id: "women-modest-zip-set", code: "W10", audience: "women", category: "Modest City Movement",
      nameAr: "Modest Zip Set", nameEn: "Modest Zip Set",
      descriptionAr: "A full-zip hoodie and wide-leg pant with side stripes for movement throughout the day.",
      tags: ["Modest", "Full zip", "City movement"],
      images: ["assets/styles/women9/1.png", "assets/styles/women9/2.png"]
    },
    {
      id: "women-navy-piped-track-set", code: "W11", audience: "women", category: "Sport Heritage",
      nameAr: "Navy Piped Track Set", nameEn: "Navy Piped Track Set",
      descriptionAr: "A navy full-zip track jacket and straight pant with white piping and compact LV8-FIT branding.",
      tags: ["Full zip", "Piping", "Sport heritage"],
      images: Array.from({ length: 6 }, (_, index) => `assets/styles/women10/${index + 1}.png`)
    },
    {
      id: "women-taupe-piped-hoodie-set", code: "W12", audience: "women", category: "Lifestyle / Soft Set",
      nameAr: "Taupe Piped Hoodie Set", nameEn: "Taupe Piped Hoodie Set",
      descriptionAr: "An oversized taupe hoodie and wide jogger set with white piping and a soft everyday silhouette.",
      tags: ["Hoodie", "Wide leg", "Soft neutral"],
      images: Array.from({ length: 4 }, (_, index) => `assets/styles/women11/${index + 1}.png`)
    },
    {
      id: "women-sage-motion-hoodie-set", code: "W13", audience: "women", category: "Lifestyle / Soft Set",
      nameAr: "Sage Motion Hoodie Set", nameEn: "Sage Motion Hoodie Set",
      descriptionAr: "A pale-sage hoodie and wide jogger set with curved line graphics designed for relaxed city styling.",
      tags: ["Hoodie", "Wide leg", "Motion line"],
      images: Array.from({ length: 4 }, (_, index) => `assets/styles/women12/${index + 1}.png`)
    },
    {
      id: "women-lilac-panel-track-set", code: "W14", audience: "women", category: "Athleisure / Color Block",
      nameAr: "Lilac Panel Track Set", nameEn: "Lilac Panel Track Set",
      descriptionAr: "A lilac-and-light-grey track jacket and wide pant with curved contrast panels and a soft sport finish.",
      tags: ["Color block", "Wide leg", "Matching set"],
      images: Array.from({ length: 5 }, (_, index) => `assets/styles/women13/${index + 1}.webp`)
    }
  ],
  comparisons: [
    {
      id: "men-shell-direction", audience: "men",
      questionAr: "Which men's jacket direction is stronger?",
      noteAr: "Choose the one you would realistically wear more often during the week.",
      options: [
        { id: "storm-shell", styleId: "men-storm-shell-set", labelAr: "Clean technical shell" },
        { id: "signal-panel", styleId: "men-signal-panel-shell", labelAr: "Bold panel shell" }
      ]
    },
    {
      id: "men-yoke-shell-direction", audience: "men",
      questionAr: "Which hooded shell-set direction should LV8 develop?",
      noteAr: "Compare the overall color-block treatment, not only your favorite color.",
      options: [
        { id: "blue-yoke", styleId: "men-blue-yoke-shell-set", labelAr: "Blue two-tone" },
        { id: "graphite-yoke", styleId: "men-graphite-yoke-shell-set", labelAr: "Graphite two-tone" },
        { id: "minimal-black", styleId: "men-minimal-black-shell-set", labelAr: "Minimal black" }
      ]
    },
    {
      id: "women-track-direction", audience: "women",
      questionAr: "Which women's track-set direction do you prefer?",
      noteAr: "Choose the overall design direction, not the color alone.",
      options: [
        { id: "wide-colorblock", styleId: "women-wide-motion-set", labelAr: "Wide leg + color block" },
        { id: "fine-piping", styleId: "women-piped-track-set", labelAr: "Fine sport piping" }
      ]
    },
    {
      id: "women-closure-direction", audience: "women",
      questionAr: "Which closure works best for the oversized red layer?",
      noteAr: "Choose the version you would find easiest to wear and style.",
      options: [
        { id: "crew", styleId: "women-oversized-crew", labelAr: "Crew neck - no zip" },
        { id: "half-zip", styleId: "women-half-zip-crew", labelAr: "Half zip" },
        { id: "full-zip", styleId: "women-full-zip-crew", labelAr: "Full zip" }
      ]
    },
    {
      id: "women-modest-closure", audience: "women",
      questionAr: "For the modest set: full zip or pullover?",
      noteAr: "Which version would be easier to wear and style?",
      options: [
        { id: "pullover", styleId: "women-modest-colorblock-set", labelAr: "Pullover - no zip" },
        { id: "full-zip", styleId: "women-modest-zip-set", labelAr: "Full zip" }
      ]
    },
    {
      id: "women-performance-top", audience: "women",
      questionAr: "Which performance top deserves a place in the first drop?",
      noteAr: "Choose based on how often you would actually use it.",
      options: [
        { id: "essential-tee", styleId: "women-pace-essential-tee", labelAr: "Essential tee" },
        { id: "modest-long-sleeve", styleId: "women-asymmetric-modest-top", labelAr: "Asymmetric long sleeve" }
      ]
    },
    {
      id: "women-soft-set-direction", audience: "women",
      questionAr: "Which soft lifestyle set has the stronger LV8 direction?",
      noteAr: "Compare the silhouette and graphic treatment rather than the color alone.",
      options: [
        { id: "taupe-piping", styleId: "women-taupe-piped-hoodie-set", labelAr: "Taupe + clean piping" },
        { id: "sage-motion", styleId: "women-sage-motion-hoodie-set", labelAr: "Sage + motion lines" }
      ]
    }
  ]
});
