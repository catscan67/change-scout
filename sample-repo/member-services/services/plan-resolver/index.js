'use strict';

/**
 * Determines which plan a member's documents are filed under.
 *
 * Document keys in Nuxeo are composed of the member identifier and the plan the
 * document was issued against, so retrieval requires resolving the plan first.
 */

const PLAN_TYPE = 'MEDICAL';

class NoActivePlanError extends Error {
  constructor(memberId) {
    super(`No active plan found for member: ${memberId}`);
    this.name = 'NoActivePlanError';
    this.code = 'NO_ACTIVE_PLAN';
    this.status = 404;
  }
}

/**
 * @param {string} memberId Acme member identifier.
 * @param {object} deps
 * @param {object} deps.enrollment Enrollment System client.
 * @returns {Promise<{memberId: string, planId: string, planType: string}>}
 */
async function resolvePlan(memberId, deps) {
  const enrollments = await deps.enrollment.getEnrollments(memberId);

  const active = enrollments.filter((enrollment) => enrollment.status === 'ACTIVE');

  if (active.length === 0) {
    throw new NoActivePlanError(memberId);
  }

  const [plan] = active;

  return {
    memberId,
    planId: plan.planId,
    planType: PLAN_TYPE,
  };
}

module.exports = { resolvePlan, NoActivePlanError };
