import {describe,expect,it} from 'vitest';
import {repositoryHasWorkflows} from '../packages/delivery/publish.js';
import {githubInstallationUrl} from '../packages/delivery/github.js';

describe('GitHub delivery safety',()=>{
 it('detects GitHub Actions paths case-insensitively',()=>{
  expect(repositoryHasWorkflows({tree:[{path:'README.md'},{path:'.github/workflows/build.yml'}]})).toBe(true);
  expect(repositoryHasWorkflows({tree:[{path:'.GITHUB/WORKFLOWS/release.yaml'}]})).toBe(true);
 });
 it('allows a clean delivery repository',()=>expect(repositoryHasWorkflows({tree:[{path:'README.md'},{path:'.github/ISSUE_TEMPLATE/bug.md'}]})).toBe(false));
 it('starts installation with the wallet-bound OAuth state',()=>expect(githubInstallationUrl('hive-delivery','secure-state')).toBe('https://github.com/apps/hive-delivery/installations/new?state=secure-state'));
});
