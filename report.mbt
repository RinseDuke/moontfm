///|
fn envelope(
  command : String,
  status : String,
  diagnostics : Array[Diagnostic],
  data : Json,
) -> Json {
  let coverage : Array[String] = [
    "classic_8bit_tfm", "table_bounds", "metric_indices", "fixed_point_ranges", "lig_kern_references",
    "extensible_references", "next_larger_cycles",
  ]
  let uncovered : Array[String] = [
    "ligature_execution_semantics_and_cycles", "seven_bit_safe_claim", "rendering",
    "jfm_ofm", "header_string_contents", "math_parameter_counts",
  ]
  Json::object({
    "schema_version": Json(1),
    "command": Json(command),
    "status": Json(status),
    "diagnostics": Json(diagnostics),
    "coverage": Json(coverage),
    "not_covered": Json(uncovered),
    "data": data,
  })
}

///|
/// A stable versioned JSON report. Success means only that declared checks passed.
pub fn inspect_json(data : Bytes) -> String {
  match parse(data) {
    Err(ds) => envelope("inspect", "invalid", ds, Json::null()).stringify()
    Ok(font) => {
      let ds = validate(font)
      let status = if ds.is_empty() { "ok" } else { "invalid" }
      envelope("inspect", status, ds, Json(font)).stringify()
    }
  }
}

///|
pub fn glyph_json(data : Bytes, code : Int32) -> String {
  match parse(data) {
    Err(ds) => envelope("glyph", "invalid", ds, Json::null()).stringify()
    Ok(font) => {
      let ds = validate(font)
      if !ds.is_empty() {
        return envelope("glyph", "invalid", ds, Json::null()).stringify()
      }
      match glyph(font, code) {
        None =>
          envelope(
            "glyph",
            "invalid",
            [
              diagnostic(
                "CHARACTER_CODE", 0, "query", "Character code must be between 0 and 255",
              ),
            ],
            Json::null(),
          ).stringify()
        Some(g) => envelope("glyph", "ok", [], Json(g)).stringify()
      }
    }
  }
}

///|
pub fn diff_json(before : Bytes, after : Bytes) -> String {
  let b = match parse(before) {
    Ok(f) => f
    Err(ds) =>
      return envelope(
        "diff",
        "invalid",
        ds,
        Json::object({ "input": Json("before") }),
      ).stringify()
  }
  let bd = validate(b)
  if !bd.is_empty() {
    return envelope(
      "diff",
      "invalid",
      bd,
      Json::object({ "input": Json("before") }),
    ).stringify()
  }
  let a = match parse(after) {
    Ok(f) => f
    Err(ds) =>
      return envelope(
        "diff",
        "invalid",
        ds,
        Json::object({ "input": Json("after") }),
      ).stringify()
  }
  let ad = validate(a)
  if !ad.is_empty() {
    return envelope(
      "diff",
      "invalid",
      ad,
      Json::object({ "input": Json("after") }),
    ).stringify()
  }
  match diff(b, a) {
    Ok(d) => envelope("diff", "ok", [], Json(d)).stringify()
    Err(ds) => envelope("diff", "invalid", ds, Json::null()).stringify()
  }
}
