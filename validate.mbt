///|
fn check_dimensions(
  values : Array[Int32],
  offset : Int32,
  name : String,
  zero : Bool,
  out : Array[Diagnostic],
) -> Unit {
  if zero && values.is_empty() {
    out.push(
      diagnostic(
        "EMPTY_METRIC_TABLE", offset, name, "A metric table must have at least its zero entry",
      ),
    )
  }
  if zero && !values.is_empty() && values[0] != 0 {
    out.push(
      diagnostic("NONZERO_ORIGIN", offset, name, "Entry zero must contain zero"),
    )
  }
  for i in 0..<values.length() {
    // TFtoPL checks the first byte: 0 or 255. Negative values are legal.
    if values[i] < -16777216 || values[i] >= 16777216 {
      out.push(
        diagnostic(
          "DIMENSION_RANGE",
          offset + i * 4,
          name,
          "Scaled dimension must have first byte 0 or 255",
        ),
      )
    }
  }
}

///|
/// Check declared structure and references, without executing ligature programs.
/// Fonts must come from parse; callers should not construct inconsistent Font records.
pub fn validate(font : Font) -> Array[Diagnostic] {
  let out : Array[Diagnostic] = []
  if font.header[1] < 1048576 {
    out.push(
      diagnostic(
        "DESIGN_SIZE", 28, "header", "Design size must be at least one TeX point",
      ),
    )
  }
  // BCPL string fields are defined only when their complete region is present.
  if font.header.length() >= 12 && ((font.header[2] >> 24) & 255) > 39 {
    out.push(
      diagnostic("BCPL_LENGTH", 32, "header", "Coding scheme exceeds 39 bytes"),
    )
  }
  if font.header.length() >= 17 && ((font.header[12] >> 24) & 255) > 19 {
    out.push(
      diagnostic("BCPL_LENGTH", 72, "header", "Family name exceeds 19 bytes"),
    )
  }
  check_dimensions(font.widths, table_start(font, 4), "width", true, out)
  check_dimensions(font.heights, table_start(font, 5), "height", true, out)
  check_dimensions(font.depths, table_start(font, 6), "depth", true, out)
  check_dimensions(font.italics, table_start(font, 7), "italic", true, out)
  check_dimensions(font.kerns, table_start(font, 9), "kern", false, out)
  // param[1] is slant, the exception to scaled-dimension bounds.
  for i in 1..<font.parameters.length() {
    let v = font.parameters[i]
    if v < -16777216 || v >= 16777216 {
      out.push(
        diagnostic(
          "DIMENSION_RANGE",
          table_start(font, 11) + 4 * i,
          "param",
          "Scaled font parameter must have first byte 0 or 255",
        ),
      )
    }
  }
  for ch in font.characters {
    if ch.width_index == 0 {
      continue
    }
    let indices = [
      ch.width_index,
      ch.height_index,
      ch.depth_index,
      ch.italic_index,
    ]
    let sizes = [
      font.widths.length(),
      font.heights.length(),
      font.depths.length(),
      font.italics.length(),
    ]
    let names = ["width", "height", "depth", "italic"]
    let offsets = [0, 1, 1, 2]
    for i in 0..<4 {
      if indices[i] >= sizes[i] {
        out.push(
          reference_error(
            ch.byte_offset + offsets[i],
            names[i],
            indices[i],
            sizes[i],
            Some(ch.code),
          ),
        )
      }
    }
    match ch.tag {
      1 =>
        if ch.remainder >= font.lig_kern.length() {
          out.push(
            reference_error(
              ch.byte_offset + 3,
              "lig_kern",
              ch.remainder,
              font.lig_kern.length(),
              Some(ch.code),
            ),
          )
        }
      2 =>
        if !exists(font, ch.remainder) {
          let d = diagnostic(
            "MISSING_CHARACTER",
            ch.byte_offset + 3,
            "next_larger",
            "Next-larger character \{ch.remainder} does not exist",
          )
          out.push({
            ..d,
            character_code: Some(ch.code),
            actual: Some(ch.remainder),
          })
        } else {
          let seen : Array[Int32] = []
          let mut current = ch.code
          // There are at most 256 characters; each iteration visits a new one.
          while exists(font, current) {
            if seen.contains(current) {
              let d = diagnostic(
                "NEXT_LARGER_CYCLE",
                ch.byte_offset + 3,
                "next_larger",
                "Next-larger chain contains a cycle",
              )
              out.push({ ..d, character_code: Some(ch.code), })
              break
            }
            seen.push(current)
            let link = font.characters[current - font.lengths[2]]
            if link.tag != 2 {
              break
            }
            current = link.remainder
          }
        }
      3 =>
        if ch.remainder >= font.extensibles.length() {
          out.push(
            reference_error(
              ch.byte_offset + 3,
              "exten",
              ch.remainder,
              font.extensibles.length(),
              Some(ch.code),
            ),
          )
        }
      _ => ()
    }
  }
  let nl = font.lig_kern.length()
  let right_boundary = if nl > 0 && font.lig_kern[0].a == 255 {
    font.lig_kern[0].b
  } else {
    256
  }
  for i in 0..<nl {
    let r = font.lig_kern[i]
    let p = table_start(font, 8) + i * 4
    if r.a > 128 {
      // First skip=255 only declares right boundary; last may also declare left.
      if i != 0 || r.a != 255 || i == nl - 1 {
        let target = r.c * 256 + r.d
        if target >= nl {
          out.push(reference_error(p + 2, "lig_kern", target, nl, None))
        }
      }
      continue
    }
    if r.a < 128 && i + r.a + 1 >= nl {
      out.push(reference_error(p, "lig_kern", i + r.a + 1, nl, None))
    }
    if !exists(font, r.b) && r.b != right_boundary {
      out.push(
        diagnostic(
          "MISSING_CHARACTER",
          p + 1,
          "lig_kern",
          "Next character \{r.b} does not exist and is not the right boundary",
        ),
      )
    }
    if r.c >= 128 {
      let index = (r.c - 128) * 256 + r.d
      if index >= font.kerns.length() {
        out.push(
          reference_error(p + 2, "kern", index, font.kerns.length(), None),
        )
      }
    } else {
      if r.c == 4 || (r.c > 7 && r.c != 11) {
        out.push(
          diagnostic(
            "LIGATURE_OPCODE",
            p + 2,
            "lig_kern",
            "Nonstandard ligature operation code \{r.c}",
          ),
        )
      }
      if !exists(font, r.d) {
        out.push(
          diagnostic(
            "MISSING_CHARACTER",
            p + 3,
            "lig_kern",
            "Ligature result character \{r.d} does not exist",
          ),
        )
      }
    }
  }
  for i in 0..<font.extensibles.length() {
    let r = font.extensibles[i]
    let parts = [r.a, r.b, r.c, r.d]
    for j in 0..<4 {
      if (j == 3 || parts[j] != 0) && !exists(font, parts[j]) {
        out.push(
          diagnostic(
            "MISSING_CHARACTER",
            table_start(font, 10) + 4 * i + j,
            "exten",
            "Recipe piece \{parts[j]} does not exist",
          ),
        )
      }
    }
  }
  out
}
