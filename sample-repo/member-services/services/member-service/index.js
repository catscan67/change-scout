'use strict';

const { resolvePlan } = require('../plan-resolver');
const cardService = require('../card-service');

/**
 * Member-facing entry point.
 *
 * Member Services holds no data of its own; this layer establishes the member
 * context and then delegates retrieval to the owning service.
 */

class MemberValidationError extends Error {
  constructor(memberId) {
    super(`Member identifier failed validation: ${memberId}`);
    this.name = 'MemberValidationError';
    this.code = 'MEMBER_NOT_FOUND';
    this.status = 404;
  }
}

/**
 * Handles GET /members/{memberId}/card.
 *
 * @param {string} memberId Acme member identifier from the request path.
 * @param {object} deps
 * @param {object} deps.enrollment Enrollment System client.
 * @param {object} deps.nuxeo     Nuxeo document client.
 * @param {string} deps.correlationId Gateway-issued request correlation id.
 * @returns {Promise<object>} Card payload, per openapi/card-api.yaml.
 */
async function getMemberCard(memberId, deps) {
  const member = await deps.enrollment.validateMember(memberId, {
    correlationId: deps.correlationId,
  });

  if (!member.valid) {
    throw new MemberValidationError(memberId);
  }

  const plan = await resolvePlan(member.memberId, deps);

  return cardService.getCard(member.memberId, plan, deps);
}

module.exports = { getMemberCard, MemberValidationError };
