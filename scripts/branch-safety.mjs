import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9/_-]{1,150}$/;
export function isProtected(path, config) {
  return (config.protected_paths || []).some(x => path === x || path.startsWith(x.endsWith('/') ? x : x + '/')) ||
    /(^|\/)\.env(?:\.|$)/.test(path) || /(^|\/)(?:id_rsa|\.npmrc|\.p12)$/.test(path);
}
export function evaluateChange({head, base, behind, files, config}) {
  const issues = [], warnings = [];
  const integration = config.integration_branch;
  const isIntegration = head === integration;
  const lane = config.lanes?.[head];
  if (!SAFE_REF.test(head || '') || !SAFE_REF.test(base || '')) issues.push('Unsafe or missing Git reference');
  if (!Number.isSafeInteger(behind) || behind < 0) issues.push('Unknown branch drift: fail closed');
  if (!Array.isArray(files) || !files.every(x => typeof x === 'string')) issues.push('Diff not available: fail closed');
  if (isIntegration && base !== 'main') issues.push('Integration branch may only target main');
  if (!isIntegration && head?.startsWith('agent/') && base !== integration) issues.push('Agent PR must target integration branch');
  if (!isIntegration && !lane && head?.startsWith('agent/')) issues.push('Unregistered agent branch');
  if (!isIntegration && !head?.startsWith('agent/')) issues.push('Unregistered branch for protected workflow');
  if (behind > config.max_behind_commits) issues.push('Branch behind by ' + behind + ' commits (limit ' + config.max_behind_commits + ')');
  for (const path of files || []) {
    if (path.startsWith('/') || path.includes('..') || path.includes('\\')) {
      issues.push('Invalid diff path: ' + path); continue;
    }
    if (isProtected(path, config)) {
      if (isIntegration) warnings.push('Manual protected-resource review: ' + path);
      else issues.push('Protected resource outside agent authority: ' + path);
    }
    if (lane && !lane.paths.some(prefix => path === prefix || path.startsWith(prefix))) {
      issues.push('Outside ' + head + ' ownership: ' + path);
    }
  }
  return {status: issues.length ? 'FAIL' : warnings.length ? 'REVIEW_REQUIRED' : 'PASS',
    head, base, behind, changed_files: files?.length ?? null, issues, warnings, rule_version: config.version};
}
export function readConfig(path='config/agent-sync.json') {
  const config=JSON.parse(readFileSync(path,'utf8'));
  if(!config.integration_branch || !config.lanes || !Number.isSafeInteger(config.max_behind_commits)) throw Error('Invalid governance config');
  return config;
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',timeout:15000}).trim();
export function inspectGit(config, head, base) {
  if(!SAFE_REF.test(head || '') || !SAFE_REF.test(base || '')) throw Error('Unsafe branch ref');
  const headRef='refs/remotes/origin/'+head, baseRef='refs/remotes/origin/'+base;
  git('rev-parse','--verify',headRef); git('rev-parse','--verify',baseRef);
  const behind=Number(git('rev-list','--count',headRef+'..'+baseRef));
  // Include additions, modifications, renames AND deletions in ownership checks.
  const diff=git('diff','--name-only',baseRef+'...'+headRef);
  return evaluateChange({head,base,behind,files:diff ? diff.split('\n') : [],config});
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const config=readConfig(process.env.TRUSTED_AGENT_CONFIG || 'config/agent-sync.json');
    const head=process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
    const base=process.env.GITHUB_BASE_REF || (head===config.integration_branch?'main':config.integration_branch);
    const report=inspectGit(config,head,base);
    console.log(JSON.stringify(report,null,2));
    if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '### Branch guard: '+report.status+'\n\n'+report.issues.concat(report.warnings).map(x=>'- '+x).join('\n')+'\n');
    if(report.status==='FAIL') process.exitCode=1;
  } catch(e) {
    console.error('BLOCKED: Cannot prove branch integrity: '+e.message);
    process.exitCode=1;
  }
}
