const CATEGORY_RULES: Record<string, string[]> = {
  "Infrastructure": ["pothole", "streetlight", "street light", "sidewalk", "pavement", "sign", "manhole", "cover", "bridge", "guardrail"],
  "Sanitation": ["trash", "garbage", "dumping", "rat", "rodent", "litter", "overflowing", "basket", "debris", "sweeping"],
  "Public Safety": ["light", "dark", "hazard", "unsafe", "collapse", "wire", "spark", "barrier", "abandoned"],
  "Parks & Recreation": ["tree", "branch", "park", "playground", "bench", "grass", "overgrown", "trail"],
  "Transit": ["bus", "stop", "subway", "bike lane", "biker", "crosswalk", "signal", "traffic"],
  "Housing": ["leak", "heat", "hot water", "mold", "pest", "door", "window", "roof"],
};

export function autoCategorizeIssue(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  let bestCategory = "Infrastructure"; // Default fallback
  let highestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}