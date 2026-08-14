'use strict';

/**
 * Retrieves member ID card documents from Nuxeo.
 *
 * Nuxeo owns the document. This service resolves it to the response shape
 * published in openapi/card-api.yaml and does nothing else — the member context
 * and the plan are established by the caller.
 */

const DOC_TYPE = 'ID_CARD';

class CardNotFoundError extends Error {
  constructor(memberId) {
    super(`No card document on file for member: ${memberId}`);
    this.name = 'CardNotFoundError';
    this.code = 'CARD_NOT_FOUND';
    this.status = 404;
  }
}

/**
 * @param {string} memberId Validated Acme member identifier.
 * @param {{planId: string, planType: string}} plan Resolved plan for the member.
 * @param {object} deps
 * @param {object} deps.nuxeo Nuxeo document client.
 * @returns {Promise<object>} Card payload, per openapi/card-api.yaml.
 */
async function getCard(memberId, plan, deps) {
  const documents = await deps.nuxeo.query({
    memberId,
    planId: plan.planId,
    planType: plan.planType,
    docType: DOC_TYPE,
  });

  if (documents.length === 0) {
    throw new CardNotFoundError(memberId);
  }

  return toCardPayload(documents[0]);
}

/**
 * Maps a Nuxeo document record onto the published Card schema.
 *
 * @param {object} document Nuxeo document record.
 * @returns {object}
 */
function toCardPayload(document) {
  return {
    cardId: document.uid,
    memberId: document.properties.memberId,
    memberName: document.properties.memberName,
    planId: document.properties.planId,
    planName: document.properties.planName,
    groupNumber: document.properties.groupNumber,
    issuedDate: document.properties.issuedDate,
  };
}

module.exports = { getCard, toCardPayload, CardNotFoundError };
