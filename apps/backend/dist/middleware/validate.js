"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const express_validator_1 = require("express-validator");
function validate(validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map((v) => v.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return;
        }
        next();
    };
}
//# sourceMappingURL=validate.js.map