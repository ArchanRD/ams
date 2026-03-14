const { z } = require('zod');

const verifySessionSchema = z.object({
  idToken: z.string().trim().min(1, 'idToken is required'),
});

module.exports = {
  verifySessionSchema,
};
