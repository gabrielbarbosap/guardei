/**
 * Remove `undefined` em qualquer profundidade.
 *
 * O Firestore recusa `undefined` inclusive dentro de objetos aninhados — foi
 * assim que um complemento de endereço em branco derrubou a criação do pedido.
 * Uma limpeza rasa não bastaria: o campo estava dentro de `shippingAddress`.
 *
 * Preserva `null`, `0`, `""` e `false`: só `undefined` é descartado.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      out[key] = stripUndefinedDeep(item);
    }
    return out as T;
  }
  return value;
}
