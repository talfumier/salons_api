export class CustomError {
  constructor(message = "Custom Error message", statusCode = 500, description) {
    this.name = this.constructor.name;
    this.message = message;
    this.statusCode = statusCode;
    this.description = description;
  }
}
export class BadRequest extends CustomError {
  constructor(description) {
    super("Cannot process the request as it stands.", 400, description);
  }
}
export class NotFound extends CustomError {
  constructor(description) {
    super("The requested resource could not be found.", 404, description);
  }
}
export class Unauthorized extends CustomError {
  constructor(description) {
    super(
      "Unauthorized Access. Authentication required or invalid.",
      401,
      description
    );
  }
}
export class UnexpectedError extends CustomError {
  constructor(description) {
    super("An unexpected error has occured.", "unknown", description);
  }
}
