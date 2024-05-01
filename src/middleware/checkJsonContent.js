export function checkJsonContent(req, res, next) {
  //make sure data provided in POST request body are JSON formatted
  if (req.headers["content-type"] !== "application/json")
    res.status(400).send("Server requires application/json");
  else next();
}
