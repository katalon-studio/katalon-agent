const { getKSReleases } = require('../../../src/core/api/api');

describe('getKSReleases test', () => {
  it('Get KS Releases', async () => {
    /// When
    const ksReleases = await getKSReleases();
    const responseStatus = ksReleases.status;
    /// Then
    expect(responseStatus).toBe(200);
  });
});
