import { Statement } from "../down/TextAST";
import { parse } from "../down/textToAST";
import { astItemToTextString } from "../up/astToText";
import { statementsIntersecting } from "./statementIntersection";

jest.mock("utils/depUtils");
jest.mock("globals/window");

function positionsAndProgram(s: string) {
  const split = s.split("|");
  let pos = 0;
  const positions: number[] = [];
  split.slice(0, -1).forEach((x) => positions.push((pos += x.length)));
  return [positions, parse(split.join("")).program] as const;
}

function toString(s: Statement) {
  return astItemToTextString(s).replace(/ /g, "");
}

function testIntersection(s: string, stmts: string[]) {
  test(JSON.stringify(s), () => {
    const [[from, to], program] = positionsAndProgram(s);
    const intersection = [...statementsIntersecting(program, from, to)];
    expect(intersection.map(toString)).toEqual(stmts);
  });
}

describe("Statement intersection", () => {
  testIntersection("y=|x^2", ["y=x^2"]);
  testIntersection("y=|x^2;y=sin(|x)", ["y=x^2", "y=sin(x)"]);
  testIntersection("y=1\n|\ny=2", []);
  testIntersection("y=1\n|//\n|\ny=2", []);
  testIntersection("y=1\n|\ny=2\n|\ny=3", ["y=2"]);
  testIntersection('folder""{y=1;y|=2;y=3}', [
    'folder""{\ny=1\n\ny=2\n\ny=3\n}',
    "y=2",
  ]);
  testIntersection('folder""{y=1\n\n | y=2;y=3}', [
    'folder""{\ny=1\n\ny=2\n\ny=3\n}',
  ]);
  testIntersection('fol|der""{y=1;y|=2;y=3}', [
    'folder""{\ny=1\n\ny=2\n\ny=3\n}',
    "y=1",
    "y=2",
  ]);
  testIntersection('folder""{y=1;y|=2;y=3}\n\ny=|7', [
    'folder""{\ny=1\n\ny=2\n\ny=3\n}',
    "y=2",
    "y=3",
    "y=7",
  ]);
});
