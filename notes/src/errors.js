class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

class ServiceUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = "ServiceUnavailableError";
    }
}

module.exports = { ValidationError, ServiceUnavailableError };
