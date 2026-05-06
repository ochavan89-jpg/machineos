export function appendUniqueById(prev, incoming) {
  const seen = new Set((prev || []).map((x) => x?.id).filter(Boolean));
  const fresh = (incoming || []).filter((x) => {
    if (!x?.id) return true;
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });
  return [...(prev || []), ...fresh];
}
