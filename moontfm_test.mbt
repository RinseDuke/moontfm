///|
fn sample() -> Bytes {
  // Directory: lf=15, lh=2, bc=ec=65, nw=nh=2, nd=ni=1.
  // Checksum 0x12345678, design size 10pt, A: width .5, height .6999998.
  b"\x00\x0f\x00\x02\x00\x41\x00\x41\x00\x02\x00\x02\x00\x01\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x12\x34\x56\x78\x00\xa0\x00\x00\x01\x10\x00\x00\x00\x00\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\x0b\x33\x33\x00\x00\x00\x00\x00\x00\x00\x00"
}

///|
test "parse complete model and validate known file" {
  guard @moontfm.parse(sample()) is Ok(font) else {
    fail("Expected valid sample")
  }
  @test.assert_eq(font.header[0], 0x12345678)
  @test.assert_eq(font.header[1], 10485760)
  @test.assert_eq(font.widths.length(), 2)
  @test.assert_eq(@moontfm.validate(font).length(), 0)
}

///|
test "query exact metrics and distinguish missing character" {
  guard @moontfm.parse(sample()) is Ok(font) else {
    fail("Expected valid sample")
  }
  guard @moontfm.glyph(font, 65) is Some(g) else { fail("Expected glyph") }
  guard g.metrics is Some(m) else { fail("Expected metrics") }
  @test.assert_eq(m.width, 524288)
  @test.assert_eq(m.height, 734003)
  @test.assert_eq(@moontfm.glyph(font, 66).unwrap().exists, false)
  @test.assert_eq(@moontfm.glyph(font, 256) is None, true)
}

///|
test "empty and incomplete directory return diagnostics" {
  for bytes in [b"", b"\x00", b"\x00\x0f\x00\x02"] {
    guard @moontfm.parse(bytes) is Err(ds) else { fail("Expected truncation") }
    @test.assert_eq(ds[0].code, "TRUNCATED")
    @test.assert_eq(ds[0].byte_offset, bytes.length())
  }
}

///|
test "identity diff has no changes" {
  guard @moontfm.parse(sample()) is Ok(font) else {
    fail("Expected valid sample")
  }
  guard @moontfm.diff(font, font) is Ok(d) else { fail("Expected valid diff") }
  @test.assert_eq(d.metrics_equal, true)
  @test.assert_eq(d.glyph_changes.length(), 0)
  @test.assert_eq(d.other_changes.length(), 0)
}

///|
test "fixed-point conversion preserves signed values" {
  @test.assert_eq(@moontfm.fixed_to_double(1048576), 1.0)
  @test.assert_eq(@moontfm.fixed_to_double(-131072), -0.125)
}
