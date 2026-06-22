export type RouteHandlerEntry<THandler> = {
  handler: THandler;
  firstSegments: string[];
};

export function buildRouteHandlerDispatchMap<THandler>(
  entries: RouteHandlerEntry<THandler>[],
) {
  return entries.reduce<Map<string, THandler[]>>((map, entry) => {
    for (const firstSegment of entry.firstSegments) {
      const handlers = map.get(firstSegment) ?? [];
      handlers.push(entry.handler);
      map.set(firstSegment, handlers);
    }
    return map;
  }, new Map());
}

export function selectRouteHandlers<THandler>(
  path: string[],
  allHandlers: THandler[],
  handlersByFirstSegment: Map<string, THandler[]>,
) {
  const firstSegment = path[0];
  if (!firstSegment) {
    return allHandlers;
  }
  return handlersByFirstSegment.get(firstSegment) ?? allHandlers;
}
