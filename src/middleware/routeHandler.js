export function routeHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err, req, res, next); //call error handler
    }
  };
}
