///|
/// JS ABI: Bytes is Uint8Array and String is a JavaScript string.
pub fn inspect_json(data : Bytes) -> String {
  @moontfm.inspect_json(data)
}

///|
pub fn glyph_json(data : Bytes, code : Int32) -> String {
  @moontfm.glyph_json(data, code)
}

///|
pub fn diff_json(before : Bytes, after : Bytes) -> String {
  @moontfm.diff_json(before, after)
}
