export function slugify(str = "") {
    let slug = str.toLowerCase().trim();
    slug = slug.replace("ł", "l").trim();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/[^a-z0-9\s-]/g, " ").trim();
    slug = slug.replace(/[\s-]+/g, "-");
  
    return slug;
}