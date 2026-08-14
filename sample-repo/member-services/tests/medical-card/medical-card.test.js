'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { resolvePlan, NoActivePlanError } = require('../../services/plan-resolver');
const { getCard, CardNotFoundError } = require('../../services/card-service');
const { getMemberCard } = require('../../services/member-service');

const MEMBER_ID = 'M100200300';

const medicalEnrollment = {
  planId: 'ACME-PPO-2026',
  planType: 'MEDICAL',
  status: 'ACTIVE',
  effectiveDate: '2026-01-01',
  termDate: '2026-12-31',
};

const medicalCardDocument = {
  uid: '8f14e45f-ea8d-4b1c-9f2a-7c3d5e6a1b20',
  properties: {
    memberId: MEMBER_ID,
    memberName: 'JORDAN A RIVERA',
    planId: 'ACME-PPO-2026',
    planName: 'Acme PPO Choice',
    groupNumber: 'GRP-44120',
    issuedDate: '2025-11-14',
  },
};

const enrollment = {
  async validateMember() {
    return { valid: true, memberId: MEMBER_ID, status: 'ACTIVE' };
  },
  async getEnrollments() {
    return [medicalEnrollment];
  },
};

const nuxeo = {
  async query() {
    return [medicalCardDocument];
  },
};

const emptyNuxeo = {
  async query() {
    return [];
  },
};

test('resolves the active plan for an enrolled member', async () => {
  const plan = await resolvePlan(MEMBER_ID, { enrollment });

  assert.equal(plan.memberId, MEMBER_ID);
  assert.equal(plan.planId, 'ACME-PPO-2026');
  assert.equal(plan.planType, 'MEDICAL');
});

test('throws when the member has no active enrollment', async () => {
  const terminated = {
    async getEnrollments() {
      return [{ ...medicalEnrollment, status: 'TERMINATED' }];
    },
  };

  await assert.rejects(
    () => resolvePlan(MEMBER_ID, { enrollment: terminated }),
    NoActivePlanError,
  );
});

test('returns the ID card on file for the resolved plan', async () => {
  const plan = await resolvePlan(MEMBER_ID, { enrollment });
  const card = await getCard(MEMBER_ID, plan, { nuxeo });

  assert.equal(card.cardId, medicalCardDocument.uid);
  assert.equal(card.memberId, MEMBER_ID);
  assert.equal(card.planId, 'ACME-PPO-2026');
  assert.equal(card.planName, 'Acme PPO Choice');
  assert.equal(card.groupNumber, 'GRP-44120');
});

test('throws when no card document is on file', async () => {
  const plan = await resolvePlan(MEMBER_ID, { enrollment });

  await assert.rejects(
    () => getCard(MEMBER_ID, plan, { nuxeo: emptyNuxeo }),
    CardNotFoundError,
  );
});

test('validates the member before retrieving the card', async () => {
  const calls = [];

  const tracked = {
    async validateMember(memberId) {
      calls.push('validateMember');
      return { valid: true, memberId, status: 'ACTIVE' };
    },
    async getEnrollments() {
      calls.push('getEnrollments');
      return [medicalEnrollment];
    },
  };

  const trackedNuxeo = {
    async query() {
      calls.push('nuxeo.query');
      return [medicalCardDocument];
    },
  };

  const card = await getMemberCard(MEMBER_ID, {
    enrollment: tracked,
    nuxeo: trackedNuxeo,
    correlationId: 'test-correlation-id',
  });

  assert.equal(card.memberId, MEMBER_ID);
  assert.deepEqual(calls, ['validateMember', 'getEnrollments', 'nuxeo.query']);
});
