// No dictionary import here: client components can use this without shipping the dictionary.
export const translateCategory = (name, t, nameAr) => {
  const isArabic = t.catLighting === "الإضاءة";
  if (isArabic && nameAr) return nameAr;
  const mapping = {
    "Lighting": t.catLighting,
    "Cables & Wires": t.catCablesWires,
    "Switches & Sockets": t.catSwitchesSockets,
    "Connectors": t.catConnectors,
    "Power Systems": t.catPowerSystems,
    "Safety Gear": t.catSafetyGear
  };
  return mapping[name] || name;
};
