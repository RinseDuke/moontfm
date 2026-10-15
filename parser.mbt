// The caller checks all table extents before these readers are used.

///|
fn u16(data : Bytes, offset : Int32) -> Int32 {
  data[offset].to_int() * 256 + data[offset + 1].to_int()
}

///|
fn i32(data : Bytes, offset : Int32) -> Int32 {
  (data[offset].to_int() << 24) |
  (data[offset + 1].to_int() << 16) |
  (data[offset + 2].to_int() << 8) |
  data[offset + 3].to_int()
}

///|
fn words(data : Bytes, offset : Int32, count : Int32) -> Array[Int32] {
  Array::makei(count, i => i32(data, offset + i * 4))
}

///|
fn records(data : Bytes, offset : Int32, count : Int32) -> Array[Record] {
  Array::makei(count, i => {
    let p = offset + i * 4
    {
      a: data[p].to_int(),
      b: data[p + 1].to_int(),
      c: data[p + 2].to_int(),
      d: data[p + 3].to_int(),
    }
  })
}

///|
/// Parse classic 8-bit, big-endian TFM. Fatal layout errors stop before table reads.
/// Maximum supported size is 32767 words (131068 bytes), per the format.
pub fn parse(data : Bytes) -> Result[Font, Array[Diagnostic]] {
  if data.length() > 131068 {
    return Err([
      diagnostic(
        "INPUT_TOO_LARGE", 131068, "file", "Classic TFM is limited to 32767 words (131068 bytes)",
      ),
    ])
  }
  if data.length() < 24 {
    return Err([
      diagnostic(
        "TRUNCATED",
        data.length(),
        "directory",
        "Expected the 24-byte TFM directory",
      ),
    ])
  }
  let n = Array::makei(12, i => u16(data, i * 2))
  for i in 0..<12 {
    if n[i] >= 32768 {
      return Err([
        diagnostic(
          "UNSUPPORTED_OR_INVALID_FORMAT",
          i * 2,
          "directory",
          "Classic TFM directory fields must be below 32768; OFM/JFM are unsupported",
        ),
      ])
    }
  }
  // Japanese TFM identifiers 9/11 cannot be valid classic TFM total lengths.
  if n[0] == 9 || n[0] == 11 {
    return Err([
      diagnostic(
        "UNSUPPORTED_OR_INVALID_FORMAT", 0, "directory", "JFM identifiers are unsupported",
      ),
    ])
  }
  if n[1] < 2 {
    return Err([
      diagnostic(
        "HEADER_TOO_SHORT", 2, "header", "Header must contain checksum and design size",
      ),
    ])
  }
  if n[2] > n[3] + 1 || n[3] > 255 {
    return Err([
      diagnostic(
        "CHARACTER_RANGE", 4, "char_info", "Require bc <= ec + 1 and ec <= 255",
      ),
    ])
  }
  if n[10] > 256 {
    return Err([
      diagnostic(
        "TABLE_SIZE", 20, "exten", "At most 256 extensible recipes are supported",
      ),
    ])
  }
  let count = n[3] - n[2] + 1
  let mut total = 6 + n[1] + count
  for i in 4..<12 {
    total = total + n[i]
  }
  if total != n[0] {
    return Err([
      diagnostic(
        "LENGTH_SUM",
        0,
        "directory",
        "Declared length \{n[0]} words differs from table sum \{total}",
      ),
    ])
  }
  let expected = n[0] * 4
  if data.length() != expected {
    let offset = if data.length() < expected { data.length() } else { expected }
    let code = if data.length() < expected {
      "TRUNCATED"
    } else {
      "TRAILING_DATA"
    }
    return Err([
      diagnostic(
        code,
        offset,
        "file",
        "Expected \{expected} bytes, received \{data.length()}",
      ),
    ])
  }
  let header = words(data, 24, n[1])
  let char_start = 24 + 4 * n[1]
  let characters = Array::makei(count, i => {
    let p = char_start + i * 4
    {
      code: n[2] + i,
      byte_offset: p,
      width_index: data[p].to_int(),
      height_index: data[p + 1].to_int() >> 4,
      depth_index: data[p + 1].to_int() & 15,
      italic_index: data[p + 2].to_int() >> 2,
      tag: data[p + 2].to_int() & 3,
      remainder: data[p + 3].to_int(),
    }
  })
  let w = char_start + 4 * count
  let h = w + 4 * n[4]
  let d = h + 4 * n[5]
  let it = d + 4 * n[6]
  let l = it + 4 * n[7]
  let k = l + 4 * n[8]
  let e = k + 4 * n[9]
  let p = e + 4 * n[10]
  Ok({
    lengths: n,
    header,
    characters,
    widths: words(data, w, n[4]),
    heights: words(data, h, n[5]),
    depths: words(data, d, n[6]),
    italics: words(data, it, n[7]),
    lig_kern: records(data, l, n[8]),
    kerns: words(data, k, n[9]),
    extensibles: records(data, e, n[10]),
    parameters: words(data, p, n[11]),
  })
}

///|
fn table_start(font : Font, table_index : Int32) -> Int32 {
  let mut offset = 24 + 4 * (font.lengths[1] + font.characters.length())
  for i in 4..<table_index {
    offset = offset + 4 * font.lengths[i]
  }
  offset
}

///|
fn exists(font : Font, code : Int32) -> Bool {
  let i = code - font.lengths[2]
  i >= 0 && i < font.characters.length() && font.characters[i].width_index != 0
}

///|
/// Returns None for an out-of-range query or an existing glyph with invalid indices.
/// Missing in-range byte codes return Some with exists=false and metrics=None.
pub fn glyph(font : Font, code : Int32) -> Glyph? {
  if code < 0 || code > 255 {
    return None
  }
  if !exists(font, code) {
    return Some({ character_code: code, exists: false, metrics: None, })
  }
  let ch = font.characters[code - font.lengths[2]]
  if ch.width_index >= font.widths.length() ||
    ch.height_index >= font.heights.length() ||
    ch.depth_index >= font.depths.length() ||
    ch.italic_index >= font.italics.length() {
    return None
  }
  Some({
    character_code: code,
    exists: true,
    metrics: Some({
      width: font.widths[ch.width_index],
      height: font.heights[ch.height_index],
      depth: font.depths[ch.depth_index],
      italic: font.italics[ch.italic_index],
    }),
  })
}
