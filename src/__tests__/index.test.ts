import parse from ".."

test("empty", () => {
  expect(parse("")).toEqual([]);
});