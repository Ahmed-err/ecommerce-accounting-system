# Builds docs/rebuild/data/p1-2-content.json (input to the apply script) and
# docs/rebuild/data/p1-2-content-review.csv (old vs new, for the owner to review).
#   python3 scripts/apply/p1-2-build.py export/catalog-live-2026-10-04.json
import csv, json, sys, importlib.util

def load(path):
    spec = importlib.util.spec_from_file_location("m", path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

a, b = load("scripts/apply/p1-2-content-a.py"), load("scripts/apply/p1-2-content-b.py")
rows, remove = a.ROWS + b.ROWS, b.REMOVE

num = lambda n: f"{n:,}"
SPECS = {  # code -> (key EN, key AR, value EN fmt, value AR fmt)
    "cap_cuft": ("Capacity", "السعة", "{} cu ft", "{} قدم"),
    "cap_l": ("Capacity", "السعة", "{} L", "{} لتر"),
    "cap_kg": ("Capacity", "السعة", "{} kg", "{} كجم"),
    "cap_g": ("Capacity", "السعة", "{} g", "{} جرام"),
    "max_kg": ("Max weight", "أقصى وزن", "{} kg", "{} كجم"),
    "btu": ("Cooling capacity", "قدرة التبريد", "{} BTU", "{} وحدة"),
    "screen": ("Screen size", "مقاس الشاشة", "{} in", "{} بوصة"),
    "watt": ("Power", "القدرة", "{} W", "{} واط"),
    "va": ("Rating", "القدرة", "{} VA", "{} VA"),
    "burners": ("Burners", "عدد العيون", "{}", "{}"),
    "doors": ("Doors", "عدد الأبواب", "{}", "{}"),
    "drawers": ("Drawers", "عدد الأدراج", "{}", "{}"),
}
TEXT = {"type": ("Type", "النوع"), "fuel": ("Fuel", "نوع التشغيل"), "surface": ("Surface", "السطح"),
        "controls": ("Controls", "التحكم"), "feature": ("Feature", "ميزة"), "origin": ("Made in", "بلد الصنع"),
        "model": ("Model", "الموديل"), "variant": ("Variant", "الإصدار"), "material": ("Material", "الخامة"),
        "use": ("Use", "الاستخدام"), "condition": ("Condition", "الحالة"), "display": ("Display", "الشاشة")}

def spec_rows(brand, specs):
    out = [{"keyEn": "Brand", "keyAr": "العلامة التجارية", "valueEn": brand, "valueAr": brand}] if brand else []
    for s in specs:
        if s[0] in SPECS:
            ke, ka, fe, fa = SPECS[s[0]]; v = num(s[1]) if isinstance(s[1], int) and s[1] >= 1000 else s[1]
            out.append({"keyEn": ke, "keyAr": ka, "valueEn": fe.format(v), "valueAr": fa.format(v)})
        else:
            ke, ka = TEXT[s[0]]; out.append({"keyEn": ke, "keyAr": ka, "valueEn": s[1], "valueAr": s[2]})
    return out

live = {p["sku"]: p for p in json.load(open(sys.argv[1]))}
skus = [r[0] for r in rows]
assert len(skus) == len(set(skus)), "duplicate SKU in content"
missing = set(live) - set(skus) - set(remove); extra = set(skus) - set(live)
assert not missing and not extra, (missing, extra)

content = {"products": [], "remove": remove}
review = []
for r in rows:
    sku, ne, na, brand, specs, de = r[:6]; da = r[6] if len(r) > 6 else None
    p = live[sku]
    entry = {"sku": sku, "expectOld": {"nameAr": p["nameAr"], "nameEn": p["nameEn"]}, "name": na, "nameAr": na, "nameEn": ne, "brand": brand, "specs": spec_rows(brand, specs), "descriptionEn": de}
    if da: entry["descriptionAr"] = entry["description"] = da
    content["products"].append(entry)
    review.append({"sku": sku, "old_name_ar": p["nameAr"], "new_name_ar": na, "old_name_en": p["nameEn"].strip(), "new_name_en": ne,
                   "brand": brand or "", "specs_en": "; ".join(f'{s["keyEn"]}: {s["valueEn"]}' for s in entry["specs"]),
                   "old_description_en": p["descriptionEn"], "new_description_en": de, "new_description_ar": da or "(unchanged)"})
for sku in remove:
    p = live[sku]; review.append({"sku": sku, "old_name_ar": p["nameAr"], "new_name_ar": "(REMOVE: duplicate without photo)", "old_name_en": p["nameEn"], "new_name_en": "(REMOVE)"})

json.dump(content, open("docs/rebuild/data/p1-2-content.json", "w"), ensure_ascii=False, indent=1)
with open("docs/rebuild/data/p1-2-content-review.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(review[0])); w.writeheader(); w.writerows(review)
print(f"{len(rows)} products updated, {len(remove)} removed; brands: {len({r[3] for r in rows if r[3]})}; with specs: {sum(bool(e['specs']) for e in content['products'])}")
