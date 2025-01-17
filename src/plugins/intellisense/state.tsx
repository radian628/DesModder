import { BoundIdentifier } from ".";
import { mapAugAST } from "./latex-parsing";
import { ItemModel } from "globals/models";
import { Calc } from "globals/window";
import { rootKeys } from "plugins/find-replace/backend";
import Metadata from "plugins/manage-metadata/interface";
import { parseRootLatex } from "plugins/text-mode/aug/rawToAug";

export function get<T extends object, K extends string | symbol | number>(
  t: T,
  prop: K
): K extends keyof T ? T[K] : undefined {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  const obj2 = t as {
    [Key in string | symbol | number]: Key extends keyof T ? T[Key] : undefined;
  };

  return obj2[prop];
}

function getOrMakeKey<K, V>(map: Map<K, V>, k: K, v: () => V) {
  if (map.has(k)) {
    return map.get(k) as V;
  } else {
    const newV = v();
    map.set(k, newV);
    return newV;
  }
}

function undefinedIfErr<T>(cb: () => T): T | undefined {
  try {
    return cb();
  } catch {}
}

export class IntellisenseState {
  // maps an expression ID to every bound identifier in that expression
  boundIdentifiersInExpressions = new Map<string, BoundIdentifier[]>();

  // maps an identifier name to every expression ID where it is referenced
  identifierReferences = new Map<string, Set<string>>();

  // maps an expression ID to every identifier it references
  identifiersReferencedInExpression = new Map<string, Set<string>>();

  metadata: Metadata;

  counter = 0;

  constructor(metadata: Metadata) {
    this.metadata = metadata;
    Calc.controller.dispatcher.register((e) => {
      if (e.type === "on-evaluator-changes") {
        for (const id of Object.keys(e.changes)) {
          const model = Calc.controller.getItemModel(id);
          if (model) {
            this.handleStateChange(model);
          }
        }
      } else if (e.type === "delete-item-and-animate-out") {
        this.handleStateRemoval(e.id);
      } else if (e.type === "set-state") {
        this.setAllState();
      }
    });

    this.setAllState();
  }

  *boundIdentifiers() {
    for (const entry of this.boundIdentifiersInExpressions) {
      for (const ident of entry[1]) {
        yield ident;
      }
    }
  }

  setAllState() {
    const models = Calc.controller.getAllItemModels();
    for (const model of models) {
      this.handleStateChange(model);
    }
  }

  addIdentifierReference(ident: string, exprId: string) {
    const identRefSet = getOrMakeKey(
      this.identifierReferences,
      ident,
      () => new Set()
    );
    identRefSet.add(exprId);
  }

  removeIdentifierReference(ident: string, exprId: string) {
    const identRefSet = this.identifierReferences.get(ident);
    if (identRefSet) {
      identRefSet.delete(exprId);
    }
  }

  handleStateRemoval(id: string) {
    // remove all references to this identifier
    const oldIdentifiersReferencedInExpression =
      this.identifiersReferencedInExpression.get(id) ?? new Set();
    for (const ident of oldIdentifiersReferencedInExpression) {
      this.removeIdentifierReference(ident, id);
    }

    this.boundIdentifiersInExpressions.delete(id);
    this.identifiersReferencedInExpression.delete(id);
  }

  // handle a change to one expression
  handleStateChange(expression: ItemModel) {
    this.handleStateRemoval(expression.id);

    const newBoundIdentifiers: BoundIdentifier[] = [];

    const newIdentifiersReferenced = new Set<string>();

    if (expression.type !== "folder") {
      if (expression.type === "expression") {
        for (const key of rootKeys) {
          const ltxStr = get(expression, key);
          if (typeof ltxStr !== "string") continue;

          const ltx = undefinedIfErr(() => parseRootLatex(ltxStr));

          if (!ltx) continue;

          // add assignments to bound ident list
          if (ltx.type === "Assignment") {
            newBoundIdentifiers.push({
              type: "variable",
              variableName: ltx.left.symbol,
              exprId: expression.id,
              id: this.counter++,
            });

            // add fn def and params to bound ident list
          } else if (ltx.type === "FunctionDefinition") {
            newBoundIdentifiers.push({
              type: "function",
              variableName: ltx.symbol.symbol,
              exprId: expression.id,
              id: this.counter++,
              params: ltx.argSymbols.map((s) => s.symbol),
            });
            newBoundIdentifiers.push(
              ...ltx.argSymbols.map((s) => ({
                type: "function-param" as const,
                variableName: s.symbol,
                exprId: expression.id,
                id: this.counter++,
              }))
            );
          }

          mapAugAST(ltx, (node) => {
            if (!node) return;

            // add referenced identifier
            if (node.type === "Identifier") {
              this.addIdentifierReference(node.symbol, expression.id);
              newIdentifiersReferenced.add(node.symbol);
            }

            // add listcomps, substitutions, derivatives, and repeated ops (e.g. sum)
            if (
              node.type === "ListComprehension" ||
              node.type === "Substitution"
            ) {
              for (const ass of node.assignments) {
                newBoundIdentifiers.push({
                  exprId: expression.id,
                  variableName: ass.variable.symbol,
                  type: "listcomp-param",
                  id: this.counter++,
                });
              }
            } else if (node.type === "Derivative") {
              newBoundIdentifiers.push({
                exprId: expression.id,
                variableName: node.variable.symbol,
                type: "derivative",
                id: this.counter++,
              });
            } else if (node.type === "RepeatedOperator") {
              newBoundIdentifiers.push({
                exprId: expression.id,
                variableName: node.index.symbol,
                type: "repeated-operator",
                id: this.counter++,
              });
            }
          });
        }
      }
    }

    this.boundIdentifiersInExpressions.set(expression.id, newBoundIdentifiers);
    this.identifiersReferencedInExpression.set(
      expression.id,
      newIdentifiersReferenced
    );
  }
}
