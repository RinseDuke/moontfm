///|
/// Compare validated fonts. The report separately tracks metadata and raw tables.
/// Err prevents invalid references from being interpreted as missing glyphs.
pub fn diff(
  before : Font,
  after : Font,
) -> Result[Difference, Array[Diagnostic]] {
  let errors = validate(before)
  errors.append(validate(after))
  if !errors.is_empty() {
    return Err(errors)
  }
  let changes : Array[GlyphChange] = []
  for code in 0..<256 {
    let b = glyph(before, code).unwrap().metrics
    let a = glyph(after, code).unwrap().metrics
    if b != a {
      let kind = match (b, a) {
        (None, _) => "added"
        (_, None) => "removed"
        _ => "changed"
      }
      changes.push({ character_code: code, kind, before: b, after: a, })
    }
  }
  let other : Array[String] = []
  if before.header[0] != after.header[0] {
    other.push("checksum")
  }
  if before.header != after.header {
    other.push("header")
  }
  if before.lengths[2] != after.lengths[2] ||
    before.lengths[3] != after.lengths[3] {
    other.push("character_range")
  }
  // Ignore offsets in char_info comparisons, but preserve tag/representation changes.
  let raw_chars = fn(f : Font) {
    f.characters.map(c => Record::{
      a: c.width_index,
      b: c.height_index * 16 + c.depth_index,
      c: c.italic_index * 4 + c.tag,
      d: c.remainder,
    })
  }
  if raw_chars(before) != raw_chars(after) {
    other.push("char_info")
  }
  if before.widths != after.widths {
    other.push("width_table")
  }
  if before.heights != after.heights {
    other.push("height_table")
  }
  if before.depths != after.depths {
    other.push("depth_table")
  }
  if before.italics != after.italics {
    other.push("italic_table")
  }
  if before.lig_kern != after.lig_kern {
    other.push("lig_kern")
  }
  if before.kerns != after.kerns {
    other.push("kern")
  }
  if before.extensibles != after.extensibles {
    other.push("exten")
  }
  if before.parameters != after.parameters {
    other.push("parameters")
  }
  Ok({
    metrics_equal: changes.is_empty() && before.header[1] == after.header[1],
    design_size_before: before.header[1],
    design_size_after: after.header[1],
    glyph_changes: changes,
    other_changes: other,
  })
}
