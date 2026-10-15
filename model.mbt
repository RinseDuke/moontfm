///|
/// A diagnostic refers to a zero-based byte offset in the original TFM.
pub(all) struct Diagnostic {
  code : String
  severity : String
  byte_offset : Int32
  table : String
  message : String
  character_code : Int32?
  expected_min : Int32?
  expected_max : Int32?
  actual : Int32?
} derive(@debug.Debug, Eq)

///|
/// Raw signed 12.20 fixed-point values; character codes are font bytes, not Unicode.
pub(all) struct Metrics {
  width : Int32
  height : Int32
  depth : Int32
  italic : Int32
} derive(@debug.Debug, Eq, ToJson)

///|
pub(all) struct Character {
  code : Int32
  byte_offset : Int32
  width_index : Int32
  height_index : Int32
  depth_index : Int32
  italic_index : Int32
  tag : Int32
  remainder : Int32
} derive(@debug.Debug, Eq, ToJson)

///|
/// Four unsigned bytes, used by lig/kern instructions and extensible recipes.
pub(all) struct Record {
  a : Int32
  b : Int32
  c : Int32
  d : Int32
} derive(@debug.Debug, Eq, ToJson)

///|
/// A safely bounded parse. Call validate separately before relying on references.
pub struct Font {
  lengths : Array[Int32]
  header : Array[Int32]
  characters : Array[Character]
  widths : Array[Int32]
  heights : Array[Int32]
  depths : Array[Int32]
  italics : Array[Int32]
  lig_kern : Array[Record]
  kerns : Array[Int32]
  extensibles : Array[Record]
  parameters : Array[Int32]
} derive(@debug.Debug, ToJson)

///|
pub(all) struct Glyph {
  character_code : Int32
  exists : Bool
  metrics : Metrics?
} derive(@debug.Debug, Eq)

///|
pub(all) struct GlyphChange {
  character_code : Int32
  kind : String
  before : Metrics?
  after : Metrics?
} derive(@debug.Debug, Eq)

///|
pub(all) struct Difference {
  metrics_equal : Bool
  design_size_before : Int32
  design_size_after : Int32
  glyph_changes : Array[GlyphChange]
  other_changes : Array[String]
} derive(@debug.Debug, Eq, ToJson)

///|
fn diagnostic(
  code : String,
  offset : Int32,
  table : String,
  message : String,
) -> Diagnostic {
  {
    code,
    severity: "error",
    byte_offset: offset,
    table,
    message,
    character_code: None,
    expected_min: None,
    expected_max: None,
    actual: None,
  }
}

///|
fn reference_error(
  offset : Int32,
  table : String,
  index : Int32,
  length : Int32,
  character : Int32?,
) -> Diagnostic {
  {
    code: "INDEX_OUT_OF_RANGE",
    severity: "error",
    byte_offset: offset,
    table,
    message: "Index \{index} outside table of length \{length}",
    character_code: character,
    expected_min: Some(0),
    expected_max: Some(length - 1),
    actual: Some(index),
  }
}

///|
/// Convert a raw fix_word for display only; diff compares the original integers.
pub fn fixed_to_double(raw : Int32) -> Double {
  raw.to_double() / 1048576.0
}

///|
pub extend Diagnostic with Eq::{equal, not_equal}

///|
pub extend Metrics with Eq::{equal, not_equal}

///|
pub extend Character with Eq::{equal, not_equal}

///|
pub extend Record with Eq::{equal, not_equal}

///|
pub extend Glyph with Eq::{equal, not_equal}

///|
pub extend GlyphChange with Eq::{equal, not_equal}

///|
pub extend Difference with Eq::{equal, not_equal}

///|
pub extend Diagnostic with ToJson::{to_json}

///|
pub extend Metrics with ToJson::{to_json}

///|
pub extend Character with ToJson::{to_json}

///|
pub extend Record with ToJson::{to_json}

///|
pub extend Font with ToJson::{to_json}

///|
pub extend Glyph with ToJson::{to_json}

///|
pub extend GlyphChange with ToJson::{to_json}

///|
pub extend Difference with ToJson::{to_json}

///|
pub extend Diagnostic with @debug.Debug::{to_repr}

///|
pub extend Metrics with @debug.Debug::{to_repr}

///|
pub extend Character with @debug.Debug::{to_repr}

///|
pub extend Record with @debug.Debug::{to_repr}

///|
pub extend Font with @debug.Debug::{to_repr}

///|
pub extend Glyph with @debug.Debug::{to_repr}

///|
pub extend GlyphChange with @debug.Debug::{to_repr}

///|
pub extend Difference with @debug.Debug::{to_repr}

///|
pub impl ToJson for Diagnostic with fn to_json(self) {
  Json::object({
    "code": Json(self.code),
    "severity": Json(self.severity),
    "byte_offset": Json(self.byte_offset),
    "table": Json(self.table),
    "message": Json(self.message),
    "character_code": nullable(self.character_code),
    "expected_min": nullable(self.expected_min),
    "expected_max": nullable(self.expected_max),
    "actual": nullable(self.actual),
  })
}

///|
pub impl ToJson for Glyph with fn to_json(self) {
  Json::object({
    "character_code": Json(self.character_code),
    "exists": Json(self.exists),
    "metrics": nullable(self.metrics),
  })
}

///|
pub impl ToJson for GlyphChange with fn to_json(self) {
  Json::object({
    "character_code": Json(self.character_code),
    "kind": Json(self.kind),
    "before": nullable(self.before),
    "after": nullable(self.after),
  })
}

///|
fn[T : ToJson] nullable(value : T?) -> Json {
  match value {
    Some(v) => Json(v)
    None => Json::null()
  }
}
